import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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

  const { friends, familyMembers, profiles, idealizedMemories } = useJourney();
  const { assignments, setOverride } = useNotificationsManager();

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
    // Use nullish coalescing (??) instead of || to handle 0 (midnight) correctly
    date.setHours(hours ?? 9, minutes ?? 0, 0, 0);
    return date;
  };

  const formatTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const currentTime = useMemo(() => parseTimeString(customDraft.timeOfDay), [customDraft.timeOfDay]);

  // Helper functions to evaluate conditions
  const countMoments = useCallback((memories: any[]) => {
    if (!memories || memories.length === 0) return 0;
    return memories.reduce((acc, m) => acc + (m.hardTruths?.length ?? 0) + (m.goodFacts?.length ?? 0), 0);
  }, []);

  const latestMemoryDate = useCallback((memories: any[]) => {
    if (!memories || memories.length === 0) return undefined;
    const timestamps = memories
      .map((m) => m.updatedAt || m.createdAt)
      .filter(Boolean)
      .map((ts) => new Date(ts).getTime());
    if (timestamps.length === 0) return undefined;
    return new Date(Math.max(...timestamps));
  }, []);

  const evaluateConditionStatus = useCallback(
    (condition: NotificationTemplate['condition'], noRecentDays?: number): { met: boolean; explanation: string } => {
      const memoriesForEntity = idealizedMemories.filter((m) => m.entityId === entityId && m.sphere === sphere);

      if (condition === 'none') {
        return { met: true, explanation: 'No condition is set. Notifications will always trigger.' };
      }

      if (condition === 'noRecent') {
        const last = latestMemoryDate(memoriesForEntity);
        if (!last) {
          return { met: true, explanation: 'No memories found. Condition is met → Notification will trigger.' };
        }
        const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        const threshold = noRecentDays ?? 7;
        const met = diffDays >= threshold;
        return {
          met,
          explanation: met
            ? `Last memory was ${diffDays.toFixed(1)} days ago (threshold: ${threshold} days). Condition is met → Notification will trigger.`
            : `Last memory was ${diffDays.toFixed(1)} days ago (threshold: ${threshold} days). Condition is not met → Notification will NOT trigger.`,
        };
      }

      if (condition === 'belowAvgMoments' && (sphere === 'friends' || sphere === 'family')) {
        const entitiesInSphere =
          sphere === 'friends'
            ? friends.map((f) => f.id)
            : sphere === 'family'
              ? familyMembers.map((f) => f.id)
              : [];
        // Exclude the current entity from the average calculation
        const otherEntities = entitiesInSphere.filter((id) => id !== entityId);
        if (otherEntities.length === 0) {
          return { met: false, explanation: 'No other entities in this sphere to compare.' };
        }
        // Calculate totals for OTHER entities only (excluding current entity)
        const totals = otherEntities.map((id) =>
          countMoments(idealizedMemories.filter((m) => m.entityId === id && m.sphere === sphere))
        );
        const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
        const entityTotal = countMoments(memoriesForEntity);
        const met = entityTotal < avg;
        return {
          met,
          explanation: met
            ? `${entityName} has ${entityTotal} moments, which is below the average of ${avg.toFixed(1)} for other ${sphere} (${otherEntities.length} ${otherEntities.length === 1 ? 'entity' : 'entities'}). Condition is met → Notification will trigger.`
            : `${entityName} has ${entityTotal} moments, which is above or equal to the average of ${avg.toFixed(1)} for other ${sphere} (${otherEntities.length} ${otherEntities.length === 1 ? 'entity' : 'entities'}). Condition is not met → Notification will NOT trigger.`,
        };
      }

      if (condition === 'relationshipLessThanJob' && sphere === 'relationships') {
        const currentRelationship = profiles.find((p) => !p.relationshipEndDate);
        if (!currentRelationship || currentRelationship.id !== entityId) {
          return { met: false, explanation: 'This is not your current partner.' };
        }
        const relationshipMems = idealizedMemories.filter((m) => m.entityId === currentRelationship.id && m.sphere === 'relationships');
        const careerMems = idealizedMemories.filter((m) => m.sphere === 'career');
        const careerTotal = countMoments(careerMems);
        const relationshipTotal = countMoments(relationshipMems);
        const met = relationshipTotal < careerTotal;
        return {
          met,
          explanation: met
            ? `Relationship has ${relationshipTotal} moments, which is less than career's ${careerTotal}. Condition is met → Notification will trigger.`
            : `Relationship has ${relationshipTotal} moments, which is equal to or more than career's ${careerTotal}. Condition is not met → Notification will NOT trigger.`,
        };
      }

      if (condition === 'relationshipLessThanFriendsAvg' && sphere === 'relationships') {
        const currentRelationship = profiles.find((p) => !p.relationshipEndDate);
        if (!currentRelationship || currentRelationship.id !== entityId) {
          return { met: false, explanation: 'This is not your current partner.' };
        }
        const relationshipMems = idealizedMemories.filter((m) => m.entityId === currentRelationship.id && m.sphere === 'relationships');
        const friendsEntities = friends.map((f) => f.id);
        if (friendsEntities.length === 0) {
          return { met: false, explanation: 'No friends to compare with.' };
        }
        const friendsTotals = friendsEntities.map((id) =>
          countMoments(idealizedMemories.filter((m) => m.entityId === id && m.sphere === 'friends'))
        );
        const avgFriends = friendsTotals.reduce((a, b) => a + b, 0) / friendsTotals.length;
        const relationshipTotal = countMoments(relationshipMems);
        const met = relationshipTotal < avgFriends;
        return {
          met,
          explanation: met
            ? `Relationship has ${relationshipTotal} moments, which is less than friends' average of ${avgFriends.toFixed(1)}. Condition is met → Notification will trigger.`
            : `Relationship has ${relationshipTotal} moments, which is equal to or more than friends' average of ${avgFriends.toFixed(1)}. Condition is not met → Notification will NOT trigger.`,
        };
      }

      if (condition === 'relationshipNoRecent' && sphere === 'relationships') {
        const currentRelationship = profiles.find((p) => !p.relationshipEndDate);
        if (!currentRelationship || currentRelationship.id !== entityId) {
          return { met: false, explanation: 'This is not your current partner.' };
        }
        const last = latestMemoryDate(memoriesForEntity);
        if (!last) {
          return { met: true, explanation: 'No memories found. Condition is met → Notification will trigger.' };
        }
        const threshold = noRecentDays ?? 7;
        const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        const met = diffDays >= threshold;
        return {
          met,
          explanation: met
            ? `Last memory was ${diffDays.toFixed(1)} days ago (threshold: ${threshold} days). Condition is met → Notification will trigger.`
            : `Last memory was ${diffDays.toFixed(1)} days ago (threshold: ${threshold} days). Condition is not met → Notification will NOT trigger.`,
        };
      }

      return { met: false, explanation: 'Unknown condition.' };
    },
    [entityId, sphere, entityName, friends, familyMembers, profiles, idealizedMemories, countMoments, latestMemoryDate]
  );

  const persistCustomOverride = useCallback(
    async (draft: Omit<NotificationTemplate, 'id'>) => {
      const payload: NotificationTemplate = {
        ...draft,
        id: `custom_${entityId}`,
        frequencyDays: Math.max(1, Number(draft.frequencyDays) || 1),
        noRecentDays:
          draft.condition === 'noRecent' || draft.condition === 'relationshipNoRecent'
            ? Math.max(1, Number(draft.noRecentDays) || 1)
            : undefined,
      };
      console.log('[NotificationDetail] persistCustomOverride: SAVING notification settings', {
        sphere,
        entityId,
        entityName,
        payload: {
          ...payload,
          message: payload.message || `Check in with ${entityName || 'them'} today`,
        },
      });
      await setOverride(sphere, entityId, { kind: 'custom', template: payload });
      console.log('[NotificationDetail] persistCustomOverride: SAVED notification settings', {
        sphere,
        entityId,
        entityName,
      });
    },
    [entityId, setOverride, sphere, entityName]
  );

  const updateCustomDraft = useCallback(
    (patch: Partial<Omit<NotificationTemplate, 'id'>>) => {
      setCustomDraft((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  useEffect(() => {
    if (currentOverride?.kind === 'custom') {
      const { template } = currentOverride;
      setCustomDraft({
        name: template.name,
        frequencyDays: template.frequencyDays,
        timeOfDay: template.timeOfDay,
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

  // Persist changes after state updates (but not during initialization or while time picker is open)
  // Use a longer debounce to prevent excessive persistence on every keystroke
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPersistedRef = useRef<string>('');
  
  useEffect(() => {
    // Don't persist while time picker is open - wait until user closes it
    if (!isInitializing.current && currentOverride?.kind === 'custom' && !showTimePicker) {
      // Create a stable key from the draft to avoid unnecessary saves
      const draftKey = JSON.stringify({
        name: customDraft.name,
        frequencyDays: customDraft.frequencyDays,
        timeOfDay: customDraft.timeOfDay,
        condition: customDraft.condition,
        noRecentDays: customDraft.noRecentDays,
        message: customDraft.message,
      });
      
      // Skip if this is the same as what we last persisted
      if (draftKey === lastPersistedRef.current) {
        return;
      }
      
      // Clear any pending persistence
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
      
      // Debounce persistence to avoid excessive writes
      persistTimeoutRef.current = setTimeout(() => {
        persistCustomOverride(customDraft);
        lastPersistedRef.current = draftKey;
      }, 1000); // 1 second debounce - only persist after user stops typing
      
      return () => {
        if (persistTimeoutRef.current) {
          clearTimeout(persistTimeoutRef.current);
        }
      };
    }
  }, [customDraft, persistCustomOverride, currentOverride, showTimePicker]);

  const handleToggleNotifications = async () => {
    if (currentOverride?.kind === 'custom') {
      await setOverride(sphere, entityId, { kind: 'none' });
      Alert.alert('Saved', 'Notifications turned off for this entity.');
    } else {
      // Enable with default settings
      await persistCustomOverride(customDraft);
      Alert.alert('Saved', 'Notifications enabled.');
    }
  };

  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/notifications');
    }
  }, []);

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
              Turn on to enable notifications. Don't forget to press "Apply & reschedule" after enabling.
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
                    persistCustomOverride(customDraft);
                  }}>
                    <Pressable style={styles.timePickerOverlay} onPress={() => {
                      setShowTimePicker(false);
                      persistCustomOverride(customDraft);
                    }}>
                      <Pressable style={styles.timePickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.timePickerHeader}>
                          <TouchableOpacity onPress={() => {
                            setShowTimePicker(false);
                            // Persist immediately when user closes picker
                            persistCustomOverride(customDraft);
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
              {customDraft.condition !== 'none' && (() => {
                const currentStatus = evaluateConditionStatus(customDraft.condition, customDraft.noRecentDays);
                return (
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      setInfoModal({
                        title: 'Current Condition Status',
                        body: currentStatus.explanation,
                      });
                    }}
                    style={styles.statusIndicator}
                  >
                    <MaterialIcons
                      name={currentStatus.met ? 'check-circle' : 'cancel'}
                      size={18 * fontScale}
                      color={currentStatus.met ? palette.primary : palette.muted}
                    />
                    <ThemedText size="xs" style={{ color: currentStatus.met ? palette.primary : palette.muted, marginLeft: 4 }}>
                      {currentStatus.met ? 'Will trigger' : "Won't trigger"}
                    </ThemedText>
                  </Pressable>
                );
              })()}
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
                const conditionStatus = evaluateConditionStatus(
                  opt.value as NotificationTemplate['condition'],
                  customDraft.noRecentDays
                );
                const isCurrentlyMet = conditionStatus.met;
                
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateCustomDraft({ condition: opt.value as NotificationTemplate['condition'] })}
                  >
                    <ThemedText size="xs" weight="medium" style={{ color: active ? palette.background : palette.text }}>
                      {opt.label}
                    </ThemedText>
                    <Pressable
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        setInfoModal({
                          title: `${opt.label} - Current Status`,
                          body: conditionStatus.explanation,
                        });
                      }}
                    >
                      <MaterialIcons
                        name={isCurrentlyMet ? 'check-circle' : 'info-outline'}
                        size={16 * fontScale}
                        color={
                          active
                            ? palette.background
                            : isCurrentlyMet
                              ? palette.primary
                              : palette.muted
                        }
                      />
                    </Pressable>
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

const getConditionInfo = (
  condition: NotificationTemplate['condition'],
  sphere: LifeSphere,
  noRecentDays: number
): { title: string; body: string } => {
  switch (condition) {
    case 'belowAvgMoments':
      return {
        title: 'Below average',
        body: `Sends when this ${sphere.slice(0, -1)} has fewer moments than the average for ${sphere}. Example: average is 12, this one has 7 → notify.`,
      };
    case 'relationshipLessThanJob':
      return {
        title: 'Less than job',
        body: 'Sends when your current partner has fewer moments than your career/job moments.',
      };
    case 'relationshipLessThanFriendsAvg':
      return {
        title: 'Less than friends average',
        body: 'Sends when partner moments are below the average moments you have with friends.',
      };
    case 'noRecent':
      return {
        title: 'No recent moments',
        body: `Sends when there are no new moments for at least ${noRecentDays} days.`,
      };
    case 'relationshipNoRecent':
      return {
        title: 'No recent partner moments',
        body: `Sends when there are no new partner moments for at least ${noRecentDays} days.`,
      };
    case 'none':
      return {
        title: 'No condition',
        body: 'No condition is applied. This option will not trigger notifications unless another condition is selected.',
      };
    default:
      return {
        title: 'Condition',
        body: 'Choose how this notification should be triggered.',
      };
  }
};

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
  });
