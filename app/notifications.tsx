import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import { useEventInAppNotificationPreference } from '@/utils/EventInAppNotificationPreferenceProvider';
import { useNotificationNudgePreference } from '@/utils/NotificationNudgePreferenceProvider';
import { useNotificationsManager } from '@/utils/NotificationsProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import {
  getAllScheduledEventReminders,
  type EventReminderInfo,
} from '@/utils/sfera-events';

export default function NotificationsScreen() {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const palette = useMemo(
    () => ({
      text: colors.text,
      background: colors.background,
      primary: colors.primary,
      border: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
      card: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      muted: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#4a4a4a',
      error: colors.error || '#e05555',
    }),
    [colorScheme, colors]
  );
  const styles = useMemo(() => createStyles(palette, fontScale), [palette, fontScale]);

  const { friends, familyMembers, profiles } = useJourney();
  const { assignments } = useNotificationsManager();
  const notificationNudge = useNotificationNudgePreference();
  const eventInAppPref = useEventInAppNotificationPreference();

  const [eventReminders, setEventReminders] = useState<EventReminderInfo[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);

  const loadEventReminders = useCallback(async () => {
    setLoadingReminders(true);
    try {
      const reminders = await getAllScheduledEventReminders();
      setEventReminders(reminders);
    } catch (error) {
      console.error('[Notifications] Failed to load event reminders:', error);
    } finally {
      setLoadingReminders(false);
    }
  }, []);

  // Refresh reminders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void loadEventReminders();
    }, [loadEventReminders])
  );

  const renderEventRemindersSection = () => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/event-reminders')}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <ThemedText size="l" weight="bold">
              {t('notifications.eventReminders.title')}
            </ThemedText>
            <ThemedText size="sm" style={{ color: palette.muted, marginTop: 4 }}>
              {loadingReminders
                ? t('common.loading')
                : eventReminders.length === 0
                ? t('notifications.eventReminders.noScheduled')
                : t('notifications.eventReminders.count', { count: eventReminders.length })}
            </ThemedText>
          </View>
          <MaterialIcons name="chevron-right" size={24 * fontScale} color={palette.text} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSphereBlock = (sphere: 'friends' | 'family' | 'relationships', title: string, entityNames: { id: string; name: string }[]) => {
    if (entityNames.length === 0) return null;
    const assignment = assignments[sphere];
    return (
      <View key={sphere} style={styles.card}>
        <ThemedText size="l" weight="bold" style={{ marginBottom: 8 }}>
          {title}
        </ThemedText>

        <View style={{ marginTop: 12, gap: 10 }}>
          {entityNames.map((entity) => {
            // Check if notification is enabled: must have override with kind 'custom'
            const override = assignment?.overrides?.[entity.id];
            const notifOn = override?.kind === 'custom';

            return (
              <TouchableOpacity
                key={entity.id}
                style={styles.entityRow}
                onPress={() => router.push(`/notifications/${sphere}/${entity.id}`)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ThemedText size="sm" weight="medium">
                    {entity.name}
                  </ThemedText>
                </View>
                <View style={styles.rowActionsCompact}>
                  <View style={[styles.badge, notifOn ? styles.badgeOn : styles.badgeOff]}>
                    <MaterialIcons
                      name={notifOn ? 'notifications-active' : 'notifications-off'}
                      size={16 * fontScale}
                      color={notifOn ? palette.background : palette.text}
                    />
                    <ThemedText size="xs" weight="bold" style={{ color: notifOn ? palette.background : palette.text }}>
                      {notifOn ? t('notifications.status.on') : t('notifications.status.off')}
                    </ThemedText>
                  </View>
                  <MaterialIcons name="chevron-right" size={20 * fontScale} color={palette.text} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSectionHeader = (label: string) => (
    <View style={{ marginTop: 8, marginBottom: 4, paddingHorizontal: 4 }}>
      <ThemedText size="xs" weight="semibold" style={{ color: palette.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </ThemedText>
    </View>
  );

  const renderSferasView = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Section 1: Banners & alerts */}
      {renderSectionHeader(t('notifications.section.banners'))}
      <View style={styles.sectionGroup}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <ThemedText size="l" weight="bold">
                {t('settings.notificationNudge.title')}
              </ThemedText>
              <ThemedText size="sm" style={{ color: palette.muted, marginTop: 4 }}>
                {t('settings.notificationNudge.description')}
              </ThemedText>
            </View>
            <Switch
              value={notificationNudge.enabled}
              onValueChange={(v) => void notificationNudge.setEnabled(v)}
              trackColor={{
                false: 'rgba(150,150,150,0.35)',
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <ThemedText size="l" weight="bold">
                {t('settings.eventInAppNotifications.title')}
              </ThemedText>
              <ThemedText size="sm" style={{ color: palette.muted, marginTop: 4 }}>
                {t('settings.eventInAppNotifications.description')}
              </ThemedText>
            </View>
            <Switch
              value={eventInAppPref.enabled}
              onValueChange={(v) => void eventInAppPref.setEnabled(v)}
              trackColor={{
                false: 'rgba(150,150,150,0.35)',
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* Section 2: Push reminders */}
      {renderSectionHeader(t('notifications.section.pushReminders'))}
      <View style={styles.sectionGroup}>
        {renderEventRemindersSection()}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/moment-notifications')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText size="l" weight="bold">
              {t('momentNotifications.title')}
            </ThemedText>
            <MaterialIcons name="chevron-right" size={24 * fontScale} color={palette.text} />
          </View>
          <ThemedText size="sm" style={{ color: palette.muted, marginTop: 4 }}>
            {t('momentNotifications.addSchedule')}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Section 3: People */}
      {renderSectionHeader(t('notifications.section.people'))}
      <View style={styles.sectionGroup}>
        {renderSphereBlock(
          'friends',
          t('notifications.sphere.friends'),
          friends.map((f) => ({ id: f.id, name: f.name }))
        )}
        {renderSphereBlock(
          'family',
          t('notifications.sphere.family'),
          familyMembers.map((f) => ({ id: f.id, name: f.name }))
        )}
        {renderSphereBlock(
          'relationships',
          t('notifications.sphere.relationships'),
          profiles.filter((p) => !p.relationshipEndDate).map((p) => ({ id: p.id, name: p.name }))
        )}
      </View>
    </ScrollView>
  );

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
              hitSlop={12}
        >
          <MaterialIcons
            name="arrow-back-ios"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <ThemedText size="l" weight="bold" style={styles.headerTitle}>
          {t('notifications.title')}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>
      {renderSferasView()}
    </TabScreenContainer>
  );
}

const createStyles = (
  palette: {
    text: string;
    background: string;
    primary: string;
    border: string;
    card: string;
    muted: string;
    error: string;
  },
  fontScale: number
) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16 * fontScale,
      paddingTop: 50,
      paddingBottom: 12 * fontScale,
    },
    headerButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    content: {
      padding: 16 * fontScale,
      paddingBottom: 32 * fontScale,
      gap: 8 * fontScale,
    },
    sectionGroup: {
      gap: 8 * fontScale,
    },
    card: {
      padding: 14 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 10 * fontScale,
    },
    entityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    rowActionsCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10 * fontScale,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6 * fontScale,
      paddingHorizontal: 10 * fontScale,
      paddingVertical: 6 * fontScale,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
    },
    badgeOn: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    badgeOff: {
      backgroundColor: palette.card,
      borderColor: palette.border,
    },
  });
