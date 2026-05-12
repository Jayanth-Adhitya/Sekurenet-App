import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ChatBubble } from './ChatBubble';
import { ChatMessage } from '../providers/types';

interface ChatHistoryProps {
  messages: ChatMessage[];
  streamingResponse: string;
}

export function ChatHistory({ messages, streamingResponse }: ChatHistoryProps) {
  const flatListRef = useRef<FlatList>(null);

  const allMessages = [
    ...messages,
    ...(streamingResponse
      ? [{ role: 'assistant' as const, content: streamingResponse }]
      : []),
  ];

  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [allMessages.length, streamingResponse]);

  return (
    <FlatList
      ref={flatListRef}
      data={allMessages}
      keyExtractor={(_, index) => index.toString()}
      renderItem={({ item }) => (
        <ChatBubble role={item.role as 'user' | 'assistant'} content={item.content} />
      )}
      style={styles.list}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={{ height: 8 }} />}
      ListFooterComponent={<View style={{ height: 8 }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingVertical: 8,
  },
});
