import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

type Status = 'idle' | 'listening' | 'transcribing' | 'thinking';

interface LiveTranscriptProps {
  status: Status;
  transcript: string;
}

const STATUS_LABELS: Record<Status, string> = {
  idle: 'Tap to start',
  listening: 'Listening...',
  transcribing: 'Transcribing...',
  thinking: 'Thinking...',
};

export function LiveTranscript({ status, transcript }: LiveTranscriptProps) {
  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        {(status === 'transcribing' || status === 'thinking') && (
          <ActivityIndicator size="small" color="#888" style={styles.spinner} />
        )}
        <Text style={styles.statusText}>{STATUS_LABELS[status]}</Text>
      </View>
      {transcript ? (
        <Text style={styles.transcript}>{transcript}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  statusText: {
    color: '#888',
    fontSize: 14,
  },
  transcript: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
