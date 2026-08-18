/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Default sample rate (Hz) for live PCM audio produced by the model. */
export const DEFAULT_PCM_SAMPLE_RATE = 24000;

/**
 * Decodes a (possibly url-safe / data-uri-prefixed) base64 string into an
 * ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  let cleaned = base64.replace(/\s/g, '');
  const commaIndex = cleaned.indexOf(',');
  if (commaIndex !== -1) {
    cleaned = cleaned.substring(commaIndex + 1);
  }
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
  while (cleaned.length % 4 !== 0) {
    cleaned += '=';
  }
  const binaryString = window.atob(cleaned);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Encodes an ArrayBuffer into a (standard) base64 string. */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
        null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
  }
  return window.btoa(binary);
}

/** Writes an ASCII string into a DataView at the given byte offset. */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Builds WAV (RIFF) bytes wrapping raw 16-bit little-endian PCM audio, so a
 * browser `<audio>` element can play it. Live audio arrives as headerless PCM,
 * which is otherwise unplayable. Returns the full WAV (header + PCM) buffer.
 */
export function pcmToWavArrayBuffer(
    pcmBuffer: ArrayBuffer, sampleRate: number = DEFAULT_PCM_SAMPLE_RATE,
    numChannels: number = 1): ArrayBuffer {
  const out = new Uint8Array(44 + pcmBuffer.byteLength);
  const view = new DataView(out.buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmBuffer.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);  // 16 bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, pcmBuffer.byteLength, true);

  out.set(new Uint8Array(pcmBuffer), 44);
  return out.buffer;
}

/**
 * Wraps raw 16-bit little-endian PCM audio in a WAV Blob (for artifact-style
 * playback paths that read from a Blob URL / FileReader).
 */
export function pcmToWavBlob(
    pcmBuffer: ArrayBuffer, sampleRate: number = DEFAULT_PCM_SAMPLE_RATE,
    numChannels: number = 1): Blob {
  return new Blob(
      [pcmToWavArrayBuffer(pcmBuffer, sampleRate, numChannels)],
      {type: 'audio/wav'});
}

/**
 * Concatenates one or more base64-encoded raw PCM chunks (16-bit
 * little-endian) into a single WAV clip and returns its base64-encoded bytes
 * (no data-uri prefix).
 *
 * Live model turns are streamed as many small PCM chunks; folding them into one
 * WAV yields a single playable clip per turn instead of dozens of unplayable
 * fragments. Returns an empty string when there is no audio.
 */
export function pcmChunksToWavBase64(
    base64Chunks: string[], sampleRate: number = DEFAULT_PCM_SAMPLE_RATE,
    numChannels: number = 1): string {
  if (!base64Chunks || base64Chunks.length === 0) {
    return '';
  }

  const buffers = base64Chunks.filter((chunk) => !!chunk)
                      .map((chunk) => base64ToArrayBuffer(chunk));
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  if (totalLength === 0) {
    return '';
  }

  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    merged.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  // 16-bit samples must be 2-byte aligned.
  const alignedLength = merged.byteLength - (merged.byteLength % 2);
  const pcmBuffer = merged.buffer.slice(0, alignedLength);

  return arrayBufferToBase64(
      pcmToWavArrayBuffer(pcmBuffer, sampleRate, numChannels));
}
