import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { SectionCard } from '@/library/components/section-card';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function RealityCheckScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const { profiles, getProfile } = useJourney();

  // Check if sections have records (completed)
  // TODO: Replace with actual profile ID when navigating from begin-new-path
  // For now, use first profile - in future, pass profile ID via route params
  const currentProfileId = profiles[0]?.id;
  const currentProfile = currentProfileId ? getProfile(currentProfileId) : null;

  // Check if sections are completed based on profile data
  const hasIdealizedMemories = currentProfile?.sections?.realityCheck?.idealizedMemories ?? false;
  const hasEmotionalDebtLedger = currentProfile?.sections?.realityCheck?.emotionalDebtLedger ?? false;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 8 * fontScale,
          marginTop: 50,
        },
        headerButton: {
          width: 48 * fontScale,
          height: 48 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerTitle: {
          flex: 1,
          textAlign: 'center',
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
        sections: {
          gap: 16 * fontScale,
        },
      }),
    [fontScale, maxContentWidth]
  );

  const handleIdealizedMemories = () => {
    if (currentProfileId) {
      router.push({
        pathname: '/idealized-memories',
        params: { profileId: currentProfileId },
      });
    }
  };

  const handleEmotionalDebtLedger = () => {
    // TODO: Navigate to Emotional Debt Ledger screen
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
        <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
          Phase 1
        </ThemedText>
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
            Reality Check
          </ThemedText>
          <ThemedText size="sm" weight="normal" style={styles.description}>
            This is where you begin to separate emotional memory from objective fact. Confront the
            past to build your future.
          </ThemedText>
        </View>

        {/* Sections */}
        <View style={styles.sections}>
          <SectionCard
            title="Idealized Memories"
            isCompleted={hasIdealizedMemories}
            onPress={handleIdealizedMemories}
          />
          <SectionCard
            title="Emotional Debt Ledger"
            isCompleted={hasEmotionalDebtLedger}
            onPress={handleEmotionalDebtLedger}
          />
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}

