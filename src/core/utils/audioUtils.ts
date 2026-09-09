/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const blockAlign = numOfChan * 2;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = numSamples * blockAlign;
  const bufferLength = 44 + dataByteLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true); // Chunk size
  writeString(8, 'WAVE');

  // 2. fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  // 3. data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // 4. Interleave PCM samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numOfChan; c++) {
      let sample = channels[c][i];
      // Clamp sample to [-1, 1]
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, Math.round(intSample), true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Extracts normalized peak amplitudes from an AudioBuffer for visual waveform rendering.
 */
export function extractAudioPeaks(audioBuffer: AudioBuffer, samplesCount = 100): number[] {
  const channelCount = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0) return Array(samplesCount).fill(0.05);

  const blockSize = Math.floor(length / samplesCount);
  const peaks: number[] = [];

  for (let i = 0; i < samplesCount; i++) {
    const start = i * blockSize;
    let maxAmp = 0;

    for (let c = 0; c < channelCount; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(data[start + j] || 0);
        if (val > maxAmp) maxAmp = val;
      }
    }
    peaks.push(Math.min(1.0, Number(maxAmp.toFixed(3))));
  }

  return peaks;
}

/**
 * Normalizes audio to target maximum peak (defaults to 0.95, approx -0.5 dBFS).
 */
export function normalizeAudioBuffer(ctx: BaseAudioContext, buffer: AudioBuffer, targetPeak = 0.95): AudioBuffer {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  let maxPeak = 0;

  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;
    }
  }

  if (maxPeak === 0 || maxPeak >= targetPeak) {
    return buffer; // Already optimal or silent
  }

  const multiplier = Math.min(10.0, targetPeak / maxPeak);
  const newBuffer = ctx.createBuffer(numChannels, length, buffer.sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = newBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      dest[i] = Math.max(-1, Math.min(1, src[i] * multiplier));
    }
  }

  return newBuffer;
}

/**
 * Reverses audio buffer for reverse audio playback effect.
 */
export function reverseAudioBuffer(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const newBuffer = ctx.createBuffer(numChannels, length, buffer.sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = newBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      dest[i] = src[length - 1 - i];
    }
  }

  return newBuffer;
}

/**
 * Generates an algorithmic reverb impulse response buffer for ConvolverNode.
 */
export function createReverbImpulse(
  ctx: BaseAudioContext,
  durationSec = 2.0,
  decay = 2.0
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = i / length;
    const env = Math.pow(1 - n, decay);
    left[i] = (Math.random() * 2 - 1) * env;
    right[i] = (Math.random() * 2 - 1) * env;
  }

  return impulse;
}
