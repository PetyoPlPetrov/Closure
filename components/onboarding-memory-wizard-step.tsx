/**
 * Sequential Sfera AI memory creation for post-entity onboarding (selected IDs only).
 */
import { AIModal } from "@/components/ai-modal";
import { AITabButton } from "@/components/haptic-tab";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useJourney, type LifeSphere } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { getCurrentBadge } from "@/utils/streak-manager";
import type { StreakBadge } from "@/utils/streak-types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  orderedEntityIds: string[];
  entityBlurbs: Record<string, string>;
  initialStepIndex: number;
  /** Persisted onboarding AI-save successes (ordering independent). */
  memoryWizardCommittedIds: string[];
  onPersistStepIndex: (index: number) => Promise<void>;
  onAppendCommittedMemoryEntityId: (id: string) => Promise<void>;
  onAllComplete: () => Promise<void>;
};

function resolveEntity(
  id: string,
  friends: ReturnType<typeof useJourney>["friends"],
  familyMembers: ReturnType<typeof useJourney>["familyMembers"],
  hobbies: ReturnType<typeof useJourney>["hobbies"],
  profiles: ReturnType<typeof useJourney>["profiles"],
  jobs: ReturnType<typeof useJourney>["jobs"],
): { sphere: LifeSphere; name: string; imageUri?: string } | null {
  const fr = friends.find((f) => f.id === id);
  if (fr)
    return {
      sphere: "friends",
      name: fr.name,
      imageUri: fr.imageUri?.trim() ? fr.imageUri : undefined,
    };
  const fm = familyMembers.find((m) => m.id === id);
  if (fm)
    return {
      sphere: "family",
      name: fm.name,
      imageUri: fm.imageUri?.trim() ? fm.imageUri : undefined,
    };
  const h = hobbies.find((x) => x.id === id);
  if (h)
    return {
      sphere: "hobbies",
      name: h.name,
      imageUri: h.imageUri?.trim() ? h.imageUri : undefined,
    };
  const pr = profiles.find((p) => p.id === id);
  if (pr)
    return {
      sphere: "relationships",
      name: pr.name,
      imageUri: pr.imageUri?.trim() ? pr.imageUri : undefined,
    };
  const job = jobs.find((j) => j.id === id);
  if (job)
    return {
      sphere: "career",
      name: job.name,
      imageUri: job.imageUri?.trim() ? job.imageUri : undefined,
    };
  return null;
}

const ONBOARDING_PRIMARY_GRADIENT = ["#4A90E2", "#357ABD", "#2E6DA4"] as const;

