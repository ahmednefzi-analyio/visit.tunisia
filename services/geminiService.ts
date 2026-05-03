import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AppMode, Coordinates, ChatMessage, GroundingMetadata } from "../types";
import { SYSTEM_INSTRUCTIONS } from "../constants";

let genAI: GoogleGenAI | null = null;

export const initializeGenAI = (apiKey: string) => {
  genAI = new GoogleGenAI({ apiKey });
};

export const sendMessageToGemini = async (
  prompt: string,
  mode: AppMode,
  history: ChatMessage[],
  location?: Coordinates
): Promise<ChatMessage> => {
  if (!genAI) {
    throw new Error("Gemini API not initialized");
  }

  let modelName = 'gemini-3-pro-preview';
  const tools: any[] = [];
  const toolConfig: any = {};

  // Configure Model and Tools based on Mode
  switch (mode) {
    case AppMode.MAPS:
      modelName = 'gemini-2.5-flash'; // Required for Maps Grounding
      tools.push({ googleMaps: {} });
      if (location) {
        toolConfig.retrievalConfig = {
          latLng: {
            latitude: location.lat,
            longitude: location.lng,
          },
        };
      }
      break;

    case AppMode.SEARCH:
      modelName = 'gemini-3-flash-preview';
      tools.push({ googleSearch: {} });
      break;

    case AppMode.CHAT:
      modelName = 'gemini-3-pro-preview';
      break;
  }

  try {
    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTIONS[mode],
    };

    if (tools.length > 0) {
      config.tools = tools;
    }

    if (Object.keys(toolConfig).length > 0) {
      config.toolConfig = toolConfig;
    }

    const contents = history
      .filter(m => !m.isError)
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const response: GenerateContentResponse = await genAI.models.generateContent({
      model: modelName,
      contents: contents,
      config: config,
    });

    const text = response.text || "I couldn't generate a text response.";
    
    // Extract Grounding Metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const groundingMetadata: GroundingMetadata = {};
    
    if (groundingChunks) {
      groundingMetadata.mapChunks = groundingChunks
        .filter((c: any) => c.maps)
        .map((c: any) => c as any); // Type assertion for simplicity in this demo context
        
      groundingMetadata.searchChunks = groundingChunks
        .filter((c: any) => c.web)
        .map((c: any) => c as any);
    }

    return {
      id: Date.now().toString(),
      role: 'model',
      text: text,
      timestamp: new Date(),
      groundingMetadata,
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
      id: Date.now().toString(),
      role: 'model',
      text: `Error: ${error.message || "Something went wrong."}`,
      timestamp: new Date(),
      isError: true,
    };
  }
};