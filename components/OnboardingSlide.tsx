import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface OnboardingSlideProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

export default function OnboardingSlide({ icon, title, description, index }: OnboardingSlideProps) {
  return (
    <View style={styles.container}>
      <Animated.View 
        entering={FadeInUp.delay(index * 100).duration(600)}
        style={styles.iconContainer}
      >
        {icon}
      </Animated.View>
      
      <Animated.View 
        entering={FadeInDown.delay(index * 100 + 200).duration(600)}
        style={styles.textContainer}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
  },
});
