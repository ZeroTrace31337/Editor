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

// ==========================================
// CINEFLOW VIDEO EDITOR AI SERVICES
// ==========================================

// POST /api/ai/text-writing
app.post("/api/ai/text-writing", async (req, res) => {
  const { instruction, style = "cinematic", tone = "epic", context = "" } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      title: instruction ? instruction.toUpperCase() : "CINEMATIC MASTERPIECE",
      variations: [
        "UNLEASH THE NEXT CHAPTER",
        "WHERE VISIONS BECOME REALITY",
        "THE DEFINITIVE EXPERIENCE",
      ],
      suggestedStyle: {
        fontFamily: "Cinzel, serif",
        fontSize: 56,
        textColor: "#fef08a",
        strokeColor: "#000000",
        strokeWidth: 3,
        shadowColor: "rgba(0,0,0,0.9)",
        shadowBlur: 14,
        animation: "fade",
      },
    });
  }

  try {
    const prompt = `You are a professional video editor copywriter and typography director.
Instruction from editor: "${instruction || "Create a powerful video title and subtitle hook"}"
Style: ${style}, Tone: ${tone}, Video Context: "${context}"

Return a JSON object with:
{
  "title": "Primary high-impact title text (short, punchy)",
  "subtitle": "Secondary subtitle or lower third line",
  "variations": ["Alternative title 1", "Alternative title 2", "Alternative title 3"],
  "suggestedStyle": {
    "fontFamily": "Inter, sans-serif | Montserrat, sans-serif | Cinzel, serif | Bebas Neue, sans-serif | Oswald, sans-serif | Playfair Display, serif",
    "fontSize": number (between 36 and 72),
    "textColor": "hex color e.g. #ffffff or #fef08a or #22d3ee or #facc15",
    "strokeColor": "hex color e.g. #000000 or #ec4899",
    "strokeWidth": number (0 to 6),
    "shadowColor": "rgba string",
    "shadowBlur": number (4 to 20),
    "animation": "fade | slide-up | pop | bounce | typewriter | glitch | word-reveal"
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Text Writing error:", error);
    res.status(500).json({ error: error.message || "Failed to generate text" });
  }
});

// POST /api/ai/smart-text-style
app.post("/api/ai/smart-text-style", async (req, res) => {
  const { text, mood = "modern" } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      fontFamily: "Montserrat, sans-serif",
      fontSize: 52,
      textColor: "#38bdf8",
      gradientType: "linear",
      gradientColors: ["#38bdf8", "#818cf8"],
      strokeColor: "#0f172a",
      strokeWidth: 4,
      shadowColor: "rgba(0,0,0,0.85)",
      shadowBlur: 12,
      animation: "pop",
    });
  }

  try {
    const prompt = `Analyze this video text: "${text}" with desired mood "${mood}".
Recommend the ideal visual styling parameters for a top-tier video editor.
Return JSON:
{
  "fontFamily": "Inter, sans-serif | Montserrat, sans-serif | Cinzel, serif | Bebas Neue, sans-serif | Oswald, sans-serif | Playfair Display, serif | Pacifico, cursive",
  "fontSize": number (32 to 72),
  "fontWeight": "600 | 700 | 800",
  "textColor": "hex color",
  "gradientType": "none | linear | radial",
  "gradientColors": ["#hex1", "#hex2"],
  "strokeColor": "hex color",
  "strokeWidth": number (0 to 8),
  "shadowColor": "rgba color",
  "shadowBlur": number,
  "glowColor": "rgba color",
  "glowIntensity": number (0 to 1),
  "backgroundColor": "transparent or rgba",
  "alignment": "center | left | right",
  "animation": "fade | slide-up | pop | bounce | typewriter | glitch | word-reveal"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Smart text style error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/auto-captions
app.post("/api/ai/auto-captions", async (req, res) => {
  const { audioContext = "video speech", style = "social" } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      captions: [
        {
          id: "cap_1",
          startSec: 0.5,
          durationSec: 2.5,
          text: "Welcome back to the ultimate video editing masterclass!",
          speaker: "Speaker 1",
          words: [
            { word: "Welcome", start: 0.5, end: 0.9, isKeyword: false },
            { word: "back", start: 0.9, end: 1.2, isKeyword: false },
            { word: "to", start: 1.2, end: 1.4, isKeyword: false },
            { word: "the", start: 1.4, end: 1.6, isKeyword: false },
            { word: "ultimate", start: 1.6, end: 2.1, isKeyword: true },
            { word: "masterclass!", start: 2.1, end: 3.0, isKeyword: true },
          ],
        },
        {
          id: "cap_2",
          startSec: 3.2,
          durationSec: 2.8,
          text: "Today we are crafting mind-blowing cinematic transitions.",
          speaker: "Speaker 1",
          words: [
            { word: "Today", start: 3.2, end: 3.6, isKeyword: false },
            { word: "we", start: 3.6, end: 3.8, isKeyword: false },
            { word: "are", start: 3.8, end: 4.0, isKeyword: false },
            { word: "crafting", start: 4.0, end: 4.5, isKeyword: true },
            { word: "cinematic", start: 4.5, end: 5.2, isKeyword: true },
            { word: "transitions.", start: 5.2, end: 6.0, isKeyword: true },
          ],
        },
      ],
    });
  }

  try {
    const prompt = `Generate realistic synchronized video subtitles and captions for a modern video production.
Context: "${audioContext}", Style: "${style}"
Return a JSON array of caption blocks with realistic speech timing (startSec, durationSec), clean punctuation, speaker detection, and word-level timing breakdown highlighting key impactful words.
Schema:
{
  "captions": [
    {
      "id": "string",
      "startSec": number,
      "durationSec": number,
      "text": "string",
      "speaker": "Speaker 1",
      "words": [
        { "word": "string", "start": number, "end": number, "isKeyword": boolean }
      ]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Auto captions error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/cleanup-captions
app.post("/api/ai/cleanup-captions", async (req, res) => {
  const { captions = [] } = req.body;
  const ai = getGeminiClient();

  if (!ai || captions.length === 0) {
    const cleaned = captions.map((c: any) => ({
      ...c,
      text: c.text
        .replace(/\b(um|uh|like|you know|sort of|basically)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim(),
    }));
    return res.json({ captions: cleaned });
  }

  try {
    const prompt = `Clean and enhance these video captions by removing filler words ('um', 'uh', 'you know', stuttered repeats), fixing capitalization, grammar, and punctuation while preserving word timing structure:
${JSON.stringify(captions)}

Return cleaned JSON with the same structure: { "captions": [...] }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    res.json({ captions });
  }
});

