# VeeCut AI Models API Setup & Configuration Guide

This guide details all API providers, neural models, endpoints, environment variables, and pricing tiers powering the **10 Neural AI Models** in the VeeCut Video Editor Suite.

---

## Architecture Overview

```text
VeeCut Web Client
       │
       ▼ (Fetch /api/ai/*)
Express Backend (server.ts)
       │
       ▼ (@google/genai SDK with process.env.GEMINI_API_KEY)
Google Gemini Cloud Models & Neural Vision Engines
       │
       ▼ (JSON / Audio WAV / Image Base64 / Timed Cues)
VeeCut Timeline & Media Pool
```

- **Zero Client Credential Leakage:** API keys are exclusively accessed in server-side code (`server.ts`).
- **No Client Secrets:** No keys are ever bundled into frontend JavaScript, `localStorage`, or `VITE_` variables.

---

## 10 Neural Models Provider & API Matrix

### 1. AI Video Generator (`ai_video_gen`)
- **Provider:** Google DeepMind
- **API:** `@google/genai` Models API
- **Model:** `gemini-3.7-flash` & `veo-3.1-lite-generate-preview` / `veo-3.1-generate-preview`
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Generous free tier in Google AI Studio; pay-as-you-go for high-volume inference.
- **Backend Endpoint:** `POST /api/ai/video-gen`
- **Inputs:** `prompt`, `style`, `duration` (3-10s), `aspectRatio` (16:9, 9:16, 1:1), `resolution` (720p, 1080p, 4K).
- **Outputs:** Video title, camera motion path description, lighting attributes, color palette array, timeline-ready video asset metadata.

---

### 2. AI Image Generator (`ai_image_gen`)
- **Provider:** Google DeepMind
- **API:** `@google/genai` Image Generation API
- **Model:** `gemini-3.1-flash-lite-image` / `gemini-3.1-flash-image`
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Free tier available; pay-as-you-go for high-volume inference.
- **Backend Endpoint:** `POST /api/ai/image-gen`
- **Inputs:** `prompt`, `style` (Photorealistic, Anime, 3D Render, Cyberpunk, Oil Painting), `aspectRatio` (1:1, 3:4, 4:3, 9:16, 16:9).
- **Outputs:** High-resolution base64 PNG data URL (`data:image/png;base64,...`) ready for Media Library and timeline overlay.

---

### 3. AI Style & Color Transfer (`ai_style_transfer`)
- **Provider:** Google Gemini
- **API:** `@google/genai` Structured JSON Color Solver
- **Model:** `gemini-3.7-flash`
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Generous free tier (up to 15 RPM free).
- **Backend Endpoint:** `POST /api/ai/style-transfer`
- **Inputs:** `preset` (Kodak 35mm Film, Teal & Orange, Cyberpunk Tokyo, Bleach Bypass, Fuji Velvia Vivid, Golden Hour Glow), `stylePrompt`, `intensity` (10-150%).
- **Outputs:** 13-parameter color grade object (`temp`, `tint`, `contrast`, `saturation`, `vibrance`, `exposure`, `highlights`, `shadows`, `whites`, `blacks`, `vignette`, `grain`, `clarity`) applied live to clip shaders.

---

### 4. AI Background Removal (`ai_bg_removal`)
- **Provider:** Google Gemini
- **API:** `@google/genai` Neural Matting & Vision Engine
- **Model:** `gemini-3.7-flash`
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Generous free tier.
- **Backend Endpoint:** `POST /api/ai/bg-removal`
- **Inputs:** `mode` (`transparent`, `blur`, `studio`, `greenscreen`), `feather` radius (0-10px), `subjectType`.
- **Outputs:** Edge-refined alpha matte properties, depth layers count, and composite blend configuration.

---

### 5. AI Object Removal & Inpainting (`ai_object_removal`)
- **Provider:** Google Gemini
- **API:** `@google/genai` Temporal Inpainter
- **Model:** `gemini-3.7-flash`
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Generous free tier.
- **Backend Endpoint:** `POST /api/ai/object-removal`
- **Inputs:** `targetDescription` (e.g. "Microphone in upper right", "Watermark", "Power lines"), `inpaintMode` (`temporal` or `patch`).
- **Outputs:** Clean plate synthesis metrics, bounding coordinates, and inpainting filter applied to timeline clip.

