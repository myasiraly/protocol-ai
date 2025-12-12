
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { PROTOCOL_SYSTEM_INSTRUCTION, MODEL_NAME, THINKING_MODEL_NAME, TTS_MODEL_NAME, IMAGE_MODEL_NAME, VIDEO_MODEL_NAME } from '../constants';
import { Message, MessageRole, Attachment, ImageGenerationSize } from '../types';

let genAIInstance: GoogleGenAI | null = null;

const getGenAI = (): GoogleGenAI => {
  // Always create a new instance to ensure fresh API key usage if it changes (e.g. via prompt dialog)
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
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
          imageSize: size // "1K", "2K", or "4K"
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
    // Check for API Key selection for Veo
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

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
      // Fetch the actual bytes to avoid CORS/Auth issues in <img> tags if possible, 
      // or return the URI with key appended for direct playback.
      // For Veo, we often need to fetch with key.
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

// --- Main Chat Function ---

export const sendMessageToProtocol = async (
  history: Message[],
  newMessage: string,
  useDeepAgent: boolean = false,
  attachments: Attachment[] = [],
  imageSize: ImageGenerationSize = '1K'
): Promise<{ text: string, generatedMedia?: Attachment[] }> => {
  const ai = getGenAI();

  const modelName = useDeepAgent ? THINKING_MODEL_NAME : MODEL_NAME;
  
  // Configure tools with both Search and Maps
  const config: any = {
    systemInstruction: PROTOCOL_SYSTEM_INSTRUCTION,
    temperature: 0.2,
    tools: [
      { googleSearch: {} },
      { googleMaps: {} }
    ],
  };

  if (useDeepAgent) {
    // DeepAgent uses high thinking budget for complex planning
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const formattedHistory = history.map(msg => {
    const parts: any[] = [];
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        if (att.type === 'image' && att.data) {
           parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data
            }
          });
        }
      });
    }
    if (msg.content) parts.push({ text: msg.content });
    return {
      role: msg.role === MessageRole.USER ? 'user' : 'model',
      parts: parts
    };
  });

  const chat = ai.chats.create({
    model: modelName,
    config: config,
    history: formattedHistory
  });

  let messagePayload: any = newMessage;
  if (attachments.length > 0) {
    const parts: any[] = [];
    attachments.forEach(att => {
      if (att.type === 'image' && att.data) {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      }
    });
    parts.push({ text: newMessage });
    messagePayload = { parts };
  }

  const result: GenerateContentResponse = await chat.sendMessage({
    message: messagePayload
  });

  let responseText = result.text || "[ERROR]: Protocol Malfunction. No text returned.";
  const generatedMedia: Attachment[] = [];

  // --- Parse for Media Generation Tags ---
  
  // Regex to find [GENERATE_IMAGE: ...] or [GENERATE_VIDEO: ...]
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

  // --- Grounding Sources (Search & Maps) ---
  const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks && groundingChunks.length > 0) {
    const sources = groundingChunks
      .map((chunk: any) => {
        // Handle Google Search Web Links
        if (chunk.web?.uri && chunk.web?.title) {
          return `* [${chunk.web.title}](${chunk.web.uri})`;
        }
        // Handle Google Maps Links
        if (chunk.maps?.uri && chunk.maps?.title) {
           return `* 📍 [${chunk.maps.title}](${chunk.maps.uri})`;
        }
        // Handle Google Maps Place Answer Sources (e.g. review snippets)
        if (chunk.maps?.placeAnswerSources && chunk.maps.placeAnswerSources.length > 0) {
           return chunk.maps.placeAnswerSources.map((source: any) => {
             if (source.uri && source.title) {
               return `* 📍 [${source.title}](${source.uri})`;
             }
             return null;
           }).filter(Boolean).join('\n');
        }
        return null;
      })
      .filter(Boolean)
      .flat(); // Flatten in case maps returned an array

    const uniqueSources = [...new Set(sources)];
    if (uniqueSources.length > 0) {
      responseText += `\n\n### INTEL SOURCES\n${uniqueSources.join('\n')}`;
    }
  }

  return { text: responseText, generatedMedia };
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getGenAI();
  const safeText = text.length > 2000 ? text.substring(0, 2000) + "..." : text;
  const response = await ai.models.generateContent({
    model: TTS_MODEL_NAME,
    contents: [{ parts: [{ text: safeText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Fenrir' },
        },
      },
    },
  });
  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error("No audio data returned.");
  return audioData;
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

export const playAudioData = async (
  base64Audio: string, 
  audioContext: AudioContext
): Promise<AudioBufferSourceNode> => {
  const audioBuffer = await audioContext.decodeAudioData(decode(base64Audio).buffer);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
  return source;
};
