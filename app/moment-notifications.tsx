import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { AIInsightsConsentModal } from "@/components/ai-insights-consent-modal";
import { useInAppNotification } from "@/utils/InAppNotificationProvider";
import { useAIInsightsConsent } from "@/utils/AIInsightsConsentProvider";
import { showPaywallForUpgradeAccess } from "@/utils/premium-access";
import { useSubscription } from "@/utils/SubscriptionProvider";
import { useJourney, type LifeSphere } from "@/utils/JourneyProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import type { MomentNotificationSchedule, MomentType } from "@/utils/moment-notification-types";
import { useMomentNotifications } from "@/utils/MomentNotificationProvider";

const SPHERE_OPTIONS: { value: LifeSphere; labelKey: string }[] = [
  { value: "career", labelKey: "momentNotifications.sphere.career" },
  { value: "relationships", labelKey: "momentNotifications.sphere.relationships" },
  { value: "family", labelKey: "momentNotifications.sphere.family" },
  { value: "friends", labelKey: "momentNotifications.sphere.friends" },
  { value: "hobbies", labelKey: "momentNotifications.sphere.hobbies" },
];

const MOMENT_TYPE_OPTIONS: { value: MomentType; labelKey: string }[] = [
  { value: "lesson", labelKey: "momentNotifications.momentType.lesson" },
  { value: "sunny", labelKey: "momentNotifications.momentType.sunny" },
];

const FREQUENCY_HOURS = [1, 2, 4, 6, 8, 12, 24];
const MIN_FREQUENCY_HOURS = 1;
const MAX_FREQUENCY_HOURS = 168; // 1 week

