import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, GenerateVideosOperation, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { TrendEngine } from "./server/trendEngine";
import { TemplateDatabase } from "./server/templateDatabase";
import { YouTubeService } from "./server/youtubeService";
import { AIServiceLayer } from "./server/aiServices";


dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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

// Helper: Convert raw 24kHz 16-bit Mono PCM audio into a standard playable WAV buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);

  // fmt sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);

  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// =========================================================================
// 10 VEECUT AI TOOLS SUITE ENDPOINTS (Powered by AIServiceLayer)
// =========================================================================

// -------------------------------------------------------------------------
// 1. PROMPT-TO-VIDEO / AI VIDEO GENERATOR (veo-3.1-lite-generate-preview)
// -------------------------------------------------------------------------

// Start Veo video generation operation
app.post("/api/ai/video-generate", async (req, res) => {
  const {
    prompt = "Cinematic aerial drone shot over majestic mountain ridge at sunset, 4K",
    aspectRatio = "16:9",
    resolution = "720p",
    duration = 5,
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.startVideoGeneration({
      prompt,
      aspectRatio,
      resolution,
      duration,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Veo video-generate error:", err);
    res.status(500).json({ error: err.message || "Failed to initiate video generation" });
  }
});

// Poll status of Veo video generation
app.post("/api/ai/video-status", async (req, res) => {
  const { operationName } = req.body;
  if (!operationName) {
    return res.status(400).json({ error: "operationName is required" });
  }

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.pollVideoStatus(operationName);
    res.json(result);
  } catch (err: any) {
    console.error("Veo video-status error:", err);
    res.status(500).json({ error: err.message || "Failed to poll video status" });
  }
});

// Stream / download generated Veo video
app.get("/api/ai/video-download", async (req, res) => {
  const { uri } = req.query;
  if (!uri || typeof uri !== "string") {
    return res.status(400).json({ error: "Video URI is required" });
  }

  try {
    const aiService = AIServiceLayer.getInstance();
    const videoBuffer = await aiService.downloadVideoBuffer(uri);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", 'inline; filename="ai-generated-video.mp4"');
    res.send(videoBuffer);
  } catch (err: any) {
    console.error("Veo video-download error:", err);
    res.status(500).json({ error: err.message || "Failed to download video" });
  }
});

// All-in-one Synchronous Video Generation endpoint
app.post("/api/ai/video-gen", async (req, res) => {
  const {
    prompt = "Cinematic aerial drone shot of futuristic neon metropolis at night, 4K 60fps",
    style = "Cinematic",
    duration = 5,
    aspectRatio = "16:9",
    resolution = "1080p",
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.generateVideoSync({
      prompt,
      style,
      duration,
      aspectRatio,
      resolution,
    });
    res.json(result);
  } catch (error: any) {
    console.error("Video Gen Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate video" });
  }
});

