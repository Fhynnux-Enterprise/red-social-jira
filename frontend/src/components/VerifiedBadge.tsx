import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface VerifiedBadgeProps {
  size?: number;
  style?: ViewStyle | ViewStyle[];
}

export default function VerifiedBadge({ size = 16, style }: VerifiedBadgeProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        {/* Simple, modern solid blue circle */}
        <Circle
          cx="12"
          cy="12"
          r="10"
          fill="#0095F6"
        />
        {/* Solid white checkmark path centered within the circle */}
        <Path
          d="M8.5 12.5L11 15L16 9"
          stroke="#FFFFFF"
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});