---

### 6. AI Motion Tracking (`ai_motion_tracking`)
- **Provider:** Google Gemini
- **API:** `@google/genai` 3D Planar Trajectory Solver
- **Model:** `gemini-3.7-flash`
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Generous free tier.
- **Backend Endpoint:** `POST /api/ai/motion-tracking`
- **Inputs:** `targetName` (Subject Face, Moving Vehicle, Focal Point), `trackingMode` (Pin 3D Text, Pin Sticker, Mosaic Blur, Spotlight), `durationSec`.
- **Outputs:** Continuous 60fps trajectory keyframe matrix (`{ t, x, y, scale, rotation, confidence }`) synchronized with timeline elements.

---

### 7. AI Auto Captions & Subtitles (`ai_captions`)
- **Provider:** Google Gemini
- **API:** `@google/genai` Multilingual Speech Transcriber
- **Model:** `gemini-3.7-flash` / `gemini-3.5-transcribe`
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Generous free tier.
- **Backend Endpoint:** `POST /api/ai/auto-captions`
- **Inputs:** `language` (English, Spanish, French, German, Japanese, Hindi, etc.), `style` (Viral TikTok Karaoke, Clean Cinema Subtitle, Pop Bouncy Word, Neon Glow Box), `audioPrompt`.
- **Outputs:** Array of structured subtitle cues with `startMs`, `endMs`, `text`, and `highlightWord` markers placed into subtitle track.

---

### 8. AI Voice & Speech TTS (`ai_voice`)
- **Provider:** Google Gemini
- **API:** `@google/genai` Speech Synthesis API
- **Model:** `gemini-3.1-flash-tts-preview` with Web Speech API audio synthesis fallback
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Generous free tier.
- **Backend Endpoint:** `POST /api/ai/voice-tts`
- **Inputs:** `text`, `voice` (Puck, Charon, Kore, Fenrir, Zephyr), `emotion` (Cinematic Narrator, Energetic Vlog, Storyteller, News Anchor, Gentle Whisper).
- **Outputs:** Base64 audio WAV stream (`data:audio/wav;base64,...`) playable in modal and placed on the audio track.

---

### 9. AI Audio Enhancement (`ai_audio_enhance`)
- **Provider:** Google Gemini
- **API:** `@google/genai` Spectral Master Engine
- **Model:** `gemini-3.7-flash`
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Generous free tier.
- **Backend Endpoint:** `POST /api/ai/audio-enhance`
- **Inputs:** `profile` (Studio Vocal Clarity, Wind De-Noise, Room De-Reverb, Broadcast Leveler, Warm Tube), `noiseReduction` (0-100%), `deReverb` (0-100%).
- **Outputs:** Spectral mastering parameters (noise floor dB, high-pass cutoff, de-esser frequency, multiband compression ratio, LUFS target) and WebAudio DSP settings.

---

### 10. AI 4K/8K Upscaler (`ai_upscale`)
- **Provider:** Google Gemini
- **API:** `@google/genai` Super-Resolution Engine
- **Model:** `gemini-3.7-flash`
- **Environment Variable:** `GEMINI_API_KEY`
- **Where to Obtain:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pricing:** Generous free tier.
- **Backend Endpoint:** `POST /api/ai/upscale`
- **Inputs:** `scaleFactor` (`2x`, `4x`, `8x`), `enhancementModel` (Super-Resolution Neural, Edge Sharpness, Artifact Reducer), `deNoise`, `sharpness`.
- **Outputs:** Canvas dimension scaling parameters, temporal stability matrix, and post-processing sharpness shader configurations.

---

## Environment Setup Instructions

1. Obtain your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create or update your `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```
3. Restart the server:
   ```bash
   npm run dev
   ```
4. Verify all 10 tools from the VeeCut Home AI Tools Suite or the Studio Editor sidebar!
