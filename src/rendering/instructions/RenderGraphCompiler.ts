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

    // 2. Query active clips at current time
    const activeLayers: { clip: TimelineClip; track: Track }[] = [];

    for (const track of sequence.tracks) {
      if (track.kind !== 'video' || !track.visible) continue;

      for (const clip of track.clips) {
        if (clip.muted) continue;
        const start = clip.timelineRange.start;
        const end = addRationalTime(start, clip.timelineRange.duration);

        if (compareRationalTime(currentTime, start) >= 0 && compareRationalTime(currentTime, end) < 0) {
          activeLayers.push({ clip, track });
        }
      }
    }

    // Sort tracks from bottom to top for correct layered composition
    activeLayers.sort((a, b) => a.track.id.localeCompare(b.track.id));

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

      // Evaluate animated Color Grade
      let evaluatedColorGrade: ColorGrade;
      if (clip.colorGrade?.colorGradeEnabled === false) {
        evaluatedColorGrade = {
          ...createDefaultColorGrade(),
          colorGradeEnabled: false,
        };
      } else {
        evaluatedColorGrade = {
          ...clip.colorGrade,
          exposure: this.evaluateProp(clip, 'colorGrade.exposure', clip.colorGrade?.exposure ?? 0, elapsedOnTimeline),
          contrast: this.evaluateProp(clip, 'colorGrade.contrast', clip.colorGrade?.contrast ?? 1.0, elapsedOnTimeline),
          brightness: this.evaluateProp(clip, 'colorGrade.brightness', clip.colorGrade?.brightness ?? 0, elapsedOnTimeline),
          brilliance: this.evaluateProp(clip, 'colorGrade.brilliance', clip.colorGrade?.brilliance ?? 0, elapsedOnTimeline),
          saturation: this.evaluateProp(clip, 'colorGrade.saturation', clip.colorGrade?.saturation ?? 1.0, elapsedOnTimeline),
          vibrance: this.evaluateProp(clip, 'colorGrade.vibrance', clip.colorGrade?.vibrance ?? 0, elapsedOnTimeline),
          temperature: this.evaluateProp(clip, 'colorGrade.temperature', clip.colorGrade?.temperature ?? 0, elapsedOnTimeline),
          tint: this.evaluateProp(clip, 'colorGrade.tint', clip.colorGrade?.tint ?? 0, elapsedOnTimeline),
          hue: this.evaluateProp(clip, 'colorGrade.hue', clip.colorGrade?.hue ?? 0, elapsedOnTimeline),
          highlights: this.evaluateProp(clip, 'colorGrade.highlights', clip.colorGrade?.highlights ?? 0, elapsedOnTimeline),
          shadows: this.evaluateProp(clip, 'colorGrade.shadows', clip.colorGrade?.shadows ?? 0, elapsedOnTimeline),
          whites: this.evaluateProp(clip, 'colorGrade.whites', clip.colorGrade?.whites ?? 0, elapsedOnTimeline),
          blacks: this.evaluateProp(clip, 'colorGrade.blacks', clip.colorGrade?.blacks ?? 0, elapsedOnTimeline),
          sharpen: this.evaluateProp(clip, 'colorGrade.sharpen', clip.colorGrade?.sharpen ?? 0, elapsedOnTimeline),
          clarity: this.evaluateProp(clip, 'colorGrade.clarity', clip.colorGrade?.clarity ?? 0, elapsedOnTimeline),
          noiseReduction: this.evaluateProp(clip, 'colorGrade.noiseReduction', clip.colorGrade?.noiseReduction ?? 0, elapsedOnTimeline),
          fade: this.evaluateProp(clip, 'colorGrade.fade', clip.colorGrade?.fade ?? 0, elapsedOnTimeline),
          vignette: this.evaluateProp(clip, 'colorGrade.vignette', clip.colorGrade?.vignette ?? 0, elapsedOnTimeline),
          grain: this.evaluateProp(clip, 'colorGrade.grain', clip.colorGrade?.grain ?? 0, elapsedOnTimeline),
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
