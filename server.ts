import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initializer for GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// App generation prompt builder
const SYSTEM_INSTRUCTION = `You are an expert full-stack web developer and UI/UX designer. Your mission is to generate complete, single-file, production-ready, interactive, and stunning HTML5/CSS/JavaScript applications based on user prompts.

CRITICAL RULES FOR GENERATED CODE:
1. OUTPUT FORMAT:
   - Return ONLY the raw executable HTML code starting with <!DOCTYPE html> and ending with </html>.
   - Do NOT wrap in markdown codeblocks (no \`\`\`html or \`\`\`).
   - Do NOT include conversational text before or after the code.
2. LIBRARIES & STYLING:
   - Include Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
   - Configure Tailwind if needed with <script>tailwind.config = { darkMode: 'class', theme: { extend: { colors: { brand: '#4f46e5' } } } }</script>
   - Include Lucide Icons via CDN: <script src="https://unpkg.com/lucide@latest"></script> (Call lucide.createIcons() on DOMContentLoaded and after dynamic renders) or use clean SVG icons.
   - Include Chart.js (<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>) or Canvas if the app involves charts or visual analytics.
   - Include Canvas-confetti (<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>) for celebration effects when appropriate.
3. CODE QUALITY & COMPLETENESS:
   - Must be 100% self-contained and immediately functional without external backend servers.
   - Implement REAL interactive logic, state management, event listeners, calculations, and animations.
   - Persist state to \`localStorage\` where appropriate so user data isn't lost on refresh.
   - If audio/sound is requested or suitable for games/timers, use the Web Audio API (e.g. AudioContext synthesizers for bleeps, chimes, clicks) with zero external audio assets.
   - Make the UI responsive, modern, beautiful, and accessible with great typography, intuitive micro-interactions, empty states, and feedback toasts.
   - Include error handling so JavaScript exceptions don't break the app.
`;

// Helper to extract clean HTML from model output
function cleanModelOutput(rawText: string): string {
  let cleaned = rawText.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```html")) {
    cleaned = cleaned.replace(/^```html\s*/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

// POST /api/generate-app
app.post("/api/generate-app", async (req, res) => {
  const { prompt, options = {}, previousCode, editInstruction } = req.body;

  if (!prompt && !editInstruction) {
    return res.status(400).json({ error: "A prompt or edit instruction is required" });
  }

  const ai = getGeminiClient();

  if (!ai) {
    return res.status(503).json({
      error: "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment or Settings > Secrets.",
      isApiKeyMissing: true,
    });
  }

  try {
    let contents = "";
    if (previousCode && editInstruction) {
      contents = `Here is the current existing HTML application code:
---
${previousCode}
---

The user wants to modify and improve this application with the following instruction:
"${editInstruction}"

Please update the application code according to this instruction. Keep everything working, maintain or improve the design quality, and output the complete revised self-contained HTML file.`;
    } else {
      const { theme = "modern", features = [], complexity = "medium" } = options;
      contents = `Create a complete, fully functional, self-contained single-file HTML5 web application based on this prompt:
"${prompt}"

Specific requirements:
- Theme/Vibe: ${theme}
- Complexity: ${complexity}
${features.length > 0 ? `- Desired Features: ${features.join(", ")}` : ""}
- Make it interactive, responsive, polished, and delight the user with thoughtful UI details.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const outputText = response.text || "";
    const htmlCode = cleanModelOutput(outputText);

    if (!htmlCode.includes("<html") && !htmlCode.includes("<!DOCTYPE")) {
      throw new Error("The model output did not contain valid HTML");
    }

    res.json({
      html: htmlCode,
      model: "gemini-3.7-flash",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error generating app with Gemini:", error);
    res.status(500).json({
      error: error.message || "Failed to generate application",
      details: error.toString(),
    });
  }
});

// POST /api/suggest-prompts
app.post("/api/suggest-prompts", async (req, res) => {
  const { category, currentAppTitle } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // Return sensible fallback suggestions
    return res.json({
      suggestions: [
        "A Pomodoro Timer with ambient sound synthesizer and task statistics",
        "A 2D Retro Neon Asteroids Arcade Game with Web Audio SFX",
        "A Personal Finance & Wealth Compound Interest Calculator with interactive charts",
        "A Kanban Workflow Board with drag-and-drop, tags, and local storage export",
        "An Interactive Flashcard Study Tool with spaced repetition and score tracker",
      ],
    });
  }

  try {
    const promptText = currentAppTitle
      ? `Give 5 concise, high-value prompt suggestions to iterate or enhance this app: "${currentAppTitle}". Return as a JSON array of 5 strings.`
      : `Give 5 creative, highly functional web app ideas for category: "${category || "all"}". Return as a JSON array of 5 strings. Each prompt should be 1-2 sentences describing an engaging, interactive single-file web tool or game.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
      },
    });

    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(response.text || "[]");
      suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [];
    } catch {
      suggestions = [
        "A Pomodoro Timer with ambient sound synthesizer and task statistics",
        "A 2D Retro Neon Asteroids Arcade Game with Web Audio SFX",
        "A Personal Finance Calculator with interactive charts",
        "A Kanban Workflow Board with local storage export",
      ];
    }

    res.json({ suggestions });
  } catch (error: any) {
    console.error("Error generating suggestions:", error);
    res.json({
      suggestions: [
        "Add a dark/light mode toggle and theme selector",
        "Add sound effects using Web Audio API for user interactions",
        "Add export to JSON and CSV data persistence",
        "Add animated celebration effects and interactive charts",
      ],
    });
  }
});

// POST /api/explain-app
app.post("/api/explain-app", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      summary: "This is a self-contained HTML5 web application with embedded CSS and JavaScript.",
      features: ["Client-side interactivity", "Responsive styling", "State management"],
      techStack: ["HTML5", "CSS3 / Tailwind", "Vanilla JavaScript", "Web APIs"],
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Analyze this HTML/JS application code and provide a clean architectural summary:
---
${code.slice(0, 8000)}
---

Provide a JSON object with:
1. "summary": 2-3 sentence overview of what the app does.
2. "features": array of 4-6 key features implemented in the code.
3. "architecture": 2 sentences explaining state management and DOM handling.
4. "techStack": array of libraries/APIs used.`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const explanation = JSON.parse(response.text || "{}");
    res.json(explanation);
  } catch (error: any) {
    console.error("Error explaining code:", error);
    res.json({
      summary: "Single-file interactive web application with dynamic state management.",
      features: ["Interactive UI elements", "Event-driven architecture", "Responsive layout"],
      architecture: "Uses native DOM manipulation and browser APIs for reactive updates.",
      techStack: ["HTML5", "Tailwind CSS", "JavaScript ES6+"],
    });
  }
});

// Start Server and mount Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Prompt to App Studio server running on http://localhost:${PORT}`);
  });
}

startServer();
