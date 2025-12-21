import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { LifeSphere, useJourney } from '@/utils/JourneyProvider';
import { NotificationTemplate, useNotificationsManager } from '@/utils/NotificationsProvider';

export const options = {
  headerShown: true,
  title: 'Notifications',
};

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<{ sphere: LifeSphere; entityId: string }>();
  const sphere = params.sphere;
  const entityId = params.entityId;

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const palette = useMemo(
    () => ({
      text: colors.text,
      background: colors.background,
      primary: colors.primary,
      border: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
      card: colorScheme === 'dark' ? colors.surfaceElevated1 || 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      muted: colorScheme === 'dark' ? colors.textMediumEmphasis || 'rgba(255,255,255,0.6)' : '#4a4a4a',
      error: colors.error || '#e05555',
      inputBg: colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    }),
    [colorScheme, colors]
  );
  const fontScale = useFontScale();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(palette, fontScale, insets.top), [palette, fontScale, insets.top]);

  const { friends, familyMembers, profiles } = useJourney();
  const { assignments, setOverride, checkCondition, getNextTriggerDate, getScheduledNotifications } = useNotificationsManager();
  
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  const entityName =
    sphere === 'friends'
      ? friends.find((f) => f.id === entityId)?.name
      : sphere === 'family'
        ? familyMembers.find((f) => f.id === entityId)?.name
        : sphere === 'relationships'
          ? profiles.find((p) => p.id === entityId)?.name
          : 'Entity';

  const assignment = assignments[sphere];
  const currentOverride = assignment?.overrides?.[entityId];

  const [customDraft, setCustomDraft] = useState<Omit<NotificationTemplate, 'id'>>({
    name: entityName || 'Custom notification',
    frequencyDays: 1,
    timeOfDay: '09:00',
    weekDay: 1, // Default to Monday
    condition: 'belowAvgMoments',
    noRecentDays: 7,
    defaultForSpheres: [],
    message: '',
  });
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const isInitializing = useRef(true);

  const parseTimeString = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours ?? 9, minutes ?? 0, 0, 0);
    return date;
  };

  const formatTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const currentTime = useMemo(() => parseTimeString(customDraft.timeOfDay), [customDraft.timeOfDay]);

  useEffect(() => {
    if (currentOverride?.kind === 'custom') {
      const { template } = currentOverride;
      setCustomDraft({
        name: template.name,
        frequencyDays: template.frequencyDays,
        timeOfDay: template.timeOfDay,
        weekDay: template.weekDay ?? 1,
        condition: template.condition,
        noRecentDays: template.noRecentDays,
        defaultForSpheres: template.defaultForSpheres || [],
        message: (template as any).message || '',
      });
      isInitializing.current = false;
    } else {
      isInitializing.current = false;
    }
  }, [currentOverride]);

  const updateCustomDraft = useCallback(
    (patch: Partial<Omit<NotificationTemplate, 'id'>>) => {
      setCustomDraft((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handleToggleNotifications = async () => {
    if (currentOverride?.kind === 'custom') {
      // Turn off notifications
      await setOverride(sphere, entityId, { kind: 'none' });
    } else {
      // Turn on notifications with current draft settings
      await setOverride(sphere, entityId, {
        kind: 'custom',
        template: { ...customDraft, id: `custom_${entityId}` },
      });
    }
  };

  // Auto-save changes when draft is updated (only if notifications are enabled)
  useEffect(() => {
    if (!isInitializing.current && currentOverride?.kind === 'custom') {
      const saveChanges = async () => {
        await setOverride(sphere, entityId, {
          kind: 'custom',
          template: { ...customDraft, id: `custom_${entityId}` },
        });
      };

      // Debounce the save to avoid excessive updates
      const timeoutId = setTimeout(saveChanges, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [customDraft, currentOverride?.kind, entityId, isInitializing, setOverride, sphere]);

  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/notifications');
    }
  }, []);

  const handleDebugNotifications = useCallback(async () => {
    if (!__DEV__) return;

    const scheduled = await getScheduledNotifications();
    console.log('=== Scheduled Notifications ===');
    console.log(`Total: ${scheduled.length}`);

    scheduled.forEach((notification, index) => {
      const trigger = notification.trigger as any;
      const triggerDate = trigger.type === 'date' ? new Date(trigger.value) : null;
      const secondsUntil = triggerDate ? Math.floor((triggerDate.getTime() - Date.now()) / 1000) : null;

      console.log(`\n[${index + 1}] ${notification.content.title}`);
      console.log(`  ID: ${notification.identifier}`);
      console.log(`  Body: ${notification.content.body}`);
      console.log(`  Trigger: ${triggerDate ? triggerDate.toLocaleString() : 'N/A'}`);
      console.log(`  In: ${secondsUntil !== null ? `${secondsUntil}s` : 'N/A'}`);
      console.log(`  Data:`, notification.content.data);
    });

    console.log('==============================');
  }, [getScheduledNotifications]);

  // Check if condition is met for the current entity
  // Use specific properties to avoid re-renders when other customDraft properties change
  const isConditionMet = useMemo(() => {
    if (currentOverride?.kind !== 'custom') {
      return false;
    }
    return checkCondition(entityId, sphere, customDraft.condition, customDraft.noRecentDays);
  }, [currentOverride?.kind, customDraft.condition, customDraft.noRecentDays, entityId, sphere, checkCondition]);

  // Countdown timer for dev mode
  const [countdown, setCountdown] = useState<number | null>(null);

  // Format seconds to human-readable format (e.g., "1d 2h 30m 15s" or "5m 30s" or "45s")
  const formatCountdown = useCallback((totalSeconds: number): string => {
    if (totalSeconds <= 0) return '0s';

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  }, []);

  useEffect(() => {
    if (isConditionMet && currentOverride?.kind === 'custom') {
      const updateCountdown = () => {
        const nextTriggerDate = getNextTriggerDate(customDraft);
        const now = new Date();
        const secondsUntilTrigger = Math.floor((nextTriggerDate.getTime() - now.getTime()) / 1000);
        setCountdown(secondsUntilTrigger > 0 ? secondsUntilTrigger : 0);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [isConditionMet, currentOverride?.kind, customDraft, getNextTriggerDate]);

  return (
    <TabScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBackPress} hitSlop={10} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24 * fontScale} color={palette.text} />
          </TouchableOpacity>
          <ThemedText size="xl" weight="bold" style={styles.title}>
            {entityName}
          </ThemedText>
          {__DEV__ && (
            <TouchableOpacity onPress={handleDebugNotifications} hitSlop={10} style={styles.backButton}>
              <MaterialIcons name="bug-report" size={24 * fontScale} color={palette.primary} />
            </TouchableOpacity>
          )}
        </View>
        <ThemedText size="s" style={{ color: palette.muted }}>
          Sphere: {sphere}
        </ThemedText>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText size="m" weight="bold">
              Notification settings
            </ThemedText>
            <TouchableOpacity
              style={[styles.chip, currentOverride?.kind === 'custom' && styles.chipActive]}
              onPress={handleToggleNotifications}
            >
              <ThemedText size="xs" weight="medium" style={{ color: currentOverride?.kind === 'custom' ? palette.background : palette.text }}>
                {currentOverride?.kind === 'custom' ? 'On' : 'Off'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          {currentOverride?.kind !== 'custom' && (
            <ThemedText size="xs" style={{ color: palette.muted, marginTop: -4 }}>
              Turn on to enable notifications.
            </ThemedText>
          )}
          <View style={styles.fieldGroup}>
            <ThemedText size="s" weight="medium" style={styles.fieldLabel}>
              Message
            </ThemedText>
            <TextInput
              placeholder="Check in with Alex today"
              placeholderTextColor={palette.muted}
              value={customDraft.message || `Check in with ${entityName || 'them'} today`}
              onChangeText={(text) => updateCustomDraft({ message: text })}
              style={[styles.input, styles.inputBox]}
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText size="s" weight="medium" style={styles.fieldLabel}>
              Frequency
            </ThemedText>
            <View style={styles.chipRow}>
              {[
                { label: 'Daily', value: 1 },
                { label: 'Weekly', value: 7 },
              ].map((opt) => {
                const active = customDraft.frequencyDays === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateCustomDraft({ frequencyDays: opt.value })}
                  >
                    <ThemedText size="xs" weight="medium" style={{ color: active ? palette.background : palette.text }}>
                      {opt.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {customDraft.frequencyDays === 7 && (
            <View style={styles.fieldGroup}>
              <ThemedText size="s" weight="medium" style={styles.fieldLabel}>
                Day of week
              </ThemedText>
              <View style={styles.chipRow}>
                {[
                  { label: 'Sun', value: 0 },
                  { label: 'Mon', value: 1 },
                  { label: 'Tue', value: 2 },
                  { label: 'Wed', value: 3 },
                  { label: 'Thu', value: 4 },
                  { label: 'Fri', value: 5 },
                  { label: 'Sat', value: 6 },
                ].map((day) => {
                  const active = customDraft.weekDay === day.value;
                  return (
                    <TouchableOpacity
                      key={day.label}
                      style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
                      onPress={() => updateCustomDraft({ weekDay: day.value })}
                    >
                      <ThemedText size="xs" weight="medium" style={{ color: active ? palette.background : palette.text }}>
                        {day.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <ThemedText size="s" weight="medium" style={styles.fieldLabel}>
              Time
            </ThemedText>
            <TouchableOpacity
              style={[styles.input, styles.inputBox, styles.timePickerButton]}
              onPress={() => setShowTimePicker(true)}
            >
              <ThemedText size="s" style={{ color: palette.text }}>
                {customDraft.timeOfDay}
              </ThemedText>
              <MaterialIcons name="access-time" size={20 * fontScale} color={palette.muted} />
            </TouchableOpacity>
            {showTimePicker && (
              <>
                {Platform.OS === 'ios' ? (
                  <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => {
                    setShowTimePicker(false);
                  }}>
                    <Pressable style={styles.timePickerOverlay} onPress={() => {
                      setShowTimePicker(false);
                    }}>
                      <Pressable style={styles.timePickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.timePickerHeader}>
                          <TouchableOpacity onPress={() => {
                            setShowTimePicker(false);
                          }}>
                            <ThemedText size="s" weight="medium" style={{ color: palette.primary }}>
                              Done
                            </ThemedText>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={currentTime}
                          mode="time"
                          is24Hour={true}
                          display="spinner"
                          onChange={(event, selectedTime) => {
                            if (selectedTime) {
                              updateCustomDraft({ timeOfDay: formatTimeString(selectedTime) });
                            }
                          }}
                          themeVariant={colorScheme || 'dark'}
                          style={styles.timePicker}
                        />
                      </Pressable>
                    </Pressable>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={currentTime}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={(event, selectedTime) => {
                      setShowTimePicker(false);
                      if (event.type === 'set' && selectedTime) {
                        updateCustomDraft({ timeOfDay: formatTimeString(selectedTime) });
                      } else {
                        setShowTimePicker(false);
                      }
                    }}
                    themeVariant={colorScheme || 'dark'}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <ThemedText size="s" weight="medium" style={styles.fieldLabel}>
                Condition
              </ThemedText>
              {currentOverride?.kind === 'custom' && isConditionMet && (
                <View style={styles.conditionBadgeInline}>
                  <MaterialIcons name="check-circle" size={16 * fontScale} color={palette.primary} />
                  <ThemedText size="xs" weight="medium" style={{ color: palette.primary, marginLeft: 4 * fontScale }}>
                    Met
                  </ThemedText>
                  {countdown !== null && (
                    <ThemedText size="xs" weight="medium" style={{ color: palette.muted, marginLeft: 8 * fontScale }}>
                      ({formatCountdown(countdown)})
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
            <View style={styles.chipRow}>
              {(sphere === 'relationships'
                ? [
                    { label: 'Less than job', value: 'relationshipLessThanJob' },
                    { label: 'Less than friends avg', value: 'relationshipLessThanFriendsAvg' },
                    { label: 'No recent', value: 'noRecent' },
                  ]
                : [
                    { label: 'Below avg', value: 'belowAvgMoments' },
                    { label: 'No recent', value: 'noRecent' },
                  ]
              ).map((opt) => {
                const active = customDraft.condition === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateCustomDraft({ condition: opt.value as NotificationTemplate['condition'] })}
                  >
                    <ThemedText size="xs" weight="medium" style={{ color: active ? palette.background : palette.text }}>
                      {opt.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
            {customDraft.condition === 'noRecent' && (
              <TextInput
                placeholder="No recent days (e.g., 7)"
                placeholderTextColor={palette.muted}
                keyboardType="numeric"
                value={String(customDraft.noRecentDays ?? 7)}
                onChangeText={(text) => updateCustomDraft({ noRecentDays: Math.max(1, Number(text) || 1) })}
                style={[styles.input, styles.inputBox]}
              />
            )}
          </View>
        </View>

        <Modal visible={!!infoModal} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setInfoModal(null)}>
            <View style={styles.modalCard}>
              <ThemedText size="m" weight="bold" style={{ marginBottom: 6 }}>
                {infoModal?.title}
              </ThemedText>
              <ThemedText size="s" style={{ color: palette.muted }}>
                {infoModal?.body}
              </ThemedText>
            </View>
          </Pressable>
        </Modal>
      </ScrollView>
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
    inputBg: string;
  },
  fontScale: number,
  insetTop: number
) =>
  StyleSheet.create({
    content: {
      paddingTop: insetTop + 12,
      paddingHorizontal: 16 * fontScale,
      paddingBottom: 32 * fontScale,
      gap: 16 * fontScale,
    },
    title: {
      flex: 1,
      marginBottom: 4 * fontScale,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      padding: 4 * fontScale,
    },
    card: {
      padding: 16 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 16 * fontScale,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4 * fontScale,
    },
    fieldGroup: {
      gap: 8 * fontScale,
    },
    fieldLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4 * fontScale,
    },
    fieldLabel: {
      flex: 1,
    },
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8 * fontScale,
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 10 * fontScale,
      color: palette.text,
      fontSize: 15 * fontScale,
    },
    inputBox: {
      backgroundColor: palette.inputBg,
      minHeight: 40 * fontScale,
      maxHeight: 100 * fontScale,
    },
    timePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8 * fontScale,
      alignItems: 'center',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4 * fontScale,
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 8 * fontScale,
      borderRadius: 20 * fontScale,
      borderWidth: 1,
      borderColor: palette.border,
    },
    chipActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    chipSmall: {
      paddingHorizontal: 8 * fontScale,
      paddingVertical: 6 * fontScale,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20 * fontScale,
    },
    timePickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: palette.card,
      borderRadius: 12 * fontScale,
      padding: 16 * fontScale,
      borderWidth: 1,
      borderColor: palette.border,
    },
    timePickerModal: {
      backgroundColor: palette.card,
      borderTopLeftRadius: 20 * fontScale,
      borderTopRightRadius: 20 * fontScale,
      paddingTop: 8 * fontScale,
      paddingBottom: 20 * fontScale,
      borderWidth: 1,
      borderColor: palette.border,
      borderBottomWidth: 0,
    },
    timePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16 * fontScale,
      paddingVertical: 12 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    timePicker: {
      height: 200 * fontScale,
    },
    conditionBadgeInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4 * fontScale,
    },
  });