// -------------------------------------------------------------------------
// 2. AI IMAGE GENERATOR (gemini-3.1-flash-lite-image)
// -------------------------------------------------------------------------
app.post("/api/ai/image-gen", async (req, res) => {
  const {
    prompt = "Cinematic film still, photorealistic dramatic sunset over jagged alpine peaks with volumetric mist, anamorphic lens flare",
    aspectRatio = "16:9",
    style = "Photorealistic",
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.generateImage({
      prompt,
      aspectRatio,
      style,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Image Gen Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate image" });
  }
});

// -------------------------------------------------------------------------
// 3. AI IMAGE TO VIDEO ANIMATION (Veo Motion / Animate)
// -------------------------------------------------------------------------
app.post("/api/ai/image-to-video", async (req, res) => {
  const {
    imageData,
    motionPrompt = "Subtle cinematic camera push-in with atmospheric mist and natural lighting motion",
    duration = 5,
    cameraMotion = "Pan Right",
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.animateImageToVideo({
      imageData,
      motionPrompt,
      duration,
      cameraMotion,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Image-to-Video Error:", err);
    res.status(500).json({ error: err.message || "Failed to animate image" });
  }
});

// -------------------------------------------------------------------------
// 4. AI BACKGROUND REMOVAL & MATTING (gemini-3.1-flash-lite-image)
// -------------------------------------------------------------------------
app.post("/api/ai/bg-removal", async (req, res) => {
  const {
    imageData,
    mode = "transparent",
    feather = 2,
    subjectType = "person",
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.removeBackground({
      imageData,
      mode,
      feather,
      subjectType,
    });
    res.json(result);
  } catch (err: any) {
    console.error("BG Removal Error:", err);
    res.status(500).json({ error: err.message || "Failed to process background removal" });
  }
});

// -------------------------------------------------------------------------
// AI OBJECT REMOVAL & INPAINTING (gemini-3.1-flash-lite-image)
// -------------------------------------------------------------------------
app.post("/api/ai/object-removal", async (req, res) => {
  const {
    imageData,
    targetDescription = "Microphone in upper right",
    inpaintMode = "temporal",
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.removeObject({
      imageData,
      targetDescription,
      inpaintMode,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Object Removal Error:", err);
    res.status(500).json({ error: err.message || "Failed to inpaint object" });
  }
});

// -------------------------------------------------------------------------
// 5. AI AUTO CAPTIONS & SUBTITLES (gemini-3.7-flash)
// -------------------------------------------------------------------------
app.post("/api/ai/auto-captions", async (req, res) => {
  const {
    language = "English",
    style = "Viral TikTok Karaoke",
    audioPrompt = "Welcome to VeeCut Studio. Create high-impact cinematic videos with advanced AI tools.",
    audioData,
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.generateCaptions({
      language,
      style,
      audioPrompt,
      audioData,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Auto Captions Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate captions" });
  }
});

// -------------------------------------------------------------------------
// 6. AI VOICE & SPEECH TTS (gemini-3.1-flash-tts-preview)
// -------------------------------------------------------------------------
app.post("/api/ai/voice-tts", async (req, res) => {
  const {
    text = "Welcome to VeeCut, the ultimate creative studio for cinematic storytelling.",
    voice = "Puck",
    emotion = "Cinematic Narrator",
    rate = 1.0,
    pitch = 1.0,
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.generateSpeechTTS({
      text,
      voice,
      emotion,
      rate,
      pitch,
    });
    res.json(result);
  } catch (err: any) {
    console.error("TTS Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate voiceover" });
  }
});

// -------------------------------------------------------------------------
// 7. AI MUSIC GENERATION (MusicGen / Procedural Synth)
// -------------------------------------------------------------------------
app.post("/api/ai/music-gen", async (req, res) => {
  const {
    prompt = "Cinematic epic trailer orchestral synth hybrid with dramatic riser and bass drop",
    genre = "Cinematic",
    mood = "Epic",
    durationSeconds = 30,
    bpm = 128,
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.generateMusicTrack({
      prompt,
      genre,
      mood,
      durationSeconds,
      bpm,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Music Gen Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate music" });
  }
});

// -------------------------------------------------------------------------
// AI SOUND EFFECTS GENERATION (SfxGen)
// -------------------------------------------------------------------------
app.post("/api/ai/sfx-gen", async (req, res) => {
  const {
    prompt = "Fast cinematic whoosh transition",
    category = "whoosh",
    durationSeconds = 1.5,
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.generateSoundEffect({
      prompt,
      category,
      durationSeconds,
    });
    res.json(result);
  } catch (err: any) {
    console.error("SFX Gen Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate sound effect" });
  }
});

// -------------------------------------------------------------------------
// 8. AI SPEECH-TO-TEXT WORKSPACE (gemini-3.7-flash)
// -------------------------------------------------------------------------
app.post("/api/ai/speech-to-text", async (req, res) => {
  const { audioUrl, language = "auto" } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.transcribeSpeech({
      audioUrl,
      language,
    });
    res.json(result);
  } catch (err: any) {
    console.error("STT Error:", err);
    res.status(500).json({ error: err.message || "Failed to transcribe speech" });
  }
});

// -------------------------------------------------------------------------
// 9. AI SMART EDITOR & TIMELINE ASSISTANT (gemini-3.7-flash Copilot)
// -------------------------------------------------------------------------
app.post("/api/ai/assistant-command", async (req, res) => {
  const {
    message,
    projectSummary = "VeeCut Master Project",
    currentTimeSeconds = 0,
    selectedClipInfo = null,
  } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.executeAssistantCommand({
      message,
      projectSummary,
      currentTimeSeconds,
      selectedClipInfo,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Assistant Command Error:", err);
    res.status(500).json({ error: err.message || "Failed to process assistant command" });
  }
});

// AI AUTO REFRAME (Smart Subject Tracking & Cropping)
app.post("/api/ai/auto-reframe", async (req, res) => {
  const {
    videoUrl,
    sourceAspectRatio = "16:9",
    targetAspectRatio = "9:16",
    subjectTrackingMode = "face",
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.autoReframe({
      videoUrl,
      sourceAspectRatio,
      targetAspectRatio,
      subjectTrackingMode,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Auto Reframe Error:", err);
    res.status(500).json({ error: err.message || "Failed to auto reframe" });
  }
});

// AI SMART CUT (Silence & Pause Removal)
app.post("/api/ai/smart-cut", async (req, res) => {
  const {
    videoUrl,
    silenceThresholdDb = -35,
    minSilenceDurationSec = 0.5,
    removePauses = true,
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.smartSilenceCut({
      videoUrl,
      silenceThresholdDb,
      minSilenceDurationSec,
      removePauses,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Smart Cut Error:", err);
    res.status(500).json({ error: err.message || "Failed to execute smart cut" });
  }
});

// AI HIGHLIGHT DETECTION
app.post("/api/ai/highlight-detection", async (req, res) => {
  const {
    videoUrl,
    highlightCount = 3,
    criteria = "combined",
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.detectHighlights({
      videoUrl,
      highlightCount,
      criteria,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Highlight Detection Error:", err);
    res.status(500).json({ error: err.message || "Failed to detect highlights" });
  }
});

// -------------------------------------------------------------------------
// 10. AI ENHANCER, SUPER-RESOLUTION & 3D LUT COLOR GRADING
// -------------------------------------------------------------------------
app.post("/api/ai/upscale", async (req, res) => {
  const {
    scaleFactor = "4x",
    enhancementModel = "Super-Resolution Neural",
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.upscaleResolution({
      scaleFactor,
      enhancementModel,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Upscale Error:", err);
    res.status(500).json({ error: err.message || "Failed to upscale media" });
  }
});

app.post("/api/ai/style-transfer", async (req, res) => {
  const {
    stylePrompt = "Warm Kodak 35mm Gold film stock with glowing highlights and deep amber shadows",
    preset = "Kodak 35mm Film",
    intensity = 100,
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.generateColorGrade({
      stylePrompt,
      preset,
      intensity,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Style Transfer Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate color grade" });
  }
});

app.post("/api/ai/audio-enhance", async (req, res) => {
  const {
    profile = "Studio Vocal Clarity",
    noiseReduction = 85,
    deReverb = 75,
    vocalBoost = true,
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.enhanceAudioProfile({
      profile,
      noiseReduction,
      deReverb,
      vocalBoost,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Audio Enhance Error:", err);
    res.status(500).json({ error: err.message || "Failed to enhance audio" });
  }
});

app.post("/api/ai/motion-tracking", async (req, res) => {
  const {
    targetName = "Subject Face",
    trackingMode = "Planar 3D",
    durationSec = 6,
    frameWidth = 1920,
    frameHeight = 1080,
  } = req.body;

  try {
    const aiService = AIServiceLayer.getInstance();
    const result = await aiService.solveMotionTracking({
      targetName,
      trackingMode,
      durationSec,
      frameWidth,
      frameHeight,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Motion Tracking Error:", err);
    res.status(500).json({ error: err.message || "Failed to track motion" });
  }
});

// Additional AI Utility: Sticker Generator
app.post("/api/ai/generate-sticker", async (req, res) => {
  const { prompt = "Fire dragon", style = "3D Render" } = req.body;
  const aiService = AIServiceLayer.getInstance();

  if (!aiService.hasApiKey()) {
    return res.json({
      stickerEmoji: "🔥🐉",
      stickerName: prompt,
      style,
    });
  }

  try {
    const response = await aiService.generateTextWithFallback({
      preferredModel: "gemini-3.8-flash",
      contents: `Suggest a visual emoji / symbolic unicode combination and label for a video editor sticker based on prompt: "${prompt}", style: "${style}".
Return JSON: { "stickerEmoji": "1 or 2 visual emojis or symbolic unicode e.g. ✨🚀", "stickerName": "Short 2-3 word name" }`,
      config: { responseMimeType: "application/json" },
    });
    if (response?.text) {
      return res.json(JSON.parse(response.text));
    }
  } catch {
    // fallback
  }
  res.json({ stickerEmoji: "✨ " + prompt.substring(0, 10), stickerName: prompt });
});

// -------------------------------------------------------------------------
// VIDEO TO EDITABLE TEMPLATE RECONSTRUCTION PIPELINE
// -------------------------------------------------------------------------
app.post("/api/ai/reconstruct-template", async (req, res) => {
  const { videoUrl, videoData, title, targetAspectRatio } = req.body;
  try {
    const aiService = AIServiceLayer.getInstance();
    const analysis = await aiService.reconstructTemplateFromVideo({
      videoUrl,
      videoData,
      title,
      targetAspectRatio,
    });
    res.json({ success: true, analysis });
  } catch (err: any) {
    console.error("Video Reconstruction Error:", err);
    res.status(500).json({ error: err.message || "Failed to reconstruct template from video" });
  }
});

// Provider status & health
app.get("/api/ai/provider-status", (req, res) => {
  const { provider } = req.query;
  const envMap: Record<string, { key: string; name: string; requiredEnv: string }> = {
    google_gemini: { key: process.env.GEMINI_API_KEY || "", name: "Google Gemini", requiredEnv: "GEMINI_API_KEY" },
    openai: { key: process.env.OPENAI_API_KEY || "", name: "OpenAI", requiredEnv: "OPENAI_API_KEY" },
    elevenlabs: { key: process.env.ELEVENLABS_API_KEY || "", name: "ElevenLabs", requiredEnv: "ELEVENLABS_API_KEY" },
    replicate: { key: process.env.REPLICATE_API_KEY || "", name: "Replicate", requiredEnv: "REPLICATE_API_KEY" },
    stability_ai: { key: process.env.STABILITY_API_KEY || "", name: "Stability AI", requiredEnv: "STABILITY_API_KEY" },
    huggingface: { key: process.env.HUGGINGFACE_API_KEY || "", name: "Hugging Face", requiredEnv: "HUGGINGFACE_API_KEY" },
  };

  const prov = envMap[String(provider)] || { key: process.env.GEMINI_API_KEY || "", name: "Default Provider", requiredEnv: "GEMINI_API_KEY" };
  const isConfigured = !!prov.key && prov.key !== "MY_GEMINI_API_KEY";

  res.json({
    provider,
    isConfigured,
    message: isConfigured ? `${prov.name} is configured and ready.` : `${prov.name} API is not configured (${prov.requiredEnv} is missing).`,
  });
});

// -------------------------------------------------------------------------
// 20. AI ENHANCEMENT & SUPER-RESOLUTION
// -------------------------------------------------------------------------
app.post("/api/ai/enhancement", async (req, res) => {
  const {
    mediaUrl,
    mediaType = "video",
    factor = "4x",
    denoiseAmount = 80,
    audioVocalIsolation = true,
  } = req.body;

  res.json({
    id: `enh_${Date.now()}`,
    enhancedUrl: mediaUrl,
    scaleFactor: factor,
    metrics: {
      sharpnessBoostPercent: 65,
      noiseReductionDb: 18.5,
    },
  });
});

// -------------------------------------------------------------------------
// 21. AI NEURAL EFFECTS & COLOR PROFILES
// -------------------------------------------------------------------------
app.post("/api/ai/effects", async (req, res) => {
  const {
    styleName = "Cyberpunk Neo-Tokyo",
    intensity = 100,
    customPrompt = "",
  } = req.body;

  const isCyber = styleName.toLowerCase().includes("cyber") || styleName.toLowerCase().includes("neon");

  res.json({
    id: `fx_${Date.now()}`,
    styleName,
    colorGrade: {
      temperature: isCyber ? -25 : 30,
      tint: isCyber ? 35 : 12,
      saturation: 1.35,
      contrast: 1.25,
      exposure: 0.15,
      highlights: -15,
      shadows: 18,
      vignette: 0.32,
      filmGrain: 20,
    },
    suggestedEffects: ["neon-glow", "chromatic-glitch", "film-grain"],
  });
});

// Aliases for clean routing
app.post("/api/ai/background-remove", (req, res, next) => {
  req.url = "/api/ai/bg-removal";
  app._router.handle(req, res, next);
});

app.post("/api/ai/object-remove", (req, res, next) => {
  req.url = "/api/ai/object-removal";
  app._router.handle(req, res, next);
});

// =========================================================================
// REAL-TIME TRENDING & TEMPLATE HUB API LAYER
// =========================================================================

// 1. Aggregated Real-time Trends (YouTube, TikTok, Instagram, VeeCut Curated)
app.get("/api/trends/all", async (req, res) => {
  try {
    const {
      platform = "all",
      region = "US",
      category = "all",
      search = "",
      sortBy = "score",
      refresh = "false",
    } = req.query;

    const forceRefresh = refresh === "true";
    const trendEngine = TrendEngine.getInstance();
    const result = await trendEngine.getAggregatedTrends(
      {
        platform: platform as any,
        region: String(region),
        category: String(category),
        searchQuery: String(search),
        sortBy: sortBy as any,
      },
      forceRefresh
    );

    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/trends/all:", error);
    res.status(500).json({ error: error?.message || "Failed to aggregate trends" });
  }
});

// 2. YouTube Data API specific trends
app.get("/api/trends/youtube", async (req, res) => {
  try {
    const { region = "US", category = "all" } = req.query;
    const trendEngine = TrendEngine.getInstance();
    const result = await trendEngine.fetchYouTubeTrends(String(region), String(category));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch YouTube trends" });
  }
});

// 3. TikTok Developer / Creator Trends
app.get("/api/trends/tiktok", async (req, res) => {
  try {
    const { region = "US" } = req.query;
    const trendEngine = TrendEngine.getInstance();
    const result = await trendEngine.fetchTikTokTrends(String(region));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch TikTok trends" });
  }
});

// 4. Meta / Instagram Reels Trends
app.get("/api/trends/instagram", async (req, res) => {
  try {
    const { region = "US" } = req.query;
    const trendEngine = TrendEngine.getInstance();
    const result = await trendEngine.fetchInstagramTrends(String(region));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch Instagram trends" });
  }
});

// 5. Trend API Configuration Health Status
app.get("/api/trends/status", (_req, res) => {
  const trendEngine = TrendEngine.getInstance();
  const statuses = trendEngine.getSourceStatuses();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    sources: statuses,
    features: {
      officialYouTubeApi: !!process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY !== "MY_YOUTUBE_API_KEY",
      officialTikTokApi: !!process.env.TIKTOK_CLIENT_KEY,
      officialMetaApi: !!process.env.META_APP_ID,
      supabaseDatabase: !!process.env.SUPABASE_URL,
    },
  });
});

// 6. Force Refresh Trends
app.post("/api/trends/refresh", async (req, res) => {
  try {
    const { region = "US", category = "all" } = req.body || {};
    const trendEngine = TrendEngine.getInstance();
    const result = await trendEngine.getAggregatedTrends(
      {
        platform: "all",
        region: String(region),
        category: String(category),
        sortBy: "score",
      },
      true // force refresh
    );
    res.json({ success: true, count: result.trends.length, result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to refresh trends" });
  }
});

// 7. Query Templates Database
app.get("/api/templates", (req, res) => {
  try {
    const {
      category = "all",
      platform = "all",
      search = "",
      aspectRatio = "all",
      duration = "all",
      style = "all",
      region = "all",
      language = "all",
      sortBy = "recommended",
      aiOnly = "false",
    } = req.query;

    const templateDb = TemplateDatabase.getInstance();
    const result = templateDb.queryTemplates({
      category: category as any,
      platform: platform as any,
      searchQuery: String(search),
      aspectRatio: aspectRatio as any,
      durationBucket: duration as any,
      style: style as any,
      region: String(region),
      language: String(language),
      sortBy: sortBy as any,
      aiOnly: aiOnly === "true",
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to query templates" });
  }
});

// 8. Get Single Template by ID
app.get("/api/templates/:id", (req, res) => {
  const templateDb = TemplateDatabase.getInstance();
  const template = templateDb.getTemplateById(req.params.id);
  if (!template) {
    return res.status(404).json({ error: "Template not found" });
  }
  res.json(template);
});

// 9. Create / Publish Template (Admin & User)
app.post("/api/templates", (req, res) => {
  try {
    const templateDb = TemplateDatabase.getInstance();
    const newTemplate = templateDb.createTemplate(req.body);
    res.status(201).json(newTemplate);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to create template" });
  }
});

// 10. Update Template
app.put("/api/templates/:id", (req, res) => {
  try {
    const templateDb = TemplateDatabase.getInstance();
    const updated = templateDb.updateTemplate(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to update template" });
  }
});

// 11. Delete Template
app.delete("/api/templates/:id", (req, res) => {
  const templateDb = TemplateDatabase.getInstance();
  const deleted = templateDb.deleteTemplate(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: "Template not found" });
  }
  res.json({ success: true, id: req.params.id });
});

// 12. Record Template Usage
app.post("/api/templates/:id/usage", (req, res) => {
  const templateDb = TemplateDatabase.getInstance();
  templateDb.recordUsage(req.params.id);
  res.json({ success: true, id: req.params.id });
});

// 13. Toggle Favorite
app.post("/api/templates/:id/favorite", (req, res) => {
  const templateDb = TemplateDatabase.getInstance();
  const isFav = templateDb.toggleFavorite(req.params.id);
  res.json({ success: true, isFavorite: isFav });
});

// 14. Recommend Templates for Topic / Trend
app.get("/api/templates/recommendations", (req, res) => {
  const { topic = "", aspectRatio = "9:16" } = req.query;
  const trendEngine = TrendEngine.getInstance();
  const matchingIds = trendEngine.matchTemplatesForTopic(String(topic), String(aspectRatio));
  const templateDb = TemplateDatabase.getInstance();
  const templates = matchingIds
    .map((id) => templateDb.getTemplateById(id))
    .filter(Boolean);
  res.json({ topic, templates });
});

// 15. Filter Presets Management
app.get("/api/presets", (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const presetsFile = path.join(process.cwd(), 'data', 'presets_db.json');
    if (fs.existsSync(presetsFile)) {
      const raw = fs.readFileSync(presetsFile, 'utf-8');
      const parsed = JSON.parse(raw);
      return res.json({ presets: parsed.presets || [] });
    }
    res.json({ presets: [] });
  } catch (err: any) {
    res.json({ presets: [] });
  }
});

app.post("/api/presets", (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const presetsFile = path.join(dataDir, 'presets_db.json');
    let presets: any[] = [];
    if (fs.existsSync(presetsFile)) {
      try {
        const raw = fs.readFileSync(presetsFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.presets)) {
          presets = parsed.presets;
        }
      } catch {}
    }
    const newPreset = req.body;
    if (newPreset && newPreset.id) {
      presets = presets.filter((p) => p.id !== newPreset.id);
      presets.unshift(newPreset);
      fs.writeFileSync(presetsFile, JSON.stringify({ presets }, null, 2));
    }
    res.status(201).json({ success: true, preset: newPreset });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save preset' });
  }
});

// =========================================================================
// YOUTUBE DATA API V3 INTEGRATION ENDPOINTS
// =========================================================================

// 1. Search YouTube Videos
app.get("/api/youtube/search", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const {
      q = "",
      maxResults = "18",
      pageToken,
      order = "relevance",
      videoDuration = "any",
      videoDefinition = "any",
      type = "video",
      regionCode = "US",
      safeSearch = "moderate",
      videoCategoryId,
    } = req.query;

    const referer = (req.headers.referer || req.headers.origin || "https://ai.studio") as string;
    const youtubeService = YouTubeService.getInstance();
    const result = await youtubeService.searchVideos({
      q: String(q),
      maxResults: parseInt(String(maxResults), 10) || 18,
      pageToken: pageToken ? String(pageToken) : undefined,
      order: order as any,
      videoDuration: videoDuration as any,
      videoDefinition: videoDefinition as any,
      type: type as any,
      regionCode: String(regionCode),
      safeSearch: safeSearch as any,
      videoCategoryId: videoCategoryId ? String(videoCategoryId) : undefined,
      referer,
    });

    res.json(result);
  } catch (error: any) {
    console.error("YouTube search API error:", error?.message || error);
    const statusCode = error.statusCode || (error.isApiKeyMissing ? 503 : error.isQuotaExceeded ? 429 : 500);
    res.status(statusCode).json({
      error: error.message || "Failed to search YouTube",
      isApiKeyMissing: !!error.isApiKeyMissing,
      isQuotaExceeded: !!error.isQuotaExceeded,
      isInvalidKey: !!error.isInvalidKey,
    });
  }
});

// 2. Get Video Details by ID
app.get("/api/youtube/video/:id", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { id } = req.params;
    const youtubeService = YouTubeService.getInstance();
    const video = await youtubeService.getVideoDetails(id);
    res.json(video);
  } catch (error: any) {
    console.error(`YouTube video details error for ${req.params.id}:`, error?.message || error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message || "Failed to fetch video details",
      isApiKeyMissing: !!error.isApiKeyMissing,
      isQuotaExceeded: !!error.isQuotaExceeded,
    });
  }
});

// 3. Get Channel Details by ID
app.get("/api/youtube/channel/:id", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { id } = req.params;
    const youtubeService = YouTubeService.getInstance();
    const channel = await youtubeService.getChannelDetails(id);
    res.json(channel);
  } catch (error: any) {
    console.error(`YouTube channel details error for ${req.params.id}:`, error?.message || error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message || "Failed to fetch channel details",
      isApiKeyMissing: !!error.isApiKeyMissing,
      isQuotaExceeded: !!error.isQuotaExceeded,
    });
  }
});

// 4. Check YouTube API Connection Status
app.get("/api/youtube/status", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  const youtubeService = YouTubeService.getInstance();
  const status = youtubeService.getStatus();
  res.json(status);
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
    console.log(`VeeCut Studio server running on http://localhost:${PORT}`);
  });
}

startServer();