export function OnboardingMemoryWizardStep({
  orderedEntityIds,
  entityBlurbs,
  initialStepIndex,
  memoryWizardCommittedIds,
  onPersistStepIndex,
  onAppendCommittedMemoryEntityId,
  onAllComplete,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const fontScale = useFontScale();
  const insets = useSafeAreaInsets();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();
  const {
    idealizedMemories,
    friends,
    familyMembers,
    hobbies,
    profiles,
    jobs,
    reloadAll,
  } = useJourney();

  const clampedStart =
    orderedEntityIds.length === 0
      ? 0
      : Math.min(Math.max(0, initialStepIndex), orderedEntityIds.length - 1);
  const [stepIndex, setStepIndex] = useState(clampedStart);
  const [aimodalVisible, setAimodalVisible] = useState(false);
  const [continueBusy, setContinueBusy] = useState(false);
  const [currentBadge, setCurrentBadge] = useState<StreakBadge | null>(null);

  useEffect(() => {
    const s =
      orderedEntityIds.length === 0
        ? 0
        : Math.min(Math.max(0, initialStepIndex), orderedEntityIds.length - 1);
    setStepIndex(s);
  }, [initialStepIndex, orderedEntityIds.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const badge = await getCurrentBadge();
        if (!cancelled) setCurrentBadge(badge);
      } catch {
        if (!cancelled) setCurrentBadge(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentId =
    orderedEntityIds.length === 0
      ? null
      : (orderedEntityIds[stepIndex] ?? null);
  const resolved = currentId
    ? resolveEntity(currentId, friends, familyMembers, hobbies, profiles, jobs)
    : null;

  const hasAiMemoryForCurrent = useMemo(() => {
    if (!currentId || !resolved) return false;
    return idealizedMemories.some(
      (m) =>
        m.entityId === currentId &&
        m.sphere === resolved.sphere &&
        m.source === "ai",
    );
  }, [currentId, resolved, idealizedMemories]);

  const committedSet = useMemo(
    () => new Set(memoryWizardCommittedIds),
    [memoryWizardCommittedIds],
  );

  const everyWizardSlotCommitted =
    orderedEntityIds.length > 0 &&
    orderedEntityIds.every((id) => committedSet.has(id));

  const isLastWizardStep =
    orderedEntityIds.length > 0 && stepIndex >= orderedEntityIds.length - 1;

  const showFinishContinue = isLastWizardStep && everyWizardSlotCommitted;

  const advanceAfterCurrentEntityComplete = useCallback(async () => {
    if (orderedEntityIds.length === 0) return;
    const isLast = stepIndex >= orderedEntityIds.length - 1;
    if (isLast) {
      /* Last entity: stay on this step until user taps Continue (all AI memories exist). */
      return;
    }
    const next = stepIndex + 1;
    await onPersistStepIndex(next);
    setStepIndex(next);
  }, [orderedEntityIds.length, stepIndex, onPersistStepIndex]);

  const handleCommitted = useCallback(async () => {
    if (!currentId) return;
    await reloadAll();
    setAimodalVisible(false);
    await onAppendCommittedMemoryEntityId(currentId);
    await advanceAfterCurrentEntityComplete();
  }, [
    currentId,
    reloadAll,
    onAppendCommittedMemoryEntityId,
    advanceAfterCurrentEntityComplete,
  ]);

  const onPressContinue = useCallback(async () => {
    if (continueBusy || !showFinishContinue) return;
    setContinueBusy(true);
    try {
      await onAllComplete();
    } finally {
      setContinueBusy(false);
    }
  }, [continueBusy, showFinishContinue, onAllComplete]);

  /** Resume middle steps only after onboarding wizard recorded AI save for this entity. */
  useEffect(() => {
    if (orderedEntityIds.length === 0) return;
    if (stepIndex >= orderedEntityIds.length - 1) return;
    if (!hasAiMemoryForCurrent || !currentId) return;
    if (!memoryWizardCommittedIds.includes(currentId)) return;

    let cancelled = false;
    void (async () => {
      const next = stepIndex + 1;
      try {
        await onPersistStepIndex(next);
        if (!cancelled) setStepIndex(next);
      } catch {
        /* stay on step if persist fails */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    orderedEntityIds.length,
    stepIndex,
    hasAiMemoryForCurrent,
    currentId,
    memoryWizardCommittedIds,
    onPersistStepIndex,
  ]);

  const modalBundle =
    resolved && currentId
      ? {
          sphere: resolved.sphere,
          entityId: currentId,
          entityName: resolved.name,
          contextBlurb: entityBlurbs[currentId] ?? "",
        }
      : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingHorizontal: 20 * fontScale,
          paddingTop: 56 * fontScale,
          paddingBottom: 16 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 14 * fontScale,
        },
        headerAvatar: {
          width: 56 * fontScale,
          height: 56 * fontScale,
          borderRadius: 28 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.14)"
              : "rgba(0,0,0,0.1)",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
          overflow: "hidden",
        },
        headerTitles: {
          flex: 1,
          minWidth: 0,
        },
        content: {
          flex: 1,
          padding: 24 * fontScale,
          justifyContent: "flex-start",
        },
        footer: {
          padding: 16 * fontScale,
          paddingBottom:
            Math.max(insets.bottom, 10 * fontScale) + 8 * fontScale,
          borderTopWidth: 1,
          borderTopColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
          gap: 12 * fontScale,
        },
        hero: {
          padding: 20 * fontScale,
          borderRadius: 18 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.24)"
              : "rgba(15, 23, 42, 0.16)",
          backgroundColor: colorScheme === "dark" ? "#1D2736" : "#FFFFFF",
          marginBottom: 20 * fontScale,
          alignItems: "stretch",
        },
        celebrationBadge: {
          width: 74 * fontScale,
          height: 74 * fontScale,
          borderRadius: 37 * fontScale,
          alignSelf: "center",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14 * fontScale,
          overflow: "hidden",
          borderWidth: 2,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.72)"
              : "rgba(15, 23, 42, 0.22)",
        },
      }),
    [colors.background, colorScheme, fontScale, insets.bottom],
  );

  if (!currentId || !resolved || !modalBundle) {
    return (
      <View
        style={[styles.container, { justifyContent: "center", padding: 24 }]}
      >
        <ThemedText>{t("ai.entity.noEntities")}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!showFinishContinue ? (
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {resolved.imageUri ? (
              <Image
                source={{ uri: resolved.imageUri }}
                style={styles.headerAvatar}
                contentFit="cover"
                transition={160}
                accessibilityRole="image"
                accessibilityLabel={resolved.name}
              />
            ) : null}
            <View style={styles.headerTitles}>
              <ThemedText size="xl" weight="bold" numberOfLines={2}>
                {resolved.name}
              </ThemedText>
              <ThemedText
                size="sm"
                style={{ marginTop: 6 * fontScale, opacity: 0.75 }}
                numberOfLines={1}
              >
                {t(`onboarding.sphere.${resolved.sphere}`) || resolved.sphere}
              </ThemedText>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          showFinishContinue ? { justifyContent: "center", flexGrow: 1 } : null,
        ]}
      >
        <View style={styles.hero}>
          {!resolved.imageUri ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <MaterialIcons
                name={showFinishContinue ? "celebration" : "psychology-alt"}
                size={36 * fontScale}
                color={colors.primary}
              />
            </View>
          ) : null}
          {showFinishContinue ? (
            <View style={styles.celebrationBadge}>
              <LinearGradient
                colors={[
                  currentBadge?.colorGradient[0] ?? "#5DA4EF",
                  currentBadge?.colorGradient[1] ?? "#357ABD",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: 37 * fontScale },
                ]}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: 37 * fontScale,
                    backgroundColor: isDark
                      ? "rgba(0, 0, 0, 0.18)"
                      : "rgba(0, 0, 0, 0.08)",
                  },
                ]}
              />
              <ThemedText
                style={{
                  fontSize: 34 * fontScale,
                  lineHeight: 40 * fontScale,
                }}
              >
                {currentBadge?.emoji ?? "✨"}
              </ThemedText>
            </View>
          ) : null}
          {showFinishContinue ? (
            <ThemedText
              size="xs"
              weight="semibold"
              style={{
                textAlign: "center",
                opacity: 0.78,
                marginBottom: 10 * fontScale,
                color: isDark ? "#F3F6FA" : "#1E293B",
              }}
            >
              {currentBadge ? `${currentBadge.name} badge` : "Badge earned"}
            </ThemedText>
          ) : null}
          {showFinishContinue ? (
            <ThemedText
              size="xl"
              weight="bold"
              style={{
                textAlign: "center",
                marginBottom: 8 * fontScale,
              }}
            >
              {t(
                "onboarding.postEntity.memoryWizard.onboardingCompleteTitle",
              ) ?? "You're all set!"}
            </ThemedText>
          ) : null}
          {showFinishContinue ? (
            <>
              <ThemedText
                size="sm"
                style={{
                  marginTop: resolved.imageUri ? 0 : 10 * fontScale,
                  textAlign: "center",
                  color: isDark ? "#F8FAFC" : "#111827",
                  lineHeight: 21 * fontScale,
                }}
              >
                {t(
                  "onboarding.postEntity.memoryWizard.onboardingCompleteMessage",
                )}
              </ThemedText>
              <ThemedText
                size="xs"
                style={{
                  marginTop: 10 * fontScale,
                  textAlign: "center",
                  color: isDark ? "#DCE5F0" : "#334155",
                  lineHeight: 19 * fontScale,
                  paddingHorizontal: 8 * fontScale,
                }}
              >
                {t(
                  "onboarding.postEntity.memoryWizard.onboardingCompletePerksLine",
                )}
              </ThemedText>
            </>
          ) : (
            <ThemedText
              size="sm"
              style={{
                marginTop: resolved.imageUri ? 0 : 14 * fontScale,
                textAlign: "center",
                color: isDark ? "#F8FAFC" : "#111827",
                lineHeight: 22 * fontScale,
              }}
            >
              {t("onboarding.postEntity.memoryWizard.subtitle")}
            </ThemedText>
          )}

          {showFinishContinue ? null : hasAiMemoryForCurrent ? (
            <View style={{ marginTop: 20 * fontScale }}>
              <ThemedText size="sm" weight="medium" style={{ opacity: 0.85 }}>
                ✓ {t("onboarding.postEntity.memoryWizard.aiMemorySavedShort")}
              </ThemedText>
            </View>
          ) : (
            <>
              <ThemedText
                size="sm"
                weight="semibold"
                style={{
                  marginTop: 18 * fontScale,
                  textAlign: "center",
                  opacity: 0.88,
                  lineHeight: 22 * fontScale,
                  paddingHorizontal: 4 * fontScale,
                }}
              >
                {t("onboarding.postEntity.memoryWizard.tapAiCircleForName", {
                  name: resolved.name,
                })}
              </ThemedText>
              <View
                style={{
                  alignItems: "center",
                  marginTop: 14 * fontScale,
                }}
              >
                <AITabButton
                  size={Math.round(60 * fontScale)}
                  emitGlobalPress={false}
                  accessibilityLabel={
                    t("onboarding.postEntity.memoryWizard.createAi") as string
                  }
                  onPressed={() => setAimodalVisible(true)}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <AIModal
        visible={aimodalVisible}
        onClose={() => setAimodalVisible(false)}
        onSend={() => Promise.resolve()}
        onboardingSferaAI={modalBundle}
        onOnboardingAIMemoryCommitted={() => handleCommitted()}
      />

      <View style={styles.footer}>
        {showFinishContinue ? (
          <TouchableOpacity
            disabled={continueBusy}
            activeOpacity={0.88}
            onPress={() => void onPressContinue()}
            accessibilityRole="button"
            accessibilityLabel={
              (t("onboarding.postEntity.startSferas") ??
                t("onboarding.postEntity.continue")) as string
            }
            style={{ opacity: continueBusy ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={[...ONBOARDING_PRIMARY_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 14 * fontScale,
                borderRadius: 14 * fontScale,
                alignItems: "center",
              }}
            >
              <ThemedText size="m" weight="bold" style={{ color: "#FFF" }}>
                {t("onboarding.postEntity.startSferas") ??
                  t("onboarding.postEntity.continue")}
              </ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
        {!showFinishContinue ? (
          <ThemedText size="xs" style={{ opacity: 0.6, textAlign: "center" }}>
            Step {stepIndex + 1} / {orderedEntityIds.length}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}
