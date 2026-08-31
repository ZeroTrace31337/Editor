/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TemplateCategoryInfo } from './Template';

export const TEMPLATE_CATEGORIES: TemplateCategoryInfo[] = [
  {
    id: 'for_you',
    label: 'For You',
    iconName: 'Sparkles',
    description: 'Personalized recommendations tailored to your editing style and interests',
    tagline: 'Curated based on your creative activity',
    colorAccent: '#38bdf8', // Sky / Cyan
  },
  {
    id: 'trending',
    label: 'Trending',
    iconName: 'Flame',
    description: 'Most viral and widely used templates this week across global creators',
    tagline: 'High-growth viral edits and transitions',
    colorAccent: '#f43f5e', // Rose
  },
  {
    id: 'youtube',
    label: 'YouTube',
    iconName: 'Youtube',
    description: 'Widescreen 16:9 layouts for intros, video essays, reviews, and vlogs',
    tagline: 'Landscape 4K long-form production styles',
    colorAccent: '#dc2626', // YouTube Red
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    iconName: 'Smartphone',
    description: 'Fast-paced viral vertical edits, karaoke lyric pops, and beat jumps',
    tagline: 'Fast hooks and trendy sound pacing',
    colorAccent: '#06b6d4', // Cyan
  },
  {
    id: 'youtube_shorts',
    label: 'Shorts',
    iconName: 'Zap',
    description: 'Engaging vertical video templates engineered for maximum viewer retention',
    tagline: 'Paced for Shorts algorithm discoverability',
    colorAccent: '#ef4444', // Red
  },
  {
    id: 'reels',
    label: 'Reels',
    iconName: 'Instagram',
    description: 'High-retention 9:16 Instagram Reels with hook pacing and dynamic overlays',
    tagline: 'Optimized for Instagram feed and story loops',
    colorAccent: '#e1306c', // Instagram Magenta
  },
  {
    id: 'instagram',
    label: 'Instagram',
    iconName: 'Instagram',
    description: 'Square 1:1, portrait 4:5, and carousel video templates for Instagram feeds',
    tagline: 'Clean aesthetic grids and feed visualizers',
    colorAccent: '#d946ef', // Fuchsia
  },
  {
    id: 'gaming',
    label: 'Gaming',
    iconName: 'Gamepad2',
    description: 'Esports clutch montages, streamer webcam overlays, and kill syncs',
    tagline: 'Cyberpunk neon HUDs, particle glitches & bass drops',
    colorAccent: '#a855f7', // Violet
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    iconName: 'Film',
    description: 'Hollywood anamorphic aspect ratios, letterbox grades, and dramatic paces',
    tagline: 'Moody lighting, 35mm film looks & orchestral sound design',
    colorAccent: '#fbbf24', // Amber/Gold
  },
  {
    id: 'vlog',
    label: 'Vlogs',
    iconName: 'Video',
    description: 'Daily life routines, talking-head PIP boxes, and casual vlog typography',
    tagline: 'Cozy, authentic lifestyle and storytelling layouts',
    colorAccent: '#8b5cf6', // Purple
  },
  {
    id: 'business',
    label: 'Business',
    iconName: 'Briefcase',
    description: 'Corporate pitch presentations, brand intros, key metrics, and case studies',
    tagline: 'Clean corporate typography, logo reveals & modern badges',
    colorAccent: '#3b82f6', // Corporate Blue
  },
  {
    id: 'education',
    label: 'Education',
    iconName: 'GraduationCap',
    description: 'Explainer videos, tutorial breakdowns, highlighted text callouts, and step-by-steps',
    tagline: 'Clear informational graphics and educational pacing',
    colorAccent: '#10b981', // Emerald
  },
  {
    id: 'ads',
    label: 'Ads',
    iconName: 'Megaphone',
    description: 'High-converting video ads, sales hooks, promotional discounts, and CTA end-cards',
    tagline: 'Performance marketing templates engineered for CTR',
    colorAccent: '#f97316', // Orange
  },
  {
    id: 'documents',
    label: 'Documents',
    iconName: 'FileText',
    description: 'Documentary style visuals, archival lower thirds, typewriter logs, and paper textures',
    tagline: 'Historical and investigative documentary aesthetics',
    colorAccent: '#94a3b8', // Slate
  },
  {
    id: 'presentations',
    label: 'Presentations',
    iconName: 'Presentation',
    description: 'Keynote style video decks, pitch slideshows, bullet callouts, and infographic morphs',
    tagline: 'Executive grade visual presentations',
    colorAccent: '#6366f1', // Indigo
  },
  {
    id: 'social_media',
    label: 'Social Media',
    iconName: 'Share2',
    description: 'Omni-platform short form content with animated captions and reaction frames',
    tagline: 'Cross-platform engagement boosters',
    colorAccent: '#ec4899', // Pink
  },
  {
    id: 'photo_slideshow',
    label: 'Photo Slideshow',
    iconName: 'Images',
    description: 'Parallax photo galleries, smooth 3D push transitions, and memory scrapbooks',
    tagline: 'Transform still photographs into fluid video reels',
    colorAccent: '#14b8a6', // Teal
  },
  {
    id: 'intro_outro',
    label: 'Intro/Outro',
    iconName: 'PlaySquare',
    description: 'Channel intro stingers, dynamic subscribe end-cards, and logo splash screens',
    tagline: 'Signature branding hooks and end-screen calls to action',
    colorAccent: '#eab308', // Yellow
  },
  {
    id: 'promotional',
    label: 'Promotional',
    iconName: 'ShoppingBag',
    description: 'E-commerce showcase clips, 3D product rotations, discount tags, and launch trailers',
    tagline: 'Product launch and seasonal commercial spotlights',
    colorAccent: '#06b6d4', // Cyan
  },
  {
    id: 'ai_templates',
    label: 'AI Templates',
    iconName: 'Cpu',
    description: 'AI-assisted smart layouts with dynamic generative media prompts, voiceover sync & neural grading',
    tagline: 'Intelligent multi-modal video generation pipelines',
    colorAccent: '#a855f7', // Purple
  },
  {
    id: 'travel',
    label: 'Travel',
    iconName: 'Compass',
    description: 'Scenic destination montages, aerial drone transitions, and holiday logs',
    tagline: 'Wanderlust storytelling with fluid zoom maps',
    colorAccent: '#0ea5e9', // Ocean Blue
  },
  {
    id: 'gaming',
    label: 'Gaming',
    iconName: 'Gamepad2',
    description: 'Esports clutch montages, streamer webcam overlays, and kill syncs',
    tagline: 'Cyberpunk neon HUDs, particle glitches & bass drops',
    colorAccent: '#8b5cf6',
  },
  {
    id: 'new',
    label: 'New',
    iconName: 'Clock',
    description: 'Freshly released templates updated daily with modern aesthetic styles',
    tagline: 'Brand new multi-track layouts',
    colorAccent: '#10b981', // Emerald
  },
  {
    id: 'sports',
    label: 'Sports',
    iconName: 'Trophy',
    description: 'High-energy football, basketball, gym workout, and extreme sports edits',
    tagline: 'Fast speed ramps, flash impacts & aggressive audio risers',
    colorAccent: '#f97316', // Orange
  },
  {
    id: 'birthday',
    label: 'Birthday',
    iconName: 'Gift',
    description: 'Joyful celebration slideshows, confetti bursts, and memory reels',
    tagline: 'Warm celebratory memories with custom text greetings',
    colorAccent: '#ec4899', // Pink
  },
  {
    id: 'wedding',
    label: 'Wedding',
    iconName: 'HeartHandshake',
    description: 'Timeless elegant romantic montages, slow dissolves, and golden bokeh',
    tagline: 'Graceful typography, soft light leaks and vow memories',
    colorAccent: '#fde047', // Champagne Gold
  },
  {
    id: 'photography',
    label: 'Photography',
    iconName: 'Camera',
    description: 'Photo portfolio reels, 35mm contact sheets, and parallax 3D slideshows',
    tagline: 'Minimalist gallery presentations for photographers',
    colorAccent: '#94a3b8', // Slate
  },
  {
    id: 'lyrics_music',
    label: 'Lyrics/Music',
    iconName: 'Music',
    description: 'Kinetic typography, animated word karaoke, audio visualizers, and music promos',
    tagline: 'Synchronized lyrics with visual audio pulses',
    colorAccent: '#c084fc', // Lilac
  },
  {
    id: 'memes',
    label: 'Memes',
    iconName: 'Smile',
    description: 'Viral meme formats, green-screen comedy inserts, zoom sound gags, and text boxes',
    tagline: 'Humorous short-form setups with instant punchline cuts',
    colorAccent: '#84cc16', // Lime
  },
  {
    id: 'minimal',
    label: 'Minimal',
    iconName: 'Maximize2',
    description: 'Clean typographic negative space, subtle cuts, and monochrome aesthetics',
    tagline: 'Understated elegance for contemporary creators',
    colorAccent: '#e2e8f0', // Silver
  },
  {
    id: 'beat_sync',
    label: 'Beat Sync',
    iconName: 'Activity',
    description: 'Ultra-tight frame-perfect cuts synchronized to musical drop transients',
    tagline: 'Automated transient snapping for high-impact beat pacing',
    colorAccent: '#06b6d4', // Electric Cyan
  },
];
