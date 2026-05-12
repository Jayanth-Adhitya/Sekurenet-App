import { createMMKV } from 'react-native-mmkv';
import { AppSettings, DEFAULT_SETTINGS } from '../providers/types';

const storage = createMMKV({ id: 'sekurenet-voice-settings' });

const SETTINGS_KEY = 'app_settings';

export function loadSettings(): AppSettings {
  const raw = storage.getString(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  storage.set(SETTINGS_KEY, JSON.stringify(settings));
}
