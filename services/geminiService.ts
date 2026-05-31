import { AppMode, Coordinates, ChatMessage } from "../types";

export const initializeGenAI = (apiKey: string) => {
  // Server-side handles execution, no-op on the browser side to prevent key usage leakage
  console.log("Client-side initialized proxy mode successfully.");
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.text || "Failed to retrieve response from server-side Gemini server.");
    }

    const data = await response.json();
    return {
      id: data.id || Date.now().toString(),
      role: data.role || "model",
      text: data.text || "I couldn't generate a text response.",
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      groundingMetadata: data.groundingMetadata,
      isError: data.isError,
    };
  } catch (error: any) {
    console.error("Gemini Proxy API Error:", error);
    return {
      id: Date.now().toString(),
      role: "model",
      text: `Error: ${error.message || "Failed to connect to full-stack service."}`,
      timestamp: new Date(),
      isError: true,
    };
  }
};
