/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RecentProjectItem {
  id: string;
  name: string;
  thumbnail: string;
  lastEdited: string;
  lastEditedTimestamp: number;
  duration: string;
  resolution: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
  fps: number;
  size: string;
  tags: string[];
  isStarred?: boolean;
}

export interface CanvasPreset {
  id: string;
  name: string;
  label: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5' | '21:9' | 'custom';
  ratioText: string;
  width: number;
  height: number;
  iconType: 'youtube' | 'phone' | 'square' | 'instagram' | 'cinematic' | 'sliders';
  description: string;
  popular?: boolean;
}

export interface AIToolItem {
  id: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  iconName: string;
  accentGradient: string;
  features: string[];
}

export interface TemplateItem {
  id: string;
  name: string;
  category: 'Trending' | 'Cinematic' | 'YouTube' | 'Shorts' | 'Reels' | 'Gaming' | 'Business' | 'Travel' | 'Music';
  duration: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '21:9';
  resolution: string;
  thumbnail: string;
  author: string;
  downloads: string;
  rating: number;
  description: string;
  trackCount: number;
  effectsCount: number;
}

export interface AssetItem {
  id: string;
  name: string;
  category: 'Music' | 'Sound Effects' | 'Stickers' | 'Fonts' | 'Stock Videos' | 'Stock Images' | 'Transitions' | 'Effects' | 'Filters' | 'LUTs';
  type: 'audio' | 'video' | 'image' | 'font' | 'fx';
  duration?: string;
  size?: string;
  thumbnail?: string;
  tags: string[];
  bpm?: number;
  genre?: string;
  format?: string;
  author?: string;
}

