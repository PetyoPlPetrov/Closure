/**
 * OnboardingEntityResultsView - Multi-sphere edit screen for onboarding.
 * Renders suggested entities from all spheres in one long scroll; uses
 * AIEntityResultsView in embedded mode per sphere.
 */
import { AIEntityResultsView } from "@/components/ai-entity-results-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useTranslate } from "@/utils/languages/use-translate";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type {
  AIEntitySuggestion,
  AIOnboardingResponse,
} from "@/utils/ai-service";

const SPHERE_LABELS: Record<
  keyof AIOnboardingResponse["entitiesBySphere"],
  string
> = {
  relationships: "Relationships",
  career: "Career",
  family: "Family",
  friends: "Friends",
  hobbies: "Hobbies",
};

const SPHERE_ICONS: Record<
  keyof AIOnboardingResponse["entitiesBySphere"],
  string
> = {
  relationships: "favorite",
  career: "work",
  family: "family-restroom",
  friends: "people",
  hobbies: "sports-esports",
};

type OnboardingEntityResultsViewProps = {
  entitiesBySphere: AIOnboardingResponse["entitiesBySphere"];
  onSave: (entitiesBySphere: AIOnboardingResponse["entitiesBySphere"]) => Promise<void>;
  onStartOver?: () => void;
  onEntitiesBySphereChange?: (entitiesBySphere: AIOnboardingResponse["entitiesBySphere"]) => void;
};

