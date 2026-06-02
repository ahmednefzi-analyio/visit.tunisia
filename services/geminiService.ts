import { AppMode, Coordinates, ChatMessage } from "../types";

let clientAI: any = null;

const getClientAI = async () => {
  if (clientAI) return clientAI;
  const key = import.meta.env.VITE_GEMINI_API_KEY || (window as any).VITE_GEMINI_API_KEY || "";
  if (!key) {
    throw new Error("VITE_GEMINI_API_KEY is not configured in the host environment. To enable chat on static-only hosting like Vercel, please define 'VITE_GEMINI_API_KEY' in your Vercel/environment settings.");
  }
  const { GoogleGenAI } = await import("@google/genai");
  clientAI = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  return clientAI;
};

export const initializeGenAI = (apiKey: string) => {
  console.log("Dual-layer Gemini client initialized. Prefers secure server proxy API with client fallback.");
};

export const sendMessageToGemini = async (
  prompt: string,
  mode: AppMode,
  history: ChatMessage[],
  location?: Coordinates
): Promise<ChatMessage> => {
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        mode,
        history,
        location,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        id: data.id || Date.now().toString(),
        role: data.role || "model",
        text: data.text || "I couldn't generate a text response.",
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        groundingMetadata: data.groundingMetadata,
        isError: data.isError,
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.text || `Server returned response code ${response.status}`);
    }
  } catch (error: any) {
    console.warn("Express server-side endpoint failed or unavailable. Initiating client-side fallback...", error);
    
    try {
      const ai = await getClientAI();
      // Use the standard high-performance, non-deprecated gemini-3.5-flash model
      const modelName = "gemini-3.5-flash"; 
      
      const SYSTEM_INSTRUCTIONS: Record<string, string> = {
        MAPS: "You are the Tunisia archaeological and modern travel expert on Memoria. Suggest genuine historic, cultural, archaeological, culinary or beach tourist spots in Tunisia. Your responses should be informative, friendly, and tailored. When asked for locations, provide their approximate geographical locations and tell the user they can see them pinned on the map.",
        SEARCH: "You are the Tunisia event, tourist activities, and live cultural guide. Answer queries regarding tourist spots, culture, beach activities, festivals, and events in Tunisia. Add rich context regarding history, values, and travel advice.",
        CHAT: "You are Memoria's personal travel guide bot for Tunisia tourism. Engage in friendly conversation, help users explore their tourist preferences, suggest itineraries, and match profiles with Tunisia's rich heritage."
      };

      const systemInstruction = SYSTEM_INSTRUCTIONS[mode] || SYSTEM_INSTRUCTIONS["CHAT"];
      
      const contents = (history || [])
        .filter((m: any) => !m.isError)
        .map((m: any) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      contents.push({
        role: "user",
        parts: [{ text: prompt }],
      });

      const config: any = {
        systemInstruction,
      };

      if (mode === "MAPS") {
        config.tools = [{ googleMaps: {} }];
        if (location) {
          config.toolConfig = {
            retrievalConfig: {
              latLng: {
                latitude: Number(location.lat),
                longitude: Number(location.lng),
              },
            },
          };
        }
      } else if (mode === "SEARCH") {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config,
      });

      const responseText = response.text || "I couldn't generate a text response.";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const groundingMetadata: any = {};
      
      if (groundingChunks) {
        groundingMetadata.mapChunks = groundingChunks.filter((c: any) => c.maps);
        groundingMetadata.searchChunks = groundingChunks.filter((c: any) => c.web);
      }

      return {
        id: Date.now().toString(),
        role: "model",
        text: responseText,
        timestamp: new Date(),
        groundingMetadata,
      };
    } catch (fallbackError: any) {
      console.error("Both service and client fallback failed:", fallbackError);
      return {
        id: Date.now().toString(),
        role: "model",
        text: `Error: Both the secure server API and the client-side fallback failed to execute.\n\nServer Error: ${error.message}\n\nClient Error: ${fallbackError.message}`,
        timestamp: new Date(),
        isError: true,
      };
    }
  }
};
