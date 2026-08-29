/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Wand2,
  Layers,
  Music,
  Sparkles,
  Film,
  Type,
  Clock,
  Maximize2,
  Share2,
  Heart,
  CheckCircle2,
  Star,
  Activity,
  Sliders,
} from 'lucide-react';
import { Template } from '../../domain/template/Template';
import { TemplateService } from '../../domain/template/templateService';

interface TemplatePreviewModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: Template) => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  isOpen,
  onClose,
  onUseTemplate,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const templateService = TemplateService.getInstance();

  useEffect(() => {
    if (template) {
      setIsFavorite(templateService.isFavorite(template.id));
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [template, templateService]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !template) return null;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleFavoriteToggle = () => {
    const nextFav = !isFavorite;
    setIsFavorite(nextFav);
    templateService.toggleFavorite(template.id);
  };

  return (
    <div
      id="template_preview_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="template_preview_modal_content"
        className="relative w-full max-w-5xl max-h-[90vh] bg-[#0d1117] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          id="btn_close_preview_modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-white/20 text-white/80 hover:text-white backdrop-blur-md transition-all duration-200"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: Video Preview Player */}
        <div className="md:w-3/5 relative bg-black flex flex-col items-center justify-center p-4 min-h-[340px] md:min-h-[540px]">
          <div
            className={`relative rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 ${
              template.aspectRatio === '9:16'
                ? 'w-[280px] sm:w-[320px] aspect-[9/16]'
                : template.aspectRatio === '1:1'
                ? 'w-[360px] aspect-square'
                : 'w-full aspect-video'
            }`}
          >
            {template.previewVideoUrl ? (
              <video
                ref={videoRef}
                src={template.previewVideoUrl}
                poster={template.thumbnail}
                autoPlay
                loop
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-cover"
                playsInline
              />
            ) : (
              <img
                src={template.thumbnail}
                alt={template.name}
                className="w-full h-full object-cover"
              />
            )}

            {/* Custom Interactive Player Controls Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-col gap-2">
              <input
                type="range"
                min="0"
                max={template.durationSeconds}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/20 hover:bg-white/40 accent-sky-400 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="font-mono text-[11px] text-white/80">
                    {Math.floor(currentTime).toString().padStart(2, '0')}:
                    {Math.floor((currentTime % 1) * 60).toString().padStart(2, '0')} / {template.duration}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-semibold text-sky-300">
                    {template.aspectRatio} • {template.fps}fps
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Template Metadata, Slots Breakdown & Action CTA */}
        <div className="md:w-2/5 flex flex-col justify-between p-6 bg-[#0d1117] overflow-y-auto max-h-[540px]">
          <div className="space-y-5">
            {/* Header Title & Favorite */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {template.style} • {template.category.replace('_', ' ').toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={handleFavoriteToggle}
                  className={`p-2 rounded-full border transition-all ${
                    isFavorite
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                  title={isFavorite ? 'Saved to favorites' : 'Save to favorites'}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>

              <h2 className="mt-3 text-xl font-bold text-white tracking-tight">
                {template.name}
              </h2>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {template.description}
              </p>
            </div>

            {/* Creator Badge & Metrics */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px]">
                  {template.creator.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1 font-semibold text-white">
                    {template.creator.name}
                    {template.creator.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{template.creator.handle || '@creator'}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 font-semibold text-amber-400 justify-end">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {template.rating.toFixed(1)}
                </div>
                <span className="text-[10px] text-slate-400">{(template.usageCount / 1000).toFixed(1)}k uses</span>
              </div>
            </div>

            {/* Required Media Slots List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Required Media ({template.mediaSlots.length} Slots)
                </h4>
                <span className="text-[11px] text-slate-400">{template.duration} Total</span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {template.mediaSlots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-200">{slot.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {slot.durationSeconds.toFixed(1)}s • {slot.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Soundtrack & Audio Info */}
            {template.audioTrack && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="font-semibold text-white line-clamp-1">{template.audioTrack.title}</div>
                      <div className="text-[10px] text-slate-400">{template.audioTrack.artist}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-sky-300">
                    <Activity className="w-3.5 h-3.5" />
                    {template.audioTrack.bpm} BPM
                  </div>
                </div>
              </div>
            )}

            {/* Effects & Transitions Tags */}
            <div className="flex flex-wrap gap-1.5">
              {template.transitions.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-slate-300 border border-white/5">
                  ⚡ {t}
                </span>
              ))}
              {template.effects.map((e) => (
                <span key={e} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-slate-300 border border-white/5">
                  ✨ {e}
                </span>
              ))}
            </div>
          </div>

          {/* Primary CTA Button */}
          <div className="pt-4 mt-4 border-t border-white/10">
            <button
              type="button"
              id="btn_modal_use_template"
              onClick={() => {
                onClose();
                onUseTemplate(template);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-xl shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Wand2 className="w-4 h-4" />
              Use This Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
