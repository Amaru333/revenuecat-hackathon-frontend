import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Recipe } from '@/services/recipeService';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export default function CookingModeScreen() {
  useKeepAwake(); // Keep screen on while cooking

  const params = useLocalSearchParams();
  const recipe: Recipe = params.recipe ? JSON.parse(params.recipe as string) : null;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const totalSteps = recipe?.instructions?.length || 0;

  // Timer functionality
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            // Timer complete - vibrate and announce
            if (Platform.OS !== 'web') {
              Vibration.vibrate([0, 500, 200, 500, 200, 500]);
            }
            Speech.speak('Timer complete!', { rate: 0.9 });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  // Stop speech when leaving
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const animateTransition = (direction: 'left' | 'right', callback: () => void) => {
    const exitX = direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    const enterX = direction === 'left' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    
    // Slide out current card
    translateX.value = withTiming(exitX, { duration: 200, easing: Easing.out(Easing.ease) }, () => {
      runOnJS(callback)();
      // Reset position to opposite side
      translateX.value = enterX;
      // Slide in new card
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });
  };

  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      Speech.stop();
      animateTransition('left', () => {
        setCurrentStep(prev => prev + 1);
      });
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      Speech.stop();
      animateTransition('right', () => {
        setCurrentStep(prev => prev - 1);
      });
    }
  };

  const speakCurrentStep = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      const instruction = recipe?.instructions?.[currentStep];
      if (instruction) {
        // Check if speech is available
        const isAvailable = await Speech.isSpeakingAsync();
        console.log('Speech currently speaking:', isAvailable);
        
        setIsSpeaking(true);
        const textToSpeak = `Step ${currentStep + 1}. ${instruction}`;
        console.log('Speaking:', textToSpeak);
        
        Speech.speak(textToSpeak, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.9,
          onStart: () => console.log('Speech started'),
          onDone: () => {
            console.log('Speech done');
            setIsSpeaking(false);
          },
          onStopped: () => {
            console.log('Speech stopped');
            setIsSpeaking(false);
          },
          onError: (error) => {
            console.error('Speech error:', error);
            setIsSpeaking(false);
          },
        });
      }
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && currentStep < totalSteps - 1) {
        // Complete the swipe animation - slide out left
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 150 }, () => {
          runOnJS(setCurrentStep)(currentStep + 1);
          translateX.value = SCREEN_WIDTH * 0.3; // Start closer for less travel
          translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
        });
      } else if (event.translationX > SWIPE_THRESHOLD && currentStep > 0) {
        // Slide out right
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 150 }, () => {
          runOnJS(setCurrentStep)(currentStep - 1);
          translateX.value = -SCREEN_WIDTH * 0.3;
          translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
        });
      } else {
        // Snap back smoothly
        translateX.value = withTiming(0, { duration: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const addTimer = (minutes: number) => {
    setTimerSeconds(minutes * 60);
    setIsTimerRunning(true);
    setShowTimerPicker(false);
    Speech.speak(`Timer set for ${minutes} minutes`, { rate: 0.9 });
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  if (!recipe || !recipe.instructions || recipe.instructions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No instructions found</Text>
        <TouchableOpacity style={styles.exitButton} onPress={() => router.back()}>
          <Text style={styles.exitButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentInstruction = recipe.instructions[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => {
          Speech.stop();
          router.back();
        }}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        
        {isTimerRunning || timerSeconds > 0 ? (
          <TouchableOpacity style={styles.timerDisplay} onPress={stopTimer}>
            <Ionicons name="timer" size={20} color={isTimerRunning ? "#FF9500" : "#666"} />
            <Text style={[styles.timerText, isTimerRunning && styles.timerTextActive]}>
              {formatTime(timerSeconds)}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepIndicator}>Step {currentStep + 1} of {totalSteps}</Text>
      </View>

      {/* Main Content - Swipeable */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.contentContainer, animatedStyle]}>
          <View style={styles.instructionCard}>
            <Text style={styles.instructionText}>{currentInstruction}</Text>
            
            {/* Voice Button */}
            <TouchableOpacity 
              style={[styles.voiceButton, isSpeaking && styles.voiceButtonActive]}
              onPress={speakCurrentStep}
            >
              <Ionicons 
                name={isSpeaking ? "volume-high" : "volume-medium-outline"} 
                size={24} 
                color={isSpeaking ? "#FFF" : "#666"} 
              />
            </TouchableOpacity>
          </View>

          {/* Swipe Hint */}
          <Text style={styles.swipeHint}>
            ← Swipe to navigate →
          </Text>
        </Animated.View>
      </GestureDetector>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
          onPress={goToPrevStep}
          disabled={currentStep === 0}
        >
          <Ionicons name="chevron-back" size={24} color={currentStep === 0 ? "#CCC" : "#000"} />
          <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>
            Prev
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentStep === totalSteps - 1 && styles.navButtonDisabled]}
          onPress={goToNextStep}
          disabled={currentStep === totalSteps - 1}
        >
          <Text style={[styles.navButtonText, currentStep === totalSteps - 1 && styles.navButtonTextDisabled]}>
            Next
          </Text>
          <Ionicons name="chevron-forward" size={24} color={currentStep === totalSteps - 1 ? "#CCC" : "#000"} />
        </TouchableOpacity>
      </View>

      {/* Timer Controls */}
      <View style={styles.timerControls}>
        {showTimerPicker ? (
          <View style={styles.timerPickerContainer}>
            <Text style={styles.timerPickerTitle}>Set Timer</Text>
            <View style={styles.timerOptions}>
              {[1, 3, 5, 10, 15, 20, 30].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={styles.timerOption}
                  onPress={() => addTimer(mins)}
                >
                  <Text style={styles.timerOptionText}>{mins}m</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.cancelTimerBtn}
              onPress={() => setShowTimerPicker(false)}
            >
              <Text style={styles.cancelTimerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addTimerButton}
            onPress={() => setShowTimerPicker(true)}
          >
            <Ionicons name="timer-outline" size={22} color="#000" />
            <Text style={styles.addTimerText}>Add Timer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Done Button (only on last step) */}
      {currentStep === totalSteps - 1 && (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => {
            Speech.stop();
            router.back();
          }}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
          <Text style={styles.doneButtonText}>Done Cooking!</Text>
        </TouchableOpacity>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  exitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'Poppins_600SemiBold',
  },
  timerTextActive: {
    color: '#FF9500',
  },
  placeholder: {
    width: 44,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 3,
  },
  stepIndicator: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  instructionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    minHeight: 200,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },
  instructionText: {
    fontSize: 24,
    lineHeight: 36,
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  voiceButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#007AFF',
  },
  swipeHint: {
    marginTop: 20,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  navButtonTextDisabled: {
    color: '#CCC',
  },
  timerControls: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  addTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  addTimerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  timerPickerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
  },
  timerPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  timerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  timerOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  timerOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  cancelTimerBtn: {
    marginTop: 12,
    paddingVertical: 10,
  },
  cancelTimerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
    fontFamily: 'Poppins_400Regular',
  },
  exitButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 8,
    alignSelf: 'center',
  },
  exitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});
