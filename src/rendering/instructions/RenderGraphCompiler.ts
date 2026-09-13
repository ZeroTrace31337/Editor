/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RationalTime,
  subtractRationalTime,
  addRationalTime,
  rationalTimeToSeconds,
  secondsToRationalTime,
  compareRationalTime,
  createRationalTime,
} from '../../core/time/RationalTime';
import { Sequence } from '../../domain/timeline/Sequence';
import { TimelineClip } from '../../domain/timeline/Clip';
import { Track } from '../../domain/timeline/Track';
import { KeyframeEvaluator } from '../../domain/keyframe/KeyframeEvaluator';
import { RenderInstructionTree, RenderInstruction, ClipRenderInstruction } from './RenderInstruction';
import { Transform2D } from '../../core/math/Transform2D';
import { ColorGrade, createDefaultColorGrade } from '../../domain/color/ColorGrade';
import { SpeedEngine } from '../../engine/speed/SpeedEngine';
import { TimelineIntervalIndex } from '../../engine/timeline/TimelineIntervalIndex';

export class RenderGraphCompiler {
  /**
   * Compiles the active timeline state into an immutable, evaluated RenderInstructionTree.
   */
  public static compile(
    sequence: Sequence,
    currentTime: RationalTime,
    canvasWidth: number,
    canvasHeight: number
  ): RenderInstructionTree {
    const instructions: RenderInstruction[] = [];

    // 1. Initial deep neutral backdrop clear
    instructions.push({
      kind: 'clear',
      color: '#0a0b0e',
    });

    // 2. Query active clips using high-performance TimelineIntervalIndex
    const intervalIndex = TimelineIntervalIndex.getForSequence(sequence);
    const activeLayers = intervalIndex.queryActiveVisualLayers(currentTime);

    // 3. Compile instructions for each active layer
    for (const { clip, track } of activeLayers) {
      const elapsedOnTimeline = subtractRationalTime(currentTime, clip.timelineRange.start);
      const clipDuration = clip.timelineRange.duration;

      // Source offset time with speed and curve integration
      const elapsedOnTimelineSec = Math.max(0, rationalTimeToSeconds(elapsedOnTimeline));
      const clipDurationSec = Math.max(0.001, rationalTimeToSeconds(clipDuration));
      const sourceStartSec = Math.max(0, rationalTimeToSeconds(clip.sourceRange.start));
      const sourceDurationSec = Math.max(0.001, rationalTimeToSeconds(clip.sourceRange.duration));

      let sourceSeconds = sourceStartSec + elapsedOnTimelineSec * (clip.speed ?? 1.0);
      if (clip.speedSettings && (clip.speedSettings.curvePreset !== 'Standard' || clip.speedSettings.reverse)) {
        const speedEngine = SpeedEngine.getInstance();
        sourceSeconds = speedEngine.evaluateSourceSeconds(
          clip.id,
          elapsedOnTimelineSec,
          clipDurationSec,
          sourceStartSec,
          sourceDurationSec
        );
      } else if (clip.speedSettings?.reverse) {
        sourceSeconds = sourceStartSec + Math.max(0, sourceDurationSec - elapsedOnTimelineSec * (clip.speed ?? 1.0));
      }
      sourceSeconds = Math.max(0, sourceSeconds);
      const sourceTime = secondsToRationalTime(sourceSeconds);

      // Evaluate animated Transform
      const uniformScale = this.evaluateProp(clip, 'transform.scale', clip.transform.scale?.x ?? 1.0, elapsedOnTimeline);
      const evaluatedTransform: Transform2D = {
        position: {
          x: this.evaluateProp(clip, 'transform.position.x', clip.transform.position?.x ?? 0, elapsedOnTimeline),
          y: this.evaluateProp(clip, 'transform.position.y', clip.transform.position?.y ?? 0, elapsedOnTimeline),
        },
        scale: {
          x: this.evaluateProp(clip, 'transform.scale.x', clip.transform.scale?.x ?? uniformScale, elapsedOnTimeline),
          y: this.evaluateProp(clip, 'transform.scale.y', clip.transform.scale?.y ?? uniformScale, elapsedOnTimeline),
        },
        rotation: this.evaluateProp(clip, 'transform.rotation', clip.transform.rotation ?? 0, elapsedOnTimeline),
        anchor: {
          x: this.evaluateProp(clip, 'transform.anchor.x', clip.transform.anchor?.x ?? 0.5, elapsedOnTimeline),
          y: this.evaluateProp(clip, 'transform.anchor.y', clip.transform.anchor?.y ?? 0.5, elapsedOnTimeline),
        },
        skew: {
          x: this.evaluateProp(clip, 'transform.skew.x', clip.transform.skew?.x ?? 0, elapsedOnTimeline),
          y: this.evaluateProp(clip, 'transform.skew.y', clip.transform.skew?.y ?? 0, elapsedOnTimeline),
        },
        perspective: this.evaluateProp(clip, 'transform.perspective', clip.transform.perspective ?? 0, elapsedOnTimeline),
        flipH: clip.transform.flipH,
        flipV: clip.transform.flipV,
        crop: clip.transform.crop,
      };

      // Evaluate animated Opacity
      const evaluatedOpacity = Math.max(
        0,
        Math.min(1, this.evaluateProp(clip, 'opacity', clip.opacity ?? 1.0, elapsedOnTimeline))
      );

      // Helper for safe evaluated numbers
      const safeNum = (val: unknown, fallback: number): number =>
        typeof val === 'number' && Number.isFinite(val) ? val : fallback;

      // Evaluate animated Color Grade
      let evaluatedColorGrade: ColorGrade;
      const defaultGrade = createDefaultColorGrade();
      if (clip.colorGrade?.colorGradeEnabled === false) {
        evaluatedColorGrade = {
          ...defaultGrade,
          colorGradeEnabled: false,
        };
      } else {
        const baseGrade = clip.colorGrade || defaultGrade;
        evaluatedColorGrade = {
          ...defaultGrade,
          ...baseGrade,
          exposure: safeNum(this.evaluateProp(clip, 'colorGrade.exposure', baseGrade.exposure ?? 0, elapsedOnTimeline), 0),
          contrast: safeNum(this.evaluateProp(clip, 'colorGrade.contrast', baseGrade.contrast ?? 1.0, elapsedOnTimeline), 1.0),
          brightness: safeNum(this.evaluateProp(clip, 'colorGrade.brightness', baseGrade.brightness ?? 0, elapsedOnTimeline), 0),
          brilliance: safeNum(this.evaluateProp(clip, 'colorGrade.brilliance', baseGrade.brilliance ?? 0, elapsedOnTimeline), 0),
          saturation: safeNum(this.evaluateProp(clip, 'colorGrade.saturation', baseGrade.saturation ?? 1.0, elapsedOnTimeline), 1.0),
          vibrance: safeNum(this.evaluateProp(clip, 'colorGrade.vibrance', baseGrade.vibrance ?? 0, elapsedOnTimeline), 0),
          temperature: safeNum(this.evaluateProp(clip, 'colorGrade.temperature', baseGrade.temperature ?? 0, elapsedOnTimeline), 0),
          tint: safeNum(this.evaluateProp(clip, 'colorGrade.tint', baseGrade.tint ?? 0, elapsedOnTimeline), 0),
          hue: safeNum(this.evaluateProp(clip, 'colorGrade.hue', baseGrade.hue ?? 0, elapsedOnTimeline), 0),
          highlights: safeNum(this.evaluateProp(clip, 'colorGrade.highlights', baseGrade.highlights ?? 0, elapsedOnTimeline), 0),
          shadows: safeNum(this.evaluateProp(clip, 'colorGrade.shadows', baseGrade.shadows ?? 0, elapsedOnTimeline), 0),
          whites: safeNum(this.evaluateProp(clip, 'colorGrade.whites', baseGrade.whites ?? 0, elapsedOnTimeline), 0),
          blacks: safeNum(this.evaluateProp(clip, 'colorGrade.blacks', baseGrade.blacks ?? 0, elapsedOnTimeline), 0),
          sharpen: safeNum(this.evaluateProp(clip, 'colorGrade.sharpen', baseGrade.sharpen ?? 0, elapsedOnTimeline), 0),
          clarity: safeNum(this.evaluateProp(clip, 'colorGrade.clarity', baseGrade.clarity ?? 0, elapsedOnTimeline), 0),
          noiseReduction: safeNum(this.evaluateProp(clip, 'colorGrade.noiseReduction', baseGrade.noiseReduction ?? 0, elapsedOnTimeline), 0),
          fade: safeNum(this.evaluateProp(clip, 'colorGrade.fade', baseGrade.fade ?? 0, elapsedOnTimeline), 0),
          vignette: safeNum(this.evaluateProp(clip, 'colorGrade.vignette', baseGrade.vignette ?? 0, elapsedOnTimeline), 0),
          grain: safeNum(this.evaluateProp(clip, 'colorGrade.grain', baseGrade.grain ?? 0, elapsedOnTimeline), 0),
          wheels: baseGrade.wheels || defaultGrade.wheels,
          curves: baseGrade.curves || defaultGrade.curves,
          hsl: baseGrade.hsl || defaultGrade.hsl,
        };
      }

      // Evaluate animated Effects Stack
      const evaluatedEffects = (clip.effects || []).map((fx, idx) => {
        const evalParams = { ...fx.params };
        for (const paramKey of Object.keys(fx.params)) {
          const path = `effects[${idx}].params.${paramKey}`;
          if (typeof fx.params[paramKey] === 'number') {
            evalParams[paramKey] = this.evaluateProp(clip, path, fx.params[paramKey], elapsedOnTimeline);
          }
        }
        return {
          ...fx,
          params: evalParams,
        };
      });

      // Evaluate animated Masks
      const evaluatedMasks = (clip.masks || []).map((mask, mIdx) => {
        return {
          ...mask,
          position: {
            x: this.evaluateProp(clip, `masks[${mIdx}].position.x`, mask.position.x, elapsedOnTimeline),
            y: this.evaluateProp(clip, `masks[${mIdx}].position.y`, mask.position.y, elapsedOnTimeline),
          },
          size: {
            width: this.evaluateProp(clip, `masks[${mIdx}].size.width`, mask.size.width, elapsedOnTimeline),
            height: this.evaluateProp(clip, `masks[${mIdx}].size.height`, mask.size.height, elapsedOnTimeline),
          },
          rotation: this.evaluateProp(clip, `masks[${mIdx}].rotation`, mask.rotation, elapsedOnTimeline),
          opacity: Math.max(0, Math.min(1, this.evaluateProp(clip, `masks[${mIdx}].opacity`, mask.opacity, elapsedOnTimeline))),
          feather: this.evaluateProp(clip, `masks[${mIdx}].feather`, mask.feather, elapsedOnTimeline),
          expansion: this.evaluateProp(clip, `masks[${mIdx}].expansion`, mask.expansion, elapsedOnTimeline),
        };
      });

      // Evaluate Transitions
      let transitionInInfo: ClipRenderInstruction['transitionIn'];
      if (clip.transitionIn) {
        const transDurSec = rationalTimeToSeconds(clip.transitionIn.duration);
        const elapsedSec = rationalTimeToSeconds(elapsedOnTimeline);
        if (transDurSec > 0 && elapsedSec < transDurSec) {
          const progress = Math.max(0, Math.min(1, elapsedSec / transDurSec));
          transitionInInfo = {
            transition: clip.transitionIn,
            progress,
          };
        }
      }

      let transitionOutInfo: ClipRenderInstruction['transitionOut'];
      if (clip.transitionOut) {
        const remainingTime = subtractRationalTime(clipDuration, elapsedOnTimeline);
        const transDurSec = rationalTimeToSeconds(clip.transitionOut.duration);
        const remainingSec = rationalTimeToSeconds(remainingTime);
        if (transDurSec > 0 && remainingSec < transDurSec) {
          const progress = Math.max(0, Math.min(1, remainingSec / transDurSec));
          transitionOutInfo = {
            transition: clip.transitionOut,
            progress: 1.0 - progress, // 0 -> 1 as clip ends
          };
        }
      }

      const clipInstruction: ClipRenderInstruction = {
        kind: 'clip',
        clip,
        track,
        sourceTime,
        sourceSeconds,
        evaluatedTransform,
        evaluatedOpacity,
        evaluatedColorGrade,
        evaluatedEffects,
        evaluatedMasks,
        blendMode: clip.blendMode || 'source-over',
        transitionIn: transitionInInfo,
        transitionOut: transitionOutInfo,
      };

      instructions.push(clipInstruction);
    }

    return {
      timestamp: currentTime,
      width: canvasWidth,
      height: canvasHeight,
      instructions,
    };
  }

  private static evaluateProp(
    clip: TimelineClip,
    propertyPath: string,
    fallbackValue: number,
    clipTime: RationalTime
  ): number {
    if (!clip.keyframeTracks || !clip.keyframeTracks[propertyPath]) {
      return fallbackValue;
    }
    return KeyframeEvaluator.evaluateNumber(clip.keyframeTracks[propertyPath], clipTime);
  }
}
