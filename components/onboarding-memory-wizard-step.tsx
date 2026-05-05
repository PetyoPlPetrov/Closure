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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type Props = {
  orderedEntityIds: string[];
  entityBlurbs: Record<string, string>;
  initialStepIndex: number;
  onPersistStepIndex: (index: number) => Promise<void>;
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

export function OnboardingMemoryWizardStep({
  orderedEntityIds,
  entityBlurbs,
  initialStepIndex,
  onPersistStepIndex,
  onAllComplete,
}: Props) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();
  const { idealizedMemories, friends, familyMembers, hobbies, profiles, jobs, reloadAll } =
    useJourney();

  const clampedStart =
    orderedEntityIds.length === 0
      ? 0
      : Math.min(Math.max(0, initialStepIndex), orderedEntityIds.length - 1);
  const [stepIndex, setStepIndex] = useState(clampedStart);
  const [aimodalVisible, setAimodalVisible] = useState(false);

  useEffect(() => {
    const s =
      orderedEntityIds.length === 0
        ? 0
        : Math.min(Math.max(0, initialStepIndex), orderedEntityIds.length - 1);
    setStepIndex(s);
  }, [initialStepIndex, orderedEntityIds.length]);

  const currentId =
    orderedEntityIds.length === 0 ? null : orderedEntityIds[stepIndex] ?? null;
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

  const handleCommitted = useCallback(async () => {
    await reloadAll();
    setAimodalVisible(false);
    if (orderedEntityIds.length === 0) return;
    const isLast = stepIndex >= orderedEntityIds.length - 1;
    if (isLast) {
      await onAllComplete();
      return;
    }
    const next = stepIndex + 1;
    await onPersistStepIndex(next);
    setStepIndex(next);
  }, [
    reloadAll,
    orderedEntityIds.length,
    stepIndex,
    onPersistStepIndex,
    onAllComplete,
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
            colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
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
          borderTopWidth: 1,
          borderTopColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        },
        hero: {
          padding: 20 * fontScale,
          borderRadius: 18 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
          backgroundColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
          marginBottom: 20 * fontScale,
          alignItems: "stretch",
        },
      }),
    [colors.background, colorScheme, fontScale],
  );

  if (!currentId || !resolved || !modalBundle) {
    return (
      <View style={[styles.container, { justifyContent: "center", padding: 24 }]}>
        <ThemedText>{t("ai.entity.noEntities")}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <ThemedText size="sm" style={{ marginTop: 6 * fontScale, opacity: 0.75 }} numberOfLines={1}>
              {t(`onboarding.sphere.${resolved.sphere}`) || resolved.sphere}
            </ThemedText>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText size="xs" weight="medium" style={{ opacity: 0.7, marginBottom: 14 }}>
          {t("onboarding.postEntity.memoryWizard.progress")
            .replace("{current}", String(stepIndex + 1))
            .replace("{total}", String(orderedEntityIds.length))}
        </ThemedText>

        <View style={styles.hero}>
          {!resolved.imageUri ? (
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
              <MaterialIcons name="psychology-alt" size={36 * fontScale} color={colors.primary} />
            </View>
          ) : null}
          <ThemedText
            size="sm"
            style={{
              marginTop: resolved.imageUri ? 0 : 14 * fontScale,
              textAlign: "center",
              opacity: 0.88,
            }}
          >
            {t("onboarding.postEntity.memoryWizard.subtitle")}
          </ThemedText>

          {hasAiMemoryForCurrent ? (
            <View style={{ marginTop: 20 * fontScale }}>
              <ThemedText size="sm" weight="medium" style={{ opacity: 0.85 }}>
                ✓ AI memory saved · {t("onboarding.done") ?? "Continuing…"}
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
                  size={Math.round(52 * fontScale)}
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
        onOnboardingAIMemoryCommitted={() => void handleCommitted()}
      />

      <View style={styles.footer}>
        <ThemedText size="xs" style={{ opacity: 0.6, textAlign: "center" }}>
          Step {stepIndex + 1} / {orderedEntityIds.length}
        </ThemedText>
      </View>
    </View>
  );
}
