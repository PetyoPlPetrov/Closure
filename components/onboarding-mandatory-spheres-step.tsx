/**
 * After AI entity suggestions are saved: ensure Friends, Family & Hobbies
 * hit minimum counts before the Sfera AI memory picker/wizard.
 */
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { getFreeEntityLimitPerSfera } from "@/utils/badge-rewards";
import { type LifeSphere, useJourney } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForAnySubscriptionAccess } from "@/utils/premium-access";
import {
  getSphereIconColor,
  getSphereSferaColor,
} from "@/utils/sphere-styles";
import { useSubscription } from "@/utils/SubscriptionProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type MandatorySphere = "friends" | "family" | "hobbies";

/** Matches onboarding wizard primary actions (analyze, continue). */
const ONBOARDING_PRIMARY_GRADIENT = [
  "#4A90E2",
  "#357ABD",
  "#2E6DA4",
] as const;
const ONBOARDING_BTN_DISABLED = ["#474747", "#3A3A3A"] as const;

type Props = {
  /** Minimum entities required in each of friends / family / hobbies. */
  minPerSphere: number;
  onContinue: () => void | Promise<void>;
};

async function guardEntityLimit(
  countInSphere: number,
  ensureSubscriptionResolved: () => Promise<{ hasEntityLimitEntitlement: boolean }>,
): Promise<boolean> {
  const freeEntityLimit = await getFreeEntityLimitPerSfera();
  if (countInSphere < freeEntityLimit) return true;
  const { hasEntityLimitEntitlement } = await ensureSubscriptionResolved();
  if (hasEntityLimitEntitlement) return true;
  return showPaywallForAnySubscriptionAccess();
}

