import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export interface PipelineCallbacks {
  onPartialTranscription: (text: string) => void;
  onFinalTranscription: (text: string) => void;
  onVadEvent: (isSpeech: boolean) => void;
  onError: (error: Error) => void;
}

let callbacks: PipelineCallbacks | null = null;
let isListening = false;
// Half-duplex echo prevention: while TTS is speaking, fully stop the recognizer.
// Restart it after TTS ends + a small tail-window for trailing speaker bleed.
let ttsActive = false;
const POST_TTS_RESUME_MS = 400;

let cleanupFns: (() => void)[] = [];

function setupListeners(cb: PipelineCallbacks) {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];

  const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (!transcript) return;

    if (event.isFinal) {
      cb.onFinalTranscription(transcript);
    } else {
      cb.onPartialTranscription(transcript);
    }
  });
  cleanupFns.push(() => resultSub.remove());

  const speechStartSub = ExpoSpeechRecognitionModule.addListener('speechstart', () => {
    cb.onVadEvent(true);
  });
  cleanupFns.push(() => speechStartSub.remove());

  const speechEndSub = ExpoSpeechRecognitionModule.addListener('speechend', () => {
    cb.onVadEvent(false);
  });
  cleanupFns.push(() => speechEndSub.remove());

  const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event) => {
    if (event.error === 'no-speech') return;
    cb.onError(new Error(`Speech recognition error: ${event.error} - ${event.message}`));
  });
  cleanupFns.push(() => errorSub.remove());

  // Auto-restart STT when it ends — but ONLY if we're listening AND TTS is not playing.
  const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
    console.log('[STT] end event - isListening:', isListening, 'ttsActive:', ttsActive);
    if (isListening && !ttsActive) {
      setTimeout(() => {
        if (isListening && !ttsActive) {
          console.log('[STT] auto-restarting after end');
          startRecognition();
        }
      }, 300);
    }
  });
  cleanupFns.push(() => endSub.remove());
}

function startRecognition() {
  try {
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      addsPunctuation: true,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 2000,
      },
    });
    console.log('[STT] start() called');
  } catch (e) {
    console.log('[STT] start failed:', e);
  }
}

export async function initPipeline(cb: PipelineCallbacks): Promise<void> {
  callbacks = cb;

  const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!perms.granted) {
    throw new Error('Microphone permission denied');
  }

  setupListeners(cb);
}

export async function startListening(): Promise<void> {
  isListening = true;
  startRecognition();
}

export async function stopListening(): Promise<void> {
  isListening = false;
  ExpoSpeechRecognitionModule.stop();
}

/** Call when TTS starts speaking — gracefully stop the recognizer */
export function pauseForTts(): void {
  if (ttsActive) return;
  ttsActive = true;
  console.log('[STT] pauseForTts - calling stop()');
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (e) {
    console.log('[STT] stop failed:', e);
  }
}

/** Call when TTS finishes — restart recognizer after a tail-suppression window */
export function resumeAfterTts(): void {
  if (!ttsActive) return;
  ttsActive = false;
  console.log('[STT] resumeAfterTts - scheduling restart in', POST_TTS_RESUME_MS, 'ms');
  setTimeout(() => {
    console.log('[STT] resumeAfterTts timer - isListening:', isListening, 'ttsActive:', ttsActive);
    if (isListening && !ttsActive) {
      startRecognition();
    }
  }, POST_TTS_RESUME_MS);
}

export async function releasePipeline(): Promise<void> {
  isListening = false;
  ttsActive = false;
  ExpoSpeechRecognitionModule.abort();
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  callbacks = null;
}
