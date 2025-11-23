import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { Step } from '@/library/components/step';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

type StepStatus = 'completed' | 'current' | 'ready';

export default function BeginNewPathScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const { profiles, getProfile } = useJourney();

  // Get current profile to check step 1 completion
  const currentProfileId = profiles[0]?.id;
  const currentProfile = currentProfileId ? getProfile(currentProfileId) : null;
  
  // Check if step 1 (Reality Check) is completed
  // Step 1 is completed when both sections have records
  const isStep1Completed = 
    currentProfile?.sections?.realityCheck?.idealizedMemories === true &&
    currentProfile?.sections?.realityCheck?.emotionalDebtLedger === true;

  // Track step completion status
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(() => {
    // Initialize based on step 1 completion
    if (isStep1Completed) {
      return ['completed', 'current', 'ready'];
    }
    return ['current', 'ready', 'ready']; // Step 1 is current if not completed, steps 2 and 3 are locked
  });

  // Update step statuses when step 1 completion changes
  useEffect(() => {
    if (isStep1Completed && stepStatuses[0] !== 'completed') {
      setStepStatuses(['completed', 'current', 'ready']);
    }
  }, [isStep1Completed, stepStatuses]);

  // Check if all steps are completed
  const allStepsCompleted = stepStatuses.every((status) => status === 'completed');
  
  // Step 2 and 3 are disabled until step 1 is completed
  const isStep2Disabled = !isStep1Completed;
  const isStep3Disabled = !isStep1Completed || stepStatuses[1] !== 'completed';

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
          marginTop: 20,
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
          maxWidth: maxContentWidth,
          alignSelf: 'center',
          width: '100%',
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
          maxWidth: maxContentWidth,
          height: 48 * fontScale,
          borderRadius: 8 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16 * fontScale,
          marginTop: 24 * fontScale,
          alignSelf: 'center',
        },
        buttonDisabled: {
          opacity: 0.5,
        },
      }),
    [fontScale, maxContentWidth]
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
              router.push('/reality-check');
            }}
          />
          <Step
            number={2}
            title="Processing & Accountability"
            description="Turn painful memories into lessons for growth through guided exercises."
            status={stepStatuses[1]}
            disabled={isStep2Disabled}
            onPress={
              isStep2Disabled
                ? undefined
                : () => {
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
                  }
            }
          />
          <Step
            number={3}
            title="Identity & Future Focus"
            description="Rediscover your individuality and build a future that is entirely your own."
            status={stepStatuses[2]}
            isLast
            disabled={isStep3Disabled}
            onPress={
              isStep3Disabled
                ? undefined
                : () => {
                    // TODO: Navigate to step 3 screen
                    // When step 3 is completed, update its status
                    setStepStatuses((prev) => {
                      const newStatuses = [...prev];
                      if (newStatuses[2] === 'current') {
                        newStatuses[2] = 'completed';
                      }
                      return newStatuses;
                    });
                  }
            }
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

