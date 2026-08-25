/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Sliders, ChevronDown, ChevronRight, Sparkles, Droplet, Sun, Circle, Zap, Contrast, Layers, Box, Grid } from 'lucide-react';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { EffectRegistry } from '../../rendering/effects/EffectRegistry';
import { EffectInstance, IEffect, EffectCategory } from '../../rendering/effects/EffectTypes';
import { UpdateEffectsCommand } from '../../engine/command/implementations/UpdateEffectsCommand';
import { KeyframeControl } from './KeyframeControl';

const iconMap: Record<string, React.ReactNode> = {
  Droplet: <Droplet className="w-4 h-4 text-sky-400" />,
  Sun: <Sun className="w-4 h-4 text-amber-400" />,
  Circle: <Circle className="w-4 h-4 text-indigo-400" />,
  Zap: <Zap className="w-4 h-4 text-yellow-400" />,
  Contrast: <Contrast className="w-4 h-4 text-purple-400" />,
  Layers: <Layers className="w-4 h-4 text-emerald-400" />,
  Sparkles: <Sparkles className="w-4 h-4 text-pink-400" />,
  Box: <Box className="w-4 h-4 text-cyan-400" />,
  Grid: <Grid className="w-4 h-4 text-violet-400" />,
};

interface EffectsPanelProps {
  clip?: TimelineClip;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({ clip: propClip }) => {
  const { timelineEngine, commandManager, selectedClip } = useEditor();
  const clip = propClip || selectedClip;

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFx, setExpandedFx] = useState<Record<string, boolean>>({});

