# Sekurenet-App

**SekurenetVoice** — a mobile voice assistant built with React Native + Expo. Continuous on-device speech recognition with VAD pipes into a configurable streaming LLM (Gemini, Groq, OpenClaw, Ollama).

## Features

- Continuous mic input with Voice Activity Detection (Silero VAD v6.2)
- On-device speech-to-text via `whisper.rn` / `expo-speech-recognition`
- Streaming LLM responses from multiple providers
- Live waveform + chat history UI
- Configurable system prompt and provider settings (persisted via MMKV)

## Requirements

- Node.js 18+
- npm or yarn
- For iOS: macOS with Xcode 15+
- For Android: Android Studio with SDK 34+
- A physical device or simulator (microphone required)

## Install

```bash
npm install
```

## Run

This app uses **Expo dev client** (not Expo Go) because of native modules (`whisper.rn`, `react-native-mmkv`, audio streaming).

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

The first run builds the native project (`/android` or `/ios`) — subsequent runs are faster.

To start the Metro bundler separately:
```bash
npm start
```

## Configure providers

Open the app and tap the settings icon. Choose a provider and enter credentials:

| Provider | Required fields |
|----------|----------------|
| Google Gemini | API key, model (default: `gemini-2.0-flash`) |
| Groq | API key, model (default: `llama-3.3-70b-versatile`) |
| OpenClaw | Base URL, API key, model |
| Ollama | Base URL (e.g. `http://192.168.x.x:11434/v1`), model |

> **Ollama tip:** Use your machine's LAN IP, not `localhost` — `localhost` from a phone points at the phone itself.

Adjust the system prompt and VAD threshold from the same screen.

## Project structure

```
app/             expo-router screens (index = live, settings)
src/
  audio/         pipeline (mic + VAD + STT), TTS
  components/    Waveform, ChatBubble, ChatHistory, LiveTranscript
  context/       AppContext (global state)
  providers/     LLM provider implementations (Gemini, OpenAI-compatible)
  storage/       MMKV-backed settings persistence
assets/
  models/        Silero VAD model binary
```

## Permissions

- **Android:** `RECORD_AUDIO`
- **iOS:** `NSMicrophoneUsageDescription`

Both are pre-declared in `app.json`.

## Troubleshooting

- **Build fails on first run:** delete `/android` and `/ios` and re-run `expo run:android` / `expo run:ios` to regenerate them.
- **Mic not working:** check OS-level permissions for the app.
- **Ollama unreachable:** confirm Ollama is running with `OLLAMA_HOST=0.0.0.0` and the phone is on the same network.

## License

Private.
