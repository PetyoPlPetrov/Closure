import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors, fabAccentBackground } from "@/constants/theme";
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
import type { Translations } from "@/utils/languages/translations";
import { useTranslate } from "@/utils/languages/use-translate";
import type { MomentNotificationSchedule, MomentType } from "@/utils/moment-notification-types";
import { useMomentNotifications } from "@/utils/MomentNotificationProvider";
import { getSphereSferaColor } from "@/utils/sphere-styles";

const SPHERE_OPTIONS: { value: LifeSphere; labelKey: keyof Translations }[] = [
  { value: "career", labelKey: "momentNotifications.sphere.career" },
  { value: "relationships", labelKey: "momentNotifications.sphere.relationships" },
  { value: "family", labelKey: "momentNotifications.sphere.family" },
  { value: "friends", labelKey: "momentNotifications.sphere.friends" },
  { value: "hobbies", labelKey: "momentNotifications.sphere.hobbies" },
];

const MOMENT_TYPE_OPTIONS: { value: MomentType; labelKey: keyof Translations }[] = [
  { value: "lesson", labelKey: "momentNotifications.momentType.lesson" },
  { value: "sunny", labelKey: "momentNotifications.momentType.sunny" },
];

const FREQUENCY_HOURS = [1, 2, 4, 6, 8, 12, 24];
const MIN_FREQUENCY_HOURS = 1;
const MAX_FREQUENCY_HOURS = 168; // 1 week
const DEFAULT_ACTIVE_START_TIME = "10:00";
const DEFAULT_ACTIVE_END_TIME = "19:00";
const FREE_AI_LAST_USED_DATE_KEY = "@sferas:moment_notifications_free_ai_last_used_date";

type FrequencyMode = "interval" | "specific_times";
type TimePickerTarget = "intervalStart" | "intervalEnd" | "addSpecific";

function parseTimeString(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours ?? 10, minutes ?? 0, 0, 0);
  return date;
}

function formatTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function sortTimesAscending(times: string[]): string[] {
  return [...times].sort((a, b) => {
    const [h1, m1] = a.split(":").map((v) => Number.parseInt(v || "0", 10));
    const [h2, m2] = b.split(":").map((v) => Number.parseInt(v || "0", 10));
    return h1 * 60 + m1 - (h2 * 60 + m2);
  });
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const intVal = Number.parseInt(expanded, 16);
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function MomentNotificationsScreen() {
  const t = useTranslate();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const resolvedColorScheme: "dark" = colorScheme;
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
  const [formFrequencyMode, setFormFrequencyMode] = useState<FrequencyMode>("interval");
  const [formFrequencyHours, setFormFrequencyHours] = useState(__DEV__ ? 1 : 2);
  const [formFrequencyCustom, setFormFrequencyCustom] = useState(false);
  const [formCustomHoursInput, setFormCustomHoursInput] = useState("");
  const [formActiveStartTime, setFormActiveStartTime] = useState(DEFAULT_ACTIVE_START_TIME);
  const [formActiveEndTime, setFormActiveEndTime] = useState(DEFAULT_ACTIVE_END_TIME);
  const [formSpecificTimes, setFormSpecificTimes] = useState<string[]>([]);
  const [formSource, setFormSource] = useState<"moments" | "ai">("ai");
  const [formSoundEnabled, setFormSoundEnabled] = useState(true);
  const [formEnabled, setFormEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [aiConsentModalVisible, setAiConsentModalVisible] = useState(false);
  const [pendingSourceAfterConsent, setPendingSourceAfterConsent] = useState<"ai" | null>(null);
  const [freeAiLastUsedDate, setFreeAiLastUsedDate] = useState<string | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget | null>(null);
  const [timePickerValue, setTimePickerValue] = useState(new Date());

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
  const normalizedSpecificTimes = sortTimesAscending(formSpecificTimes);
  const hasValidSpecificTimes = normalizedSpecificTimes.length > 0;
  const hasValidFrequencyConfig = formFrequencyMode === "interval" ? true : hasValidSpecificTimes;

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(FREE_AI_LAST_USED_DATE_KEY).then((value) => {
      if (!mounted) return;
      setFreeAiLastUsedDate(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const todayDateKey = getLocalDateKey(new Date());
  const hasAnyAISchedule = schedules.some((schedule) => schedule.source === "ai");
  const usedFreeAIToday = freeAiLastUsedDate === todayDateKey;
  const isEditingExistingFreeAISchedule =
    editingSchedule?.source === "ai" && editingSchedule.freeAiGranted === true;
  const canClaimFreeAI =
    !hasAIEntitlement &&
    !hasAnyAISchedule &&
    !usedFreeAIToday;
  const canUseAISource = aiConsent.isEnabled && (hasAIEntitlement || canClaimFreeAI || isEditingExistingFreeAISchedule);

  const hasFormChanged = editingSchedule
    ? (() => {
        const effectiveOriginalSource =
          editingSchedule.source === "ai" && !canUseAISource
            ? "moments"
            : editingSchedule.source;
        const originalMode = editingSchedule.frequencyMode ?? "interval";
        const originalStart = editingSchedule.activeStartTime ?? DEFAULT_ACTIVE_START_TIME;
        const originalEnd = editingSchedule.activeEndTime ?? DEFAULT_ACTIVE_END_TIME;
        const originalSpecificTimes = sortTimesAscending(editingSchedule.specificTimes ?? []);
        return (
          formSphere !== editingSchedule.sphere ||
          formMomentType !== editingSchedule.momentType ||
          formEffectiveHours !== editingSchedule.frequencyHours ||
          formFrequencyMode !== originalMode ||
          formActiveStartTime !== originalStart ||
          formActiveEndTime !== originalEnd ||
          JSON.stringify(normalizedSpecificTimes) !== JSON.stringify(originalSpecificTimes) ||
          formSource !== effectiveOriginalSource ||
          formSoundEnabled !== (editingSchedule.soundEnabled !== false) ||
          formEnabled !== editingSchedule.enabled
        );
      })()
    : true;

  const canSave =
    hasValidMomentTypeSelection &&
    !hasBothMomentTypesDisabled &&
    hasValidFrequencyConfig &&
    (editingSchedule ? hasFormChanged : true);

  const palette = useMemo(
    () => ({
      text: colors.text,
      background: colors.background,
      primary: colors.primary,
      fabBackground: fabAccentBackground,
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
    [hasLessonsForSphere, hasSunnyForSphere]
  );

  const openTimePicker = useCallback(
    (target: TimePickerTarget) => {
      const baseTime =
        target === "intervalStart"
          ? formActiveStartTime
          : target === "intervalEnd"
            ? formActiveEndTime
            : formSpecificTimes[formSpecificTimes.length - 1] ?? formActiveStartTime;
      setTimePickerTarget(target);
      setTimePickerValue(parseTimeString(baseTime));
    },
    [formActiveStartTime, formActiveEndTime, formSpecificTimes]
  );

  const applyTimeToForm = useCallback(
    (target: TimePickerTarget, date: Date) => {
      const formatted = formatTimeString(date);
      if (target === "intervalStart") {
        setFormActiveStartTime(formatted);
        return;
      }
      if (target === "intervalEnd") {
        setFormActiveEndTime(formatted);
        return;
      }
      setFormSpecificTimes((current) => {
        if (current.includes(formatted)) return current;
        return sortTimesAscending([...current, formatted]);
      });
    },
    []
  );

  const removeSpecificTime = useCallback((time: string) => {
    setFormSpecificTimes((current) => current.filter((entry) => entry !== time));
  }, []);

  const closeTimePicker = useCallback(() => {
    setTimePickerTarget(null);
  }, []);

  const commitTimePickerSelection = useCallback(() => {
    if (!timePickerTarget) return;
    applyTimeToForm(timePickerTarget, timePickerValue);
    setTimePickerTarget(null);
  }, [applyTimeToForm, timePickerTarget, timePickerValue]);

  const getEffectiveSource = useCallback(
    (schedule: MomentNotificationSchedule): "moments" | "ai" =>
      schedule.source === "ai" && !hasAIEntitlement && schedule.freeAiGranted !== true
        ? "moments"
        : schedule.source,
    [hasAIEntitlement]
  );

  const hasNoMessages = useCallback(
    (schedule: MomentNotificationSchedule): boolean => {
      const effectiveSource = getEffectiveSource(schedule);
      const momentCount =
        schedule.momentType === "lesson"
          ? countsBySphere.lessons[schedule.sphere]
          : countsBySphere.sunny[schedule.sphere];
      const aiCount = getSummariesBySphereAndType(schedule.sphere, schedule.momentType).length;
      if (effectiveSource === "moments") return momentCount === 0;
      return aiCount === 0;
    },
    [getEffectiveSource, countsBySphere, getSummariesBySphereAndType]
  );

  const handleSourcePress = useCallback(
    (source: "moments" | "ai") => {
      if (source === "ai") {
        const canUseFreeForCurrentEdit =
          (editingSchedule?.source === "ai" && editingSchedule.freeAiGranted === true) || canClaimFreeAI;
        if (!hasAIEntitlement && !canUseFreeForCurrentEdit) {
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
    [hasAIEntitlement, aiConsent.isEnabled, editingSchedule, canClaimFreeAI]
  );

  const openAdd = useCallback(() => {
    setEditingSchedule(null);
    const firstSphereWithData = SPHERE_OPTIONS.find(
      (o) => countsBySphere.lessons[o.value] > 0 || countsBySphere.sunny[o.value] > 0
    );
    const sphere = firstSphereWithData?.value ?? "career";
    const hasLessons = countsBySphere.lessons[sphere] > 0;
    setFormSphere(sphere);
    setFormMomentType(hasLessons ? "lesson" : "sunny");
    setFormFrequencyMode("interval");
    setFormFrequencyHours(__DEV__ ? 1 : 2);
    setFormFrequencyCustom(false);
    setFormCustomHoursInput("");
    setFormActiveStartTime(DEFAULT_ACTIVE_START_TIME);
    setFormActiveEndTime(DEFAULT_ACTIVE_END_TIME);
    setFormSpecificTimes([]);
    setFormSource(canUseAISource ? "ai" : "moments");
    setFormSoundEnabled(true);
    setFormEnabled(true);
    setModalVisible(true);
  }, [countsBySphere, canUseAISource]);

  const openEdit = useCallback(
    (schedule: MomentNotificationSchedule) => {
      setEditingSchedule(schedule);
      setFormSphere(schedule.sphere);
      setFormMomentType(schedule.momentType);
      setFormFrequencyMode(schedule.frequencyMode ?? "interval");
      const isPreset = FREQUENCY_HOURS.includes(schedule.frequencyHours);
      setFormFrequencyHours(schedule.frequencyHours);
      setFormFrequencyCustom(!isPreset);
      setFormCustomHoursInput(isPreset ? "" : String(schedule.frequencyHours));
      setFormActiveStartTime(schedule.activeStartTime ?? DEFAULT_ACTIVE_START_TIME);
      setFormActiveEndTime(schedule.activeEndTime ?? DEFAULT_ACTIVE_END_TIME);
      setFormSpecificTimes(sortTimesAscending(schedule.specificTimes ?? []));
      const baseSource = schedule.source;
      const canKeepAISource = hasAIEntitlement || schedule.freeAiGranted === true;
      setFormSource(baseSource === "ai" && !canKeepAISource ? "moments" : baseSource);
      setFormSoundEnabled(schedule.soundEnabled !== false);
      setFormEnabled(schedule.enabled);
      setModalVisible(true);
    },
    [hasAIEntitlement]
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimePickerTarget(null);
    setEditingSchedule(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (formFrequencyMode === "specific_times" && normalizedSpecificTimes.length === 0) {
      Alert.alert(
        t("common.error") ?? "Error",
        t("momentNotifications.specificHoursRequired") ?? "Add at least one hour to save this schedule."
      );
      return;
    }

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

    const todayKey = getLocalDateKey(new Date());
    const isEditingExistingFreeAI = editingSchedule?.source === "ai" && editingSchedule.freeAiGranted === true;
    // Re-read from AsyncStorage so the once-per-day gate is authoritative even if the
    // initial load effect hadn't resolved yet when the user tapped Save.
    let storedFreeAILastUsedDate: string | null = freeAiLastUsedDate;
    try {
      storedFreeAILastUsedDate = await AsyncStorage.getItem(FREE_AI_LAST_USED_DATE_KEY);
    } catch {
      storedFreeAILastUsedDate = freeAiLastUsedDate;
    }
    const canUseFreeAIForThisSave =
      !hasAIEntitlement &&
      (isEditingExistingFreeAI || (!hasAnyAISchedule && storedFreeAILastUsedDate !== todayKey));

    if (formSource === "ai") {
      if (!hasAIEntitlement && !canUseFreeAIForThisSave) {
        const purchased = await showPaywallForUpgradeAccess();
        if (!purchased) return;
      } else if (!aiConsent.isEnabled) {
        setAiConsentModalVisible(true);
        return;
      }
    }

    setIsSaving(true);
    try {
      if (formSource === "ai") {
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
      const specificTimes = sortTimesAscending(formSpecificTimes);
      const freeAiGrantedForSavedSchedule =
        formSource === "ai" && (editingSchedule?.freeAiGranted === true || (!hasAIEntitlement && canUseFreeAIForThisSave));

      if (editingSchedule) {
        await updateSchedule({
          ...editingSchedule,
          sphere: formSphere,
          momentType: formMomentType,
          frequencyHours: hours,
          frequencyMode: formFrequencyMode,
          activeStartTime: formActiveStartTime,
          activeEndTime: formActiveEndTime,
          specificTimes,
          source: formSource,
          freeAiGranted: freeAiGrantedForSavedSchedule,
          userMessages: [],
          soundEnabled: formSoundEnabled,
          enabled: formEnabled,
        });
      } else {
        await addSchedule({
          sphere: formSphere,
          momentType: formMomentType,
          frequencyHours: hours,
          frequencyMode: formFrequencyMode,
          activeStartTime: formActiveStartTime,
          activeEndTime: formActiveEndTime,
          specificTimes,
          source: formSource,
          freeAiGranted: freeAiGrantedForSavedSchedule,
          userMessages: [],
          soundEnabled: formSoundEnabled,
          enabled: formEnabled,
        });
      }
      if (
        formSource === "ai" &&
        !hasAIEntitlement &&
        freeAiGrantedForSavedSchedule &&
        !isEditingExistingFreeAI
      ) {
        await AsyncStorage.setItem(FREE_AI_LAST_USED_DATE_KEY, todayKey);
        setFreeAiLastUsedDate(todayKey);
      }
      await refreshMomentNudgeSchedules();
      showNotification({
        title: editingSchedule
          ? t("momentNotifications.scheduleUpdated") ?? "Schedule updated successfully!"
          : t("momentNotifications.scheduleCreated") ?? "Schedule created successfully!",
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
    formSoundEnabled,
    formEnabled,
    hasAIEntitlement,
    aiConsent.isEnabled,
    hasAnyAISchedule,
    freeAiLastUsedDate,
    updateSchedule,
    addSchedule,
    refreshMomentNudgeSchedules,
    closeModal,
    t,
    language,
    ensureSummariesForSphereAndType,
    formFrequencyCustom,
    formCustomHoursInput,
    formFrequencyMode,
    formActiveStartTime,
    formActiveEndTime,
    formSpecificTimes,
    normalizedSpecificTimes,
    showNotification,
    editingSchedule?.freeAiGranted,
  ]);

  const handleRefreshAISummaries = useCallback(async () => {
    if (!editingSchedule) return;
    if (!aiConsent.isEnabled) return;
    if (!hasAIEntitlement) {
      const purchased = await showPaywallForUpgradeAccess();
      if (!purchased) return;
    }
    setIsSaving(true);
    try {
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
        return;
      }
      await refreshMomentNudgeSchedules();
      showNotification({
        title: t("momentNotifications.scheduleUpdated") ?? "Schedule updated successfully!",
        message: "",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    editingSchedule,
    formSphere,
    formMomentType,
    hasAIEntitlement,
    aiConsent.isEnabled,
    ensureSummariesForSphereAndType,
    language,
    refreshMomentNudgeSchedules,
    showNotification,
    t,
  ]);

  const pendingAISummaryCount = useMemo(() => {
    if (!editingSchedule || formSource !== "ai") return 0;
    const existingSummaryKeysArr = getSummariesBySphereAndType(formSphere, formMomentType).map(
      (summary) => `${summary.memoryId}:${summary.momentId}`
    );
    const existingSummaryKeys = new Set(existingSummaryKeysArr);
    const memoriesInSphere = idealizedMemories.filter((memory) => memory.sphere === formSphere);
    const missingKeys: string[] = [];
    const missingDetails: { memoryId: string; memoryTitle?: string; lessonId: string; textPreview: string }[] = [];
    if (formMomentType === "lesson") {
      for (const memory of memoriesInSphere) {
        for (const lesson of memory.lessonsLearned ?? []) {
          if (!lesson.text?.trim()) continue;
          const key = `${memory.id}:${lesson.id}`;
          if (existingSummaryKeys.has(key)) continue;
          missingKeys.push(key);
          missingDetails.push({
            memoryId: memory.id,
            memoryTitle: memory.title,
            lessonId: lesson.id,
            textPreview: lesson.text.slice(0, 40),
          });
        }
      }
    } else {
      for (const memory of memoriesInSphere) {
        for (const sunnyMoment of memory.goodFacts ?? []) {
          if (!sunnyMoment.text?.trim()) continue;
          const key = `${memory.id}:${sunnyMoment.id}`;
          if (existingSummaryKeys.has(key)) continue;
          missingKeys.push(key);
          missingDetails.push({
            memoryId: memory.id,
            memoryTitle: memory.title,
            lessonId: sunnyMoment.id,
            textPreview: sunnyMoment.text.slice(0, 40),
          });
        }
      }
    }
    if (__DEV__ && missingKeys.length > 0) {
      console.log(
        `[moment-notifications][pendingAISummaryCount] sphere=${formSphere} type=${formMomentType} missing=${missingKeys.length} existingSummaries=${existingSummaryKeysArr.length}`,
        {
          missing: missingDetails,
          existingSummaryKeys: existingSummaryKeysArr,
        }
      );
    }
    return missingKeys.length;
  }, [
    editingSchedule,
    formSource,
    formSphere,
    formMomentType,
    getSummariesBySphereAndType,
    idealizedMemories,
  ]);

  const handleRefreshAIInfoPress = useCallback(() => {
    if (pendingAISummaryCount === 0) {
      Alert.alert(
        t("momentNotifications.refresh.caughtUpTitle"),
        t("momentNotifications.refresh.caughtUpMessage")
      );
      return;
    }
    Alert.alert(
      t("momentNotifications.refresh.howItWorksTitle"),
      t("momentNotifications.refresh.howItWorksMessage").replace(
        "{count}",
        String(pendingAISummaryCount)
      )
    );
  }, [pendingAISummaryCount, t]);

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
  const momentTypeGroupTitle = (type: MomentType) =>
    type === "sunny"
      ? t("momentNotifications.momentType.sunnyPlural") ?? "Sunny moments"
      : t("momentNotifications.momentType.lessonPlural") ?? "Lessons";
  const sourceIconName = (source: "moments" | "ai"): keyof typeof MaterialIcons.glyphMap => {
    if (source === "moments") return "menu-book";
    return "auto-awesome";
  };
  const sourceLabel = (source: "moments" | "ai", momentType?: MomentType) => {
    if (source === "moments") {
      return momentType === "sunny"
        ? t("momentNotifications.source.mySunnyMoments")
        : t("momentNotifications.source.myLessons");
    }
    return t("momentNotifications.source.ai");
  };
  const frequencyDescription = (schedule: MomentNotificationSchedule) => {
    const mode = schedule.frequencyMode ?? "interval";
    if (mode === "specific_times") {
      const times = sortTimesAscending(schedule.specificTimes ?? []);
      if (times.length === 0) {
        return t("momentNotifications.specificHoursEmpty") ?? "No specific hours selected";
      }
      return `${t("momentNotifications.atHours") ?? "At"} ${times.join(", ")}`;
    }
    const start = schedule.activeStartTime ?? DEFAULT_ACTIVE_START_TIME;
    const end = schedule.activeEndTime ?? DEFAULT_ACTIVE_END_TIME;
    const everyText =
      t("momentNotifications.everyHours")?.replace("{hours}", String(schedule.frequencyHours)) ??
      `Every ${schedule.frequencyHours} hour(s)`;
    return `${everyText} · ${start}-${end}`;
  };

  const groupedSchedules = useMemo(
    () =>
      SPHERE_OPTIONS.map((option) => ({
        sphere: option.value,
        schedules: schedules.filter((schedule) => schedule.sphere === option.value),
      })).filter((group) => group.schedules.length > 0),
    [schedules]
  );

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
              hitSlop={12}
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
        {groupedSchedules.map((group) => {
          const sphereAccent = getSphereSferaColor(group.sphere, resolvedColorScheme);
          const sectionBorderColor = hexToRgba(sphereAccent, resolvedColorScheme === "dark" ? 0.24 : 0.2);
          const sectionBackgroundColor = hexToRgba(sphereAccent, resolvedColorScheme === "dark" ? 0.06 : 0.045);
          const sectionLabelColor = hexToRgba(sphereAccent, resolvedColorScheme === "dark" ? 0.95 : 0.88);
          return (
            <View
              key={group.sphere}
              style={[
                styles.sphereGroupCard,
                {
                  borderColor: sectionBorderColor,
                  backgroundColor: sectionBackgroundColor,
                },
              ]}
            >
              <View style={styles.sphereGroupHeader}>
                <View style={styles.sphereGroupTitleWrap}>
                  <View style={[styles.sphereGroupDot, { backgroundColor: sectionLabelColor }]} />
                  <ThemedText size="sm" weight="semibold" style={{ color: sectionLabelColor }}>
                    {sphereLabel(group.sphere)}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.sphereGroupRows}>
                {group.schedules.map((schedule) => (
                  <View key={schedule.id} style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={styles.cardMain}>
                        <ThemedText size="l" weight="bold">
                          {momentTypeGroupTitle(schedule.momentType)}
                        </ThemedText>
                        <View style={styles.infoRows}>
                          <View style={styles.infoRow}>
                            <MaterialIcons name="schedule" size={15 * fontScale} color={palette.muted} />
                            <ThemedText size="sm" style={{ color: palette.muted, fontSize: 16 * fontScale }}>
                              {frequencyDescription(schedule)}
                            </ThemedText>
                          </View>
                          <View style={styles.infoRow}>
                            <MaterialIcons
                              name={sourceIconName(getEffectiveSource(schedule))}
                              size={15 * fontScale}
                              color={palette.muted}
                            />
                            <ThemedText size="sm" style={{ color: palette.muted, fontSize: 16 * fontScale }}>
                              {sourceLabel(getEffectiveSource(schedule), schedule.momentType)}
                            </ThemedText>
                          </View>
                        </View>
                        {hasNoMessages(schedule) && (
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}>
                            <MaterialIcons name="warning-amber" size={14 * fontScale} color="#F59E0B" />
                            <ThemedText size="sm" style={{ color: "#F59E0B", fontSize: 13 * fontScale }}>
                              {t("momentNotifications.noMomentsWarning") ?? "No moments available · notifications paused"}
                            </ThemedText>
                          </View>
                        )}
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
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fabButton} onPress={openAdd} activeOpacity={0.8}>
          <MaterialIcons name="add" size={32 * fontScale} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandleWrap}>
              <View style={styles.modalHandle} />
            </View>
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
              <View style={styles.sectionCard}>
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
              </View>

              <View style={styles.sectionCard}>
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
              </View>

              <View style={styles.sectionCard}>
                <ThemedText size="sm" weight="medium" style={styles.fieldLabel}>
                  {t("momentNotifications.frequencyLabel") ?? "Frequency (hours)"}
                </ThemedText>
                <View style={styles.frequencyModeToggleRow}>
                  <TouchableOpacity
                    style={[styles.frequencyModeOption, formFrequencyMode === "interval" && styles.sourceToggleSelected]}
                    onPress={() => setFormFrequencyMode("interval")}
                  >
                    <ThemedText
                      size="sm"
                      weight="medium"
                      style={[
                        styles.sourceToggleOptionText,
                        formFrequencyMode === "interval" ? { color: palette.background } : {},
                      ]}
                    >
                      {t("momentNotifications.frequencyMode.interval") ?? "Interval"}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.frequencyModeOption,
                      formFrequencyMode === "specific_times" && styles.sourceToggleSelected,
                    ]}
                    onPress={() => setFormFrequencyMode("specific_times")}
                  >
                    <ThemedText
                      size="sm"
                      weight="medium"
                      style={[
                        styles.sourceToggleOptionText,
                        formFrequencyMode === "specific_times" ? { color: palette.background } : {},
                      ]}
                    >
                      {t("momentNotifications.frequencyMode.specificHours") ?? "Specific hours"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {formFrequencyMode === "interval" ? (
                  <>
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

                    <View style={styles.timeRangeRow}>
                      <TouchableOpacity
                        style={[styles.input, styles.inputBox, styles.timePickerButton]}
                        onPress={() => openTimePicker("intervalStart")}
                      >
                        <ThemedText size="sm" style={{ color: palette.text }}>
                          {(t("momentNotifications.startHour") ?? "Start") + `: ${formActiveStartTime}`}
                        </ThemedText>
                        <MaterialIcons name="access-time" size={18 * fontScale} color={palette.muted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.input, styles.inputBox, styles.timePickerButton]}
                        onPress={() => openTimePicker("intervalEnd")}
                      >
                        <ThemedText size="sm" style={{ color: palette.text }}>
                          {(t("momentNotifications.endHour") ?? "End") + `: ${formActiveEndTime}`}
                        </ThemedText>
                        <MaterialIcons name="access-time" size={18 * fontScale} color={palette.muted} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.hintRow}>
                      <ThemedText size="sm" style={{ color: palette.muted }}>
                        {t("momentNotifications.intervalRangeHint") ?? "Notifications are sent only inside this time range."}
                      </ThemedText>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.optionsRow}>
                      {normalizedSpecificTimes.map((time) => (
                        <View key={time} style={styles.specificTimeChip}>
                          <ThemedText size="sm" style={{ color: palette.text }}>
                            {time}
                          </ThemedText>
                          <TouchableOpacity onPress={() => removeSpecificTime(time)} hitSlop={8}>
                            <MaterialIcons name="close" size={16 * fontScale} color={palette.muted} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity style={[styles.optionChip, styles.addTimeChip]} onPress={() => openTimePicker("addSpecific")}>
                        <MaterialIcons name="add" size={16 * fontScale} color={palette.text} />
                        <ThemedText size="sm">{t("momentNotifications.addHour") ?? "Add hour"}</ThemedText>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.hintRow}>
                      <ThemedText size="sm" style={{ color: palette.muted }}>
                        {t("momentNotifications.specificHoursHint") ??
                          "Add one or more exact hours. Nudges will be sent at these times every day."}
                      </ThemedText>
                    </View>
                    {!hasValidSpecificTimes && (
                      <View style={styles.hintRow}>
                        <ThemedText size="sm" style={{ color: "#F59E0B" }}>
                          {t("momentNotifications.specificHoursRequired") ?? "Add at least one hour to save this schedule."}
                        </ThemedText>
                      </View>
                    )}
                  </>
                )}
              </View>

              {timePickerTarget && (
                <>
                  {Platform.OS === "ios" ? (
                    <Modal
                      visible={Boolean(timePickerTarget)}
                      transparent
                      animationType="slide"
                      onRequestClose={closeTimePicker}
                    >
                      <Pressable style={styles.timePickerOverlay} onPress={closeTimePicker}>
                        <Pressable style={styles.timePickerModal} onPress={(e) => e.stopPropagation()}>
                          <View style={styles.timePickerHeader}>
                            <TouchableOpacity onPress={commitTimePickerSelection}>
                              <ThemedText size="sm" weight="medium" style={{ color: palette.primary }}>
                                {t("notifications.settings.done") ?? "Done"}
                              </ThemedText>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={timePickerValue}
                            mode="time"
                            is24Hour={true}
                            display="spinner"
                            onChange={(_, selectedTime) => {
                              if (selectedTime) {
                                setTimePickerValue(selectedTime);
                              }
                            }}
                            themeVariant={colorScheme || "dark"}
                            style={styles.timePicker}
                          />
                        </Pressable>
                      </Pressable>
                    </Modal>
                  ) : (
                    <DateTimePicker
                      value={timePickerValue}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onChange={(event, selectedTime) => {
                        if (event.type === "set" && selectedTime && timePickerTarget) {
                          setTimePickerValue(selectedTime);
                          applyTimeToForm(timePickerTarget, selectedTime);
                        }
                        closeTimePicker();
                      }}
                      themeVariant={colorScheme || "dark"}
                    />
                  )}
                </>
              )}

              <View style={styles.sectionCard}>
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
                    ]}
                    onPress={() => handleSourcePress("ai")}
                  >
                    <ThemedText
                      size="sm"
                      weight="medium"
                      style={[
                        styles.sourceToggleOptionText,
                        formSource === "ai" ? { color: palette.background } : {},
                      ]}
                    >
                      {t("momentNotifications.source.ai")}
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
                    <View style={{ gap: 6 }}>
                      <ThemedText size="sm" style={{ color: palette.muted }}>
                        {formMomentType === "sunny"
                          ? t("momentNotifications.source.aiHintSunnyMoments")
                          : t("momentNotifications.source.aiHintLessons")}
                      </ThemedText>
                      {!hasAIEntitlement && canClaimFreeAI && (
                        <ThemedText size="sm" style={{ color: palette.muted }}>
                          You have 1 free AI nudge available today.
                        </ThemedText>
                      )}
                    </View>
                  </View>
                )}
                {editingSchedule && formSource === "ai" && (
                  <View style={styles.hintRow}>
                    <View style={styles.refreshActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.optionChip,
                          styles.refreshActionButton,
                          (isSaving || pendingAISummaryCount === 0) && styles.refreshActionButtonDisabled,
                        ]}
                        onPress={() => void handleRefreshAISummaries()}
                        disabled={isSaving || pendingAISummaryCount === 0}
                      >
                        <View style={styles.refreshIconWrap}>
                          <MaterialIcons
                            name={pendingAISummaryCount === 0 ? "check-circle" : "refresh"}
                            size={16 * fontScale}
                            color={pendingAISummaryCount === 0 ? "#22C55E" : palette.text}
                          />
                          {pendingAISummaryCount > 0 && (
                            <View style={styles.refreshBadge}>
                              <ThemedText
                                size="sm"
                                weight="bold"
                                style={styles.refreshBadgeText}
                              >
                                {pendingAISummaryCount > 99 ? "99+" : String(pendingAISummaryCount)}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <ThemedText size="sm">
                          {t("momentNotifications.refresh.button")}
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.refreshInfoButton}
                        onPress={handleRefreshAIInfoPress}
                        hitSlop={8}
                        accessibilityLabel={t("momentNotifications.refresh.infoButton")}
                      >
                        <MaterialIcons name="info-outline" size={18 * fontScale} color={palette.muted} />
                      </TouchableOpacity>
                    </View>
                    {!hasAIEntitlement && (
                      <ThemedText size="sm" style={{ color: palette.muted, marginTop: 6 }}>
                        {t("momentNotifications.refresh.requiresSubscription")}
                      </ThemedText>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.soundRow}>
                  <ThemedText size="sm" weight="medium">
                    {t("notifications.settings.sound") ?? "Sound"}
                  </ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.soundToggleButton,
                      formSoundEnabled && styles.soundToggleButtonActive,
                    ]}
                    onPress={() => setFormSoundEnabled((prev) => !prev)}
                  >
                    <MaterialIcons
                      name={formSoundEnabled ? "volume-up" : "volume-off"}
                      size={18 * fontScale}
                      color={formSoundEnabled ? palette.background : palette.text}
                    />
                    <ThemedText
                      size="sm"
                      weight="bold"
                      style={{ color: formSoundEnabled ? palette.background : palette.text }}
                    >
                      {formSoundEnabled
                        ? t("notifications.settings.sound.on") ?? "On"
                        : t("notifications.settings.sound.off") ?? "Off"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
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
    fabBackground: string;
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
      minWidth: 44,
      minHeight: 44,
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
      backgroundColor: palette.fabBackground,
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
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 10 * fontScale,
    },
    sphereGroupCard: {
      borderRadius: 16 * fontScale,
      borderWidth: 1,
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 12 * fontScale,
    },
    sphereGroupHeader: {
      marginBottom: 10 * fontScale,
    },
    sphereGroupTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8 * fontScale,
    },
    sphereGroupDot: {
      width: 6 * fontScale,
      height: 6 * fontScale,
      borderRadius: 999,
    },
    sphereGroupRows: {
      gap: 10 * fontScale,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardMain: { flex: 1 },
    infoRows: {
      marginTop: 6 * fontScale,
      gap: 4 * fontScale,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6 * fontScale,
      paddingRight: 8 * fontScale,
    },
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
      backgroundColor: "rgba(0,0,0,0.58)",
      justifyContent: "flex-end",
    },
    modalContent: {
      flex: 1,
      backgroundColor: palette.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: "90%",
      minHeight: "75%",
      overflow: "hidden",
    },
    modalHandleWrap: {
      alignItems: "center",
      paddingTop: 10 * fontScale,
      paddingBottom: 2 * fontScale,
    },
    modalHandle: {
      width: 42 * fontScale,
      height: 5 * fontScale,
      borderRadius: 999,
      backgroundColor: palette.border,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20 * fontScale,
      paddingTop: 10 * fontScale,
      paddingBottom: 14 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    modalBody: {
      flex: 1,
    },
    modalBodyContent: {
      paddingHorizontal: 16 * fontScale,
      paddingTop: 14 * fontScale,
      paddingBottom: 20 * fontScale,
      flexGrow: 0,
      gap: 12 * fontScale,
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
      marginBottom: 10 * fontScale,
    },
    sectionCard: {
      borderRadius: 16 * fontScale,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 12 * fontScale,
    },
    optionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10 * fontScale,
    },
    optionChip: {
      paddingHorizontal: 14 * fontScale,
      paddingVertical: 9 * fontScale,
      borderRadius: 999,
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
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: "hidden",
      padding: 2 * fontScale,
      backgroundColor: palette.surfaceElevated,
    },
    sourceToggleOption: {
      flex: 1,
      paddingVertical: 12 * fontScale,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10 * fontScale,
    },
    sourceToggleOptionText: {
      textAlign: "center",
    },
    sourceToggleSelected: {
      backgroundColor: palette.primary,
    },
    frequencyModeToggleRow: {
      flexDirection: "row",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: "hidden",
      marginBottom: 12 * fontScale,
      padding: 2 * fontScale,
      backgroundColor: palette.surfaceElevated,
    },
    frequencyModeOption: {
      flex: 1,
      paddingVertical: 10 * fontScale,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10 * fontScale,
    },
    timeRangeRow: {
      flexDirection: "row",
      gap: 8 * fontScale,
      marginTop: 10 * fontScale,
    },
    input: {
      minHeight: 44 * fontScale,
    },
    inputBox: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 10 * fontScale,
    },
    timePickerButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8 * fontScale,
    },
    specificTimeChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6 * fontScale,
      paddingHorizontal: 10 * fontScale,
      paddingVertical: 8 * fontScale,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
    },
    addTimeChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4 * fontScale,
    },
    timePickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },
    timePickerModal: {
      backgroundColor: palette.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 8 * fontScale,
    },
    timePickerHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: 16 * fontScale,
      paddingVertical: 12 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    timePicker: {
      alignSelf: "stretch",
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
    refreshActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8 * fontScale,
    },
    refreshActionButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6 * fontScale,
    },
    refreshActionButtonDisabled: {
      opacity: 0.6,
    },
    refreshIconWrap: {
      minWidth: 18 * fontScale,
      minHeight: 18 * fontScale,
      alignItems: "center",
      justifyContent: "center",
    },
    refreshBadge: {
      position: "absolute",
      top: -7 * fontScale,
      right: -9 * fontScale,
      minWidth: 16 * fontScale,
      height: 16 * fontScale,
      borderRadius: 8 * fontScale,
      paddingHorizontal: 3 * fontScale,
      backgroundColor: "#EF4444",
      alignItems: "center",
      justifyContent: "center",
    },
    refreshBadgeText: {
      color: "#FFFFFF",
      fontSize: 9 * fontScale,
      lineHeight: 11 * fontScale,
    },
    refreshInfoButton: {
      width: 34 * fontScale,
      height: 34 * fontScale,
      borderRadius: 17 * fontScale,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    soundRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10 * fontScale,
    },
    soundToggleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6 * fontScale,
      minWidth: 86 * fontScale,
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 8 * fontScale,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
    },
    soundToggleButtonActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    cancelBtn: {
      flex: 1,
      minHeight: 50 * fontScale,
      paddingVertical: 12 * fontScale,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14 * fontScale,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
    },
    saveBtn: {
      flex: 1,
      minHeight: 50 * fontScale,
      paddingVertical: 12 * fontScale,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14 * fontScale,
      backgroundColor: palette.primary,
    },
    saveBtnDisabled: {
      backgroundColor: palette.surfaceDisabled,
      opacity: 0.7,
    },
  });
}
