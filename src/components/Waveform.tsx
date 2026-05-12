import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

type Status = 'idle' | 'listening' | 'transcribing' | 'thinking';

interface WaveformProps {
  status: Status;
}

const COLORS: Record<Status, string> = {
  idle: '#333',
  listening: '#4ade80',
  transcribing: '#facc15',
  thinking: '#60a5fa',
};

export function Waveform({ status }: WaveformProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);

    if (status === 'listening') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.4, { duration: 800 })
        ),
        -1
      );
    } else if (status === 'transcribing' || status === 'thinking') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0.3, { duration: 300 });
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    backgroundColor: COLORS[status],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circle, animatedStyle]} />
      <Animated.View style={[styles.ring, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'absolute',
  },
  ring: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'absolute',
  },
});
