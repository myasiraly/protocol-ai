
import { GoogleGenAI, GenerateContentResponse, Modality, Content } from "@google/genai";
import { PROTOCOL_SYSTEM_INSTRUCTION, MODEL_NAME, THINKING_MODEL_NAME, TTS_MODEL_NAME, IMAGE_MODEL_NAME, VIDEO_MODEL_NAME } from '../constants';
import { Message, MessageRole, Attachment, ImageGenerationSize } from '../types';

const getGenAI = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Helper: History Sanitization ---
const buildGeminiHistory = (messages: Message[]): Content[] => {
  const history: Content[] = [];
  let lastRole: 'user' | 'model' | null = null;

  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  for (const msg of sortedMessages) {
    const role = msg.role === MessageRole.USER ? 'user' : 'model';
    const parts: any[] = [];

    if (msg.attachments && msg.attachments.length > 0 && role === 'user') {
      msg.attachments.forEach(att => {
        if ((att.type === 'image' || att.type === 'video') && att.data) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data
            }
          });
        }
      });
    }

    if (msg.content && msg.content.trim()) {
      parts.push({ text: msg.content });
    }

    if (parts.length === 0) continue;

    if (lastRole === role) {
      const lastEntry = history[history.length - 1];
      lastEntry.parts = [...lastEntry.parts, ...parts];
    } else {
      history.push({ role, parts });
      lastRole = role;
    }
  }
  return history;
};

// --- Media Generation Functions ---
const generateImage = async (prompt: string, size: ImageGenerationSize): Promise<Attachment | null> => {
  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: size
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          type: 'image',
          mimeType: part.inlineData.mimeType || 'image/png',
          data: part.inlineData.data
        };
      }
    }
  } catch (e) {
    console.error("Image generation failed", e);
  }
  return null;
};

const generateVideo = async (prompt: string): Promise<Attachment | null> => {
  const ai = getGenAI();
  try {
    if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
       // Proceed
    } else if ((window as any).aistudio) {
       await (window as any).aistudio.openSelectKey();
    }

    let operation = await ai.models.generateVideos({
      model: VIDEO_MODEL_NAME,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
      const apiKey = process.env.API_KEY;
      return {
        type: 'video',
        mimeType: 'video/mp4',
        uri: `${videoUri}&key=${apiKey}`
      };
    }
  } catch (e) {
    console.error("Video generation failed", e);
  }
  return null;
};

// --- Core Message Handler ---

