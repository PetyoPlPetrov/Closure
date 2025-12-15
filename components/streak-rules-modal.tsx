/**
 * Streak Rules Modal
 * Explains how the rolling 7-day streak system works
 */

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslate } from '@/utils/languages/use-translate';
import { STREAK_BADGES } from '@/utils/streak-types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface StreakRulesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function StreakRulesModal({ visible, onClose }: StreakRulesModalProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const t = useTranslate();
  
  // Helper function to get badge translation key
  const getBadgeNameKey = (badgeId: string) => `streakRules.badge.${badgeId}.name` as const;
  const getBadgeDescriptionKey = (badgeId: string) => `streakRules.badge.${badgeId}.description` as const;

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
            <ThemedText size="sm" style={[styles.subtitle, { color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary }]}>
              {t('streakRules.badges.subtitle')}
            </ThemedText>

            {STREAK_BADGES.map((badge) => (
              <View key={badge.id} style={[styles.badgeRow, { borderBottomColor: colors.border }]}>
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
                <View style={styles.badgeInfo}>
                  <View style={styles.badgeHeader}>
                    <ThemedText size="md" weight="bold">
                      {t(getBadgeNameKey(badge.id))}
                    </ThemedText>
                    <View style={[styles.rarityBadge, {
                      backgroundColor: badge.rarity === 'legendary' ? '#9C27B0' :
                                       badge.rarity === 'epic' ? '#FF6B6B' :
                                       badge.rarity === 'rare' ? '#4CAF50' : '#64B5F6'
                    }]}>
                      <ThemedText size="xs" style={styles.rarityText}>
                        {t(`streakRules.rarity.${badge.rarity}` as const)}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText size="sm" style={{ color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary, marginTop: 2 }}>
                    {t(getBadgeDescriptionKey(badge.id))}
                  </ThemedText>
                  <ThemedText size="xs" weight="semibold" style={{ marginTop: 4, color: colors.primary }}>
                    {t('streakRules.badge.requires')} {badge.daysRequired} {badge.daysRequired === 1 ? t('streakRules.badge.requires.day') : t('streakRules.badge.requires.days')}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: 40,
  },
});
