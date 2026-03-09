/**
 * OnboardingWizard - Stepper flow for new users with no data.
 * Step 1: Tell your story (speech-to-text input)
 * Step 2: AI extracts entities from story (loading)
 * Step 3: Edit suggested entities in one long screen
 * On Save: persist entities, open home tab, show walkthrough modal
 */
import { AILoadingView } from "@/components/ai-loading-view";
import { OnboardingEntityResultsView } from "@/components/onboarding-entity-results-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import type { AIOnboardingResponse } from "@/utils/ai-service";
import { processOnboardingPrompt } from "@/utils/ai-service";
import { ensureImageInAppDocuments } from "@/utils/entity-image-storage";
import { useJourney } from "@/utils/JourneyProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  clearCachedOnboardingResponse,
  getCachedOnboardingResponse,
  setCachedOnboardingResponse,
  setOnboardingCompleted,
  setShowWalkthroughAfterOnboarding,
} from "@/utils/onboarding-storage";
import { getSphereSferaColor } from "@/utils/sphere-styles";
import type { LifeSphere } from "@/utils/JourneyProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");

const MAX_INPUT_LENGTH = 500;
const MIN_WORDS = 50;

function formatDateToYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

export type OnboardingWizardProps = {
  /** When true (e.g. re-run from Settings), back arrow exits onboarding instead of going to previous step. */
  canExitEarly?: boolean;
  /** Called when user taps back to exit onboarding. Redirects to Sferas tab. */
  onExit?: () => void;
};