export function OnboardingMandatorySpheresStep({
  minPerSphere,
  onContinue,
}: Props) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();
  const {
    friends,
    familyMembers,
    hobbies,
    addFriend,
    addFamilyMember,
    addHobby,
    reloadAll,
  } = useJourney();
  const { ensureSubscriptionResolved } = useSubscription();

  const [friendName, setFriendName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyRelationship, setFamilyRelationship] = useState("");
  const [hobbyName, setHobbyName] = useState("");

  const counts = useMemo(
    () => ({
      friends: friends.length,
      family: familyMembers.length,
      hobbies: hobbies.length,
    }),
    [friends.length, familyMembers.length, hobbies.length],
  );

  const allMet =
    counts.friends >= minPerSphere &&
    counts.family >= minPerSphere &&
    counts.hobbies >= minPerSphere;

  const addFriendRow = useCallback(async () => {
    const trimmed = friendName.trim();
    if (!trimmed) return;
    const ok = await guardEntityLimit(friends.length, ensureSubscriptionResolved);
    if (!ok) return;
    await addFriend({
      name: trimmed,
      setupProgress: 0,
      isCompleted: false,
    });
    setFriendName("");
    await reloadAll();
  }, [
    friendName,
    friends.length,
    addFriend,
    reloadAll,
    ensureSubscriptionResolved,
  ]);

  const addFamilyRow = useCallback(async () => {
    const trimmedName = familyName.trim();
    const trimmedRel = familyRelationship.trim();
    if (!trimmedName || !trimmedRel) {
      Alert.alert(
        t("common.error") ?? "Error",
        t("onboarding.postEntity.mandatoryFill.familyNeedsRelationship") ??
          "Add a name and relationship for family.",
      );
      return;
    }
    const ok = await guardEntityLimit(
      familyMembers.length,
      ensureSubscriptionResolved,
    );
    if (!ok) return;
    await addFamilyMember({
      name: trimmedName,
      relationship: trimmedRel,
      setupProgress: 0,
      isCompleted: false,
    });
    setFamilyName("");
    setFamilyRelationship("");
    await reloadAll();
  }, [
    familyName,
    familyRelationship,
    familyMembers.length,
    addFamilyMember,
    reloadAll,
    ensureSubscriptionResolved,
    t,
  ]);

  const addHobbyRow = useCallback(async () => {
    const trimmed = hobbyName.trim();
    if (!trimmed) return;
    const ok = await guardEntityLimit(hobbies.length, ensureSubscriptionResolved);
    if (!ok) return;
    await addHobby({
      name: trimmed,
      setupProgress: 0,
      isCompleted: false,
    });
    setHobbyName("");
    await reloadAll();
  }, [
    hobbyName,
    hobbies.length,
    addHobby,
    reloadAll,
    ensureSubscriptionResolved,
  ]);

  const handleContinue = useCallback(async () => {
    if (!allMet) {
      Alert.alert(
        t("common.error") ?? "Error",
        t("onboarding.postEntity.minSpheres") ??
          "Add enough in Friends, Family, and Hobbies to continue.",
      );
      return;
    }
    await onContinue();
  }, [allMet, onContinue, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingHorizontal: 20 * fontScale,
          paddingTop: 56 * fontScale,
          paddingBottom: 12 * fontScale,
        },
        callout: {
          padding: 14 * fontScale,
          borderRadius: 14 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.1)",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.03)",
        },
        section: {
          marginHorizontal: 16 * fontScale,
          marginBottom: 14 * fontScale,
          padding: 14 * fontScale,
          borderRadius: 14 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.02)",
        },
        input: {
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.14)"
              : "rgba(0,0,0,0.1)",
          borderRadius: 12 * fontScale,
          padding: 12 * fontScale,
          fontSize: 15 * fontScale,
          marginBottom: 8 * fontScale,
          color: colors.text,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(0,0,0,0.2)"
              : "rgba(255,255,255,0.96)",
        },
        addBtn: {
          height: 44 * fontScale,
          borderRadius: 12 * fontScale,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        },
        submitButtonShadow: {
          shadowColor: "#8EC8FF",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 18,
          elevation: 8,
        },
        footer: {
          padding: 16 * fontScale,
          borderTopWidth: 1,
          borderTopColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
        },
        entityChip: {
          paddingVertical: 6 * fontScale,
          paddingHorizontal: 10 * fontScale,
          borderRadius: 10 * fontScale,
          marginRight: 8 * fontScale,
          marginBottom: 8 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.14)"
              : "rgba(0,0,0,0.1)",
          alignSelf: "flex-start",
        },
      }),
    [colorScheme, colors.background, colors.text, fontScale],
  );

  const renderSection = (
    sphere: MandatorySphere,
    extras: React.ReactNode,
    listRows: React.ReactNode,
    onPressAdd: () => void,
  ) => {
    const n =
      sphere === "friends"
        ? friends.length
        : sphere === "family"
          ? familyMembers.length
          : hobbies.length;
    const met = n >= minPerSphere;
    const mappedSphere: LifeSphere =
      sphere === "friends"
        ? "friends"
        : sphere === "family"
          ? "family"
          : "hobbies";
    const scheme = colorScheme ?? "dark";
    const sferaAccent = getSphereSferaColor(mappedSphere, scheme);
    const iconGlyphColor = getSphereIconColor(mappedSphere, scheme, 60);
    const label =
      t(`onboarding.sphere.${sphere}`) ??
      sphere.charAt(0).toUpperCase() + sphere.slice(1);
    const countLine = (t("onboarding.postEntity.mandatoryFill.countStatus") ??
      "{current} / {min} ({label})")
      .replace("{current}", String(n))
      .replace("{min}", String(minPerSphere))
      .replace("{label}", label);
    const items =
      sphere === "friends"
        ? friends
        : sphere === "family"
          ? familyMembers
          : hobbies;

    return (
      <View
        key={sphere}
        style={[styles.section, { borderLeftWidth: 3, borderLeftColor: sferaAccent }]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10 * fontScale,
            gap: 8,
          }}
        >
          <View
            style={{
              width: 32 * fontScale,
              height: 32 * fontScale,
              borderRadius: 16 * fontScale,
              backgroundColor:
                scheme === "dark"
                  ? `${sferaAccent}33`
                  : `${sferaAccent}44`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons
              name={
                sphere === "friends"
                  ? "people"
                  : sphere === "family"
                    ? "family-restroom"
                    : "sports-esports"
              }
              size={18 * fontScale}
              color={iconGlyphColor}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText size="md" weight="bold">
              {label}
            </ThemedText>
            <ThemedText
              size="xs"
              style={{
                color: met ? colors.textMediumEmphasis : colors.primary,
              }}
            >
              {countLine}
            </ThemedText>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
          {items.map((e) => (
            <View
              key={e.id}
              style={[
                styles.entityChip,
                {
                  borderColor: `${sferaAccent}AA`,
                  backgroundColor: `${sferaAccent}18`,
                },
              ]}
            >
              <ThemedText size="xs">
                {(e as { name: string }).name}
              </ThemedText>
            </View>
          ))}
          {items.length === 0 ? (
            <ThemedText size="xs" style={{ opacity: 0.55 }}>
              {t("onboarding.postEntity.mandatoryFill.empty")}
            </ThemedText>
          ) : null}
        </View>

        {extras}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => void onPressAdd()}
          style={[
            { marginTop: 6 * fontScale },
            styles.submitButtonShadow,
          ]}
        >
          <LinearGradient
            colors={[...ONBOARDING_PRIMARY_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addBtn}
          >
            {listRows}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const friendGradient = (
    <ThemedText size="sm" weight="bold" style={{ color: "#FFF" }}>
      {t("onboarding.postEntity.mandatoryFill.add")}
    </ThemedText>
  );
  const hobbyGradient = friendGradient;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText size="xl" weight="bold" style={{ marginBottom: 10 * fontScale }}>
          {t("onboarding.postEntity.mandatoryFill.title")}
        </ThemedText>
        <View style={styles.callout}>
          <ThemedText size="sm" style={{ opacity: 0.9 }}>
            {(t("onboarding.postEntity.mandatoryFill.body") ??
              `Add at least ${minPerSphere} in each sphere below. You can rename or edit them anytime.`)
              .replace("{min}", String(minPerSphere))}
          </ThemedText>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 120 * fontScale,
        }}
      >
        {renderSection(
          "friends",
          <>
            <TextInput
              style={styles.input}
              value={friendName}
              onChangeText={setFriendName}
              placeholder={t("onboarding.postEntity.mandatoryFill.nameFriends")}
              placeholderTextColor={colors.textMediumEmphasis}
            />
          </>,
          friendGradient,
          addFriendRow,
        )}

        {renderSection(
          "family",
          <>
            <TextInput
              style={styles.input}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder={t("onboarding.postEntity.mandatoryFill.nameFamily")}
              placeholderTextColor={colors.textMediumEmphasis}
            />
            <TextInput
              style={styles.input}
              value={familyRelationship}
              onChangeText={setFamilyRelationship}
              placeholder={t(
                "onboarding.postEntity.mandatoryFill.relationshipFamily",
              )}
              placeholderTextColor={colors.textMediumEmphasis}
            />
          </>,
          friendGradient,
          addFamilyRow,
        )}

        {renderSection(
          "hobbies",
          <>
            <TextInput
              style={styles.input}
              value={hobbyName}
              onChangeText={setHobbyName}
              placeholder={t("onboarding.postEntity.mandatoryFill.nameHobby")}
              placeholderTextColor={colors.textMediumEmphasis}
            />
          </>,
          hobbyGradient,
          addHobbyRow,
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!allMet}
          onPress={() => void handleContinue()}
          style={allMet ? styles.submitButtonShadow : undefined}
        >
          <LinearGradient
            colors={
              allMet
                ? [...ONBOARDING_PRIMARY_GRADIENT]
                : [...ONBOARDING_BTN_DISABLED]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 50 * fontScale, borderRadius: 12 * fontScale, justifyContent: "center", alignItems: "center" }}
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
