import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Waveform } from '../src/components/Waveform';
import { LiveTranscript } from '../src/components/LiveTranscript';
import { ChatHistory } from '../src/components/ChatHistory';
import { createProvider } from '../src/providers/factory';
import {
  initPipeline,
  startListening,
  stopListening,
  releasePipeline,
  pauseForTts,
  resumeAfterTts,
} from '../src/audio/pipeline';
import {
  initTts,
  pushToken,
  endStream,
  stopTts,
  resetTts,
  releaseTts,
  isTtsSpeaking,
} from '../src/audio/tts';
import { ChatMessage } from '../src/providers/types';

export default function LiveScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [pipelineReady, setPipelineReady] = useState(false);
  const [ttsModelProgress, setTtsModelProgress] = useState<number | null>(null);

  // Keep refs to latest state for use in callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  // Queue-based transcription processing — never drop utterances
  const transcriptionQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    while (transcriptionQueueRef.current.length > 0) {
      const text = transcriptionQueueRef.current.shift()!;

      try {
        dispatch({ type: 'ADD_USER_MESSAGE', content: text });
        dispatch({ type: 'START_STREAMING' });
        resetTts();

        const currentState = stateRef.current;
        const provider = createProvider(currentState.settings.provider);

        const messages: ChatMessage[] = [
          { role: 'system', content: currentState.settings.systemPrompt },
          ...currentState.messages,
          { role: 'user', content: text },
        ];

        await provider.sendMessage(messages, (token) => {
          dispatch({ type: 'APPEND_TOKEN', token });
          pushToken(token);
        });

        endStream();
        dispatch({ type: 'FINISH_STREAMING' });
      } catch (err) {
        console.error('LLM error:', err);
        stopTts();
        dispatch({ type: 'FINISH_STREAMING' });
      }
    }

    isProcessingQueueRef.current = false;
  }, [dispatch]);

  const handleTranscription = useCallback(
    (text: string) => {
      transcriptionQueueRef.current.push(text);
      processQueue();
    },
    [processQueue]
  );

  // Initialize pipeline on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Init TTS first (downloads Kokoro model on first run)
        await initTts({
          onModelDownloadProgress: (progress) => {
            if (mounted) setTtsModelProgress(progress);
          },
          onSpeakingStateChange: (speaking) => {
            // Half-duplex: mute STT while TTS is producing audio
            if (speaking) pauseForTts();
            else resumeAfterTts();
          },
          onError: (error) => {
            console.error('TTS error:', error);
          },
        });
        if (mounted) setTtsModelProgress(null);

        await initPipeline({
          onPartialTranscription: (text) => {
            if (!mounted) return;
            dispatch({ type: 'SET_TRANSCRIPT', text });
          },
          onFinalTranscription: (text) => {
            if (!mounted) return;
            dispatch({ type: 'SET_TRANSCRIPT', text });
            dispatch({ type: 'SET_STATUS', status: 'transcribing' });
            handleTranscription(text);
          },
          onVadEvent: (isSpeech) => {
            if (!mounted) return;
            if (isSpeech) {
              // Barge-in: if TTS is currently speaking, stop it immediately
              if (isTtsSpeaking()) {
                stopTts();
              }
              dispatch({ type: 'SET_STATUS', status: 'listening' });
            }
          },
          onError: (error) => {
            console.error('Pipeline error:', error);
          },
        });
        if (mounted) {
          setPipelineReady(true);
        }
      } catch (err) {
        if (mounted) {
          Alert.alert('Pipeline Error', String(err));
        }
      }
    }

    init();

    return () => {
      mounted = false;
      releasePipeline();
      releaseTts();
    };
  }, []);

  const toggleSession = useCallback(async () => {
    if (!pipelineReady) return;

    if (state.sessionActive) {
      await stopListening();
      dispatch({ type: 'TOGGLE_SESSION' });
    } else {
      dispatch({ type: 'TOGGLE_SESSION' });
      await startListening();
    }
  }, [state.sessionActive, pipelineReady, dispatch]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sekurenet Voice</Text>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={styles.settingsBtn}
        >
          <Ionicons name="settings-outline" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Chat History */}
      <ChatHistory
        messages={state.messages}
        streamingResponse={state.streamingResponse}
      />

      {/* Live Area */}
      <View style={styles.liveArea}>
        {ttsModelProgress !== null ? (
          <View style={styles.downloadArea}>
            <Text style={styles.downloadText}>
              Loading voice model... {Math.round(ttsModelProgress * 100)}%
            </Text>
          </View>
        ) : (
          <>
            <LiveTranscript
              status={state.sessionStatus}
              transcript={state.currentTranscript}
            />
            <TouchableOpacity onPress={toggleSession} disabled={!pipelineReady}>
              <Waveform status={state.sessionStatus} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  settingsBtn: {
    padding: 8,
  },
  liveArea: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  downloadArea: {
    padding: 20,
  },
  downloadText: {
    color: '#888',
    fontSize: 14,
  },
});
