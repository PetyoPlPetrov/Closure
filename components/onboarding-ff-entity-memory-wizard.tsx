/**
 * Post–story onboarding phase 1: ensure each visible Sfera has at least one object.
 * Sfera AI memories are created in phase 2 (OnboardingMemoryWizardStep), not here.
 */
import { OnboardingFfSphereDetailOverlay } from "@/components/onboarding-ff-sphere-detail-overlay";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { type LifeSphere, useJourney } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  sphereEntityCount,
} from "@/utils/onboarding-ff-wizard-shared";
import { getSphereIconColor, getSphereSferaColor } from "@/utils/sphere-styles";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

/** Always surfaced in this wizard */
const ALWAYS_SPHERES: readonly LifeSphere[] = ["friends", "family", "hobbies"];

const ONBOARDING_PRIMARY_GRADIENT = ["#4A90E2", "#357ABD", "#2E6DA4"] as const;

type Props = {
  onContinueToMemoryWizard: () => Promise<void>;
};

export function OnboardingFfEntityMemoryWizard({
  onContinueToMemoryWizard,
}: Props) {
  const colorScheme = useColorScheme();
  const fontScheme = colorScheme ?? "dark";
  const fontScale = useFontScale();
  const colors = Colors[fontScheme];
  const t = useTranslate();
  const { profiles, jobs, friends, familyMembers, hobbies } = useJourney();

  const visibleSpheres = useMemo((): LifeSphere[] => {
    const extra: LifeSphere[] = [];
    if (profiles.length > 0) extra.push("relationships");
    if (jobs.length > 0) extra.push("career");
    return [...ALWAYS_SPHERES, ...extra];
  }, [profiles.length, jobs.length]);

  const allVisibleHaveMinEntity = useMemo(
    () =>
      visibleSpheres.every((s) =>
        sphereEntityCount(
          s,
          profiles,
          jobs,
          friends,
          familyMembers,
          hobbies,
        ) >= 1,
      ),
    [visibleSpheres, profiles, jobs, friends, familyMembers, hobbies],
  );

  const doneRef = useRef(false);

  const goToMemoryPhase = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      await onContinueToMemoryWizard();
    } catch (e) {
      doneRef.current = false;
      throw e;
    }
  }, [onContinueToMemoryWizard]);

  const [detailSphere, setDetailSphere] = useState<LifeSphere | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingHorizontal: 20 * fontScale,
          paddingTop: 56 * fontScale,
          paddingBottom: 14 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor:
            fontScheme === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
        },
        callout: {
          marginHorizontal: 20 * fontScale,
          marginTop: 14 * fontScale,
          padding: 14 * fontScale,
          borderRadius: 14 * fontScale,
          borderWidth: 1,
          borderColor:
            fontScheme === "dark"
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.1)",
          backgroundColor:
            fontScheme === "dark"
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.03)",
        },
        scroll: {
          flex: 1,
          padding: 20 * fontScale,
        },
        sphereListColumn: {
          alignSelf: "stretch",
          width: "100%",
          gap: 8 * fontScale,
          marginBottom: 18 * fontScale,
        },
        sphereRowTouchable: {
          alignSelf: "stretch",
          width: "100%",
        },
        sphereChip: {
          alignSelf: "stretch",
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 48 * fontScale,
          paddingVertical: 11 * fontScale,
          paddingLeft: 14 * fontScale,
          paddingRight: 14 * fontScale,
          borderRadius: 14 * fontScale,
          borderWidth: 2,
        },
        sphereChipNeedsSetup: {
          borderWidth: 3,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.22,
          shadowRadius: 6,
          elevation: 3,
        },
        sphereChipLabelText: {
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          paddingRight: 10 * fontScale,
        },
        sphereChipGuideTrailing: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6 * fontScale,
        },
        footer: {
          padding: 16 * fontScale,
          borderTopWidth: 1,
          borderTopColor:
            fontScheme === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
        },
        continueBlockOuter: {
          marginTop: 8 * fontScale,
          alignSelf: "stretch",
          width: "100%",
          borderRadius: 16 * fontScale,
          borderWidth:
            fontScheme === "dark" ? StyleSheet.hairlineWidth : 1,
          borderColor:
            fontScheme === "dark"
              ? "rgba(255,255,255,0.14)"
              : "rgba(74,144,226,0.28)",
          backgroundColor:
            fontScheme === "dark"
              ? "rgba(100,181,246,0.05)"
              : "rgba(74,144,226,0.06)",
          overflow: "hidden",
        },
      }),
    [colors.background, fontScheme, fontScale],
  );

  const guideCompleteGreen = "#22C55E";

  const readyFlag = allVisibleHaveMinEntity;

  const handleContinueMain = useCallback(async () => {
    if (!readyFlag) return;
    setFinalizing(true);
    try {
      await goToMemoryPhase();
    } finally {
      setFinalizing(false);
    }
  }, [readyFlag, goToMemoryPhase]);

  if (doneRef.current || finalizing) {
    return (
      <View style={[styles.container, { justifyContent: "center", padding: 24 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText size="xl" weight="bold">
          {t("onboarding.postEntity.unifiedWizard.title")}
        </ThemedText>
      </View>

      <View style={styles.callout}>
        <ThemedText size="sm" style={{ opacity: 0.9 }}>
          {t("onboarding.postEntity.unifiedWizard.body")}
        </ThemedText>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.sphereListColumn}>
          {visibleSpheres.map((s) => {
            const ac = getSphereSferaColor(s, fontScheme);
            const glyph = getSphereIconColor(s, fontScheme, 60);
            const cnt = sphereEntityCount(
              s,
              profiles,
              jobs,
              friends,
              familyMembers,
              hobbies,
            );
            const hasMin = cnt >= 1;
            const incompleteMandatory =
              (s === "friends" || s === "family" || s === "hobbies") && !hasMin;

            const borderColor = incompleteMandatory
              ? `${ac}DD`
              : `${ac}72`;
            const chipBorderW = incompleteMandatory ? 3 : 2;
            const chipDim = incompleteMandatory ? 0.82 : hasMin ? 1 : 0.92;

            const label = t(`onboarding.sphere.${s}`) || s;

            const innerChipStyle = [
              styles.sphereChip,
              incompleteMandatory ? styles.sphereChipNeedsSetup : null,
              {
                opacity: 1,
                borderWidth: chipBorderW,
                borderColor,
                shadowOffset: { width: 0, height: 0 },
                shadowColor:
                  incompleteMandatory ? `${ac}99` : "transparent",
                shadowOpacity: incompleteMandatory ? 0.22 : 0,
                shadowRadius: incompleteMandatory ? 6 : 0,
                elevation: incompleteMandatory ? 3 : 0,
                backgroundColor: "transparent",
              },
            ];

            return (
              <TouchableOpacity
                key={s}
                activeOpacity={0.82}
                onPress={() => setDetailSphere(s)}
                accessibilityRole="button"
                accessibilityState={{ checked: hasMin }}
                accessibilityLabel={`${label}${
                  hasMin
                    ? `, ${t("onboarding.postEntity.unifiedWizard.sphereRowA11yComplete")}`
                    : `, ${t("onboarding.postEntity.unifiedWizard.sphereRowA11yIncomplete")}`
                }`}
                accessibilityHint={t(
                  "onboarding.postEntity.unifiedWizard.openSphereDetailA11y",
                )}
                style={[styles.sphereRowTouchable, { opacity: chipDim }]}
              >
                <View style={innerChipStyle}>
                  <ThemedText
                    numberOfLines={1}
                    size="sm"
                    weight={hasMin ? "bold" : "medium"}
                    style={[
                      styles.sphereChipLabelText,
                      { color: glyph },
                    ]}
                  >
                    {label}
                  </ThemedText>
                  <View
                    style={styles.sphereChipGuideTrailing}
                    pointerEvents="none"
                  >
                    {hasMin ? (
                      <MaterialIcons
                        name="check-circle"
                        size={24 * fontScale}
                        color={guideCompleteGreen}
                        importantForAccessibility="no"
                        accessible={false}
                      />
                    ) : null}
                    <MaterialIcons
                      name="arrow-forward-ios"
                      size={16 * fontScale}
                      color={colors.text}
                      importantForAccessibility="no"
                      accessible={false}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.continueBlockOuter}>
          <TouchableOpacity
            disabled={!readyFlag}
            activeOpacity={0.88}
            onPress={() => void handleContinueMain()}
            accessibilityRole="button"
            accessibilityLabel={
              t("onboarding.postEntity.unifiedWizard.saveOpenAi") as string
            }
            accessibilityState={{ disabled: !readyFlag }}
            style={{
              opacity: !readyFlag ? 0.45 : 1,
            }}
          >
            <LinearGradient
              colors={[...ONBOARDING_PRIMARY_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 14 * fontScale,
                alignItems: "center",
              }}
            >
              <ThemedText size="m" weight="bold" style={{ color: "#FFF" }}>
                {t("onboarding.postEntity.unifiedWizard.saveOpenAi")}
              </ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {detailSphere ? (
        <OnboardingFfSphereDetailOverlay
          sphere={detailSphere}
          visible
          onClose={() => setDetailSphere(null)}
        />
      ) : null}

      <View style={styles.footer}>
        <ThemedText size="xs" style={{ opacity: 0.55, textAlign: "center" }}>
          {t("onboarding.postEntity.unifiedWizard.footerHint")}
        </ThemedText>
      </View>
    </View>
  );
}

export { countFfEntitiesWithAiMemory } from "@/utils/onboarding-ff-wizard-shared";