// Generate procedural thumbnails for projects and templates
export function generateDashboardThumbnail(title: string, theme: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose' | 'indigo', aspect: '16:9' | '9:16' | '1:1' | '21:9' = '16:9'): string {
  const canvas = document.createElement('canvas');
  let w = 480;
  let h = 270;
  if (aspect === '9:16') {
    w = 270;
    h = 480;
  } else if (aspect === '1:1') {
    w = 320;
    h = 320;
  } else if (aspect === '21:9') {
    w = 560;
    h = 240;
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Theme Gradients
  const themeGradients: Record<string, [string, string, string]> = {
    cyan: ['#041e28', '#083344', '#0e7490'],
    purple: ['#1e0c2b', '#3b0764', '#7e22ce'],
    amber: ['#281804', '#451a03', '#b45309'],
    emerald: ['#04281b', '#064e3b', '#047857'],
    rose: ['#2b0c16', '#4c0519', '#be123c'],
    indigo: ['#0c122b', '#1e1b4b', '#4338ca'],
  };

  const [c1, c2, c3] = themeGradients[theme] || themeGradients.cyan;

  // Background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#090a0f');
  grad.addColorStop(0.5, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle geometric grid / cinematic overlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const step = 30;
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Glowing light flare / orb
  const orbGrad = ctx.createRadialGradient(w * 0.7, h * 0.35, 10, w * 0.7, h * 0.35, Math.min(w, h) * 0.6);
  orbGrad.addColorStop(0, c3);
  orbGrad.addColorStop(0.5, c2 + '80');
  orbGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = orbGrad;
  ctx.fillRect(0, 0, w, h);

  // Abstract filmic silhouettes / shapes
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.75, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glass card element in the thumbnail
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  const cardW = w * 0.7;
  const cardH = h * 0.38;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2;
  ctx.roundRect(cardX, cardY, cardW, cardH, 8);
  ctx.fill();
  ctx.stroke();

  // Waveform / video bar simulation inside card
  ctx.fillStyle = c3;
  const bars = 16;
  const barW = (cardW - 40) / bars;
  for (let i = 0; i < bars; i++) {
    const val = Math.sin(i * 0.5 + 1) * 0.5 + 0.5;
    const barH = 6 + val * (cardH - 24);
    const bx = cardX + 20 + i * barW;
    const by = cardY + (cardH - barH) / 2;
    ctx.fillRect(bx, by, barW - 3, barH);
  }

  // Title badge
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title.substring(0, 24), cardX + 16, cardY - 10);

  // Aspect ratio stamp
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(w - 48, 8, 40, 18);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(aspect, w - 28, 20);

  return canvas.toDataURL('image/jpeg', 0.85);
}

// Initial Sample Recent Projects
export const INITIAL_RECENT_PROJECTS: RecentProjectItem[] = [
  {
    id: 'proj_cinematic_travel',
    name: 'Cinematic Travel Edit - Iceland 4K',
    thumbnail: generateDashboardThumbnail('Iceland 4K Master', 'cyan', '16:9'),
    lastEdited: '2 hours ago',
    lastEditedTimestamp: Date.now() - 2 * 3600 * 1000,
    duration: '01:26:08',
    resolution: '3840 x 2160 (4K UHD)',
    aspectRatio: '16:9',
    fps: 60,
    size: '1.42 GB',
    tags: ['Cinematic', 'Color Graded', 'Travel', 'Drone'],
    isStarred: true,
  },
  {
    id: 'proj_youtube_intro',
    name: 'YouTube Intro & Channel Branding',
    thumbnail: generateDashboardThumbnail('YouTube Intro', 'purple', '16:9'),
    lastEdited: 'Yesterday',
    lastEditedTimestamp: Date.now() - 24 * 3600 * 1000,
    duration: '00:15:20',
    resolution: '1920 x 1080 (FHD)',
    aspectRatio: '16:9',
    fps: 60,
    size: '420 MB',
    tags: ['YouTube', 'Motion Graphics', 'Logo'],
    isStarred: true,
  },
  {
    id: 'proj_product_ad',
    name: 'Product Advertisement - CyberSonic ANC',
    thumbnail: generateDashboardThumbnail('Product Ad', 'amber', '9:16'),
    lastEdited: '2 days ago',
    lastEditedTimestamp: Date.now() - 48 * 3600 * 1000,
    duration: '00:30:00',
    resolution: '1080 x 1920 (Vertical)',
    aspectRatio: '9:16',
    fps: 30,
    size: '680 MB',
    tags: ['Commercial', 'Reels', 'Product', 'Captions'],
    isStarred: false,
  },
  {
    id: 'proj_gaming_montage',
    name: 'Gaming Montage - Apex Legends Season 21',
    thumbnail: generateDashboardThumbnail('Gaming Montage', 'rose', '16:9'),
    lastEdited: '3 days ago',
    lastEditedTimestamp: Date.now() - 72 * 3600 * 1000,
    duration: '02:14:10',
    resolution: '1920 x 1080 (FHD)',
    aspectRatio: '16:9',
    fps: 120,
    size: '2.10 GB',
    tags: ['Gaming', 'Speed Ramp', 'Beat Sync'],
    isStarred: false,
  },
  {
    id: 'proj_social_reel',
    name: 'Social Media Reel - Tokyo Street Food Night',
    thumbnail: generateDashboardThumbnail('Tokyo Food Reel', 'emerald', '9:16'),
    lastEdited: '5 days ago',
    lastEditedTimestamp: Date.now() - 120 * 3600 * 1000,
    duration: '00:45:00',
    resolution: '1080 x 1920 (Vertical)',
    aspectRatio: '9:16',
    fps: 60,
    size: '890 MB',
    tags: ['TikTok', 'Shorts', 'Food', 'LUT 709'],
    isStarred: true,
  },
  {
    id: 'proj_cinematic_ultrawide',
    name: 'Nordic Fjords Nature Documentary',
    thumbnail: generateDashboardThumbnail('Nordic Fjords', 'indigo', '21:9'),
    lastEdited: '1 week ago',
    lastEditedTimestamp: Date.now() - 168 * 3600 * 1000,
    duration: '03:10:00',
    resolution: '3440 x 1440 (21:9 UltraWide)',
    aspectRatio: '21:9',
    fps: 24,
    size: '3.80 GB',
    tags: ['Documentary', 'Anamorphic', 'Dolby Vision'],
    isStarred: false,
  },
];

// Canvas Presets for "Start Creating"
export const CANVAS_PRESETS: CanvasPreset[] = [
  {
    id: 'preset_youtube',
    name: '16:9 YouTube / Horizontal',
    label: 'Standard Widescreen',
    aspectRatio: '16:9',
    ratioText: '16:9',
    width: 1920,
    height: 1080,
    iconType: 'youtube',
    description: 'YouTube, Vimeo, Web, TV & Presentation',
    popular: true,
  },
  {
    id: 'preset_shorts',
    name: '9:16 Shorts / Reels / TikTok',
    label: 'Vertical Video',
    aspectRatio: '9:16',
    ratioText: '9:16',
    width: 1080,
    height: 1920,
    iconType: 'phone',
    description: 'TikTok, Instagram Reels, YouTube Shorts & Stories',
    popular: true,
  },
  {
    id: 'preset_social',
    name: '1:1 Square Feed',
    label: 'Square Format',
    aspectRatio: '1:1',
    ratioText: '1:1',
    width: 1080,
    height: 1080,
    iconType: 'square',
    description: 'Instagram Feed, Facebook, LinkedIn Carousels',
  },
  {
    id: 'preset_instagram',
    name: '4:5 Instagram Portrait',
    label: 'Feed Portrait',
    aspectRatio: '4:5',
    ratioText: '4:5',
    width: 1080,
    height: 1350,
    iconType: 'instagram',
    description: 'Instagram Posts & High-engagement feed ads',
  },
  {
    id: 'preset_cinematic',
    name: '21:9 Cinematic UltraWide',
    label: 'Anamorphic Cinema',
    aspectRatio: '21:9',
    ratioText: '21:9',
    width: 3440,
    height: 1440,
    iconType: 'cinematic',
    description: 'UltraWide Monitors, Feature Film & Cinematic trailers',
  },
  {
    id: 'preset_custom',
    name: 'Custom Canvas',
    label: 'Precision Setup',
    aspectRatio: 'custom',
    ratioText: 'Custom',
    width: 3840,
    height: 2160,
    iconType: 'sliders',
    description: 'Set custom width, height, framerate & color space',
  },
];

// AI Tools Suite (Exactly 10 Models/Tools)
export const AI_TOOLS_LIST: AIToolItem[] = [
  {
    id: 'ai_video_gen',
    name: 'AI Video Generator',
    category: 'Generation',
    description: 'Transform detailed text prompts into cinematic high-framerate video clips with camera movement.',
    badge: 'Veo 3.1',
    iconName: 'Video',
    accentGradient: 'from-cyan-500 to-blue-600',
    features: ['Text to Video', 'Camera Dynamics', '720p/1080p Resolution'],
  },
  {
    id: 'ai_image_gen',
    name: 'AI Image Generator',
    category: 'Asset Creation',
    description: 'Generate photorealistic cinematic stills, matte paintings, textures, and custom thumbnails.',
    badge: 'Imagen 3.1',
    iconName: 'Image',
    accentGradient: 'from-purple-500 to-indigo-600',
    features: ['8K Resolution', 'Aspect Ratio Presets', 'Art Styles'],
  },
  {
    id: 'ai_image_to_video',
    name: 'AI Image to Video',
    category: 'Animation & Motion',
    description: 'Animate any still photo or artwork into a living motion shot with natural parallax and camera push.',
    badge: 'Veo Animate',
    iconName: 'Sparkles',
    accentGradient: 'from-blue-500 to-indigo-600',
    features: ['Still to Motion', 'Atmospheric Particles', 'Parallax Depth'],
  },
  {
    id: 'ai_bg_removal',
    name: 'AI Background & Object Remover',
    category: 'VFX & Rotoscoping',
    description: 'Zero-latency subject rotoscoping and inpainting cleanup without green screen.',
    badge: 'Neural Matting',
    iconName: 'Scissors',
    accentGradient: 'from-emerald-500 to-teal-600',
    features: ['Subject Isolation', 'Object Inpainting', 'Chroma Green Key'],
  },
  {
    id: 'ai_captions',
    name: 'AI Auto Captions',
    category: 'Transcription',
    description: 'Generate 99.4% accurate animated subtitles with synchronized millisecond timestamps and word karaoke.',
    badge: 'Gemini Transcribe',
    iconName: 'Subtitles',
    accentGradient: 'from-violet-500 to-purple-600',
    features: ['Word-level Karaoke', 'Multilingual Translation', 'Viral Typography'],
  },
  {
    id: 'ai_voice',
    name: 'AI Voice & Speech (TTS)',
    category: 'Audio & Dubbing',
    description: 'Natural emotive voiceovers and studio narration with high-fidelity speech synthesis.',
    badge: 'Gemini TTS',
    iconName: 'Mic',
    accentGradient: 'from-teal-500 to-emerald-600',
    features: ['Prebuilt Voices', 'Emotion Controls', 'Broadcast WAV Output'],
  },
  {
    id: 'ai_music_sfx',
    name: 'AI Music & SFX Generator',
    category: 'Audio Mixing',
    description: 'Generate original cinematic music tracks, ambient soundscapes, and customized impact effects.',
    badge: 'Neural Synth',
    iconName: 'Music',
    accentGradient: 'from-pink-500 to-rose-600',
    features: ['BPM & Mood Sync', 'Impact & Whoosh SFX', 'Waveform Synthesis'],
  },
  {
    id: 'ai_transcription',
    name: 'AI Speech-to-Text Workspace',
    category: 'Transcription',
    description: 'Transcribe audio and video dialogue with speaker identification and timeline markers.',
    badge: 'Speech to Text',
    iconName: 'FileText',
    accentGradient: 'from-amber-500 to-orange-600',
    features: ['Speaker Diarization', 'Confidence Score', 'Export SRT / JSON'],
  },
  {
    id: 'ai_assistant',
    name: 'AI Smart Editor & Assistant',
    category: 'Intelligent Copilot',
    description: 'Conversational AI copilot that performs silence trimming, highlight detection, auto-reframe, and timeline actions.',
    badge: 'Gemini Copilot',
    iconName: 'Bot',
    accentGradient: 'from-amber-400 to-rose-500',
    features: ['Smart Silence Cut', 'Auto 9:16 Reframe', 'Timeline Command Execution'],
  },
  {
    id: 'ai_upscale',
    name: 'AI Enhancer & Color Grading',
    category: 'Post Processing',
    description: 'Super-resolution neural model reconstructs sub-pixel details and applies Hollywood 3D LUT matrices.',
    badge: 'Super-Res & LUT',
    iconName: 'Palette',
    accentGradient: 'from-rose-500 to-purple-600',
    features: ['4K/8K Upscale', 'Hollywood Color LUTs', 'Denoise & Clarity'],
  },
];

// Trending Templates
export const TRENDING_TEMPLATES: TemplateItem[] = [
  {
    id: 'tmpl_cinematic_travel',
    name: 'Cinematic Travel Vlog Master',
    category: 'Cinematic',
    duration: '00:45',
    aspectRatio: '16:9',
    resolution: '4K UHD',
    thumbnail: generateDashboardThumbnail('Travel Vlog Master', 'cyan', '16:9'),
    author: 'VeeCut Studio',
    downloads: '14.2k',
    rating: 4.9,
    description: 'Smooth whip transitions, speed ramps, and mood color grading for epic travel stories.',
    trackCount: 4,
    effectsCount: 12,
  },
  {
    id: 'tmpl_viral_reel',
    name: 'Viral TikTok & Reel Hook',
    category: 'Reels',
    duration: '00:15',
    aspectRatio: '9:16',
    resolution: '1080p Vertical',
    thumbnail: generateDashboardThumbnail('Viral Reel Hook', 'purple', '9:16'),
    author: 'Alex Motion',
    downloads: '28.9k',
    rating: 5.0,
    description: 'High-retention kinetic text animations, punch-in zooms, and sound effect accents.',
    trackCount: 3,
    effectsCount: 8,
  },
  {
    id: 'tmpl_cyber_product',
    name: 'Cyberpunk Tech Product Launch',
    category: 'Business',
    duration: '00:30',
    aspectRatio: '16:9',
    resolution: '4K UHD',
    thumbnail: generateDashboardThumbnail('Tech Product Launch', 'amber', '16:9'),
    author: 'FutureDesign',
    downloads: '9.8k',
    rating: 4.8,
    description: '3D hologram title overlays, neon glow effects, and modern techno beats.',
    trackCount: 5,
    effectsCount: 15,
  },
  {
    id: 'tmpl_gaming_intro',
    name: 'Esports Gaming Intro 120FPS',
    category: 'Gaming',
    duration: '00:12',
    aspectRatio: '16:9',
    resolution: '1080p FHD',
    thumbnail: generateDashboardThumbnail('Gaming Intro 120fps', 'rose', '16:9'),
    author: 'Vortex VFX',
    downloads: '31.4k',
    rating: 4.9,
    description: 'RGB chromatic aberration, explosive glitch logo reveal, and bass drops.',
    trackCount: 4,
    effectsCount: 14,
  },
  {
    id: 'tmpl_minimal_podcast',
    name: 'Clean Split-Screen Podcast',
    category: 'YouTube',
    duration: '01:00',
    aspectRatio: '16:9',
    resolution: '4K UHD',
    thumbnail: generateDashboardThumbnail('Podcast Split View', 'emerald', '16:9'),
    author: 'AudioVisuals',
    downloads: '18.1k',
    rating: 4.7,
    description: 'Multi-cam dynamic speaker switching with animated waveform & caption bars.',
    trackCount: 4,
    effectsCount: 6,
  },
  {
    id: 'tmpl_music_visualizer',
    name: 'Lo-Fi Chill Beats Visualizer',
    category: 'Music',
    duration: '02:30',
    aspectRatio: '16:9',
    resolution: '4K UHD',
    thumbnail: generateDashboardThumbnail('Lo-Fi Visualizer', 'indigo', '16:9'),
    author: 'Soundscape Lab',
    downloads: '22.6k',
    rating: 4.9,
    description: 'Reactive spectrum rings, retro VHS dust, and subtle ambient camera drift.',
    trackCount: 3,
    effectsCount: 9,
  },
  {
    id: 'tmpl_food_story',
    name: 'Aesthetic Cafe & Food Story',
    category: 'Shorts',
    duration: '00:20',
    aspectRatio: '9:16',
    resolution: '1080p Vertical',
    thumbnail: generateDashboardThumbnail('Cafe Story', 'amber', '9:16'),
    author: 'GourmetEdits',
    downloads: '15.7k',
    rating: 4.8,
    description: 'Warm pastel film grade, clean modern typography, and soft ASMR audio mix.',
    trackCount: 3,
    effectsCount: 7,
  },
  {
    id: 'tmpl_fashion_lookbook',
    name: 'Anamorphic Fashion Lookbook',
    category: 'Cinematic',
    duration: '00:40',
    aspectRatio: '21:9',
    resolution: '3440x1440 Cinema',
    thumbnail: generateDashboardThumbnail('Fashion Lookbook', 'purple', '21:9'),
    author: 'Vogue Motion',
    downloads: '11.3k',
    rating: 4.9,
    description: 'Letterbox borders, lens flare streaks, and editorial slow-motion cuts.',
    trackCount: 4,
    effectsCount: 11,
  },
];

// Assets Library
export const ASSETS_LIBRARY: AssetItem[] = [
  {
    id: 'asset_music_1',
    name: 'Cinematic Dawn Horizon',
    category: 'Music',
    type: 'audio',
    duration: '03:24',
    bpm: 118,
    genre: 'Cinematic Orchestral',
    tags: ['Epic', 'Strings', 'Trailer', 'Dramatic'],
    author: 'London Session Orchestra',
  },
  {
    id: 'asset_music_2',
    name: 'Midnight Neon City Drive',
    category: 'Music',
    type: 'audio',
    duration: '02:48',
    bpm: 126,
    genre: 'Synthwave / Electronic',
    tags: ['Retro', 'Cyberpunk', 'Energetic', 'Night'],
    author: 'WaveForm 84',
  },
  {
    id: 'asset_sfx_1',
    name: 'Deep Cinema Sub Drop & Whoosh',
    category: 'Sound Effects',
    type: 'audio',
    duration: '00:04',
    tags: ['Transition', 'Impact', 'Bass', 'Riser'],
    author: 'ProAudio VFX',
  },
  {
    id: 'asset_sfx_2',
    name: 'Vintage Camera Shutter & Flash',
    category: 'Sound Effects',
    type: 'audio',
    duration: '00:02',
    tags: ['Camera', 'Mechanical', 'Foley', 'Click'],
    author: 'Foley Masters',
  },
  {
    id: 'asset_trans_1',
    name: 'Liquid Optical Zoom Transition',
    category: 'Transitions',
    type: 'fx',
    duration: '00:01',
    tags: ['Zoom', 'Motion Blur', 'Seamless', 'Glitch'],
    author: 'VeeCut VFX',
  },
  {
    id: 'asset_lut_1',
    name: 'Kodak Portra 400 Warm Golden',
    category: 'LUTs',
    type: 'fx',
    format: '.CUBE (33x33x33)',
    tags: ['Film Emulation', 'Warm Skin', 'Highlight Roll-off'],
    author: 'Colorist Academy',
  },
  {
    id: 'asset_lut_2',
    name: 'Teal & Orange Hollywood Blockbuster',
    category: 'LUTs',
    type: 'fx',
    format: '.CUBE (33x33x33)',
    tags: ['Action', 'Contrast', 'High Saturation'],
    author: 'Colorist Academy',
  },
  {
    id: 'asset_video_1',
    name: 'Tokyo Rain Neon Reflections 4K 60fps',
    category: 'Stock Videos',
    type: 'video',
    duration: '00:15',
    size: '124 MB',
    tags: ['Rain', 'City', 'Night', 'B-Roll'],
    author: 'Nightscape Visuals',
  },
  {
    id: 'asset_font_1',
    name: 'Neue Haas Grotesk Pro Display',
    category: 'Fonts',
    type: 'font',
    format: 'OTF / Variable',
    tags: ['Sans-serif', 'Modern', 'Clean', 'Editorial'],
    author: 'TypeFoundry',
  },
];
