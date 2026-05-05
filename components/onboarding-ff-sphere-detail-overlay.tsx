/**
 * Full-screen sphere step during onboarding **entities phase** only:
 * create at least one object per Sfera. Starter Sfera AI memories run in phase 2
 * (`OnboardingMemoryWizardStep`).
 */
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { type LifeSphere, useJourney } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  guardFfEntityLimit,
  sphereEntityCount,
  sphereEntityList,
  type EntityMini,
} from "@/utils/onboarding-ff-wizard-shared";
import { getSphereIconColor, getSphereSferaColor } from "@/utils/sphere-styles";
import { useSubscription } from "@/utils/SubscriptionProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DETAIL_PRIMARY_GRADIENT = ["#4A90E2", "#357ABD", "#2E6DA4"] as const;

type Props = {
  sphere: LifeSphere;
  visible: boolean;
  onClose: () => void;
};

export function OnboardingFfSphereDetailOverlay({
  sphere,
  visible,
  onClose,
}: Props) {
  const colorScheme = useColorScheme();
  const fontScheme = colorScheme ?? "dark";
  const fontScale = useFontScale();
  const colors = Colors[fontScheme];
  const t = useTranslate();
  const {
    profiles,
    jobs,
    friends,
    familyMembers,
    hobbies,
    addFriend,
    addFamilyMember,
    addHobby,
    addProfile,
    addJob,
    reloadAll,
    deleteFriend,
    deleteFamilyMember,
    deleteHobby,
    deleteProfile,
    deleteJob,
  } = useJourney();
  const { ensureSubscriptionResolved } = useSubscription();

  const [friendName, setFriendName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyRelationship, setFamilyRelationship] = useState("");
  const [hobbyName, setHobbyName] = useState("");
  const [relationshipPartnerName, setRelationshipPartnerName] = useState("");
  const [careerRoleName, setCareerRoleName] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setFriendName("");
    setFamilyName("");
    setFamilyRelationship("");
    setHobbyName("");
    setRelationshipPartnerName("");
    setCareerRoleName("");
    setSubmitBusy(false);
    setRemovingId(null);
  }, [sphere, visible]);

  const entityList = useMemo(
    () =>
      sphereEntityList(
        sphere,
        profiles as EntityMini[],
        jobs as EntityMini[],
        friends as EntityMini[],
        familyMembers as EntityMini[],
        hobbies as EntityMini[],
      ),
    [sphere, profiles, jobs, friends, familyMembers, hobbies],
  );

  const countInSphere = sphereEntityCount(
    sphere,
    profiles,
    jobs,
    friends,
    familyMembers,
    hobbies,
  );

  const sphereEmpty = countInSphere === 0;
  const minMetInSphere = countInSphere >= 1;

  const formCompleteForCreate = useMemo(() => {
    switch (sphere) {
      case "friends":
        return friendName.trim().length > 0;
      case "family":
        return (
          familyName.trim().length > 0 &&
          familyRelationship.trim().length > 0
        );
      case "hobbies":
        return hobbyName.trim().length > 0;
      case "relationships":
        return relationshipPartnerName.trim().length > 0;
      case "career":
        return careerRoleName.trim().length > 0;
      default:
        return false;
    }
  }, [
    sphere,
    friendName,
    familyName,
    familyRelationship,
    hobbyName,
    relationshipPartnerName,
    careerRoleName,
  ]);

  const handleCreate = useCallback(async () => {
    if (sphere === "friends") {
      const name = friendName.trim();
      if (!name) return;
      const ok = await guardFfEntityLimit(
        friends.length,
        ensureSubscriptionResolved,
      );
      if (!ok) return;
      await addFriend({
        name,
        setupProgress: 0,
        isCompleted: false,
      });
      await reloadAll();
      return;
    }
    if (sphere === "family") {
      const n = familyName.trim();
      const rel = familyRelationship.trim();
      if (!n || !rel) {
        Alert.alert(
          t("common.error") ?? "Error",
          t("onboarding.postEntity.mandatoryFill.familyNeedsRelationship") ??
            "Add a name and relationship.",
        );
        return;
      }
      const ok = await guardFfEntityLimit(
        familyMembers.length,
        ensureSubscriptionResolved,
      );
      if (!ok) return;
      await addFamilyMember({
        name: n,
        relationship: rel,
        setupProgress: 0,
        isCompleted: false,
      });
      await reloadAll();
      return;
    }
    if (sphere === "hobbies") {
      const name = hobbyName.trim();
      if (!name) return;
      const ok = await guardFfEntityLimit(
        hobbies.length,
        ensureSubscriptionResolved,
      );
      if (!ok) return;
      await addHobby({
        name,
        setupProgress: 0,
        isCompleted: false,
      });
      await reloadAll();
      return;
    }
    if (sphere === "relationships") {
      const name = relationshipPartnerName.trim();
      if (!name) return;
      const ok = await guardFfEntityLimit(
        profiles.length,
        ensureSubscriptionResolved,
      );
      if (!ok) return;
      await addProfile({
        name,
        sphere: "relationships",
        setupProgress: 0,
        isCompleted: false,
      });
      await reloadAll();
      return;
    }
    if (sphere === "career") {
      const name = careerRoleName.trim();
      if (!name) return;
      const ok = await guardFfEntityLimit(
        jobs.length,
        ensureSubscriptionResolved,
      );
      if (!ok) return;
      await addJob({
        name,
        setupProgress: 0,
        isCompleted: false,
      });
      await reloadAll();
    }
  }, [
    sphere,
    friendName,
    familyName,
    familyRelationship,
    hobbyName,
    relationshipPartnerName,
    careerRoleName,
    friends.length,
    familyMembers.length,
    hobbies.length,
    profiles.length,
    jobs.length,
    addFriend,
    addFamilyMember,
    addHobby,
    addProfile,
    addJob,
    reloadAll,
    ensureSubscriptionResolved,
    t,
  ]);

  const onPressSubmit = useCallback(async () => {
    if (!formCompleteForCreate || submitBusy || !sphereEmpty) return;
    setSubmitBusy(true);
    try {
      await handleCreate();
    } finally {
      setSubmitBusy(false);
    }
  }, [formCompleteForCreate, submitBusy, sphereEmpty, handleCreate]);

  const removeLockRef = useRef(false);

  const performRemoveEntity = useCallback(
    async (id: string) => {
      if (removeLockRef.current) return;
      removeLockRef.current = true;
      setRemovingId(id);
      try {
        switch (sphere) {
          case "friends":
            await deleteFriend(id);
            break;
          case "family":
            await deleteFamilyMember(id);
            break;
          case "hobbies":
            await deleteHobby(id);
            break;
          case "relationships":
            await deleteProfile(id);
            break;
          case "career":
            await deleteJob(id);
            break;
          default:
            break;
        }
        await reloadAll();
      } finally {
        removeLockRef.current = false;
        setRemovingId(null);
      }
    },
    [
      sphere,
      deleteFriend,
      deleteFamilyMember,
      deleteHobby,
      deleteProfile,
      deleteJob,
      reloadAll,
    ],
  );

  const requestRemoveEntity = useCallback(
    (c: EntityMini) => {
      Alert.alert(
        t("common.delete") as string,
        t("common.confirmDelete") as string,
        [
          { text: t("common.cancel") as string, style: "cancel" },
          {
            text: t("common.delete") as string,
            style: "destructive",
            onPress: () => void performRemoveEntity(c.id),
          },
        ],
      );
    },
    [t, performRemoveEntity],
  );

  const ac = getSphereSferaColor(sphere, fontScheme);
  const glyph = getSphereIconColor(sphere, fontScheme, 60);
  const sphereTitle = t(`onboarding.sphere.${sphere}`) || sphere;

  const addNewFormLead = useMemo(() => {
    switch (sphere) {
      case "friends":
        return t("onboarding.postEntity.unifiedWizard.addNewObjectFriends");
      case "family":
        return t("onboarding.postEntity.unifiedWizard.addNewObjectFamily");
      case "hobbies":
        return t("onboarding.postEntity.unifiedWizard.addNewObjectHobbies");
      case "relationships":
        return t(
          "onboarding.postEntity.unifiedWizard.addNewObjectRelationships",
        );
      case "career":
        return t("onboarding.postEntity.unifiedWizard.addNewObjectCareer");
      default:
        return "";
    }
  }, [sphere, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex1: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6 * fontScale,
          paddingHorizontal: 16 * fontScale,
          paddingTop: 52 * fontScale,
          paddingBottom: 14 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor:
            fontScheme === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
        },
        backBtn: {
          width: 44 * fontScale,
          height: 44 * fontScale,
          borderRadius: 22 * fontScale,
          alignItems: "center",
          justifyContent: "center",
        },
        scroll: {
          flexGrow: 1,
          padding: 20 * fontScale,
          paddingBottom: 32 * fontScale,
        },
        /** Min-met state: top-aligned, tight gap under header (no vertical centering). */
        scrollMinMet: {
          flexGrow: 1,
          paddingHorizontal: 20 * fontScale,
          paddingTop: 10 * fontScale,
          paddingBottom: 32 * fontScale,
          justifyContent: "flex-start",
        },
        completedHeadline: {
          alignSelf: "stretch",
          textAlign: "center",
          marginBottom: 12 * fontScale,
        },
        chipWrap: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 14 * fontScale,
          paddingTop: 0,
          paddingHorizontal: 2 * fontScale,
          marginBottom: 22 * fontScale,
          alignSelf: "stretch",
        },
        chipTile: {
          position: "relative",
          alignSelf: "flex-start",
        },
        chipPill: {
          paddingVertical: 10 * fontScale,
          paddingHorizontal: 16 * fontScale,
          paddingRight: 14 * fontScale,
          borderRadius: 999,
          borderWidth: 2,
          maxWidth: "100%",
        },
        chipRemoveBtn: {
          position: "absolute",
          top: -6 * fontScale,
          right: -8 * fontScale,
          width: 24 * fontScale,
          height: 24 * fontScale,
          borderRadius: 12 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#DC2626",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.25,
          shadowRadius: 2,
          elevation: 4,
        },
        footnoteMinMet: {
          paddingHorizontal: 12 * fontScale,
          opacity: fontScheme === "dark" ? 0.82 : 0.86,
          textAlign: "center",
          lineHeight: 22 * fontScale,
        },
        addNewFormLead: {
          marginBottom: 14 * fontScale,
          opacity: fontScheme === "dark" ? 0.9 : 0.92,
          alignSelf: "stretch",
        },
        input: {
          borderWidth: 1,
          borderColor:
            fontScheme === "dark"
              ? "rgba(255,255,255,0.14)"
              : "rgba(0,0,0,0.1)",
          borderRadius: 12 * fontScale,
          padding: 12 * fontScale,
          fontSize: 15 * fontScale,
          marginBottom: 10 * fontScale,
          color: colors.text,
          backgroundColor:
            fontScheme === "dark"
              ? "rgba(0,0,0,0.2)"
              : "rgba(255,255,255,0.96)",
        },
        primaryGradientShell: {
          marginTop: 14 * fontScale,
        },
      }),
    [colors.background, colors.text, fontScheme, fontScale],
  );

  const renderSphereInputs = () => {
    switch (sphere) {
      case "friends":
        return (
          <TextInput
            style={styles.input}
            value={friendName}
            onChangeText={setFriendName}
            placeholder={t("onboarding.postEntity.mandatoryFill.nameFriends")}
            placeholderTextColor={colors.textMediumEmphasis}
          />
        );
      case "family":
        return (
          <>
            <TextInput
              style={styles.input}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder={t(
                "onboarding.postEntity.mandatoryFill.nameFamily",
              )}
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
          </>
        );
      case "hobbies":
        return (
          <TextInput
            style={styles.input}
            value={hobbyName}
            onChangeText={setHobbyName}
            placeholder={t(
              "onboarding.postEntity.unifiedWizard.placeholderHobby",
            )}
            placeholderTextColor={colors.textMediumEmphasis}
          />
        );
      case "relationships":
        return (
          <TextInput
            style={styles.input}
            value={relationshipPartnerName}
            onChangeText={setRelationshipPartnerName}
            placeholder={t(
              "onboarding.postEntity.unifiedWizard.nameRelationships",
            )}
            placeholderTextColor={colors.textMediumEmphasis}
          />
        );
      case "career":
        return (
          <TextInput
            style={styles.input}
            value={careerRoleName}
            onChangeText={setCareerRoleName}
            placeholder={t(
              "onboarding.postEntity.unifiedWizard.nameCareer",
            )}
            placeholderTextColor={colors.textMediumEmphasis}
          />
        );
      default:
        return null;
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.flex1}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={
              (t("onboarding.back") as string | undefined) ?? "Back"
            }
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name="arrow-back"
              size={24 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
          <ThemedText
            size="l"
            weight="bold"
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {sphereTitle}
          </ThemedText>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.flex1}
          contentContainerStyle={
            minMetInSphere ? styles.scrollMinMet : styles.scroll
          }
        >
          {minMetInSphere ? (
            <>
              <ThemedText
                size="xl"
                weight="bold"
                style={styles.completedHeadline}
              >
                {t(
                  "onboarding.postEntity.unifiedWizard.sphereDetailCompleted",
                )}
              </ThemedText>
              <View style={styles.chipWrap}>
                {entityList.map((c) => (
                  <View key={c.id} style={styles.chipTile}>
                    <View
                      style={[
                        styles.chipPill,
                        {
                          borderColor: `${ac}72`,
                          backgroundColor: `${ac}14`,
                        },
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      <ThemedText
                        size="sm"
                        weight="medium"
                        numberOfLines={1}
                        style={{ color: glyph }}
                      >
                        {c.name}
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      disabled={removingId !== null}
                      onPress={() => requestRemoveEntity(c)}
                      style={[
                        styles.chipRemoveBtn,
                        { opacity: removingId !== null ? 0.5 : 1 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t(
                        "onboarding.postEntity.unifiedWizard.removeChipA11y",
                        { name: c.name },
                      )}
                      hitSlop={{
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10,
                      }}
                    >
                      <MaterialIcons
                        name="remove"
                        size={15 * fontScale}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <ThemedText
                size="sm"
                emphasis="medium"
                style={styles.footnoteMinMet}
              >
                {t(
                  "onboarding.postEntity.unifiedWizard.sphereDetailMinMetNoContinueNotice",
                )}
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText size="m" weight="semibold" style={styles.addNewFormLead}>
                {addNewFormLead}
              </ThemedText>
              {renderSphereInputs()}
              <TouchableOpacity
                disabled={!formCompleteForCreate || submitBusy}
                activeOpacity={0.88}
                onPress={() => void onPressSubmit()}
                style={[
                  styles.primaryGradientShell,
                  {
                    opacity:
                      !formCompleteForCreate || submitBusy ? 0.45 : 1,
                  },
                ]}
              >
                <LinearGradient
                  colors={[...DETAIL_PRIMARY_GRADIENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 14 * fontScale,
                    borderRadius: 14 * fontScale,
                    alignItems: "center",
                  }}
                >
                  <ThemedText size="m" weight="bold" style={{ color: "#FFF" }}>
                    {t("onboarding.postEntity.mandatoryFill.add")}
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
