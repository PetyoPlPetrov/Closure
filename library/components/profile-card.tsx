import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useTranslate } from '@/utils/languages/use-translate';
import { useJourney } from '@/utils/JourneyProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import type { ExProfile } from '@/utils/JourneyProvider';

type ProfileCardProps = {
  profile: ExProfile;
  onPress?: () => void;
  onMorePress?: () => void;
  containerStyle?: ViewStyle;
};

export function ProfileCard({ profile, onPress, onMorePress, containerStyle }: ProfileCardProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();
  const { getIdealizedMemoriesByProfileId } = useJourney();

  const isComplete = profile.isCompleted || profile.setupProgress === 100;
  const memories = getIdealizedMemoriesByProfileId(profile.id);
  const memoryCount = memories.length;
  
  // Debug logging
  if (memoryCount === 0 && profile.id) {
    console.log(`[ProfileCard] Profile ${profile.name} (ID: ${profile.id}) has 0 memories`);
  }
  
  // Calculate relationship quality (sunny percentage) - same as EX avatar border
  const sunnyPercentage = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;
    
    memories.forEach((memory) => {
      totalClouds += (memory.hardTruths || []).length;
      totalSuns += (memory.goodFacts || []).length;
    });
    
    const total = totalClouds + totalSuns;
    if (total === 0) return 0; // No moments if no data
    
    // Percentage of sunny moments (0-100)
    return Math.round((totalSuns / total) * 100);
  }, [memories]);
  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarBgColor = isComplete
    ? colors.primary
    : colorScheme === 'dark'
    ? 'rgba(255, 255, 255, 0.2)'
    : 'rgba(0, 0, 0, 0.1)';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderRadius: 12 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : '#ffffff',
          padding: 16 * fontScale,
          gap: 12 * fontScale,
          borderWidth: 1,
          borderColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12 * fontScale,
        },
        avatarContainer: {
          width: 56 * fontScale,
          height: 56 * fontScale,
          borderRadius: 28 * fontScale,
          backgroundColor: avatarBgColor,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        avatarText: {
          color: colorScheme === 'dark' ? '#ffffff' : '#000000',
          fontWeight: '600',
          fontSize: 20 * fontScale,
        },
        statusOverlay: {
          position: 'absolute',
          bottom: -4 * fontScale,
          right: -4 * fontScale,
          width: 24 * fontScale,
          height: 24 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colorScheme === 'dark' ? colors.background : '#ffffff',
        },
        content: {
          flex: 1,
          gap: 4 * fontScale,
        },
        name: {
          marginBottom: 2 * fontScale,
        },
        description: {
          marginBottom: 4 * fontScale,
          opacity: 0.7,
        },
        relationship: {
          marginBottom: 8 * fontScale,
        },
        moreButton: {
          position: 'absolute',
          top: 16 * fontScale,
          right: 16 * fontScale,
          width: 32 * fontScale,
          height: 32 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        },
        memoryInfo: {
          marginTop: 8 * fontScale,
        },
        memoryText: {
          opacity: 0.7,
        },
      }),
    [fontScale, colorScheme, avatarBgColor, colors.background]
  );


  const handleCardPress = () => {
    if (onPress) {
      onPress();
    }
  };

  const handleMorePress = () => {
    if (onMorePress) {
      onMorePress();
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={handleCardPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile.imageUri ? (
              <Image
                source={{ uri: profile.imageUri }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 28 * fontScale,
                }}
                contentFit="cover"
              />
            ) : (
              <ThemedText weight="semibold" style={styles.avatarText}>
                {initials}
              </ThemedText>
            )}
          </View>
          <View style={styles.content}>
            <ThemedText size="l" weight="bold" style={styles.name}>
              {profile.name}
            </ThemedText>
            {profile.description && (
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {profile.description.length > 30 ? profile.description.substring(0, 30) + '...' : profile.description}
              </ThemedText>
            )}
            {(profile.relationshipStartDate || profile.relationshipDuration) && (
              <ThemedText size="sm" weight="normal" style={styles.relationship}>
                {profile.relationshipStartDate ? (
                  (() => {
                    const startDate = new Date(profile.relationshipStartDate);
                    const endDate = profile.relationshipEndDate ? new Date(profile.relationshipEndDate) : null;
                    const startStr = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    const endStr = endDate 
                      ? endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                      : t('profile.ongoing');
                    return `${startStr} - ${endStr}`;
                  })()
                ) : (
                  profile.relationshipDuration
                )}
              </ThemedText>
            )}
          </View>
        </View>
        <View style={styles.memoryInfo}>
          <ThemedText size="sm" weight="normal" style={styles.memoryText}>
            {memoryCount === 0 
              ? t('profile.noMemories')
              : memoryCount === 1
              ? t('profile.oneMemory')
              : `${memoryCount} ${t('profile.memories')}`
            }
          </ThemedText>
          {memoryCount > 0 && (
            <ThemedText size="sm" weight="normal" style={styles.memoryText}>
              {t('profile.relationshipQuality')}: {sunnyPercentage}% {t('profile.relationshipQuality.positive')}
            </ThemedText>
          )}
        </View>
      </TouchableOpacity>
      {onMorePress && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={handleMorePress}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="more-vert"
            size={24 * fontScale}
            color={colorScheme === 'dark' ? colors.icon : colors.tabIconDefault}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