export function OnboardingWizard({
  canExitEarly = false,
  onExit,
}: OnboardingWizardProps = {}) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();
  const { language, setLanguage } = useLanguage();
  const { addProfile, addJob, addFamilyMember, addFriend, addHobby } =
    useJourney();

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCachedOnboardingResponse().then((cached) => {
      if (cancelled || !cached) return;
      if (__DEV__) console.log("[Onboarding] Restoring cached AI response, step 3");
      setAiResponse(cached);
      setStep(3);
    });
    return () => { cancelled = true; };
  }, []);
  const [aiResponse, setAiResponse] = useState<AIOnboardingResponse | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wordCount = useMemo(
    () =>
      inputText
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length,
    [inputText],
  );
  const hasMinWords = wordCount >= MIN_WORDS;
  const exceedsMax = inputText.length > MAX_INPUT_LENGTH;
  const canSubmit = hasMinWords && !exceedsMax && !isProcessing;
  if (__DEV__ && step === 1) {
    console.log("[Onboarding] render step1: canSubmit", canSubmit, "hasMinWords", hasMinWords, "exceedsMax", exceedsMax, "isProcessing", isProcessing, "step", step);
  }

  const setInputTextWithLimit = useCallback((text: string) => {
    if (text.length > MAX_INPUT_LENGTH)
      setInputText(text.slice(0, MAX_INPUT_LENGTH));
    else setInputText(text);
  }, []);

  const speechToText = useSpeechToText({
    language: language ?? "en",
    getText: () => inputText,
    setText: setInputTextWithLimit,
    disabled: isProcessing,
  });

  const handleSubmit = useCallback(async () => {
    if (__DEV__) console.log("[Onboarding] handleSubmit called, canSubmit", canSubmit);
    if (!canSubmit) {
      if (__DEV__) console.log("[Onboarding] handleSubmit early return: !canSubmit");
      return;
    }
    setErrorMessage(null);
    Keyboard.dismiss();
    if (__DEV__) console.log("[Onboarding] handleSubmit: setIsProcessing(true)");
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 100));
    if (__DEV__) console.log("[Onboarding] handleSubmit: after 100ms yield, about to call API");
    const startTime = Date.now();
    try {
      const response = await processOnboardingPrompt(
        inputText.trim(),
        language ?? "en",
      );
      // Ensure loader is visible for at least 600ms (avoids flash if API is fast)
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed));
      }
      setAiResponse(response);
      await setCachedOnboardingResponse(response);
      if (__DEV__) console.log("[Onboarding] handleSubmit: API success, cached, setStep(3)");
      setStep(3);
    } catch (err) {
      if (__DEV__) console.log("[Onboarding] handleSubmit: API error", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : (t("ai.error.send") ?? "Failed to process"),
      );
    } finally {
      if (__DEV__) console.log("[Onboarding] handleSubmit: finally, setIsProcessing(false)");
      setIsProcessing(false);
    }
  }, [canSubmit, inputText, language, t]);

  const persistEntities = useCallback(
    async (entitiesBySphere: AIOnboardingResponse["entitiesBySphere"]) => {
      const spheres = [
        "relationships",
        "career",
        "family",
        "friends",
        "hobbies",
      ] as const;
      for (const sphere of spheres) {
        const entities = entitiesBySphere[sphere];
        if (!Array.isArray(entities) || entities.length === 0) continue;

        for (const entity of entities) {
          const imageUri = entity.imageUri
            ? await ensureImageInAppDocuments(entity.imageUri)
            : undefined;

          if (sphere === "family") {
            await addFamilyMember({
              name: entity.name.trim(),
              relationship: entity.relationship?.trim() ?? "",
              description: entity.description?.trim(),
              imageUri,
              sphere: "family",
              setupProgress: 0,
              isCompleted: false,
            });
          } else if (sphere === "friends") {
            await addFriend({
              name: entity.name.trim(),
              description: entity.description?.trim(),
              imageUri,
              sphere: "friends",
              setupProgress: 0,
              isCompleted: false,
            });
          } else if (sphere === "hobbies") {
            await addHobby({
              name: entity.name.trim(),
              description: entity.description?.trim(),
              imageUri,
              sphere: "hobbies",
              setupProgress: 0,
              isCompleted: false,
            });
          } else if (sphere === "relationships") {
            let start: string | undefined;
            if (entity.startDate) {
              const d = new Date(entity.startDate);
              start = !isNaN(d.getTime())
                ? formatDateToYMD(d)
                : entity.startDate;
            }
            let end: string | null = null;
            if (entity.endDate) {
              const d = new Date(entity.endDate);
              end = !isNaN(d.getTime()) ? formatDateToYMD(d) : entity.endDate;
            }
            await addProfile({
              name: entity.name.trim(),
              description: entity.description?.trim(),
              relationshipStartDate: start,
              relationshipEndDate: end,
              imageUri,
              sphere: "relationships",
              setupProgress: 0,
              isCompleted: false,
            });
          } else if (sphere === "career") {
            let start: string | undefined;
            if (entity.startDate) {
              const d = new Date(entity.startDate);
              start = !isNaN(d.getTime())
                ? formatDateToYMD(d)
                : entity.startDate;
            }
            let end: string | null = null;
            if (entity.endDate) {
              const d = new Date(entity.endDate);
              end = !isNaN(d.getTime()) ? formatDateToYMD(d) : entity.endDate;
            }
            await addJob({
              name: entity.name.trim(),
              description: entity.description?.trim(),
              startDate: start,
              endDate: end,
              imageUri,
              setupProgress: 0,
              isCompleted: false,
            });
          }
        }
      }
    },
    [addProfile, addJob, addFamilyMember, addFriend, addHobby],
  );

  const handleCacheOnboardingResponse = useCallback(
    (entitiesBySphere: AIOnboardingResponse["entitiesBySphere"]) => {
      setCachedOnboardingResponse({ entitiesBySphere });
    },
    []
  );

  const handleStartOver = useCallback(async () => {
    await clearCachedOnboardingResponse();
    setAiResponse(null);
    setInputText("");
    setStep(1);
  }, []);

  const handleSave = useCallback(
    async (entitiesBySphere: AIOnboardingResponse["entitiesBySphere"]) => {
      try {
        await persistEntities(entitiesBySphere);
        await clearCachedOnboardingResponse();
        await setOnboardingCompleted(true);
        await setShowWalkthroughAfterOnboarding(true);
        router.replace("/(tabs)");
      } catch (err) {
        Alert.alert(
          t("common.error") ?? "Error",
          err instanceof Error
            ? err.message
            : (t("ai.entity.saveError") ?? "Failed to save"),
        );
      }
    },
    [persistEntities, t],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor:
            colorScheme === "dark" ? colors.background : "#ffffff",
        },
        header: {
          position: "relative",
          zIndex: 1,
          paddingHorizontal: 20 * fontScale,
          paddingTop: 60 * fontScale,
          paddingBottom: 16 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
        stepper: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16 * fontScale,
        },
        stepDot: {
          width: 10 * fontScale,
          height: 10 * fontScale,
          borderRadius: 5 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.3)"
              : "rgba(0, 0, 0, 0.3)",
        },
        stepDotActive: {
          backgroundColor: colors.primary,
        },
        stepLine: {
          flex: 1,
          height: 2,
          marginHorizontal: 8,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.2)"
              : "rgba(0, 0, 0, 0.2)",
        },
        content: {
          flex: 1,
          position: "relative",
          zIndex: 1,
          padding: 20 * fontScale,
        },
        inputWrapper: {
          position: "relative",
          marginBottom: 16 * fontScale,
        },
        textInput: {
          minHeight: 260 * fontScale,
          maxHeight: 320 * fontScale,
          padding: 16 * fontScale,
          paddingRight: 16 * fontScale + 64 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          color: colors.text,
          fontSize: 16 * fontScale,
          textAlignVertical: "top",
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.15)"
              : "rgba(0, 0, 0, 0.1)",
        },
        micButton: {
          width: 52 * fontScale,
          height: 52 * fontScale,
          borderRadius: 26 * fontScale,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
        },
        micButtonRecording: {
          backgroundColor: "#FF4444",
        },
        submitButton: {
          height: 52 * fontScale,
          borderRadius: 12 * fontScale,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        },
        submitButtonEnabled: {
          shadowColor: "#8EC8FF",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 28,
          elevation: 10,
        },
        submitButtonDisabled: {
          opacity: 0.5,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24 * fontScale,
        },
        errorText: {
          color: "#FF4444",
          marginTop: 12 * fontScale,
        },
      }),
    [colorScheme, colors, fontScale],
  );

  const handleSelectLanguage = useCallback(
    async (lang: "en" | "bg") => {
      await setLanguage(lang);
      setStep(1);
    },
    [setLanguage],
  );

  // Step 0: Choose language (EN / BG)
  if (step === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {(canExitEarly && onExit ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16 * fontScale,
              }}
            >
              <TouchableOpacity
                onPress={() => onExit()}
                style={{
                  width: 44 * fontScale,
                  height: 44 * fontScale,
                  borderRadius: 22 * fontScale,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8 * fontScale,
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)",
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24 * fontScale}
                  color={colorScheme === "dark" ? "#E8D5B7" : "#8B6914"}
                />
              </TouchableOpacity>
              <View style={[styles.stepper, { flex: 1, marginBottom: 0 }]}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>
            </View>
          ) : (
            <View style={styles.stepper}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={styles.stepDot} />
              <View style={styles.stepLine} />
              <View style={styles.stepDot} />
              <View style={styles.stepLine} />
              <View style={styles.stepDot} />
            </View>
          ))}
          <ThemedText
            size="xl"
            weight="bold"
            style={{ color: colorScheme === "dark" ? "#E8D5B7" : "#8B6914" }}
          >
            {t("onboarding.language.title") ?? "Choose your language"}
          </ThemedText>
          <ThemedText
            size="m"
            style={{
              marginTop: 8 * fontScale,
              color:
                colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.65)"
                  : "rgba(0, 0, 0, 0.6)",
            }}
          >
            {t("onboarding.language.subtitle") ??
              "You can change this later in Settings."}
          </ThemedText>
        </View>
        <View style={[styles.content, { justifyContent: "center", gap: 16 * fontScale }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              styles.submitButtonEnabled,
              { marginHorizontal: 0 },
            ]}
            onPress={() => void handleSelectLanguage("en")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#4A90E2", "#357ABD", "#2E6DA4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              borderRadius={12 * fontScale}
            />
            <ThemedText size="l" weight="bold" style={{ color: "#FFFFFF" }}>
              {t("settings.language.english") ?? "English"}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              styles.submitButtonEnabled,
              { marginHorizontal: 0 },
            ]}
            onPress={() => void handleSelectLanguage("bg")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#4A90E2", "#357ABD", "#2E6DA4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              borderRadius={12 * fontScale}
            />
            <ThemedText size="l" weight="bold" style={{ color: "#FFFFFF" }}>
              {t("settings.language.bulgarian") ?? "Bulgarian"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 2: Loading – must be checked BEFORE step 1 so loader shows when isProcessing during step 1
  if (step === 2 || isProcessing) {
    if (__DEV__) console.log("[Onboarding] rendering LOADER: step", step, "isProcessing", isProcessing);
    const loadingMessages = [
      t("onboarding.sferaAnalyzing") ?? "Sfera AI is analyzing...",
      t("onboarding.analyzing") ?? "Analyzing your story...",
      t("ai.loading.thinking") ?? "AI is thinking...",
      t("ai.loading.processing") ?? "Processing memories...",
    ];
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.stepper}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View
              style={[styles.stepLine, { backgroundColor: colors.primary }]}
            />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View
              style={[styles.stepLine, { backgroundColor: colors.primary }]}
            />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot]} />
          </View>
          <ThemedText size="xl" weight="bold">
            {t("onboarding.analyzing") ?? "Analyzing your story..."}
          </ThemedText>
        </View>
        <AILoadingView messages={loadingMessages} />
      </View>
    );
  }

  // Step 1: Tell your story
  if (step === 1) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }} collapsable={false}>
        <Pressable style={styles.header} onPress={Keyboard.dismiss}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16 * fontScale,
            }}
          >
            <TouchableOpacity
              onPress={() =>
                canExitEarly && onExit ? onExit() : setStep(0)
              }
              style={{
                width: 44 * fontScale,
                height: 44 * fontScale,
                borderRadius: 22 * fontScale,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8 * fontScale,
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={24 * fontScale}
                color={colorScheme === "dark" ? "#E8D5B7" : "#8B6914"}
              />
            </TouchableOpacity>
            <View style={[styles.stepper, { flex: 1, marginBottom: 0 }]}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View
              style={[styles.stepLine, { backgroundColor: colors.primary }]}
            />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
            </View>
          </View>
          <ThemedText
            size="xl"
            weight="bold"
            style={{ color: colorScheme === "dark" ? "#E8D5B7" : "#8B6914" }}
          >
            {t("onboarding.title") ?? "Introduce yourself to Sfera"}
          </ThemedText>
          {!keyboardVisible && (
            <>
              <ThemedText
                size="m"
                style={{
                  marginTop: 8 * fontScale,
                  color:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.65)"
                      : "rgba(0, 0, 0, 0.6)",
                }}
              >
                {t("onboarding.subtitle") ??
                  "Let's personalize your life spheres. Tell us a few words about your world..."}
              </ThemedText>

              {/* Sfera badges - dark bg, per-category icon colors (no border to avoid selected-state look) */}
              <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10 * fontScale,
              marginTop: 16 * fontScale,
            }}
          >
            {(
              [
                {
                  sphere: "family" as LifeSphere,
                  icon: "family-restroom" as const,
                  label: t("onboarding.sphere.family") || "Family",
                },
                {
                  sphere: "friends" as LifeSphere,
                  icon: "people" as const,
                  label: t("onboarding.sphere.friends") || "Friends",
                },
                {
                  sphere: "career" as LifeSphere,
                  icon: "work" as const,
                  label: t("onboarding.sphere.career") || "Job",
                },
                {
                  sphere: "hobbies" as LifeSphere,
                  icon: "local-cafe" as const,
                  label: t("onboarding.sphere.hobbies") || "Hobbies",
                },
                {
                  sphere: "relationships" as LifeSphere,
                  icon: "favorite" as const,
                  label: t("onboarding.sphere.relationships") || "Relationships",
                },
              ] as const
            ).map((s) => ({
              ...s,
              iconColor: getSphereSferaColor(
                s.sphere,
                (colorScheme ?? "dark") as "light" | "dark",
              ),
            })).map((s) => (
              <View
                key={s.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14 * fontScale,
                  paddingVertical: 10 * fontScale,
                  borderRadius: 24 * fontScale,
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(42, 37, 32, 0.95)"
                      : "rgba(60, 55, 50, 0.15)",
                }}
              >
                <MaterialIcons
                  name={s.icon}
                  size={18 * fontScale}
                  color={s.iconColor}
                  style={{ marginRight: 8 * fontScale }}
                />
                <ThemedText
                  size="s"
                  style={{
                    color:
                      colorScheme === "dark"
                        ? "rgba(255, 255, 255, 0.9)"
                        : "rgba(0, 0, 0, 0.85)",
                  }}
                >
                  {s.label}
                </ThemedText>
              </View>
            ))}
              </View>
            </>
          )}
        </Pressable>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
          keyboardShouldPersistTaps="never"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                position: "relative" as const,
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                borderRadius: 16 * fontScale,
                padding: 16 * fontScale,
              },
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputTextWithLimit}
              placeholder={
                t("onboarding.placeholder") ??
                "Tell your story in a few sentences. For example:\n\nMy name is... In my family I have... we're close and...\n\nI work as... I've been there for...\n\nMy closest friends are... we met... and still...\n\nI love... on weekends I usually...\n\nI'm in a relationship with... we've been together for..."
              }
              placeholderTextColor={
                colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.45)"
                  : "rgba(0, 0, 0, 0.45)"
              }
              multiline
              scrollEnabled
              maxLength={MAX_INPUT_LENGTH}
              editable={!isProcessing}
            />
            {/* Mic button - top right of input, lowered */}
            <View
              style={{
                position: "absolute",
                right: 28 * fontScale,
                top: 48 * fontScale,
                alignItems: "center",
              }}
            >
              <TouchableOpacity
                style={[
                  styles.micButton,
                  speechToText.isRecording && styles.micButtonRecording,
                ]}
                onPress={
                  speechToText.isRecording
                    ? () => void speechToText.stop()
                    : () => void speechToText.start()
                }
                disabled={isProcessing}
              >
                <MaterialIcons
                  name={speechToText.isRecording ? "stop" : "mic"}
                  size={24 * fontScale}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          <ThemedText size="s" style={{ opacity: 0.6, marginBottom: 16 }}>
            {MIN_WORDS}+ words • {inputText.length}/{MAX_INPUT_LENGTH} chars
          </ThemedText>
        </ScrollView>

        {/* Fixed footer: person + sferas + submit - always visible at bottom */}
        <View
          style={{
            position: "relative",
            zIndex: 1,
            paddingHorizontal: 20 * fontScale,
            paddingTop: keyboardVisible ? 24 * fontScale : 0,
            paddingBottom: 64 * fontScale,
            minHeight: 120 * fontScale,
            justifyContent: "flex-end",
          }}
        >
          {/* Sferas - just above the person */}
          <View
            style={{
              position: "absolute",
              right: -10 * fontScale,
              bottom: 150 * fontScale,
              width: 165 * fontScale,
              height: 130 * fontScale,
              zIndex: 1,
            }}
          >
            <Image
              source={require("@/assets/images/onboarding-sferas.png")}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          </View>
          {/* Person - sitting almost on top of submit button */}
          <View
            style={{
              position: "absolute",
              right: -10 * fontScale,
              bottom: 40,
              width: 190 * fontScale,
              height: 260 * fontScale,
              zIndex: 2,
            }}
          >
            <Image
              source={require("@/assets/images/onboarding-person.png")}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              canSubmit && styles.submitButtonEnabled,
              !canSubmit && styles.submitButtonDisabled,
            ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  canSubmit ? ["#4A90E2", "#357ABD", "#2E6DA4"] : ["#666", "#555"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
                borderRadius={12 * fontScale}
              />
              <ThemedText size="l" weight="bold" style={{ color: "#FFFFFF" }}>
                {t("onboarding.analyze") ?? "Analyze my story"}
              </ThemedText>
            </TouchableOpacity>
        </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  // Step 3: Edit entities
  if (step === 3 && aiResponse) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {canExitEarly && onExit ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16 * fontScale,
              }}
            >
              <TouchableOpacity
                onPress={() => onExit()}
                style={{
                  width: 44 * fontScale,
                  height: 44 * fontScale,
                  borderRadius: 22 * fontScale,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8 * fontScale,
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)",
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24 * fontScale}
                  color={colorScheme === "dark" ? "#E8D5B7" : "#8B6914"}
                />
              </TouchableOpacity>
              <View style={[styles.stepper, { flex: 1, marginBottom: 0 }]}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View
                  style={[styles.stepLine, { backgroundColor: colors.primary }]}
                />
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View
                  style={[styles.stepLine, { backgroundColor: colors.primary }]}
                />
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View
                  style={[styles.stepLine, { backgroundColor: colors.primary }]}
                />
                <View style={[styles.stepDot, styles.stepDotActive]} />
              </View>
            </View>
          ) : (
            <View style={styles.stepper}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View
                style={[styles.stepLine, { backgroundColor: colors.primary }]}
              />
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View
                style={[styles.stepLine, { backgroundColor: colors.primary }]}
              />
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View
                style={[styles.stepLine, { backgroundColor: colors.primary }]}
              />
              <View style={[styles.stepDot, styles.stepDotActive]} />
            </View>
          )}
          <ThemedText size="xl" weight="bold">
            {t("onboarding.review") ?? "Review & edit your entities"}
          </ThemedText>
          <ThemedText
            size="m"
            style={{ marginTop: 8 * fontScale, opacity: 0.8 }}
          >
            {t("onboarding.reviewSubtitle") ??
              "These are initial suggestions—edit what you like and add more anytime later."}
          </ThemedText>
        </View>

        <View style={{ flex: 1 }}>
          <OnboardingEntityResultsView
            entitiesBySphere={aiResponse.entitiesBySphere}
            onSave={handleSave}
            onStartOver={handleStartOver}
            onEntitiesBySphereChange={handleCacheOnboardingResponse}
          />
        </View>
      </View>
    );
  }

  return null;
}
