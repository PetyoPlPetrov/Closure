import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useTranslate } from '@/utils/languages/use-translate';
import {
  clearEventReminderInAppForEvent,
  getAllScheduledEventReminders,
  type EventReminderInfo,
  cancelEventMemoryReminders,
} from '@/utils/sfera-events';

export default function EventRemindersScreen() {
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

  const [eventReminders, setEventReminders] = useState<EventReminderInfo[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const loadEventReminders = useCallback(async () => {
    setLoadingReminders(true);
    try {
      const reminders = await getAllScheduledEventReminders();
      setEventReminders(reminders);
    } catch (error) {
      console.error('[Event Reminders] Failed to load:', error);
    } finally {
      setLoadingReminders(false);
    }
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void loadEventReminders();
    }, [loadEventReminders])
  );

  const formatReminderTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = timestamp - now;

    // Format as date and time
    const dateStr = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
    const timeStr = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (diff < 0) {
      return `${dateStr} at ${timeStr} (${t('notifications.eventReminders.overdue')})`;
    }

    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${dateStr} at ${timeStr} (${t('notifications.eventReminders.inMinutes', { count: minutes })})`;
    }

    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${dateStr} at ${timeStr} (${t('notifications.eventReminders.inHours', { count: hours })})`;
    }

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${dateStr} at ${timeStr} (${t('notifications.eventReminders.inDays', { count: days })})`;
  }, [t]);

  const handleToggleReminder = useCallback(async (reminder: EventReminderInfo, enabled: boolean) => {
    if (!enabled) {
      // User is turning OFF (canceling) the reminder
      Alert.alert(
        t('notifications.eventReminders.cancelTitle'),
        t('notifications.eventReminders.cancelMessage', { eventName: reminder.event.name }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              setTogglingIds(prev => new Set(prev).add(reminder.event.id));
              try {
                await clearEventReminderInAppForEvent(reminder.event.id);
                await cancelEventMemoryReminders(reminder.event.id);
                await loadEventReminders();
              } catch (error) {
                console.error('[Event Reminders] Failed to cancel:', error);
                Alert.alert(t('common.error'), t('notifications.eventReminders.cancelError'));
              } finally {
                setTogglingIds(prev => {
                  const next = new Set(prev);
                  next.delete(reminder.event.id);
                  return next;
                });
              }
            },
          },
        ]
      );
    }
  }, [t, loadEventReminders]);

  const renderContent = () => {
    if (loadingReminders) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText size="sm" style={{ color: palette.muted, marginTop: 12 }}>
            {t('common.loading')}
          </ThemedText>
        </View>
      );
    }

    if (eventReminders.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="notifications-none" size={64 * fontScale} color={palette.muted} />
          <ThemedText size="l" weight="bold" style={{ marginTop: 16, textAlign: 'center' }}>
            {t('notifications.eventReminders.noScheduled')}
          </ThemedText>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {eventReminders.map((reminder) => {
          const isToggling = togglingIds.has(reminder.event.id);

          // Show all 3 reminder times as separate items
          return reminder.schedule.dueTimes.map((dueTime, index) => {
            // Skip reminders that have already been shown
            if (index < reminder.schedule.shownCount) return null;

            const reminderNumber = index + 1;
            const timeStr = formatReminderTime(dueTime);

            return (
              <View key={`${reminder.event.id}-${index}`} style={styles.reminderCard}>
                <View style={{ flex: 1 }}>
                  <ThemedText size="l" weight="bold">
                    {reminder.event.name}
                  </ThemedText>
                  <ThemedText size="sm" style={{ color: palette.muted, marginTop: 6 }}>
                    {t('notifications.eventReminders.reminderNumber', { number: reminderNumber })}: {timeStr}
                  </ThemedText>
                </View>
                <View style={styles.toggleContainer}>
                  {isToggling ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Switch
                      value={true}
                      onValueChange={(enabled) => handleToggleReminder(reminder, enabled)}
                      trackColor={{
                        false: 'rgba(150,150,150,0.35)',
                        true: colors.primary,
                      }}
                      thumbColor="#FFFFFF"
                      disabled={isToggling}
                    />
                  )}
                </View>
              </View>
            );
          }).filter(Boolean);
        })}
      </ScrollView>
    );
  };

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back-ios"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <ThemedText size="l" weight="bold" style={styles.headerTitle}>
          {t('notifications.eventReminders.title')}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>
      {renderContent()}
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
      width: 40 * fontScale,
      height: 40 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32 * fontScale,
    },
    content: {
      padding: 16 * fontScale,
      paddingBottom: 32 * fontScale,
      gap: 12 * fontScale,
    },
    reminderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 16 * fontScale,
    },
    toggleContainer: {
      minWidth: 50,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
  });
