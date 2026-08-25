# Lumina Studio — System Architecture Documentation

## 1. Architectural Principles

1. **Separation of Presentation and Computation:**
   - The UI layer (React 19) is strictly a view layer.
   - The Core Engine (Timeline, Time Math, Color Pipeline, Render Graph) operates independently of DOM or React state.
   - Playhead scrubbing and frame updates bypass React reconciler cycles using high-frequency direct canvas/WebGPU render callbacks.

2. **Non-Destructive Editing Pipeline:**
   - Source media is read-only and immutable.
   - Timeline operations generate instruction trees and transformations.
   - Render outputs (both preview and master export) are evaluated dynamically from the timeline DAG.

3. **Deterministic State & History:**
   - All state modifications occur through typed `Command` objects.
   - Every command provides both `execute()` and `undo()` transformations.
   - Projects can be serialized, snapshot-tested, and restored with 100% bit-exact timeline placement.

4. **Rational Time Mathematics:**
   - No floating-point time representations (`0.1 + 0.2` drift is eliminated).
   - Time is represented as `RationalTime { value: bigint, timescale: number }`.

---

## 2. Core Subsystems

### A. Core Math & Time Engine (`src/core/`)
- `RationalTime`: Exact rational number arithmetic for audio samples, video frames, and timecodes.
- `TimeRange`: Defines continuous media intervals with start and duration.
- `Timecode`: Converts between SMPTE timecodes (`HH:MM:SS:FF`), milliseconds, frame counts, and rational ticks.

### B. Domain Models (`src/domain/`)
- `Project`: Project metadata, canvas resolution, project frame rate, media pool references, and sequence list.
- `Sequence`: Active timeline containing ordered video and audio tracks, duration, and markers.
- `Track`: Layer containing zero-overlap clips, track locks, mute, and solo states.
- `Clip`: Composite object holding `timelineRange`, `sourceRange`, speed, transform, color grade, and keyframe envelopes.
- `MediaAsset`: Reference to source video/audio/image file with probed metadata (streams, resolution, codecs, waveforms).
- `ColorGrade`: Primary wheels (Lift/Gamma/Gain), Temp/Tint balance, tonal curves, and 3D LUT mappings.
- `Keyframe`: Parameter interpolation along bezier/linear curves.

### C. Command & History Subsystem (`src/engine/command/`)
- `CommandManager`: Maintains undo/redo stacks, executes atomic actions, and manages transaction batches.
- Concrete commands: `AddClipCommand`, `MoveClipCommand`, `SplitClipCommand`, `DeleteClipCommand`, `SetColorGradeCommand`.

### D. Color & Render Pipeline (`src/engine/color/` & `src/rendering/`)
- 32-bit Floating Point Color Grading Model.
- Primary color grading with Lift, Gamma, Gain, Temperature, Tint, Exposure, Highlights, Shadows, and Curves.
- 3D LUT abstraction (.cube format support architecture).
- Multi-pass GPU shader architecture for transforms, grading, blend modes, and composition.

### E. Media Processing Abstraction (`src/media-services/`)
- `IMediaProcessor`: Interface abstracting native FFmpeg / hardware transcoding.
- Capabilities: Probing metadata, generating proxy media, rendering thumbnail filmstrips, calculating audio waveform peak buffers.

---

## 3. Data Flow

```
[User Action in UI]
       │
       ▼
[Instantiate Typed Command] (e.g. SplitClipCommand)
       │
       ▼
[CommandManager.execute()] ──► [Record in Undo Stack]
       │
       ▼
[Timeline Engine Updates Sequence State]
       │
       ▼
[Render Graph Compiler]
       │
       ▼
[GPU Passes: WebCodecs/Canvas Decoders -> Transform -> Color Shaders -> Composite]
       │
       ▼
[Preview Canvas (60fps)]
```
