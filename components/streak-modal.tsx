/**
 * Streak Modal - Detailed Streak Statistics
 */

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import type { StreakBadge, StreakData } from '@/utils/streak-types';
import { STREAK_BADGES } from '@/utils/streak-types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
  streakData: StreakData;
  currentBadge: StreakBadge | null;
  nextBadge: StreakBadge | null;
}

export const StreakModal = React.memo(function StreakModal({
  visible,
  onClose,
  streakData,
  currentBadge,
  nextBadge,
}: StreakModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();

  const daysToNext = nextBadge ? nextBadge.daysRequired - streakData.currentStreak : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText size="xl" weight="bold">
                Your Streak 🔥
              </ThemedText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24 * fontScale} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Current Streak Display */}
              <View style={styles.currentStreakContainer}>
                {currentBadge && (
                  <LinearGradient
                    colors={currentBadge.colorGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.currentStreakBadge}
                  >
                    <ThemedText size="xxxl" weight="bold" style={{ fontSize: 48 }}>
                      {currentBadge.emoji}
                    </ThemedText>
                    <ThemedText size="xl" weight="bold" style={{ marginTop: 8 }}>
                      {streakData.currentStreak} days
                    </ThemedText>
                    <ThemedText size="sm" style={{ opacity: 0.7, marginTop: 4 }}>
                      {currentBadge.name}
                    </ThemedText>
                  </LinearGradient>
                )}

                {!currentBadge && streakData.currentStreak === 0 && (
                  <View style={[styles.currentStreakBadge, { backgroundColor: colors.card }]}>
                    <ThemedText size="xxxl" weight="bold" style={{ fontSize: 48 }}>
                      💫
                    </ThemedText>
                    <ThemedText size="xl" weight="bold" style={{ marginTop: 8 }}>
                      0 days
                    </ThemedText>
                    <ThemedText size="sm" style={{ opacity: 0.7, marginTop: 4 }}>
                      Start your journey
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <ThemedText size="sm" style={{ opacity: 0.7 }}>
                    Current Streak
                  </ThemedText>
                  <ThemedText size="xl" weight="bold" style={{ marginTop: 4 }}>
                    {streakData.currentStreak} days
                  </ThemedText>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <ThemedText size="sm" style={{ opacity: 0.7 }}>
                    Longest Streak
                  </ThemedText>
                  <ThemedText size="xl" weight="bold" style={{ marginTop: 4, color: '#FFD700' }}>
                    {streakData.longestStreak} days
                  </ThemedText>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <ThemedText size="sm" style={{ opacity: 0.7 }}>
                    Total Days
                  </ThemedText>
                  <ThemedText size="xl" weight="bold" style={{ marginTop: 4 }}>
                    {streakData.totalDaysLogged}
                  </ThemedText>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <ThemedText size="sm" style={{ opacity: 0.7 }}>
                    Badges Earned
                  </ThemedText>
                  <ThemedText size="xl" weight="bold" style={{ marginTop: 4, color: colors.primary }}>
                    {streakData.earnedBadges?.length || 0}
                  </ThemedText>
                </View>
              </View>

              {/* Next Badge */}
              {nextBadge && (
                <View style={[styles.nextBadgeContainer, { backgroundColor: colors.card }]}>
                  <ThemedText size="m" weight="bold" style={{ marginBottom: 8 }}>
                    Next Badge: {nextBadge.name}
                  </ThemedText>
                  <View style={styles.nextBadgeContent}>
                    <ThemedText size="xxxl" style={{ fontSize: 40 }}>
                      {nextBadge.emoji}
                    </ThemedText>
                    <View style={{ marginLeft: 16, flex: 1 }}>
                      <ThemedText size="sm" style={{ opacity: 0.7 }}>
                        {nextBadge.description}
                      </ThemedText>
                      <ThemedText size="m" weight="bold" style={{ marginTop: 4, color: colors.primary }}>
                        {daysToNext} {daysToNext === 1 ? 'day' : 'days'} to go!
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {/* Earned Badges Collection */}
              <View style={styles.badgesSection}>
                <ThemedText size="l" weight="bold" style={{ marginBottom: 12 }}>
                  Badge Collection
                </ThemedText>
                <View style={styles.badgesGrid}>
                  {STREAK_BADGES.map((badge) => {
                    const isEarned = streakData.earnedBadges?.includes(badge.id) || false;
                    const isCurrent = currentBadge?.id === badge.id;

                    return (
                      <View
                        key={badge.id}
                        style={[
                          styles.badgeItem,
                          {
                            backgroundColor: colors.card,
                            opacity: isEarned ? 1 : 0.3,
                            borderWidth: isCurrent ? 2 : 0,
                            borderColor: isCurrent ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        <ThemedText size="xl" style={{ fontSize: 32 }}>
                          {badge.emoji}
                        </ThemedText>
                        <ThemedText size="xs" weight="bold" style={{ marginTop: 4 }}>
                          {badge.name}
                        </ThemedText>
                        <ThemedText size="xxs" style={{ opacity: 0.6, marginTop: 2 }}>
                          {badge.daysRequired} days
                        </ThemedText>
                        {isEarned && (
                          <View style={styles.checkmark}>
                            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Motivation Message */}
              <View style={[styles.motivationContainer, { backgroundColor: colors.card }]}>
                <ThemedText size="m" style={{ textAlign: 'center', opacity: 0.8 }}>
                  {streakData.currentStreak === 0
                    ? "Start your journey today! Log a moment to begin your streak 🌱"
                    : streakData.currentStreak < 3
                    ? "You're building a habit! Keep it going 💪"
                    : streakData.currentStreak < 7
                    ? "Great progress! You're forming a powerful routine ⭐"
                    : streakData.currentStreak < 30
                    ? "Amazing consistency! You're mastering self-reflection 🔥"
                    : "You're a legend! Your dedication is inspiring 👑"}
                </ThemedText>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  modal: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  currentStreakContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  currentStreakBadge: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextBadgeContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  nextBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgesSection: {
    marginBottom: 24,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    width: '30%',
    aspectRatio: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  motivationContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
});
