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
import type { Job } from '@/utils/JourneyProvider';

type JobCardProps = {
  job: Job;
  onPress?: () => void;
  onMorePress?: () => void;
  containerStyle?: ViewStyle;
};

export function JobCard({ job, onPress, onMorePress, containerStyle }: JobCardProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();
  const { getIdealizedMemoriesByEntityId } = useJourney();

  const isComplete = job.isCompleted || job.setupProgress === 100;
  const memories = getIdealizedMemoriesByEntityId(job.id, 'career');
  const memoryCount = memories.length;
  
  // Calculate job satisfaction (sunny percentage)
  const sunnyPercentage = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;
    
    memories.forEach((memory) => {
      totalClouds += (memory.hardTruths || []).length;
      totalSuns += (memory.goodFacts || []).length;
    });
    
    const total = totalClouds + totalSuns;
    if (total === 0) return 0;
    
    return Math.round((totalSuns / total) * 100);
  }, [memories]);
  
  const initials = job.name
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
        dateRange: {
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
    [fontScale, colorScheme, avatarBgColor]
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
            {job.imageUri ? (
              <Image
                source={{ uri: job.imageUri }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 28 * fontScale,
                }}
                contentFit="cover"
              />
            ) : (
              <MaterialIcons
                name="work"
                size={28 * fontScale}
                color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
              />
            )}
          </View>
          <View style={styles.content}>
            <ThemedText size="l" weight="bold" style={styles.name}>
              {job.name}
            </ThemedText>
            {job.description && (
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {job.description.length > 30 ? job.description.substring(0, 30) + '...' : job.description}
              </ThemedText>
            )}
            {(job.startDate || job.endDate) && (
              <ThemedText size="sm" weight="normal" style={styles.dateRange}>
                {(() => {
                  const startDate = job.startDate ? new Date(job.startDate) : null;
                  const endDate = job.endDate ? new Date(job.endDate) : null;
                  if (startDate && endDate) {
                    const startStr = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    const endStr = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    return `${startStr} - ${endStr}`;
                  } else if (startDate) {
                    const startStr = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    return `${startStr} - Ongoing`;
                  }
                  return null;
                })()}
              </ThemedText>
            )}
          </View>
        </View>
        <View style={styles.memoryInfo}>
          <ThemedText size="sm" weight="normal" style={styles.memoryText}>
            {memoryCount === 0 
              ? 'No memories'
              : memoryCount === 1
              ? '1 memory'
              : `${memoryCount} memories`
            }
          </ThemedText>
          {memoryCount > 0 && (
            <ThemedText size="sm" weight="normal" style={styles.memoryText}>
              Job satisfaction: {sunnyPercentage}% positive
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


