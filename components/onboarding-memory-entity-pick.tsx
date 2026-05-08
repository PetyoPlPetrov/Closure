/**
 * Pick which entities receive an onboarding starter memory when there are more than
 * `ONBOARDING_MEMORY_WIZARD_MAX` profiles.
 */
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  ONBOARDING_MEMORY_WIZARD_MAX,
  type MemoryWizardPickRow,
} from "@/utils/onboarding-memory-wizard-ids";
import { getSphereIconColor, getSphereSferaColor } from "@/utils/sphere-styles";
import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  rows: MemoryWizardPickRow[];
  onConfirm: (orderedSelectedIds: string[]) => Promise<void>;
};

const ONBOARDING_PRIMARY_GRADIENT = ["#4A90E2", "#357ABD", "#2E6DA4"] as const;
const ONBOARDING_MEMORY_WIZARD_MIN = 2;

export function OnboardingMemoryEntityPick({ rows, onConfirm }: Props) {
  const colorScheme = useColorScheme();
  const fontScheme = colorScheme ?? "dark";
  const fontScale = useFontScale();
  const colors = Colors[fontScheme];
  const t = useTranslate();

  const [picked, setPicked] = useState<Record<string, true>>(() => ({}));
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(
    (id: string) => {
      setPicked((prev) => {
        if (prev[id]) {
          const next = { ...prev };
          delete next[id];
          return next;
        }
        const count = Object.keys(prev).length;
        if (count >= ONBOARDING_MEMORY_WIZARD_MAX) return prev;
        return { ...prev, [id]: true };
      });
    },
    [],
  );

  const selectedCount = useMemo(() => Object.keys(picked).length, [picked]);
  const canContinue = selectedCount >= ONBOARDING_MEMORY_WIZARD_MIN && !busy;

  const orderedIds = useMemo(() => {
    const out: string[] = [];
    for (const row of rows) {
      if (picked[row.id]) out.push(row.id);
    }
    return out;
  }, [rows, picked]);

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
        hint: {
          paddingHorizontal: 20 * fontScale,
          paddingTop: 14 * fontScale,
          paddingBottom: 8 * fontScale,
        },
        scroll: {
          flex: 1,
          paddingHorizontal: 20 * fontScale,
          paddingBottom: 16 * fontScale,
        },
        rowTouchable: {
          marginBottom: 10 * fontScale,
        },
        rowInner: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12 * fontScale,
          paddingHorizontal: 14 * fontScale,
          borderRadius: 14 * fontScale,
          borderWidth: 2,
          gap: 12 * fontScale,
        },
        rowAvatar: {
          width: 40 * fontScale,
          height: 40 * fontScale,
          borderRadius: 20 * fontScale,
          overflow: "hidden",
          backgroundColor:
            fontScheme === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
        },
        rowTexts: {
          flex: 1,
          minWidth: 0,
        },
        checkSlot: {
          width: 28 * fontScale,
          alignItems: "center",
          justifyContent: "center",
        },
        footer: {
          padding: 16 * fontScale,
          borderTopWidth: 1,
          borderTopColor:
            fontScheme === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
        },
        infoHintBanner: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10 * fontScale,
          marginTop: 14 * fontScale,
          paddingVertical: 12 * fontScale,
          paddingHorizontal: 14 * fontScale,
          borderRadius: 14 * fontScale,
          borderWidth:
            fontScheme === "dark" ? StyleSheet.hairlineWidth : 1,
          borderColor:
            fontScheme === "dark"
              ? "rgba(100, 181, 246, 0.38)"
              : "rgba(74, 144, 226, 0.42)",
          backgroundColor:
            fontScheme === "dark"
              ? "rgba(100, 181, 246, 0.1)"
              : "rgba(74, 144, 226, 0.11)",
        },
        infoHintText: {
          flex: 1,
          minWidth: 0,
          lineHeight: 19 * fontScale,
          opacity: fontScheme === "dark" ? 0.92 : 0.88,
        },
      }),
    [colors.background, fontScheme, fontScale],
  );

  const onContinue = useCallback(async () => {
    if (!canContinue) return;
    setBusy(true);
    try {
      await onConfirm(orderedIds);
    } finally {
      setBusy(false);
    }
  }, [canContinue, orderedIds, onConfirm]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText size="xl" weight="bold">
          {t("onboarding.postEntity.memoryPick.title")}
        </ThemedText>
      </View>
      <View style={styles.hint}>
        <ThemedText size="sm" style={{ opacity: 0.82, lineHeight: 22 * fontScale }}>
          {t("onboarding.postEntity.memoryPick.body")}
        </ThemedText>
        <View
          style={styles.infoHintBanner}
          accessibilityRole="text"
          accessibilityLabel={t(
            "onboarding.postEntity.memoryPick.bodyHint",
          )}
        >
          <MaterialIcons
            name="info-outline"
            size={20 * fontScale}
            color={colors.primary}
            style={{ opacity: fontScheme === "dark" ? 0.92 : 0.94, marginTop: 1 }}
            importantForAccessibility="no"
          />
          <ThemedText
            size="xs"
            emphasis="medium"
            style={styles.infoHintText}
          >
            {t("onboarding.postEntity.memoryPick.bodyHint")}
          </ThemedText>
        </View>
        <ThemedText
          size="sm"
          weight="semibold"
          style={{
            marginTop: 12 * fontScale,
            opacity: 0.9,
          }}
        >
          {t("onboarding.postEntity.memoryPick.pickCountHint", {
            current: selectedCount,
            min: ONBOARDING_MEMORY_WIZARD_MIN,
            max: ONBOARDING_MEMORY_WIZARD_MAX,
          })}
        </ThemedText>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {rows.map((row) => {
          const selected = !!picked[row.id];
          const atCap =
            selectedCount >= ONBOARDING_MEMORY_WIZARD_MAX && !selected;
          const ac = getSphereSferaColor(row.sphere, fontScheme);
          const glyph = getSphereIconColor(row.sphere, fontScheme, 60);
          return (
            <TouchableOpacity
              key={row.id}
              activeOpacity={0.82}
              disabled={atCap}
              onPress={() => toggle(row.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${row.name}, ${t(`onboarding.sphere.${row.sphere}`)}`}
              style={[
                styles.rowTouchable,
                { opacity: atCap ? 0.45 : 1 },
              ]}
            >
              <View
                style={[
                  styles.rowInner,
                  {
                    borderColor: selected ? ac : `${ac}55`,
                    backgroundColor:
                      selected
                        ? fontScheme === "dark"
                          ? `${ac}18`
                          : `${ac}10`
                        : "transparent",
                  },
                ]}
              >
                {row.imageUri ? (
                  <Image
                    source={{ uri: row.imageUri }}
                    style={styles.rowAvatar}
                    contentFit="cover"
                    transition={160}
                  />
                ) : (
                  <View
                    style={[styles.rowAvatar, { justifyContent: "center", alignItems: "center" }]}
                  >
                    <MaterialIcons name="person" size={22 * fontScale} color={glyph} />
                  </View>
                )}
                <View style={styles.rowTexts}>
                  <ThemedText size="m" weight="semibold" numberOfLines={1}>
                    {row.name}
                  </ThemedText>
                  <ThemedText size="xs" style={{ marginTop: 2, opacity: 0.72 }} numberOfLines={1}>
                    {t(`onboarding.sphere.${row.sphere}`)}
                  </ThemedText>
                </View>
                <View style={styles.checkSlot}>
                  <MaterialIcons
                    name={selected ? "check-box" : "check-box-outline-blank"}
                    size={26 * fontScale}
                    color={selected ? glyph : colors.textMediumEmphasis}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          disabled={!canContinue}
          activeOpacity={0.88}
          onPress={() => void onContinue()}
          style={{
            opacity: canContinue ? 1 : 0.45,
          }}
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
              {t("onboarding.postEntity.memoryPick.confirm")}
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
