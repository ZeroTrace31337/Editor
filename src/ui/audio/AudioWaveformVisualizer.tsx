/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { MediaAsset } from '../../domain/media/MediaAsset';
import { rationalTimeToSeconds } from '../../core/time/RationalTime';

interface AudioWaveformVisualizerProps {
  asset?: MediaAsset;
  peaks?: number[];
  sourceStartSec?: number;
  sourceDurationSec?: number;
  fadeInSec?: number;
  fadeOutSec?: number;
  color?: string;
  progressColor?: string;
  className?: string;
  progress?: number; // 0.0 to 1.0 for library preview playback
  barGap?: number;
  showCenterLine?: boolean;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  asset,
  peaks: propPeaks,
  sourceStartSec = 0,
  sourceDurationSec,
  fadeInSec = 0,
  fadeOutSec = 0,
  color = '#10b981', // emerald-500
  progressColor = '#38bdf8', // sky-400
  className = '',
  progress = -1,
  barGap = 1,
  showCenterLine = true,
}) => {
  const [computedPeaks, setComputedPeaks] = useState<number[] | null>(null);

  const rawPeaks = propPeaks || asset?.waveformPeaks || computedPeaks;

  // Lazily compute peaks if not available on asset
  useEffect(() => {
    if (propPeaks || asset?.waveformPeaks || !asset?.uri) return;

    let isMounted = true;
    const compute = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const resp = await fetch(asset.uri);
        const arrayBuf = await resp.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        const channelData = audioBuf.getChannelData(0);
        const samples = 80;
        const blockSize = Math.floor(channelData.length / samples);
        const result: number[] = [];

        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          let max = 0;
          for (let j = 0; j < blockSize; j++) {
            const val = Math.abs(channelData[start + j] || 0);
            if (val > max) max = val;
          }
          result.push(Math.min(1.0, Number(max.toFixed(3))));
        }

        ctx.close();
        if (isMounted) {
          setComputedPeaks(result);
          if (asset) asset.waveformPeaks = result;
        }
      } catch {
        if (isMounted) {
          // Fallback procedural waveform shape
          setComputedPeaks([0.3, 0.5, 0.7, 0.8, 0.6, 0.4, 0.5, 0.9, 0.6, 0.4, 0.3]);
        }
      }
    };

    compute();
    return () => {
      isMounted = false;
    };
  }, [asset, propPeaks]);

  // Trim peaks according to source in/out
  const displayedPeaks = useMemo(() => {
    const peaks = rawPeaks || [0.2, 0.4, 0.6, 0.8, 0.7, 0.5, 0.3, 0.5, 0.8, 0.4, 0.2];
    const totalAssetDur = asset?.duration ? rationalTimeToSeconds(asset.duration) : (sourceDurationSec || 10);
    const validTotalDur = Math.max(0.1, totalAssetDur);
    const validClipDur = sourceDurationSec !== undefined ? sourceDurationSec : validTotalDur;

    const startFrac = Math.max(0, Math.min(1, sourceStartSec / validTotalDur));
    const endFrac = Math.max(startFrac, Math.min(1, (sourceStartSec + validClipDur) / validTotalDur));

    const totalCount = peaks.length;
    const startIndex = Math.floor(startFrac * totalCount);
    const endIndex = Math.ceil(endFrac * totalCount);

    const slice = peaks.slice(startIndex, Math.max(startIndex + 1, endIndex));
    return slice.length > 0 ? slice : peaks;
  }, [rawPeaks, asset?.duration, sourceStartSec, sourceDurationSec]);

  const numBars = displayedPeaks.length;

  return (
    <div className={`relative w-full h-full flex items-center overflow-hidden pointer-events-none select-none ${className}`}>
      {/* Subtle center line */}
      {showCenterLine && (
        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-emerald-500/20 pointer-events-none" />
      )}

      <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${numBars * 3} 100`}>
        {displayedPeaks.map((peak, index) => {
          const frac = index / numBars;
          const isPassedProgress = progress >= 0 && frac <= progress;
          const barColor = isPassedProgress ? progressColor : color;

          // Compute fade multiplier
          let fadeMult = 1.0;
          if (sourceDurationSec && sourceDurationSec > 0) {
            const timeAtBar = frac * sourceDurationSec;
            if (fadeInSec > 0 && timeAtBar < fadeInSec) {
              fadeMult = Math.max(0.1, timeAtBar / fadeInSec);
            } else if (fadeOutSec > 0 && timeAtBar > (sourceDurationSec - fadeOutSec)) {
              fadeMult = Math.max(0.1, (sourceDurationSec - timeAtBar) / fadeOutSec);
            }
          }

          const height = Math.max(6, Math.min(96, peak * 96 * fadeMult));
          const y = (100 - height) / 2;
          const x = index * 3 + barGap / 2;

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={Math.max(1.5, 3 - barGap)}
              height={height}
              rx={1}
              fill={barColor}
              opacity={fadeMult < 1.0 ? 0.4 + fadeMult * 0.5 : 0.85}
            />
          );
        })}
      </svg>
    </div>
  );
};
