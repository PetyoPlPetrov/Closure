/**
 * Post-entity onboarding: Sfera AI bundle explainer; pick 3–min(5,N) FFH entities; STT/context per selection.
 */
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { getSphere3DGradientColors } from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export type FfhPickerEntity = {
  id: string;
  name: string;
  sphere: "friends" | "family" | "hobbies";
};

const MAX_BLURB = 500;

type Props = {
  entities: FfhPickerEntity[];
  onSubmit: (selectedIdsOrdered: string[], blurbs: Record<string, string>) => void | Promise<void>;
};

function BlurbEditor({
  entityId,
  blurb,
  onBlurb,
  placeholder,
}: {
  entityId: string;
  blurb: string;
  onBlurb: (id: string, t: string) => void;
  placeholder: string;
}) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? "dark"];
  const { language } = useLanguage();
  const setLim = useCallback(
    (text: string) => onBlurb(entityId, text.length > MAX_BLURB ? text.slice(0, MAX_BLURB) : text),
    [entityId, onBlurb],
  );
  const speechToText = useSpeechToText({
    language: language ?? "en",
    getText: () => blurb,
    setText: setLim,
    disabled: false,
  });

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor:
          colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        paddingTop: 10 * fontScale,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <TextInput
          style={{
            flex: 1,
            minHeight: 72 * fontScale,
            maxHeight: 140 * fontScale,
            padding: 12 * fontScale,
            fontSize: 15 * fontScale,
            borderRadius: 12 * fontScale,
            marginRight: 8 * fontScale,
            borderWidth: 1,
            borderColor:
              colorScheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
            backgroundColor:
              colorScheme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.96)",
            textAlignVertical: "top",
            color: colors.text,
          }}
          value={blurb}
          onChangeText={setLim}
          multiline
          placeholder={placeholder}
          placeholderTextColor={colors.textMediumEmphasis}
          maxLength={MAX_BLURB}
        />
        <TouchableOpacity
          style={{
            width: 46 * fontScale,
            height: 46 * fontScale,
            borderRadius: 23 * fontScale,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor:
              speechToText.isRecording || speechToText.isListening
                ? colors.primary + "DD"
                : colorScheme === "dark"
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.08)",
          }}
          onPress={() =>
            speechToText.isRecording ? void speechToText.stop() : void speechToText.start()
          }
          activeOpacity={0.85}
        >
          <MaterialIcons
            name={speechToText.isRecording ? "stop" : "mic"}
            size={20 * fontScale}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
      <ThemedText size="xs" style={{ opacity: 0.65, alignSelf: "flex-end", marginTop: 4 }}>
        {blurb.length}/{MAX_BLURB}
      </ThemedText>
    </View>
  );
}