export default function MomentNotificationsScreen() {
  const t = useTranslate();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();

  const { idealizedMemories } = useJourney();
  const { showNotification } = useInAppNotification();
  const aiConsent = useAIInsightsConsent();
  const { hasAIEntitlement } = useSubscription();
  const {
    schedules,
    summaries,
    isLoaded,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    ensureSummariesForSphereAndType,
    getSummariesBySphereAndType,
    refreshMomentNudgeSchedules,
  } = useMomentNotifications();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MomentNotificationSchedule | null>(null);

  const [formSphere, setFormSphere] = useState<LifeSphere>("career");
  const [formMomentType, setFormMomentType] = useState<MomentType>("lesson");
  const [formFrequencyHours, setFormFrequencyHours] = useState(__DEV__ ? 1 : 2);
  const [formFrequencyCustom, setFormFrequencyCustom] = useState(false);
  const [formCustomHoursInput, setFormCustomHoursInput] = useState("");
  const [formSource, setFormSource] = useState<"moments" | "ai" | "both">("ai");
  const [formEnabled, setFormEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [aiConsentModalVisible, setAiConsentModalVisible] = useState(false);
  const [pendingSourceAfterConsent, setPendingSourceAfterConsent] = useState<"ai" | "both" | null>(null);

  const countsBySphere = useMemo(() => {
    const lessons: Record<LifeSphere, number> = {
      career: 0,
      relationships: 0,
      family: 0,
      friends: 0,
      hobbies: 0,
    };
    const sunny: Record<LifeSphere, number> = {
      career: 0,
      relationships: 0,
      family: 0,
      friends: 0,
      hobbies: 0,
    };
    for (const mem of idealizedMemories) {
      const sphere = mem.sphere ?? "relationships";
      if (sphere in lessons) {
        lessons[sphere] += (mem.lessonsLearned ?? []).filter((l) => l.text?.trim()).length;
        sunny[sphere] += (mem.goodFacts ?? []).filter((g) => g.text?.trim()).length;
      }
    }
    return { lessons, sunny };
  }, [idealizedMemories]);

  const lessonsCount = countsBySphere.lessons[formSphere] ?? 0;
  const sunnyCount = countsBySphere.sunny[formSphere] ?? 0;
  const hasLessonsForSphere = lessonsCount > 0;
  const hasSunnyForSphere = sunnyCount > 0;
  const hasValidMomentTypeSelection =
    (formMomentType === "lesson" && hasLessonsForSphere) || (formMomentType === "sunny" && hasSunnyForSphere);
  const hasBothMomentTypesDisabled = !hasLessonsForSphere && !hasSunnyForSphere;

  const formEffectiveHours =
    formFrequencyCustom && formCustomHoursInput.trim()
      ? Math.min(
          MAX_FREQUENCY_HOURS,
          Math.max(MIN_FREQUENCY_HOURS, parseInt(formCustomHoursInput, 10) || MIN_FREQUENCY_HOURS)
        )
      : formFrequencyHours;

  const canUseAISource = hasAIEntitlement && aiConsent.isEnabled;

  const hasFormChanged = editingSchedule
    ? (() => {
        const effectiveOriginalSource =
          (editingSchedule.source === "ai" || editingSchedule.source === "both") && !canUseAISource
            ? "moments"
            : editingSchedule.source;
        return (
          formSphere !== editingSchedule.sphere ||
          formMomentType !== editingSchedule.momentType ||
          formEffectiveHours !== editingSchedule.frequencyHours ||
          formSource !== effectiveOriginalSource ||
          formEnabled !== editingSchedule.enabled
        );
      })()
    : true;

  const canSave =
    hasValidMomentTypeSelection && !hasBothMomentTypesDisabled && (editingSchedule ? hasFormChanged : true);

  const palette = useMemo(
    () => ({
      text: colors.text,
      background: colors.background,
      primary: colors.primary,
      border: colorScheme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
      card: colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      muted: colorScheme === "dark" ? "rgba(255,255,255,0.6)" : "#4a4a4a",
      // Elevated surface for unselected chips/buttons (WCAG 3:1 contrast)
      surfaceElevated: colorScheme === "dark" ? "#2D3A4F" : "rgba(0,0,0,0.08)",
      surfaceDisabled: colorScheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.04)",
    }),
    [colorScheme, colors]
  );
  const styles = useMemo(() => createStyles(palette, fontScale), [palette, fontScale]);

  // Debug: print current lessons and AI summaries when screen loads
  useEffect(() => {
    if (!__DEV__ || !isLoaded) return;
    const lessons: { memoryId: string; source: string; id: string; text: string }[] = [];
    const sunnyMoments: { memoryId: string; source: string; id: string; text: string }[] = [];
    for (const mem of idealizedMemories) {
      const src = mem.source ?? "unknown";
      for (const l of mem.lessonsLearned ?? []) {
        lessons.push({ memoryId: mem.id, source: src, id: l.id, text: l.text });
      }
      for (const g of mem.goodFacts ?? []) {
        sunnyMoments.push({ memoryId: mem.id, source: src, id: g.id, text: g.text });
      }
    }
    const lessonSummaries = summaries.filter((s) => s.momentType === "lesson");
    const sunnySummaries = summaries.filter((s) => s.momentType === "sunny");
  }, [isLoaded, idealizedMemories, summaries]);

  useEffect(() => {
    if (!hasLessonsForSphere && formMomentType === "lesson" && hasSunnyForSphere) {
      setFormMomentType("sunny");
    } else if (!hasSunnyForSphere && formMomentType === "sunny" && hasLessonsForSphere) {
      setFormMomentType("lesson");
    } else if (!hasLessonsForSphere && !hasSunnyForSphere) {
      setFormMomentType("lesson");
    }
  }, [formSphere, hasLessonsForSphere, hasSunnyForSphere, formMomentType]);

  const handleMomentTypePress = useCallback(
    (type: MomentType) => {
      if (type === "lesson" && !hasLessonsForSphere) return;
      if (type === "sunny" && !hasSunnyForSphere) return;
      setFormMomentType(type);
    },
    [hasLessonsForSphere, hasSunnyForSphere, formSphere]
  );

  const getEffectiveSource = useCallback(
    (schedule: MomentNotificationSchedule): "moments" | "ai" | "both" =>
      (schedule.source === "ai" || schedule.source === "both") && !canUseAISource
        ? "moments"
        : schedule.source,
    [canUseAISource]
  );

  const handleSourcePress = useCallback(
    (source: "moments" | "ai" | "both") => {
      if (source === "ai" || source === "both") {
        if (!hasAIEntitlement) {
          void showPaywallForUpgradeAccess().then((purchased) => {
            if (purchased) setFormSource(source);
          });
          return;
        }
        if (!aiConsent.isEnabled) {
          setPendingSourceAfterConsent(source);
          setAiConsentModalVisible(true);
          return;
        }
      }
      setFormSource(source);
    },
    [hasAIEntitlement, aiConsent.isEnabled]
  );

  const openAdd = useCallback(() => {
    setEditingSchedule(null);
    const firstSphereWithData = (SPHERE_OPTIONS as { value: LifeSphere }[]).find(
      (o) => countsBySphere.lessons[o.value] > 0 || countsBySphere.sunny[o.value] > 0
    );
    const sphere = firstSphereWithData?.value ?? "career";
    const hasLessons = countsBySphere.lessons[sphere] > 0;
    setFormSphere(sphere);
    setFormMomentType(hasLessons ? "lesson" : "sunny");
    setFormFrequencyHours(__DEV__ ? 1 : 2);
    setFormFrequencyCustom(false);
    setFormCustomHoursInput("");
    setFormSource(canUseAISource ? "ai" : "moments");
    setFormEnabled(true);
    setModalVisible(true);
  }, [countsBySphere, canUseAISource]);

  const openEdit = useCallback(
    (schedule: MomentNotificationSchedule) => {
      setEditingSchedule(schedule);
      setFormSphere(schedule.sphere);
      setFormMomentType(schedule.momentType);
      const isPreset = FREQUENCY_HOURS.includes(schedule.frequencyHours);
      setFormFrequencyHours(schedule.frequencyHours);
      setFormFrequencyCustom(!isPreset);
      setFormCustomHoursInput(isPreset ? "" : String(schedule.frequencyHours));
      const baseSource =
        schedule.source === "user" ? "moments" : schedule.source;
      setFormSource((baseSource === "ai" || baseSource === "both") && !canUseAISource ? "moments" : baseSource);
      setFormEnabled(schedule.enabled);
      setModalVisible(true);
    },
    [canUseAISource]
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingSchedule(null);
  }, []);

  const handleSave = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        Alert.alert(
          t("common.error") ?? "Error",
          t("momentNotifications.permissionRequired") ?? "Notification permission is required."
        );
        return;
      }
    }

    if (formSource === "ai" || formSource === "both") {
      if (!hasAIEntitlement) {
        const purchased = await showPaywallForUpgradeAccess();
        if (!purchased) return;
      } else if (!aiConsent.isEnabled) {
        setAiConsentModalVisible(true);
        return;
      }
    }

    setIsSaving(true);
    try {
      if (formSource === "ai" || formSource === "both") {
        const result = await ensureSummariesForSphereAndType(
          formSphere,
          formMomentType,
          language === "bg" ? "bg" : "en"
        );
        if (result.error) {
          Alert.alert(
            t("common.error") ?? "Error",
            result.error
          );
          setIsSaving(false);
          return;
        }
      }

      const hours =
        formFrequencyCustom && formCustomHoursInput.trim()
          ? Math.min(
              MAX_FREQUENCY_HOURS,
              Math.max(MIN_FREQUENCY_HOURS, parseInt(formCustomHoursInput, 10) || MIN_FREQUENCY_HOURS)
            )
          : formFrequencyHours;

      if (editingSchedule) {
        await updateSchedule({
          ...editingSchedule,
          sphere: formSphere,
          momentType: formMomentType,
          frequencyHours: hours,
          source: formSource,
          userMessages: [],
          enabled: formEnabled,
        });
      } else {
        await addSchedule({
          sphere: formSphere,
          momentType: formMomentType,
          frequencyHours: hours,
          source: formSource,
          userMessages: [],
          enabled: formEnabled,
        });
      }
      await refreshMomentNudgeSchedules();
      showNotification({
        title: t("momentNotifications.scheduleCreated") ?? "Schedule created successfully!",
        message: "",
      });
      closeModal();
    } finally {
      setIsSaving(false);
    }
  }, [
    editingSchedule,
    formSphere,
    formMomentType,
    formFrequencyHours,
    formSource,
    formEnabled,
    hasAIEntitlement,
    aiConsent.isEnabled,
    updateSchedule,
    addSchedule,
    refreshMomentNudgeSchedules,
    closeModal,
    t,
    formSource,
    language,
    ensureSummariesForSphereAndType,
    formFrequencyCustom,
    formCustomHoursInput,
    showNotification,
  ]);

  const handleDelete = useCallback(
    (schedule: MomentNotificationSchedule) => {
      Alert.alert(
        t("momentNotifications.deleteConfirmTitle") ?? "Delete schedule?",
        t("momentNotifications.deleteConfirmMessage") ?? "This notification schedule will be removed.",
        [
          { text: t("common.cancel") ?? "Cancel", style: "cancel" },
          {
            text: t("common.delete") ?? "Delete",
            style: "destructive",
            onPress: async () => {
              await deleteSchedule(schedule.id);
              await refreshMomentNudgeSchedules();
            },
          },
        ]
      );
    },
    [deleteSchedule, refreshMomentNudgeSchedules, t]
  );

  const handleToggleEnabled = useCallback(
    async (schedule: MomentNotificationSchedule) => {
      await updateSchedule({ ...schedule, enabled: !schedule.enabled });
      await refreshMomentNudgeSchedules();
    },
    [updateSchedule, refreshMomentNudgeSchedules]
  );

  const sphereLabel = (sphere: LifeSphere) => {
    const key = SPHERE_OPTIONS.find((o) => o.value === sphere)?.labelKey ?? "momentNotifications.sphere.career";
    return t(key);
  };
  const momentTypeLabel = (type: MomentType) => {
    const key = MOMENT_TYPE_OPTIONS.find((o) => o.value === type)?.labelKey ?? "momentNotifications.momentType.lesson";
    return t(key);
  };
  const sourceLabel = (source: "moments" | "ai" | "both", momentType?: MomentType) => {
    if (source === "moments") {
      return momentType === "sunny"
        ? t("momentNotifications.source.mySunnyMoments")
        : t("momentNotifications.source.myLessons");
    }
    if (source === "both") return t("momentNotifications.source.both");
    return t("momentNotifications.source.ai");
  };

  if (!isLoaded) {
    return (
      <TabScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </TabScreenContainer>
    );
  }

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
          {t("momentNotifications.title")}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>
      <AIInsightsConsentModal
        visible={aiConsentModalVisible}
        onEnable={() => {
          setAiConsentModalVisible(false);
          setFormSource(pendingSourceAfterConsent ?? "ai");
          setPendingSourceAfterConsent(null);
          void aiConsent.setChoice("enabled");
        }}
        onMaybeLater={() => {
          setAiConsentModalVisible(false);
          setPendingSourceAfterConsent(null);
          void aiConsent.setChoice("maybe_later");
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {schedules.map((schedule) => (
          <View key={schedule.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardMain}>
                <ThemedText size="l" weight="bold">
                  {sphereLabel(schedule.sphere)} · {momentTypeLabel(schedule.momentType)}
                </ThemedText>
                <ThemedText size="sm" style={{ color: palette.muted, marginTop: 4, fontSize: 16 * fontScale }}>
                  {t("momentNotifications.everyHours")?.replace("{hours}", String(schedule.frequencyHours)) ??
                    `Every ${schedule.frequencyHours} hour(s)`}{" "}
                  · {sourceLabel(getEffectiveSource(schedule), schedule.momentType)}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleEnabled(schedule)}
                activeOpacity={0.7}
                style={[styles.statusBadge, schedule.enabled ? styles.statusBadgeOn : styles.statusBadgeOff]}
              >
                <MaterialIcons
                  name={schedule.enabled ? "notifications-active" : "notifications-off"}
                  size={18 * fontScale}
                  color={schedule.enabled ? palette.background : palette.text}
                />
                <ThemedText
                  size="sm"
                  weight="bold"
                  style={{ color: schedule.enabled ? palette.background : palette.text }}
                >
                  {schedule.enabled ? t("notifications.status.on") : t("notifications.status.off")}
                </ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => openEdit(schedule)} style={styles.iconButton}>
                <MaterialIcons name="edit" size={22 * fontScale} color={palette.text} />
                <ThemedText size="sm" style={{ color: palette.text }}>
                  {t("common.edit") ?? "Edit"}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(schedule)} style={styles.iconButton}>
                <MaterialIcons name="delete-outline" size={22 * fontScale} color={palette.muted} />
                <ThemedText size="sm" style={{ color: palette.muted }}>
                  {t("common.delete") ?? "Delete"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fabButton} onPress={openAdd} activeOpacity={0.8}>
          <MaterialIcons name="add" size={32 * fontScale} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText size="l" weight="bold">
                {editingSchedule
                  ? t("momentNotifications.editSchedule") ?? "Edit schedule"
                  : t("momentNotifications.newSchedule") ?? "New schedule"}
              </ThemedText>
              <Pressable onPress={closeModal} hitSlop={12}>
                <MaterialIcons name="close" size={24 * fontScale} color={palette.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <ThemedText size="sm" weight="medium" style={styles.fieldLabel}>
                {t("momentNotifications.sphereLabel") ?? "Sphere"}
              </ThemedText>
              <View style={styles.optionsRow}>
                {SPHERE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionChip, formSphere === opt.value && styles.optionChipSelected]}
                    onPress={() => setFormSphere(opt.value)}
                  >
                    <ThemedText size="sm" style={formSphere === opt.value ? { color: palette.background } : {}}>
                      {t(opt.labelKey)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText size="sm" weight="medium" style={styles.fieldLabel}>
                {t("momentNotifications.momentTypeLabel") ?? "Moment type"}
              </ThemedText>
              <View style={styles.optionsRow}>
                {MOMENT_TYPE_OPTIONS.map((opt) => {
                  const disabled =
                    (opt.value === "lesson" && !hasLessonsForSphere) ||
                    (opt.value === "sunny" && !hasSunnyForSphere);
                  const isSelected = formMomentType === opt.value && !disabled;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionChip,
                        isSelected && styles.optionChipSelected,
                        disabled && styles.optionChipDisabled,
                      ]}
                      onPress={() => handleMomentTypePress(opt.value)}
                      disabled={disabled}
                      pointerEvents={disabled ? "none" : "auto"}
                    >
                      <ThemedText
                        size="sm"
                        style={[
                          isSelected ? { color: palette.background } : {},
                          disabled ? { color: palette.muted, opacity: 0.6 } : {},
                        ]}
                      >
                        {t(opt.labelKey)}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <ThemedText size="sm" weight="medium" style={styles.fieldLabel}>
                {t("momentNotifications.frequencyLabel") ?? "Frequency (hours)"}
              </ThemedText>
              <View style={styles.optionsRow}>
                {__DEV__ && (
                  <TouchableOpacity
                    style={[
                      styles.optionChip,
                      !formFrequencyCustom && formFrequencyHours === 1 && styles.optionChipSelected,
                    ]}
                    onPress={() => {
                      setFormFrequencyHours(1);
                      setFormFrequencyCustom(false);
                      setFormCustomHoursInput("");
                    }}
                  >
                    <ThemedText
                      size="sm"
                      style={
                        !formFrequencyCustom && formFrequencyHours === 1
                          ? { color: palette.background }
                          : {}
                      }
                    >
                      1 min
                    </ThemedText>
                  </TouchableOpacity>
                )}
                {FREQUENCY_HOURS.filter((h) => !__DEV__ || h !== 1).map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.optionChip,
                      !formFrequencyCustom && formFrequencyHours === h && styles.optionChipSelected,
                    ]}
                    onPress={() => {
                      setFormFrequencyHours(h);
                      setFormFrequencyCustom(false);
                      setFormCustomHoursInput("");
                    }}
                  >
                    <ThemedText
                      size="sm"
                      style={
                        !formFrequencyCustom && formFrequencyHours === h
                          ? { color: palette.background }
                          : {}
                      }
                    >
                      {h}h
                    </ThemedText>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.optionChip, formFrequencyCustom && styles.optionChipSelected]}
                  onPress={() => setFormFrequencyCustom(true)}
                >
                  <ThemedText
                    size="sm"
                    style={formFrequencyCustom ? { color: palette.background } : {}}
                  >
                    {t("momentNotifications.frequencyCustom") ?? "Custom"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              {formFrequencyCustom && (
                <View style={styles.customHoursRow}>
                  <TextInput
                    style={styles.smallInput}
                    placeholder={t("momentNotifications.frequencyCustomPlaceholder") ?? "Hours (1–168)"}
                    placeholderTextColor={palette.muted}
                    value={formCustomHoursInput}
                    onChangeText={setFormCustomHoursInput}
                    keyboardType="number-pad"
                  />
                </View>
              )}

              <ThemedText size="sm" weight="medium" style={styles.fieldLabel}>
                {t("momentNotifications.sourceLabel") ?? "Notification message source"}
              </ThemedText>
              <View style={styles.sourceToggleRow}>
                <TouchableOpacity
                  style={[styles.sourceToggleOption, formSource === "moments" && styles.sourceToggleSelected]}
                  onPress={() => handleSourcePress("moments")}
                >
                  <ThemedText
                    size="sm"
                    weight="medium"
                    style={[
                      styles.sourceToggleOptionText,
                      formSource === "moments" ? { color: palette.background } : {},
                    ]}
                  >
                    {sourceLabel("moments", formMomentType)}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sourceToggleOption,
                    formSource === "ai" && styles.sourceToggleSelected,
                    !canUseAISource && styles.sourceToggleOptionDisabled,
                  ]}
                  onPress={() => handleSourcePress("ai")}
                >
                  <ThemedText
                    size="sm"
                    weight="medium"
                    style={[
                      styles.sourceToggleOptionText,
                      formSource === "ai" ? { color: palette.background } : {},
                      !canUseAISource ? { color: palette.muted } : {},
                    ]}
                  >
                    {t("momentNotifications.source.ai")}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sourceToggleOption,
                    formSource === "both" && styles.sourceToggleSelected,
                    !canUseAISource && styles.sourceToggleOptionDisabled,
                  ]}
                  onPress={() => handleSourcePress("both")}
                >
                  <ThemedText
                    size="sm"
                    weight="medium"
                    style={[
                      styles.sourceToggleOptionText,
                      formSource === "both" ? { color: palette.background } : {},
                      !canUseAISource ? { color: palette.muted } : {},
                    ]}
                  >
                    {t("momentNotifications.source.both")}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {formSource === "moments" && (
                <View style={styles.hintRow}>
                  <ThemedText size="sm" style={{ color: palette.muted }}>
                    {formMomentType === "sunny"
                      ? t("momentNotifications.source.mySunnyMomentsHint")
                      : t("momentNotifications.source.myLessonsHint")}
                  </ThemedText>
                </View>
              )}
              {formSource === "ai" && (
                <View style={styles.hintRow}>
                  <ThemedText size="sm" style={{ color: palette.muted }}>
                    {formMomentType === "sunny"
                      ? t("momentNotifications.source.aiHintSunnyMoments")
                      : t("momentNotifications.source.aiHintLessons")}
                  </ThemedText>
                </View>
              )}
              {formSource === "both" && (
                <View style={styles.hintRow}>
                  <ThemedText size="sm" style={{ color: palette.muted }}>
                    {t("momentNotifications.source.bothHint")}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <ThemedText size="m" weight="medium">
                  {t("common.cancel") ?? "Cancel"}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (isSaving || !canSave) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving || !canSave}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <ThemedText size="m" weight="medium" style={{ color: colors.background }}>
                    {t("common.save") ?? "Save"}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TabScreenContainer>
  );
}