  if (!clip) {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
        <p>Select a clip on the timeline to apply visual effects & animations.</p>
      </div>
    );
  }

  const registry = EffectRegistry.getInstance();
  const allEffects = registry.getAllEffects();
  const activeEffects: EffectInstance[] = clip.effects || [];

  const updateEffects = (newEffects: EffectInstance[]) => {
    const cmd = new UpdateEffectsCommand(timelineEngine, clip.id, newEffects);
    commandManager.execute(cmd);
  };

  const handleAddEffect = (effect: IEffect) => {
    const newInstance: EffectInstance = {
      id: `fx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      effectId: effect.id,
      name: effect.name,
      enabled: true,
      opacity: 1.0,
      params: effect.getDefaultParams(),
    };

    updateEffects([...activeEffects, newInstance]);
    setExpandedFx((prev) => ({ ...prev, [newInstance.id]: true }));
    setShowAddModal(false);
  };

  const handleToggleEnable = (id: string) => {
    const updated = activeEffects.map((fx) =>
      fx.id === id ? { ...fx, enabled: !fx.enabled } : fx
    );
    updateEffects(updated);
  };

  const handleDeleteEffect = (id: string) => {
    const updated = activeEffects.filter((fx) => fx.id !== id);
    updateEffects(updated);
  };

  const handleParamChange = (instanceId: string, paramKey: string, value: any) => {
    const updated = activeEffects.map((fx) => {
      if (fx.id === instanceId) {
        return {
          ...fx,
          params: {
            ...fx.params,
            [paramKey]: value,
          },
        };
      }
      return fx;
    });
    updateEffects(updated);
  };

  const handleOpacityChange = (instanceId: string, opacity: number) => {
    const updated = activeEffects.map((fx) =>
      fx.id === instanceId ? { ...fx, opacity } : fx
    );
    updateEffects(updated);
  };

  const toggleExpand = (id: string) => {
    setExpandedFx((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredLibrary = allEffects.filter((eff) => {
    const matchCat = selectedCategory === 'all' || eff.category === selectedCategory;
    const matchSearch = eff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        eff.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Active Stack ({activeEffects.length})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded text-xs font-medium transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Effect</span>
        </button>
      </div>

      {/* Active Stack List */}
      {activeEffects.length === 0 ? (
        <div className="p-6 border border-dashed border-zinc-800 rounded-lg text-center bg-zinc-900/40">
          <Sliders className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-400 font-medium">No effects applied to this clip</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Add blurs, blooms, grain, vignettes or stylizers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeEffects.map((fxInstance, index) => {
            const effectDef = registry.getEffect(fxInstance.effectId);
            const isExpanded = expandedFx[fxInstance.id] !== false;

            return (
              <div
                key={fxInstance.id}
                className="bg-zinc-900/90 border border-zinc-800 rounded-lg overflow-hidden transition"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/60 select-none">
                  <button
                    type="button"
                    onClick={() => toggleExpand(fxInstance.id)}
                    className="flex items-center space-x-2 text-left flex-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    {iconMap[effectDef?.iconName || 'Sparkles'] || <Sparkles className="w-4 h-4 text-purple-400" />}
                    <span className={`text-xs font-medium ${fxInstance.enabled ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>
                      {fxInstance.name}
                    </span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleToggleEnable(fxInstance.id)}
                      className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-700/60"
                      title={fxInstance.enabled ? 'Disable Effect' : 'Enable Effect'}
                    >
                      {fxInstance.enabled ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEffect(fxInstance.id)}
                      className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-700/60"
                      title="Delete Effect"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Parameters Body */}
                {isExpanded && (
                  <div className="p-3 space-y-3 border-t border-zinc-800/60 bg-zinc-950/40">
                    {/* Master Mix / Opacity */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                        <span>Effect Mix / Opacity</span>
                        <span>{Math.round((fxInstance.opacity ?? 1.0) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={fxInstance.opacity ?? 1.0}
                        onChange={(e) => handleOpacityChange(fxInstance.id, parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    {/* Effect Specific Parameters */}
                    {effectDef?.parameters.map((param) => {
                      const currentVal = fxInstance.params[param.id] ?? (param as any).defaultValue;
                      const propPath = `effects[${index}].params.${param.id}`;

                      if (param.type === 'range' || param.type === 'number') {
                        return (
                          <div key={param.id} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400">{param.name}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-zinc-300 font-mono">
                                  {typeof currentVal === 'number' ? currentVal.toFixed(1) : currentVal}
                                  {(param as any).unit || ''}
                                </span>
                                {param.keyframeable && (
                                  <KeyframeControl
                                    clip={clip}
                                    propertyPath={propPath}
                                    propertyName={`${fxInstance.name} ${param.name}`}
                                    currentValue={currentVal}
                                  />
                                )}
                              </div>
                            </div>
                            <input
                              type="range"
                              min={(param as any).min}
                              max={(param as any).max}
                              step={(param as any).step || 0.1}
                              value={currentVal}
                              onChange={(e) => handleParamChange(fxInstance.id, param.id, parseFloat(e.target.value))}
                              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>
                        );
                      }

                      if (param.type === 'color') {
                        return (
                          <div key={param.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400">{param.name}</span>
                            <div className="flex items-center space-x-2">
                              <input
                                type="color"
                                value={currentVal}
                                onChange={(e) => handleParamChange(fxInstance.id, param.id, e.target.value)}
                                className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                              />
                              <span className="text-zinc-300 font-mono uppercase">{currentVal}</span>
                            </div>
                          </div>
                        );
                      }

                      if (param.type === 'boolean') {
                        return (
                          <div key={param.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400">{param.name}</span>
                            <input
                              type="checkbox"
                              checked={!!currentVal}
                              onChange={(e) => handleParamChange(fxInstance.id, param.id, e.target.checked)}
                              className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                          </div>
                        );
                      }

                      if (param.type === 'select') {
                        return (
                          <div key={param.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400">{param.name}</span>
                            <select
                              value={currentVal}
                              onChange={(e) => handleParamChange(fxInstance.id, param.id, e.target.value)}
                              className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded px-2 py-0.5 text-xs focus:outline-none"
                            >
                              {(param as any).options.map((opt: any) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Effect Modal Browser */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Effect Library</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded"
              >
                Close
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-950/60 space-y-2">
              <input
                type="text"
                placeholder="Search effects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              />

              <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs">
                {['all', 'blur', 'lighting', 'stylize', 'distortion', 'utility'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-0.5 rounded capitalize whitespace-nowrap text-[11px] font-medium transition ${
                      selectedCategory === cat
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Effects Grid */}
            <div className="p-4 overflow-y-auto grid grid-cols-2 gap-2.5">
              {filteredLibrary.map((eff) => (
                <button
                  key={eff.id}
                  type="button"
                  onClick={() => handleAddEffect(eff)}
                  className="flex flex-col text-left p-3 rounded-lg bg-zinc-800/60 hover:bg-purple-900/20 border border-zinc-800 hover:border-purple-500/50 transition group"
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {iconMap[eff.iconName || 'Sparkles'] || <Sparkles className="w-4 h-4 text-purple-400" />}
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-purple-300">
                      {eff.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {eff.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