export function OnboardingEntityResultsView({
  entitiesBySphere: initialEntitiesBySphere,
  onSave,
  onStartOver,
  onEntitiesBySphereChange,
}: OnboardingEntityResultsViewProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();

  const [entitiesBySphere, setEntitiesBySphere] =
    useState<AIOnboardingResponse["entitiesBySphere"]>(initialEntitiesBySphere);
  const [collapsedSpheres, setCollapsedSpheres] = useState<
    Partial<Record<keyof AIOnboardingResponse["entitiesBySphere"], boolean>>
  >({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetY = useRef(0);

  useEffect(() => {
    const y = scrollOffsetY.current;
    if (y > 0 && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y, animated: false });
      });
    }
  }, [entitiesBySphere]);

  const spheresWithEntities = useMemo(() => {
    const spheres: (keyof AIOnboardingResponse["entitiesBySphere"])[] = [
      "relationships",
      "career",
      "family",
      "friends",
      "hobbies",
    ];
    return spheres.filter(
      (s) =>
        entitiesBySphere[s] &&
        Array.isArray(entitiesBySphere[s]) &&
        entitiesBySphere[s]!.length > 0
    );
  }, [entitiesBySphere]);

  const validateSphereEntities = useCallback(
    (
      sphere: keyof AIOnboardingResponse["entitiesBySphere"],
      entities: AIEntitySuggestion[] | undefined
    ): boolean => {
      if (!Array.isArray(entities)) return true;
      for (const entity of entities) {
        if (!entity.name?.trim()) return false;
        if (sphere === "family" && !entity.relationship?.trim()) return false;
        if (sphere === "relationships" || sphere === "career") {
          if (entity.isCurrent === undefined) return false;
          if (!entity.startDate) return false;
          if (entity.isCurrent === false && !entity.endDate) return false;
          if (entity.startDate && entity.endDate) {
            const start = new Date(entity.startDate);
            const end = new Date(entity.endDate);
            if (end <= start) return false;
          }
        }
      }
      return true;
    },
    []
  );

  const updateSphereEntities = useCallback(
    (
      sphere: keyof AIOnboardingResponse["entitiesBySphere"],
      entities: AIEntitySuggestion[]
    ) => {
      setEntitiesBySphere((prev) => {
        const next = { ...prev, [sphere]: entities };
        onEntitiesBySphereChange?.(next);
        return next;
      });
    },
    [onEntitiesBySphereChange]
  );

  const toggleSphereCollapsed = useCallback(
    (sphere: keyof AIOnboardingResponse["entitiesBySphere"]) => {
      setCollapsedSpheres((prev) => ({
        ...prev,
        [sphere]: !prev[sphere],
      }));
    },
    []
  );

  const validateAll = useCallback((): boolean => {
    const spheres: (keyof AIOnboardingResponse["entitiesBySphere"])[] = [
      "relationships",
      "career",
      "family",
      "friends",
      "hobbies",
    ];
    for (const sphere of spheres) {
      const entities = entitiesBySphere[sphere];
      if (!validateSphereEntities(sphere, entities)) return false;
    }
    return true;
  }, [entitiesBySphere, validateSphereEntities]);

  const hasValidationErrorsBySphere = useMemo(() => {
    const bySphere: Partial<
      Record<keyof AIOnboardingResponse["entitiesBySphere"], boolean>
    > = {};
    for (const sphere of spheresWithEntities) {
      bySphere[sphere] = !validateSphereEntities(sphere, entitiesBySphere[sphere]);
    }
    return bySphere;
  }, [entitiesBySphere, spheresWithEntities, validateSphereEntities]);

  const isSaveDisabled = useMemo(
    () => isSavingAll || !validateAll(),
    [isSavingAll, validateAll]
  );

  const handleSaveAll = useCallback(async () => {
    if (!validateAll()) {
      Alert.alert(
        t("common.error") ?? "Error",
        t("ai.entity.validationError") ?? "Please fill in all required fields for all entities."
      );
      return;
    }
    setIsSavingAll(true);
    try {
      await onSave(entitiesBySphere);
    } finally {
      setIsSavingAll(false);
    }
  }, [entitiesBySphere, onSave, validateAll, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor:
            colorScheme === "dark" ? colors.background : "#ffffff",
        },
        scrollContent: {
          padding: 16 * fontScale,
          paddingBottom: 120 * fontScale,
        },
        sectionHeader: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 24 * fontScale,
          marginBottom: 12 * fontScale,
          paddingBottom: 8 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.15)"
              : "rgba(0, 0, 0, 0.1)",
        },
        sectionHeaderFirst: {
          marginTop: 0,
        },
        sectionIcon: {
          width: 36 * fontScale,
          height: 36 * fontScale,
          borderRadius: 18 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.08)",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12 * fontScale,
        },
        sectionTitleContainer: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
        },
        sectionCollapseButton: {
          width: 36 * fontScale,
          height: 36 * fontScale,
          borderRadius: 18 * fontScale,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)",
        },
        sectionValidationDot: {
          position: "absolute",
          top: 4 * fontScale,
          right: 4 * fontScale,
          width: 9 * fontScale,
          height: 9 * fontScale,
          borderRadius: 4.5 * fontScale,
          backgroundColor: "#FF4D4F",
        },
        saveButtonContainer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16 * fontScale,
          backgroundColor:
            colorScheme === "dark" ? colors.background : "#ffffff",
          borderTopWidth: 1,
          borderTopColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
        saveButton: {
          height: 48 * fontScale,
          borderRadius: 12 * fontScale,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
          position: "relative",
        },
        saveButtonDisabled: {
          opacity: 0.6,
        },
        startOverButton: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 12 * fontScale,
          paddingVertical: 12 * fontScale,
          borderRadius: 12 * fontScale,
          borderWidth: 1,
        },
      }),
    [colorScheme, colors, fontScale]
  );

  if (spheresWithEntities.length === 0) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 32 * fontScale, alignItems: "center" }}>
          <ThemedText size="m" style={{ opacity: 0.7 }}>
            {t("ai.entity.noEntities") || "No entities found"}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        style={styles.scrollContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={Platform.OS === "android"}
      >
        {spheresWithEntities.map((sphere, idx) => {
          const entities = entitiesBySphere[sphere] ?? [];
          const label =
            t(`onboarding.sphere.${sphere}`) || SPHERE_LABELS[sphere];
          const icon = SPHERE_ICONS[sphere];
          const isCollapsed = !!collapsedSpheres[sphere];
          const hasValidationError = !!hasValidationErrorsBySphere[sphere];
          return (
            <View key={sphere}>
              <TouchableOpacity
                style={[
                  styles.sectionHeader,
                  idx === 0 && styles.sectionHeaderFirst,
                ]}
                onPress={() => toggleSphereCollapsed(sphere)}
                activeOpacity={0.75}
              >
                <View style={styles.sectionTitleContainer}>
                  <View style={styles.sectionIcon}>
                    <MaterialIcons
                      name={icon as "favorite" | "work" | "family-restroom" | "people" | "sports-esports"}
                      size={20 * fontScale}
                      color={colors.primary}
                    />
                  </View>
                  <ThemedText size="l" weight="bold">
                    {label}
                  </ThemedText>
                </View>
                <View style={styles.sectionCollapseButton}>
                  <MaterialIcons
                    name={isCollapsed ? "expand-more" : "expand-less"}
                    size={24 * fontScale}
                    color={colors.textMediumEmphasis}
                  />
                  {hasValidationError ? (
                    <View style={styles.sectionValidationDot} />
                  ) : null}
                </View>
              </TouchableOpacity>
              {!isCollapsed ? (
                <AIEntityResultsView
                  sphere={sphere}
                  entities={entities}
                  onSave={async () => {}}
                  onCancel={() => {}}
                  embedded
                  onEntitiesChange={(e) => updateSphereEntities(sphere, e)}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaveDisabled && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveAll}
          disabled={isSaveDisabled}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              isSaveDisabled
                ? colorScheme === "dark"
                  ? ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.1)"]
                  : ["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.1)"]
                : ["#4A90E2", "#357ABD", "#2E6DA4"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 12 * fontScale }]}
          />
          {isSavingAll ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText size="l" weight="bold" style={{ color: "#FFFFFF" }}>
              {t("common.save")}
            </ThemedText>
          )}
        </TouchableOpacity>
        {onStartOver ? (
          <TouchableOpacity
            style={[styles.startOverButton, { borderColor: colors.text + "40" }]}
            onPress={onStartOver}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color={colors.textMediumEmphasis}
              style={{ marginRight: 8 }}
            />
            <ThemedText
              size="sm"
              style={{ color: colors.textMediumEmphasis }}
            >
              {t("onboarding.startOver") ?? "Start from scratch again"}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