export const sendMessageToSession = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[] = [],
  imageSize: ImageGenerationSize = '1K',
  outputModality: 'TEXT' | 'AUDIO' = 'TEXT',
  useDeepAgent: boolean = false
): Promise<{ text: string, generatedMedia?: Attachment[], audioData?: string }> => {

  const ai = getGenAI();
  
  // Detect if video attachment is present. If so, we MUST use gemini-3-pro-preview
  const hasVideo = attachments.some(a => a.type === 'video');
  const modelToUse = hasVideo 
    ? 'gemini-3-pro-preview' 
    : (useDeepAgent ? THINKING_MODEL_NAME : MODEL_NAME);
  
  const contents = buildGeminiHistory(history);
  
  const currentParts: any[] = [];
  if (attachments.length > 0) {
    attachments.forEach(att => {
      if ((att.type === 'image' || att.type === 'video') && att.data) {
        currentParts.push({
          inlineData: { mimeType: att.mimeType, data: att.data }
        });
      }
    });
  }
  if (newMessage.trim()) {
    currentParts.push({ text: newMessage });
  } else if (currentParts.length === 0) {
    currentParts.push({ text: '...' });
  }
  contents.push({ role: 'user', parts: currentParts });

  let responseText = "";
  let audioData: string | undefined = undefined;
  let generatedMedia: Attachment[] = [];
  let result: GenerateContentResponse | null = null;
  
  // 1. PRIORITY: Attempt Native Audio Generation
  // Only attempt audio if NO video is present (Flash 2.5 feature) and DeepAgent is off.
  if (outputModality === 'AUDIO' && !hasVideo) {
    try {
      // We use the standard model (Flash) which supports audio out
      const audioResult = await ai.models.generateContent({
        model: MODEL_NAME, 
        contents: contents,
        config: {
          systemInstruction: PROTOCOL_SYSTEM_INSTRUCTION,
          // STRICTLY REQUEST AUDIO ONLY
          responseModalities: ['AUDIO'], 
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' }
            }
          }
        }
      });

      // Extract inline audio data
      const inlineData = audioResult.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      
      if (inlineData && inlineData.data) {
        audioData = inlineData.data;
        responseText = "[Encrypted Audio Transmission]";
      } else {
        throw new Error("API returned no inline audio data.");
      }
    } catch (e) {
      console.warn("Native Audio generation failed. Engaging Fallback Protocol (Text Only).", e);
    }
  }

  // 2. Text Generation
  // Run this if:
  // a) Modality was TEXT initially
  // b) Modality was AUDIO but failed (so audioData is missing)
  // c) We are processing Video (forces text response usually)
  if (outputModality === 'TEXT' || (outputModality === 'AUDIO' && !audioData) || hasVideo) {
    try {
      const config: any = {
        systemInstruction: PROTOCOL_SYSTEM_INSTRUCTION,
        temperature: 0.2,
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
      };

      if (useDeepAgent) {
        config.thinkingConfig = { thinkingBudget: 32768 };
      }

      result = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: config
      });

      responseText = result.text || "";
      if (!responseText) {
         responseText = "[STATUS]: Request processed but no text returned.";
      }

    } catch (textError) {
      console.error("Text Generation Failed:", textError);
      throw textError;
    }
  }

  // 4. Post-Processing: Media Tags & Grounding
  if (responseText && responseText !== "[Encrypted Audio Transmission]") {
    const imageTagRegex = /\[GENERATE_IMAGE:\s*(.*?)\]/;
    const videoTagRegex = /\[GENERATE_VIDEO:\s*(.*?)\]/;

    const imageMatch = responseText.match(imageTagRegex);
    const videoMatch = responseText.match(videoTagRegex);

    if (imageMatch) {
      const prompt = imageMatch[1];
      responseText = responseText.replace(imageTagRegex, `\n[STATUS]: Generating ${imageSize} High-Fidelity Image...\n`);
      const image = await generateImage(prompt, imageSize);
      if (image) generatedMedia.push(image);
    }

    if (videoMatch) {
      const prompt = videoMatch[1];
      responseText = responseText.replace(videoTagRegex, '\n[STATUS]: Generating Cinematic Video (Veo 3.1)... Please wait.\n');
      const video = await generateVideo(prompt);
      if (video) generatedMedia.push(video);
    }

    if (result) {
        const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks && groundingChunks.length > 0) {
          const sources = groundingChunks
            .map((chunk: any) => {
              const chunkSources: string[] = [];
              if (chunk.web?.uri && chunk.web?.title) {
                chunkSources.push(`[${chunk.web.title}](${chunk.web.uri})`);
              }
              if (chunk.maps?.uri && chunk.maps?.title) {
                chunkSources.push(`📍 [${chunk.maps.title}](${chunk.maps.uri})`);
              }
              return chunkSources;
            })
            .flat();

          const uniqueSources = [...new Set(sources)];
          if (uniqueSources.length > 0) {
            responseText += `\n\n### INTEL SOURCES\n${uniqueSources.map(s => `* ${s}`).join('\n')}`;
          }
        }
    }
  }

  return { text: responseText, generatedMedia, audioData };
};

// --- Utilities ---

export const generateConversationTitle = async (userPrompt: string): Promise<string> => {
  const ai = getGenAI();
  const promptText = userPrompt.trim() || "New Protocol Session";
  
  const prompt = `Generate a very concise, action-oriented title (3-5 words) for a chat that begins with this user prompt:
"${promptText.substring(0, 500)}"

Rules:
1. No quotation marks.
2. No prefixes like "Title:".
3. Direct and professional.
4. If the prompt is just "hello" or generic, generate a creative tech-themed title.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.7, maxOutputTokens: 20 }
    });
    let title = response.text?.trim() || "Protocol Log";
    return title.replace(/^["']|["']$/g, '');
  } catch (error) {
    return "Protocol Log";
  }
};

const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Gemini returns raw PCM data (24kHz, 1 channel), so we must manually decode it 
// because standard audioContext.decodeAudioData expects a WAV/MP3 container with headers.
const pcmToAudioBuffer = (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer => {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playAudioData = async (
  base64Audio: string, 
  audioContext: AudioContext
): Promise<AudioBufferSourceNode> => {
  const pcmData = decode(base64Audio);
  
  // Directly create buffer from PCM data
  const audioBuffer = pcmToAudioBuffer(pcmData, audioContext, 24000);
  
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
  return source;
};
