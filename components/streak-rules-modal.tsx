/**
 * Streak Rules Modal
 * Explains how active streak badges and rewards work
 */

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslate } from '@/utils/languages/use-translate';
import {
  getStreakBadgeBenefitReminderEnabled,
  setStreakBadgeBenefitReminderEnabled,
} from '@/utils/streak-badge-reminder-preference';
import { refreshStreakNotifications } from '@/utils/streak-notifications';
import { recalculateStreak } from '@/utils/streak-manager';
import { STREAK_BADGES } from '@/utils/streak-types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface StreakRulesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const StreakRulesModal = React.memo(function StreakRulesModal({ visible, onClose }: StreakRulesModalProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const t = useTranslate();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [badgeReminderEnabled, setBadgeReminderEnabled] = useState(true);
  
  // Helper function to get badge translation key
  const getBadgeNameKey = (badgeId: string) => `streakRules.badge.${badgeId}.name` as const;
  const getBadgeDescriptionKey = (badgeId: string) => `streakRules.badge.${badgeId}.description` as const;
  const getBadgeRewardKey = (badgeId: string) => `streakRules.badge.${badgeId}.reward` as const;

  useEffect(() => {
    if (!visible) return;
    let mounted = true;

    void Promise.all([
      recalculateStreak(),
      getStreakBadgeBenefitReminderEnabled(),
    ]).then(([streakData, reminderEnabled]) => {
      if (!mounted) return;
      setCurrentStreak(streakData.currentStreak || 0);
      setBadgeReminderEnabled(reminderEnabled);
    });

    return () => {
      mounted = false;
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color={colors.text} />
          </Pressable>
          <ThemedText size="lg" weight="bold" style={[styles.headerTitle, { fontSize: 20 }]}>
            {t('streakRules.title')}
          </ThemedText>
          <View style={styles.closeButtonSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Available Badges */}
          <View style={styles.section}>
            <ThemedText size="lg" weight="bold" style={styles.sectionTitle}>
              {t('streakRules.badges.title')}
            </ThemedText>
            <ThemedText size="sm" style={[styles.subtitle, { color: colors.textMediumEmphasis }]}>
              {t('streakRules.badges.subtitle')}
            </ThemedText>

            {STREAK_BADGES.map((badge) => {
              const isEarned = currentStreak >= badge.daysRequired;
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeRow,
                    {
                      borderBottomColor: colors.border,
                      opacity: isEarned ? 1 : 0.45,
                    },
                  ]}
                >
                  <View style={styles.badgeIconWrap}>
                    <LinearGradient
                      colors={badge.colorGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.badgeIcon}
                    >
                      <ThemedText size="lg" style={styles.badgeRowEmoji}>
                        {badge.emoji}
                      </ThemedText>
                    </LinearGradient>
                    <View style={styles.badgeStatusIcon}>
                      <MaterialIcons
                        name={isEarned ? "check-circle" : "lock-outline"}
                        size={15}
                        color={isEarned ? colors.primary : colors.textMediumEmphasis}
                      />
                    </View>
                  </View>
                  <View style={styles.badgeInfo}>
                    <View style={styles.badgeHeader}>
                      <ThemedText size="md" weight="bold">
                        {t(getBadgeNameKey(badge.id) as keyof import("@/utils/languages/translations").Translations)}
                      </ThemedText>
                    </View>
                    <ThemedText size="sm" style={{ color: colors.textMediumEmphasis, marginTop: 2 }}>
                      {t(getBadgeDescriptionKey(badge.id) as keyof import("@/utils/languages/translations").Translations)}
                    </ThemedText>
                    <ThemedText size="xs" style={{ color: colors.textHighEmphasis, marginTop: 4 }}>
                      {t(getBadgeRewardKey(badge.id) as keyof import("@/utils/languages/translations").Translations)}
                    </ThemedText>
                    <ThemedText size="xs" weight="semibold" style={{ marginTop: 4, color: colors.primary }}>
                      {t('streakRules.badge.requires')} {badge.daysRequired} {badge.daysRequired === 1 ? t('streakRules.badge.requires.day') : t('streakRules.badge.requires.days')}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
            <Pressable
              style={[
                styles.reminderToggleRow,
                { borderColor: colors.border },
              ]}
              onPress={async () => {
                const next = !badgeReminderEnabled;
                setBadgeReminderEnabled(next);
                await setStreakBadgeBenefitReminderEnabled(next);
                await refreshStreakNotifications();
              }}
            >
              <MaterialIcons
                name={badgeReminderEnabled ? "check-box" : "check-box-outline-blank"}
                size={22}
                color={badgeReminderEnabled ? colors.primary : colors.textMediumEmphasis}
              />
              <View style={styles.reminderToggleTextWrap}>
                <ThemedText size="sm" weight="semibold">
                  {t('streakRules.reminder.toggleTitle')}
                </ThemedText>
                <ThemedText
                  size="xs"
                  style={{
                    color: colors.textMediumEmphasis,
                    marginTop: 2,
                  }}
                >
                  {t('streakRules.reminder.toggleDescription')}
                </ThemedText>
              </View>
            </Pressable>
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  closeButtonSpacer: {
    width: 44,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  reminderToggleTextWrap: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  badgeIconWrap: {
    marginRight: 12,
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeStatusIcon: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRowEmoji: {
    fontSize: 24,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomSpacer: {
    height: 40,
  },
});
