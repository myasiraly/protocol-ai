
import { GoogleGenAI, GenerateContentResponse, Modality, Content } from "@google/genai";
import { PROTOCOL_SYSTEM_INSTRUCTION, MODEL_NAME, THINKING_MODEL_NAME, TTS_MODEL_NAME, IMAGE_MODEL_NAME, VIDEO_MODEL_NAME } from '../constants';
import { Message, MessageRole, Attachment, TrainingConfig } from '../types';

const getGenAI = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Audio Helpers ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playAudioData = async (base64Data: string, audioContext: AudioContext): Promise<AudioBufferSourceNode> => {
  const bytes = decode(base64Data);
  const audioBuffer = await decodeAudioData(bytes, audioContext, 24000, 1);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
  return source;
};

export const generateConversationTitle = async (message: string): Promise<string> => {
  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate a very short, concise title (max 5 words) for a conversation that starts with this message: "${message}". Do not use quotes.`,
    });
    return response.text?.trim() || "New Protocol";
  } catch (e) {
    console.error("Title generation failed", e);
    return "New Protocol";
  }
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
        // Handle Images, Videos, Audio, and Files
        // Gemini supports generic inlineData for all these types if mimeType is correct
        if (att.data) {
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
const generateImage = async (prompt: string, referenceImage?: { data: string, mimeType: string }): Promise<Attachment | null> => {
  const ai = getGenAI();
  try {
    const parts: any[] = [];
    if (referenceImage) {
      parts.push({
        inlineData: {
          mimeType: referenceImage.mimeType,
          data: referenceImage.data
        }
      });
    }
    parts.push({ text: prompt });

    const config: any = {
      imageConfig: {
        aspectRatio: "16:9",
      }
    };

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: { parts },
      config: config
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
  outputModality: 'TEXT' | 'AUDIO' = 'TEXT',
  useDeepAgent: boolean = false,
  activeIntegrations: string[] = [], // New Param
  trainingConfig?: TrainingConfig | null // New Param
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
      // Pass all supported types as inlineData
      if (att.data) {
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
  
  // Construct Dynamic System Instruction
  let finalInstruction = PROTOCOL_SYSTEM_INSTRUCTION;

  if (trainingConfig && trainingConfig.isEnabled) {
    finalInstruction += `\n\n### NEURAL CONDITIONING (USER TRAINING OVERRIDE)
The user has manually trained this model instance with specific requirements. You MUST adhere to these overrides above all standard behaviors:

**CUSTOM IDENTITY:**
${trainingConfig.identity}

**CORE OBJECTIVES:**
${trainingConfig.objectives}

**BEHAVIORAL CONSTRAINTS:**
${trainingConfig.constraints}

**RESPONSE TONE/STYLE:**
${trainingConfig.tone}`;
  }

  if (activeIntegrations.length > 0) {
    finalInstruction += `\n\n### ACTIVE INTEGRATIONS
The following external tools are connected and authorized by the user: ${activeIntegrations.join(', ')}. You can confidently act as if you have access to these services when requested.`;
  }

  // 1. PRIORITY: Attempt Native Audio Generation
  if (outputModality === 'AUDIO' && !hasVideo) {
    try {
      const audioResult = await ai.models.generateContent({
        model: MODEL_NAME, 
        contents: contents,
        config: {
          systemInstruction: finalInstruction,
          responseModalities: ['AUDIO'], 
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' }
            }
          }
        }
      });

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
  if (outputModality === 'TEXT' || (outputModality === 'AUDIO' && !audioData) || hasVideo) {
    try {
      const config: any = {
        systemInstruction: finalInstruction,
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

    } catch (textError: any) {
      console.error("Text Generation Failed:", textError);
      let friendlyError = textError.message || "Unknown Connection Failure";
      if (friendlyError.includes('429')) friendlyError = "[SYSTEM ALERT]: Rate Limit Exceeded.";
      throw new Error(friendlyError);
    }
  }

  // 3. Post-Processing: Media Tags & Grounding
  if (responseText && responseText !== "[Encrypted Audio Transmission]") {
    const imageTagRegex = /\[GENERATE_IMAGE:\s*(.*?)\]/;
    const editImageTagRegex = /\[EDIT_IMAGE:\s*(.*?)\]/;
    const videoTagRegex = /\[GENERATE_VIDEO:\s*(.*?)\]/;

    const imageMatch = responseText.match(imageTagRegex);
    const editImageMatch = responseText.match(editImageTagRegex);
    const videoMatch = responseText.match(videoTagRegex);

    if (imageMatch) {
      const prompt = imageMatch[1];
      responseText = responseText.replace(imageTagRegex, `\n[STATUS]: Generating High-Fidelity Image (Gemini 2.5 Flash)...\n`);
      const image = await generateImage(prompt);
      if (image) generatedMedia.push(image);
    }

    if (editImageMatch) {
      const prompt = editImageMatch[1];
      // Find reference image in current attachments
      const refImage = attachments.find(a => a.type === 'image' && a.data);
      
      if (refImage && refImage.data) {
          responseText = responseText.replace(editImageTagRegex, `\n[STATUS]: Editing Image (Gemini 2.5 Flash)...\n`);
          const image = await generateImage(prompt, { data: refImage.data, mimeType: refImage.mimeType });
          if (image) generatedMedia.push(image);
      } else {
          // Fallback to generation if no image found to edit
          responseText = responseText.replace(editImageTagRegex, `\n[STATUS]: Generating Image (No Reference Found)...\n`);
          const image = await generateImage(prompt);
          if (image) generatedMedia.push(image);
      }
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
              if (chunk.web?.uri) return { title: chunk.web.title || 'Web Source', uri: chunk.web.uri, type: 'web' };
              if (chunk.maps?.uri) return { title: chunk.maps.title || 'Location', uri: chunk.maps.uri, type: 'map' };
              return null;
            })
            .filter(Boolean);

          const uniqueSources = Array.from(new Map(sources.map((item:any) => [item.uri, item])).values());
          
          if (uniqueSources.length > 0) {
            // Append as hidden JSON block for UI to parse and render as chips
            responseText += `\n\n:::GROUNDING=${JSON.stringify(uniqueSources)}:::`;
          }
        }
    }
  }

  return { text: responseText, generatedMedia, audioData };
};
