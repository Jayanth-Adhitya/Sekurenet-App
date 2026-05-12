import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../src/context/AppContext';
import {
  ProviderId,
  DEFAULT_PROVIDERS,
  ProviderConfig,
} from '../src/providers/types';

const PROVIDER_IDS: ProviderId[] = ['gemini', 'groq', 'openclaw', 'ollama'];

export default function SettingsScreen() {
  const { state, dispatch } = useApp();
  const [provider, setProvider] = useState<ProviderConfig>(
    state.settings.provider
  );
  const [systemPrompt, setSystemPrompt] = useState(
    state.settings.systemPrompt
  );

  function selectProvider(id: ProviderId) {
    const defaults = DEFAULT_PROVIDERS[id];
    const updated = {
      ...defaults,
      apiKey: provider.id === id ? provider.apiKey : defaults.apiKey,
      baseUrl: provider.id === id ? provider.baseUrl : defaults.baseUrl,
      model: provider.id === id ? provider.model : defaults.model,
    };
    setProvider(updated);
    dispatch({ type: 'SET_PROVIDER', provider: updated });
  }

  function updateField(field: keyof ProviderConfig, value: string) {
    const updated = { ...provider, [field]: value };
    setProvider(updated);
    dispatch({ type: 'SET_PROVIDER', provider: updated });
  }

  function updateSystemPrompt(text: string) {
    setSystemPrompt(text);
    dispatch({ type: 'SET_SYSTEM_PROMPT', prompt: text });
  }

  const showBaseUrl = provider.id === 'openclaw' || provider.id === 'ollama';
  const showApiKey = provider.id !== 'ollama';

  return (
    <ScrollView style={styles.container}>
      {/* Provider Selection */}
      <Text style={styles.sectionTitle}>LLM Provider</Text>
      <View style={styles.providerRow}>
        {PROVIDER_IDS.map((id) => (
          <TouchableOpacity
            key={id}
            style={[
              styles.providerBtn,
              provider.id === id && styles.providerBtnActive,
            ]}
            onPress={() => selectProvider(id)}
          >
            <Text
              style={[
                styles.providerBtnText,
                provider.id === id && styles.providerBtnTextActive,
              ]}
            >
              {DEFAULT_PROVIDERS[id].name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* API Key */}
      {showApiKey && (
        <>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={provider.apiKey}
            onChangeText={(v) => updateField('apiKey', v)}
            placeholder="Enter API key..."
            placeholderTextColor="#555"
            secureTextEntry
            autoCapitalize="none"
          />
        </>
      )}

      {/* Base URL */}
      {showBaseUrl && (
        <>
          <Text style={styles.label}>Base URL</Text>
          <TextInput
            style={styles.input}
            value={provider.baseUrl}
            onChangeText={(v) => updateField('baseUrl', v)}
            placeholder="https://..."
            placeholderTextColor="#555"
            autoCapitalize="none"
            keyboardType="url"
          />
        </>
      )}

      {/* Model */}
      <Text style={styles.label}>Model</Text>
      <TextInput
        style={styles.input}
        value={provider.model}
        onChangeText={(v) => updateField('model', v)}
        placeholder="Model name..."
        placeholderTextColor="#555"
        autoCapitalize="none"
      />

      {/* System Prompt */}
      <Text style={styles.sectionTitle}>System Prompt</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={systemPrompt}
        onChangeText={updateSystemPrompt}
        placeholder="You are a helpful assistant..."
        placeholderTextColor="#555"
        multiline
        numberOfLines={4}
      />

      {/* Clear Chat */}
      <TouchableOpacity
        style={styles.dangerBtn}
        onPress={() => dispatch({ type: 'CLEAR_MESSAGES' })}
      >
        <Text style={styles.dangerBtnText}>Clear Chat History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
  },
  providerBtnActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#2563eb',
  },
  providerBtnText: {
    color: '#888',
    fontSize: 14,
  },
  providerBtnTextActive: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  dangerBtn: {
    marginTop: 30,
    marginBottom: 40,
    paddingVertical: 14,
    backgroundColor: '#2a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#5c2020',
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
