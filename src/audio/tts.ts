import {
  TextToSpeechModule,
  KOKORO_MEDIUM,
  KOKORO_VOICE_AF_HEART,
  initExecutorch,
} from 'react-native-executorch';
import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';
import {
  AudioContext,
  AudioBufferQueueSourceNode,
} from 'react-native-audio-api';

// Initialize ExecuTorch with the resource fetcher (required in v0.8+)
let executorchInitialized = false;
function ensureExecutorchInit() {
  if (executorchInitialized) return;
  initExecutorch({ resourceFetcher: ExpoResourceFetcher });
  executorchInitialized = true;
}

const KOKORO_SAMPLE_RATE = 24000;

export interface TtsCallbacks {
  onModelDownloadProgress?: (progress: number) => void;
  onSpeakingStateChange?: (speaking: boolean) => void;
  onError?: (err: Error) => void;
}

let ttsModule: TextToSpeechModule | null = null;
let audioContext: AudioContext | null = null;
let queueNode: AudioBufferQueueSourceNode | null = null;
let isStreaming = false;
let cb: TtsCallbacks = {};

// Track when the audio currently queued will finish playing.
// onSpeakingStateChange(false) fires only after this time elapses.
let audioPlaybackEndsAt = 0;
let speakingFalseTimer: ReturnType<typeof setTimeout> | null = null;
let speakingState = false;

// Sentence aggregator state — Pipecat-style
const SENTENCE_END = new Set(['.', '!', '?', ';', '…', '\n']);
let textBuffer = '';
let needsLookahead = false;
let firstChunkSpoken = false;

function setupQueueNode() {
  if (!audioContext) return;
  // Stop and disconnect any existing node
  if (queueNode) {
    try {
      queueNode.stop();
      queueNode.disconnect();
    } catch {}
    queueNode = null;
  }
  queueNode = audioContext.createBufferQueueSource();
  queueNode.connect(audioContext.destination);
  queueNode.start();
}

function setSpeaking(isSpeaking: boolean) {
  if (isSpeaking === speakingState) return;
  speakingState = isSpeaking;
  console.log('[TTS] setSpeaking:', isSpeaking);
  cb.onSpeakingStateChange?.(isSpeaking);
}

function scheduleSpeakingFalse() {
  if (speakingFalseTimer) clearTimeout(speakingFalseTimer);
  const remainingMs = Math.max(0, audioPlaybackEndsAt - Date.now());
  speakingFalseTimer = setTimeout(() => {
    speakingFalseTimer = null;
    console.log('[TTS] speaking-false timer fired');
    setSpeaking(false);
  }, remainingMs + 200);
}

function enqueueAudio(samples: Float32Array) {
  if (!audioContext || !queueNode || samples.length === 0) return;
  const buffer = audioContext.createBuffer(1, samples.length, KOKORO_SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);
  queueNode.enqueueBuffer(buffer);

  // Track when this chunk will finish playing
  const durationMs = (samples.length / KOKORO_SAMPLE_RATE) * 1000;
  const now = Date.now();
  audioPlaybackEndsAt = Math.max(audioPlaybackEndsAt, now) + durationMs;
  setSpeaking(true);
  // Push the speaking-false timer forward each time a new chunk arrives.
  // When chunks stop coming, the timer naturally fires after the last audio plays.
  scheduleSpeakingFalse();
}

async function speakChunk(text: string) {
  if (!ttsModule) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    // streamInsert is synchronous queue — actual audio playback time
    // is tracked in enqueueAudio when chunks are produced.
    ttsModule.streamInsert(trimmed);
  } catch (e) {
    cb.onError?.(e instanceof Error ? e : new Error(String(e)));
  }
}

