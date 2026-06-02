import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers
  app.use(express.json());

  // Initialize server-side Gemini client
  let genAI: any = null;
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (apiKey) {
    try {
      genAI = new GoogleGenAI({ apiKey });
      console.log("Server-side Gemini client initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize server-side Gemini client:", e);
    }
  } else {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not defined on the server!");
  }

  // API router for Gemini content generation to protect key from browser clients
  app.post("/api/gemini", async (req, res) => {
    const { prompt, mode, history, location } = req.body;

    if (!genAI) {
      // Re-evaluate key dynamically in case it got provisioned after launch
      const dynamicKey = process.env.GEMINI_API_KEY || '';
      if (dynamicKey) {
        genAI = new GoogleGenAI({ apiKey: dynamicKey });
      } else {
        return res.status(500).json({
          id: Date.now().toString(),
          role: "model",
          text: "Error: GEMINI_API_KEY is not configured on the host server. Please provide it in the secrets settings panel.",
          timestamp: new Date(),
          isError: true
        });
      }
    }

    let modelName = "gemini-3.5-flash";
    const tools: any[] = [];
    const toolConfig: any = {};

    // System instructions based on travel chatbot modes in Tunisia context
    const SYSTEM_INSTRUCTIONS: Record<string, string> = {
      MAPS: "You are the Tunisia archaeological and modern travel expert on Memoria. Suggest genuine historic, cultural, archaeological, culinary or beach tourist spots in Tunisia. Your responses should be informative, friendly, and tailored. When asked for locations, provide their approximate geographical locations and tell the user they can see them pinned on the map.",
      SEARCH: "You are the Tunisia event, tourist activities, and live cultural guide. Answer queries regarding tourist spots, culture, beach activities, festivals, and events in Tunisia. Add rich context regarding history, values, and travel advice.",
      CHAT: "You are Memoria's personal travel guide bot for Tunisia tourism. Engage in friendly conversation, help users explore their tourist preferences, suggest itineraries, and match profiles with Tunisia's rich heritage."
    };

    // Configure specific tools
    switch (mode) {
      case "MAPS":
        modelName = "gemini-3.5-flash"; // Standard non-deprecated model with Maps grounding support
        tools.push({ googleMaps: {} });
        if (location) {
          toolConfig.retrievalConfig = {
            latLng: {
              latitude: Number(location.lat),
              longitude: Number(location.lng),
            },
          };
        }
        break;
      case "SEARCH":
        modelName = "gemini-3.5-flash"; // Standard non-deprecated model with Search grounding support
        tools.push({ googleSearch: {} });
        break;
      case "CHAT":
      default:
        modelName = "gemini-3.5-flash"; // Standard non-deprecated text model
        break;
    }

    try {
      const config: any = {
        systemInstruction: SYSTEM_INSTRUCTIONS[mode] || SYSTEM_INSTRUCTIONS["CHAT"],
      };

      if (tools.length > 0) {
        config.tools = tools;
      }

      if (Object.keys(toolConfig).length > 0) {
        config.toolConfig = toolConfig;
      }

      const contents = (history || [])
        .filter((m: any) => !m.isError)
        .map((m: any) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      // Add user current message
      contents.push({
        role: "user",
        parts: [{ text: prompt }],
      });

      const response = await genAI.models.generateContent({
        model: modelName,
        contents: contents,
        config: config,
      });

      const responseText = response.text || "I couldn't generate a text response.";
      
      // Grounding metadata mapping
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const groundingMetadata: any = {};
      
      if (groundingChunks) {
        groundingMetadata.mapChunks = groundingChunks
          .filter((c: any) => c.maps)
          .map((c: any) => c);
          
        groundingMetadata.searchChunks = groundingChunks
          .filter((c: any) => c.web)
          .map((c: any) => c);
      }

      return res.json({
        id: Date.now().toString(),
        role: "model",
        text: responseText,
        timestamp: new Date(),
        groundingMetadata,
      });

    } catch (error: any) {
      console.error("Server-side Gemini Error:", error);
      return res.status(500).json({
        id: Date.now().toString(),
        role: "model",
        text: `Server Error: ${error.message || "Unable to retrieve chatbot response from model."}`,
        timestamp: new Date(),
        isError: true,
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  // Hot Module Dev / Prod static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Listen on 0.0.0.0:3000 (standard ingress binding)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
