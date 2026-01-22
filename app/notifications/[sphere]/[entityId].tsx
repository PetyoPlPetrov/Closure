import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
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
import { useSubscription } from '@/utils/SubscriptionProvider';
import { showPaywallForPremiumAccess } from '@/utils/premium-access';
import { useTranslate } from '@/utils/languages/use-translate';

// Note: Header title is set in _layout.tsx
export const options = {
  headerShown: true,
};

export default function NotificationDetailScreen() {
  const t = useTranslate();
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
  const { isSubscribed } = useSubscription();
  
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
    soundEnabled: true, // Default to sound enabled
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
        soundEnabled: template.soundEnabled !== false, // Default to true if not specified
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
      // Turn on notifications - check subscription first
      // In development mode, bypass subscription check
      if (!__DEV__ && !isSubscribed) {
        // Show paywall (custom in dev, RevenueCat in prod)
        const subscribed = await showPaywallForPremiumAccess();
        if (!subscribed) return; // User cancelled or didn't subscribe
        // User subscribed, continue to enable notifications
      }
      
      // Request notification permissions when user explicitly enables notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          // User denied permissions, don't enable notifications
          return;
        }
      }
      
      // Turn on notifications with current draft settings
      await setOverride(sphere, entityId, {
        kind: 'custom',
        template: { ...customDraft, id: `custom_${entityId}` },
      });
      
      // Log analytics event
      const { logNotificationTurnedOn } = require('@/utils/analytics');
      // Determine entity type based on sphere
      const entityType = sphere === 'relationships' ? 'profile' 
        : sphere === 'career' ? 'job'
        : sphere === 'family' ? 'familyMember'
        : sphere === 'friends' ? 'friend'
        : sphere === 'hobbies' ? 'hobby'
        : 'unknown';
      logNotificationTurnedOn(sphere, entityType).catch(() => {
        // Failed to log event
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
    // Debug: Scheduled notifications available for inspection
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
          {t('notifications.settings.sphere')}: {sphere}
        </ThemedText>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText size="m" weight="bold">
              {t('notifications.settings.title')}
            </ThemedText>
            <TouchableOpacity
              style={[styles.toggleButton, currentOverride?.kind === 'custom' && styles.toggleButtonActive]}
              onPress={handleToggleNotifications}
            >
              <ThemedText size="sm" weight="bold" style={{ color: currentOverride?.kind === 'custom' ? palette.background : palette.text }}>
                {currentOverride?.kind === 'custom' ? t('notifications.status.on') : t('notifications.status.off')}
              </ThemedText>
            </TouchableOpacity>
          </View>
          {currentOverride?.kind !== 'custom' && (
            <ThemedText size="xs" style={{ color: palette.muted, marginTop: -4 }}>
              {t('notifications.settings.turnOnDescription')}
            </ThemedText>
          )}
          <View style={styles.fieldGroup}>
            <ThemedText size="s" weight="medium" style={styles.fieldLabel}>
              {t('notifications.settings.message')}
            </ThemedText>
            <TextInput
              placeholder={t('notifications.settings.messagePlaceholder').replace('{name}', entityName || 'them')}
              placeholderTextColor={palette.muted}
              value={customDraft.message || t('notifications.settings.messagePlaceholder').replace('{name}', entityName || 'them')}
              onChangeText={(text) => updateCustomDraft({ message: text })}
              style={[styles.input, styles.inputBox]}
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText size="s" weight="medium" style={styles.fieldLabel}>
              {t('notifications.settings.frequency')}
            </ThemedText>
            <View style={styles.chipRow}>
              {[
                { label: t('notifications.settings.frequency.daily'), value: 1 },
                { label: t('notifications.settings.frequency.weekly'), value: 7 },
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
                {t('notifications.settings.dayOfWeek')}
              </ThemedText>
              <View style={styles.chipRow}>
                {[
                  { label: t('notifications.settings.dayOfWeek.sun'), value: 0 },
                  { label: t('notifications.settings.dayOfWeek.mon'), value: 1 },
                  { label: t('notifications.settings.dayOfWeek.tue'), value: 2 },
                  { label: t('notifications.settings.dayOfWeek.wed'), value: 3 },
                  { label: t('notifications.settings.dayOfWeek.thu'), value: 4 },
                  { label: t('notifications.settings.dayOfWeek.fri'), value: 5 },
                  { label: t('notifications.settings.dayOfWeek.sat'), value: 6 },
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
              {t('notifications.settings.time')}
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
                              {t('notifications.settings.done')}
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
                {t('notifications.settings.sound')}
              </ThemedText>
              <TouchableOpacity
                style={[styles.toggleButton, styles.toggleButtonSmall, customDraft.soundEnabled && styles.toggleButtonActive]}
                onPress={() => updateCustomDraft({ soundEnabled: !customDraft.soundEnabled })}
              >
                <MaterialIcons
                  name={customDraft.soundEnabled ? 'volume-up' : 'volume-off'}
                  size={18 * fontScale}
                  color={customDraft.soundEnabled ? palette.background : palette.text}
                />
                <ThemedText size="xs" weight="bold" style={{ color: customDraft.soundEnabled ? palette.background : palette.text }}>
                  {customDraft.soundEnabled ? t('notifications.settings.sound.on') : t('notifications.settings.sound.off')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <ThemedText size="s" weight="medium" style={styles.fieldLabel}>
                {t('notifications.settings.condition')}
              </ThemedText>
              {currentOverride?.kind === 'custom' && (
                isConditionMet ? (
                  <View style={styles.conditionBadgeInline}>
                    <MaterialIcons name="check-circle" size={16 * fontScale} color={palette.primary} />
                    <ThemedText size="xs" weight="medium" style={{ color: palette.primary, marginLeft: 4 * fontScale }}>
                      {t('notifications.settings.condition.met')}
                    </ThemedText>
                    {countdown !== null && (
                      <ThemedText size="xs" weight="medium" style={{ color: palette.muted, marginLeft: 8 * fontScale }}>
                        ({formatCountdown(countdown)})
                      </ThemedText>
                    )}
                  </View>
                ) : (
                  <View style={styles.conditionBadgeInline}>
                    <MaterialIcons name="cancel" size={16 * fontScale} color={palette.error} />
                    <ThemedText size="xs" weight="medium" style={{ color: palette.error, marginLeft: 4 * fontScale }}>
                      {t('notifications.settings.condition.notMet')}
                    </ThemedText>
                  </View>
                )
              )}
            </View>
            <View style={styles.chipRow}>
              {(sphere === 'relationships'
                ? [
                    {
                      label: t('notifications.settings.condition.lessThanJob'),
                      value: 'relationshipLessThanJob',
                      info: {
                        title: t('notifications.settings.condition.lessThanJob.title'),
                        body: t('notifications.settings.condition.lessThanJob.body')
                      }
                    },
                    {
                      label: t('notifications.settings.condition.lessThanFriendsAvg'),
                      value: 'relationshipLessThanFriendsAvg',
                      info: {
                        title: t('notifications.settings.condition.lessThanFriendsAvg.title'),
                        body: t('notifications.settings.condition.lessThanFriendsAvg.body')
                      }
                    },
                    {
                      label: t('notifications.settings.condition.noRecent'),
                      value: 'noRecent',
                      info: {
                        title: t('notifications.settings.condition.noRecent.title'),
                        body: t('notifications.settings.condition.noRecent.body')
                      }
                    },
                  ]
                : [
                    {
                      label: t('notifications.settings.condition.belowAvg'),
                      value: 'belowAvgMoments',
                      info: {
                        title: t('notifications.settings.condition.belowAvg.title'),
                        body: t('notifications.settings.condition.belowAvg.body')
                      }
                    },
                    {
                      label: t('notifications.settings.condition.noRecent'),
                      value: 'noRecent',
                      info: {
                        title: t('notifications.settings.condition.noRecent.title'),
                        body: t('notifications.settings.condition.noRecent.body')
                      }
                    },
                  ]
              ).map((opt) => {
                const active = customDraft.condition === opt.value;
                return (
                  <View key={opt.value} style={styles.chipWithInfo}>
                    <TouchableOpacity
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => updateCustomDraft({ condition: opt.value as NotificationTemplate['condition'] })}
                    >
                      <ThemedText size="xs" weight="medium" style={{ color: active ? palette.background : palette.text }}>
                        {opt.label}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.infoIcon}
                      onPress={() => setInfoModal(opt.info)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons
                        name="info-outline"
                        size={18 * fontScale}
                        color={palette.muted}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            {customDraft.condition === 'noRecent' && (
              <TextInput
                placeholder={t('notifications.settings.condition.noRecentDaysPlaceholder')}
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
    toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20 * fontScale,
      paddingVertical: 12 * fontScale,
      borderRadius: 24 * fontScale,
      borderWidth: 2,
      borderColor: palette.border,
      minWidth: 80 * fontScale,
    },
    toggleButtonActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    toggleButtonSmall: {
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 8 * fontScale,
      minWidth: 60 * fontScale,
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
    chipWithInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4 * fontScale,
    },
    infoIcon: {
      padding: 4 * fontScale,
      marginLeft: -4 * fontScale,
    },
  });