function createStyles(
  palette: {
    text: string;
    background: string;
    primary: string;
    border: string;
    card: string;
    muted: string;
    surfaceElevated: string;
    surfaceDisabled: string;
  },
  fontScale: number
) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16 * fontScale,
      paddingTop: 50,
      paddingBottom: 12 * fontScale,
    },
    headerButton: {
      width: 40 * fontScale,
      height: 40 * fontScale,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
    },
    content: {
      padding: 16 * fontScale,
      paddingBottom: 110 * fontScale, // Extra space for FAB
      gap: 16 * fontScale,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    fabContainer: {
      position: "absolute",
      bottom: 40 * fontScale,
      right: 20 * fontScale,
      zIndex: 10,
    },
    fabButton: {
      width: 64 * fontScale,
      height: 64 * fontScale,
      borderRadius: 32 * fontScale,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    card: {
      padding: 14 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 10 * fontScale,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardMain: { flex: 1 },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6 * fontScale,
      paddingHorizontal: 10 * fontScale,
      paddingVertical: 6 * fontScale,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusBadgeOn: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    statusBadgeOff: {
      backgroundColor: palette.card,
      borderColor: palette.border,
    },
    cardActions: {
      flexDirection: "row",
      gap: 16 * fontScale,
    },
    iconButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6 * fontScale,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      flex: 1,
      backgroundColor: palette.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "90%",
      minHeight: "75%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    modalBody: {
      flex: 1,
    },
    modalBodyContent: {
      padding: 16 * fontScale,
      flexGrow: 0,
    },
    modalFooter: {
      flexDirection: "row",
      gap: 12 * fontScale,
      padding: 16 * fontScale,
      paddingBottom: 24 * fontScale,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      flexShrink: 0,
      marginTop: "auto",
    },
    fieldLabel: {
      marginTop: 12 * fontScale,
      marginBottom: 6 * fontScale,
    },
    optionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8 * fontScale,
    },
    optionChip: {
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 8 * fontScale,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
    },
    optionChipSelected: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    optionChipDisabled: {
      backgroundColor: palette.surfaceDisabled,
      opacity: 0.6,
    },
    customHoursRow: {
      marginTop: 8 * fontScale,
    },
    smallInput: {
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 10 * fontScale,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.border,
      color: palette.text,
      fontSize: 14 * fontScale,
      minWidth: 100,
      maxWidth: 120,
    },
    sourceToggleRow: {
      flexDirection: "row",
      gap: 0,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: "hidden",
    },
    sourceToggleOption: {
      flex: 1,
      paddingVertical: 12 * fontScale,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surfaceElevated,
    },
    sourceToggleOptionText: {
      textAlign: "center",
    },
    sourceToggleOptionDisabled: {
      backgroundColor: palette.surfaceDisabled,
      opacity: 0.6,
    },
    sourceToggleSelected: {
      backgroundColor: palette.primary,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8 * fontScale,
    },
    textInput: {
      flex: 1,
      minHeight: 44 * fontScale,
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 10 * fontScale,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.border,
      color: palette.text,
      fontSize: 14 * fontScale,
    },
    addMessageBtn: {
      padding: 10 * fontScale,
    },
    userMessageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8 * fontScale,
      paddingVertical: 6 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    hintRow: {
      marginTop: 8 * fontScale,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12 * fontScale,
      alignItems: "center",
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
    },
    saveBtn: {
      flex: 1,
      paddingVertical: 12 * fontScale,
      alignItems: "center",
      borderRadius: 10,
      backgroundColor: palette.primary,
    },
    saveBtnDisabled: {
      backgroundColor: palette.surfaceDisabled,
      opacity: 0.7,
    },
  });
}