export function OnboardingEntityContextSelectionStep({ entities, onSubmit }: Props) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();

  const n = entities.length;
  const minSel = Math.min(3, n);
  const maxSel = Math.min(5, n);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [blurbs, setBlurbs] = useState<Record<string, string>>({});

  const onBlurbChange = useCallback((id: string, text: string) => {
    setBlurbs((prev) => ({ ...prev, [id]: text }));
  }, []);

  const k = selected.size;
  const needsMoreForMin = Math.max(0, minSel - k);
  const canSelectMore = k < maxSel;

  const statusLabel = useMemo(() => {
    if (k >= maxSel) return t("onboarding.postEntity.status.maxSelected");
    if (needsMoreForMin > 0) {
      return t("onboarding.postEntity.status.pickMore").replace(
        "{count}",
        String(needsMoreForMin),
      );
    }
    const optionalLeft = Math.max(0, maxSel - k);
    return t("onboarding.postEntity.status.readyRange").replace("{count}", String(optionalLeft));
  }, [t, needsMoreForMin, k, maxSel]);

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          return next;
        }
        if (next.size >= maxSel) return prev;
        next.add(id);
        return next;
      });
    },
    [maxSel],
  );

  const canonicalOrderIds = useMemo(() => entities.map((e) => e.id), [entities]);

  const orderedSelectedIds = useMemo(() => {
    return canonicalOrderIds.filter((id) => selected.has(id));
  }, [canonicalOrderIds, selected]);

  const sections = useMemo(() => {
    const bySphere = (s: FfhPickerEntity["sphere"]) =>
      entities.filter((e) => e.sphere === s);
    return (["friends", "family", "hobbies"] as const)
      .map((sphere) => ({
        title: sphere,
        data: bySphere(sphere),
      }))
      .filter((s) => s.data.length > 0);
  }, [entities]);

  const handleContinue = async () => {
    if (k < minSel || k > maxSel) return;
    for (const id of orderedSelectedIds) {
      if (!blurbs[id]?.trim()) {
        Alert.alert(t("common.error") ?? "Error", t("onboarding.postEntity.blurbRequired"));
        return;
      }
    }
    await onSubmit(orderedSelectedIds, { ...blurbs });
  };

  const canContinue =
    k >= minSel && k <= maxSel && orderedSelectedIds.every((id) => blurbs[id]?.trim().length ?? 0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingHorizontal: 20 * fontScale,
          paddingTop: 56 * fontScale,
          paddingBottom: 8 * fontScale,
        },
        callout: {
          padding: 14 * fontScale,
          borderRadius: 14 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
          backgroundColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
          marginBottom: 12 * fontScale,
        },
        statusBar: {
          paddingVertical: 10 * fontScale,
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        },
        secHead: {
          paddingHorizontal: 20 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 8 * fontScale,
        },
        rowOuter: {
          paddingHorizontal: 16 * fontScale,
          paddingVertical: 12 * fontScale,
          marginHorizontal: 12 * fontScale,
          marginBottom: 10 * fontScale,
          borderRadius: 14 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
          backgroundColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
        },
        rowInner: { flexDirection: "row", alignItems: "center" },
        circleRing: {
          width: 24 * fontScale,
          height: 24 * fontScale,
          borderRadius: 12 * fontScale,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.35)",
        },
        circleFilled: {
          width: 26 * fontScale,
          height: 26 * fontScale,
          borderRadius: 13 * fontScale,
          justifyContent: "center",
          alignItems: "center",
        },
        footer: {
          padding: 16 * fontScale,
          borderTopWidth: 1,
          borderTopColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        },
        btn: {
          height: 50 * fontScale,
          borderRadius: 12 * fontScale,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        },
      }),
    [colors, colorScheme, fontScale],
  );

  const renderRow = ({ item }: { item: FfhPickerEntity }) => {
    const isSel = selected.has(item.id);
    const allowToggle = canSelectMore || isSel;
    const grad = getSphere3DGradientColors(item.sphere as LifeSphere, 60, colorScheme ?? "dark");
    return (
      <View style={styles.rowOuter}>
        <Pressable onPress={() => allowToggle && toggle(item.id)} style={styles.rowInner}>
          <TouchableOpacity
            onPress={() => allowToggle && toggle(item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSel }}
            style={{
              width: 36 * fontScale,
              height: 36 * fontScale,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.8}
          >
            {isSel ? (
              <View style={[styles.circleFilled, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="check" size={18 * fontScale} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.circleRing} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 * fontScale }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <ThemedText size="m" weight="semibold">
                {item.name}
              </ThemedText>
              <View
                style={{
                  paddingHorizontal: 10 * fontScale,
                  paddingVertical: 4 * fontScale,
                  borderRadius: 12 * fontScale,
                  borderWidth: 1,
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.12)",
                  backgroundColor: grad.base + "33",
                }}
              >
                <ThemedText size="xs" style={{ opacity: 0.9 }}>
                  {t(`onboarding.sphere.${item.sphere}`) || item.sphere}
                </ThemedText>
              </View>
            </View>
          </View>
        </Pressable>
        {isSel ? (
          <BlurbEditor
            entityId={item.id}
            blurb={blurbs[item.id] ?? ""}
            onBlurb={onBlurbChange}
            placeholder={t("onboarding.postEntity.entityContextPlaceholder")}
          />
        ) : null}
      </View>
    );
  };

  if (n === 0) {
    return (
      <View style={[styles.container, { justifyContent: "center", padding: 24 }]}>
        <ThemedText size="m" style={{ textAlign: "center", opacity: 0.75 }}>
          {t("ai.entity.noEntities")}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText size="xl" weight="bold" style={{ marginBottom: 12 * fontScale }}>
          {t("onboarding.postEntity.sferaAi.title")}
        </ThemedText>
        <View style={styles.callout}>
          <ThemedText size="sm" style={{ opacity: 0.92 }}>
            {t("onboarding.postEntity.sferaAi.body")}
          </ThemedText>
        </View>
      </View>
      <View style={styles.statusBar}>
        <ThemedText size="sm" weight="medium" style={{ opacity: 0.9 }}>
          {statusLabel}
        </ThemedText>
        <ThemedText size="xs" style={{ opacity: 0.65, marginTop: 4 }}>
          ({k}/{maxSel}) · {String(minSel)}–{String(maxSel)}
        </ThemedText>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(it) => it.id}
        style={{ flex: 1 }}
        renderSectionHeader={({ section }) => (
          <View style={styles.secHead}>
            <ThemedText size="sm" weight="bold" style={{ opacity: 0.85 }}>
              {t(`onboarding.sphere.${section.title}`) || section.title}
            </ThemedText>
          </View>
        )}
        renderItem={renderRow}
      />
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => void handleContinue()}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              canContinue ? ["#4A90E2", "#357ABD", "#2E6DA4"] : ["#474747", "#3A3A3A"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <ThemedText size="l" weight="bold" style={{ color: "#FFF" }}>
              {t("onboarding.postEntity.continue")}
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