async function startStreamingSession() {
  if (!ttsModule || isStreaming) return;
  isStreaming = true;
  setupQueueNode();
  audioPlaybackEndsAt = 0;
  if (speakingFalseTimer) {
    clearTimeout(speakingFalseTimer);
    speakingFalseTimer = null;
  }
  try {
    const generator = ttsModule.stream({ speed: 1.0, stopAutomatically: false });
    for await (const chunk of generator) {
      enqueueAudio(chunk);
    }
  } catch (e) {
    cb.onError?.(e instanceof Error ? e : new Error(String(e)));
  } finally {
    isStreaming = false;
    // Fire onSpeakingStateChange(false) only after the queued audio finishes playing
    scheduleSpeakingFalse();
  }
}

export async function initTts(callbacks: TtsCallbacks): Promise<void> {
  cb = callbacks;
  ensureExecutorchInit();
  audioContext = new AudioContext({ sampleRate: KOKORO_SAMPLE_RATE });

  ttsModule = await TextToSpeechModule.fromModelName(
    { model: KOKORO_MEDIUM, voice: KOKORO_VOICE_AF_HEART },
    (progress: number) => {
      callbacks.onModelDownloadProgress?.(progress);
    }
  );
}

/** Push text token from LLM stream. Splits into sentences and feeds Kokoro. */
export function pushToken(token: string): void {
  if (!ttsModule) return;
  for (const ch of token) {
    textBuffer += ch;

    // Lookahead: confirm sentence boundary on first non-whitespace after punct
    if (needsLookahead) {
      if (ch.trim()) {
        needsLookahead = false;
        const sentence = textBuffer.slice(0, -1).trim();
        const last = textBuffer.slice(-1);
        textBuffer = last;
        if (sentence) {
          if (!isStreaming) startStreamingSession().catch(() => {});
          speakChunk(sentence);
          firstChunkSpoken = true;
        }
      }
      continue;
    }

    if (SENTENCE_END.has(ch)) {
      needsLookahead = true;
      continue;
    }

    // First chunk: also flush at comma/colon past 25 chars for low TTFA
    if (
      !firstChunkSpoken &&
      (ch === ',' || ch === ':') &&
      textBuffer.length >= 25
    ) {
      const chunk = textBuffer.trim();
      textBuffer = '';
      if (!isStreaming) startStreamingSession().catch(() => {});
      speakChunk(chunk);
      firstChunkSpoken = true;
    }
  }
}

/** Call when LLM finishes streaming — flush any trailing text. */
export function endStream(): void {
  if (!ttsModule) return;
  const tail = textBuffer.trim();
  textBuffer = '';
  needsLookahead = false;
  if (tail) {
    if (!isStreaming) startStreamingSession().catch(() => {});
    speakChunk(tail);
  }
  // Tell Kokoro to finish processing the buffer
  try {
    ttsModule.streamStop(false);
  } catch {}
}

/** Barge-in: stop everything immediately. */
export function stopTts(): void {
  textBuffer = '';
  needsLookahead = false;
  firstChunkSpoken = false;
  if (ttsModule) {
    try {
      ttsModule.streamStop(true);
    } catch {}
  }
  if (queueNode) {
    try {
      queueNode.clearBuffers();
      queueNode.stop();
      queueNode.disconnect();
    } catch {}
    queueNode = null;
  }
  isStreaming = false;
  audioPlaybackEndsAt = 0;
  if (speakingFalseTimer) {
    clearTimeout(speakingFalseTimer);
    speakingFalseTimer = null;
  }
  setSpeaking(false);
}

/** Reset for a new turn. */
export function resetTts(): void {
  stopTts();
  textBuffer = '';
  needsLookahead = false;
  firstChunkSpoken = false;
}

export async function releaseTts(): Promise<void> {
  stopTts();
  if (ttsModule) {
    try {
      ttsModule.delete();
    } catch {}
    ttsModule = null;
  }
  if (audioContext) {
    try {
      await audioContext.close();
    } catch {}
    audioContext = null;
  }
}

export function isTtsSpeaking(): boolean {
  return isStreaming;
}
