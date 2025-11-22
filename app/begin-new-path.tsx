import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { Step } from '@/library/components/step';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

type StepStatus = 'completed' | 'current' | 'ready';

export default function BeginNewPathScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();

  // Track step completion status
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(['completed', 'current', 'ready']);

  // Check if all steps are completed
  const allStepsCompleted = stepStatuses.every((status) => status === 'completed');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16 * fontScale,
          paddingTop: 8 * fontScale,
          paddingBottom: 16 * fontScale,
        },
        headerButton: {
          width: 48 * fontScale,
          height: 48 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8 * fontScale,
          flex: 1,
          justifyContent: 'center',
        },
        scrollContent: {
          padding: 16 * fontScale,
          paddingBottom: 32 * fontScale,
          gap: 24 * fontScale,
        },
        title: {
          marginBottom: 12 * fontScale,
        },
        description: {
          marginBottom: 32 * fontScale,
        },
        steps: {
          gap: 0,
        },
        button: {
          width: '100%',
          height: 48 * fontScale,
          borderRadius: 8 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16 * fontScale,
          marginTop: 24 * fontScale,
        },
        buttonDisabled: {
          opacity: 0.5,
        },
      }),
    [fontScale]
  );

  const handleBeginJourney = () => {
    // Navigate back to ex-profiles screen or wherever appropriate
    router.replace('/(tabs)/ex-profiles');
  };

  return (
    <TabScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <MaterialIcons name="settings" size={30* fontScale} color={colors.primary} />
          <ThemedText size="xl" weight="bold" letterSpacing="s">
            Closure
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title and Description */}
        <View>
          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.title}>
            Your Path to Healing
          </ThemedText>
          <ThemedText size="sm" weight="normal" style={styles.description}>
            Welcome to your journey of Active Detachment. Here is your roadmap to a new beginning.
          </ThemedText>
        </View>

        {/* Steps */}
        <View style={styles.steps}>
          <Step
            number={1}
            title="Reality Check"
            description="Confront idealization with objective facts. Commit to seeing the past clearly."
            status={stepStatuses[0]}
            onPress={() => {
              // TODO: Navigate to step 1 screen
              console.log('Step 1 pressed');
            }}
          />
          <Step
            number={2}
            title="Processing & Accountability"
            description="Turn painful memories into lessons for growth through guided exercises."
            status={stepStatuses[1]}
            onPress={() => {
              // TODO: Navigate to step 2 screen
              // When step 2 is completed, update its status
              setStepStatuses((prev) => {
                const newStatuses = [...prev];
                if (newStatuses[1] === 'current') {
                  newStatuses[1] = 'completed';
                  newStatuses[2] = 'current'; // Make step 3 current
                }
                return newStatuses;
              });
            }}
          />
          <Step
            number={3}
            title="Identity & Future Focus"
            description="Rediscover your individuality and build a future that is entirely your own."
            status={stepStatuses[2]}
            isLast
            onPress={() => {
              // TODO: Navigate to step 3 screen
              // When step 3 is completed, update its status
              setStepStatuses((prev) => {
                const newStatuses = [...prev];
                if (newStatuses[2] === 'current') {
                  newStatuses[2] = 'completed';
                }
                return newStatuses;
              });
            }}
          />
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            !allStepsCompleted && styles.buttonDisabled,
          ]}
          onPress={handleBeginJourney}
          activeOpacity={allStepsCompleted ? 0.8 : 1}
          disabled={!allStepsCompleted}
        >
          <ThemedText weight="bold" letterSpacing="l" style={{ color: '#ffffff' }}>
            Begin Your Journey
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </TabScreenContainer>
  );
}