// POST /api/ai/translate-captions
app.post("/api/ai/translate-captions", async (req, res) => {
  const { captions = [], targetLanguage = "Spanish" } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      captions: captions.map((c: any) => ({
        ...c,
        text: `[${targetLanguage}] ${c.text}`,
      })),
    });
  }

  try {
    const prompt = `Translate the following video subtitle captions into ${targetLanguage}. Maintain the exact timestamp IDs and durations:
${JSON.stringify(captions)}

Return JSON: { "captions": [...] }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    res.json({ captions });
  }
});

// POST /api/ai/smart-filter
app.post("/api/ai/smart-filter", async (req, res) => {
  const { sceneDescription = "cinematic outdoor scene", desiredVibe = "warm blockbuster" } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      filterName: "Golden Blockbuster",
      description: "Warm golden sunlight with deep teal shadows and rich contrast",
      colorGrade: {
        exposure: 0.15,
        contrast: 1.25,
        saturation: 1.2,
        temperature: 25,
        tint: 10,
        highlights: -15,
        shadows: 10,
        whites: 5,
        blacks: -10,
        clarity: 15,
        sharpen: 20,
        vignette: 0.25,
      },
    });
  }

  try {
    const prompt = `You are a Hollywood colorist. Recommend optimal color grade and filter parameters for scene: "${sceneDescription}", vibe: "${desiredVibe}".
Return JSON:
{
  "filterName": "string",
  "description": "string",
  "colorGrade": {
    "exposure": number (-2 to 2),
    "contrast": number (0.8 to 1.6),
    "saturation": number (0.5 to 1.6),
    "vibrance": number (-50 to 50),
    "temperature": number (-50 to 50),
    "tint": number (-50 to 50),
    "highlights": number (-50 to 50),
    "shadows": number (-50 to 50),
    "whites": number (-50 to 50),
    "blacks": number (-50 to 50),
    "clarity": number (0 to 50),
    "sharpen": number (0 to 50),
    "noiseReduction": number (0 to 50),
    "vignette": number (0 to 0.6),
    "grain": number (0 to 40)
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/auto-adjust
app.post("/api/ai/auto-adjust", async (req, res) => {
  const { currentGrade = {}, sceneType = "general" } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      enhancedGrade: {
        ...currentGrade,
        exposure: 0.1,
        contrast: 1.15,
        saturation: 1.1,
        vibrance: 12,
        highlights: -10,
        shadows: 15,
        whites: 5,
        blacks: -8,
        clarity: 10,
        sharpen: 15,
      },
    });
  }

  try {
    const prompt = `Perform automated 1-click professional image balance for scene type: "${sceneType}".
Balance white point, black point, contrast recovery, highlight protection, and shadow lift.
Return JSON:
{
  "enhancedGrade": {
    "exposure": number,
    "contrast": number,
    "saturation": number,
    "vibrance": number,
    "temperature": number,
    "tint": number,
    "highlights": number,
    "shadows": number,
    "whites": number,
    "blacks": number,
    "clarity": number,
    "sharpen": number
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    console.log(`CineFlow Studio server running on http://localhost:${PORT}`);
  });
}

startServer();
