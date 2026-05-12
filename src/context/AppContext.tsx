import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppSettings, ChatMessage, ProviderConfig } from '../providers/types';
import { loadSettings, saveSettings } from '../storage/settings';

type SessionStatus = 'idle' | 'listening' | 'transcribing' | 'thinking';

interface AppState {
  settings: AppSettings;
  messages: ChatMessage[];
  sessionActive: boolean;
  sessionStatus: SessionStatus;
  currentTranscript: string;
  streamingResponse: string;
}

type AppAction =
  | { type: 'SET_SETTINGS'; settings: AppSettings }
  | { type: 'SET_PROVIDER'; provider: ProviderConfig }
  | { type: 'SET_SYSTEM_PROMPT'; prompt: string }
  | { type: 'SET_VAD_THRESHOLD'; threshold: number }
  | { type: 'TOGGLE_SESSION' }
  | { type: 'SET_STATUS'; status: SessionStatus }
  | { type: 'SET_TRANSCRIPT'; text: string }
  | { type: 'ADD_USER_MESSAGE'; content: string }
  | { type: 'START_STREAMING' }
  | { type: 'APPEND_TOKEN'; token: string }
  | { type: 'FINISH_STREAMING' }
  | { type: 'CLEAR_MESSAGES' };

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: action.settings };
    case 'SET_PROVIDER':
      return { ...state, settings: { ...state.settings, provider: action.provider } };
    case 'SET_SYSTEM_PROMPT':
      return { ...state, settings: { ...state.settings, systemPrompt: action.prompt } };
    case 'SET_VAD_THRESHOLD':
      return { ...state, settings: { ...state.settings, vadThreshold: action.threshold } };
    case 'TOGGLE_SESSION':
      return {
        ...state,
        sessionActive: !state.sessionActive,
        sessionStatus: state.sessionActive ? 'idle' : 'listening',
        currentTranscript: '',
        streamingResponse: '',
      };
    case 'SET_STATUS':
      return { ...state, sessionStatus: action.status };
    case 'SET_TRANSCRIPT':
      return { ...state, currentTranscript: action.text };
    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, { role: 'user', content: action.content }],
        currentTranscript: '',
      };
    case 'START_STREAMING':
      return { ...state, streamingResponse: '', sessionStatus: 'thinking' };
    case 'APPEND_TOKEN':
      return { ...state, streamingResponse: state.streamingResponse + action.token };
    case 'FINISH_STREAMING':
      return {
        ...state,
        messages: [
          ...state.messages,
          { role: 'assistant', content: state.streamingResponse },
        ],
        streamingResponse: '',
        sessionStatus: state.sessionActive ? 'listening' : 'idle',
      };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    settings: loadSettings(),
    messages: [],
    sessionActive: false,
    sessionStatus: 'idle' as SessionStatus,
    currentTranscript: '',
    streamingResponse: '',
  });

  useEffect(() => {
    saveSettings(state.settings);
  }, [state.settings]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
