import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
    clearPendingAIError,
    clearPendingAIRequest,
    clearPendingAIResponse,
    getPendingAIError,
    getPendingAIRequest,
    getPendingAIResponse,
    isBackgroundTaskRunning,
    savePendingAIResponse,
    startBackgroundAIProcessing,
    stopBackgroundAIProcessing,
    type PendingAIResponse,
} from "@/utils/ai-background-processor";
import {
  consumeAIRequestIfAvailable,
  getRemainingAIRequests,
  REQUESTS_PER_DAY_PREMIUM,
} from "@/utils/ai-rate-limiter";
import { processMemoryPrompt, type AIMemoryResponse } from "@/utils/ai-service";
import {
    logAIMemoryDiscarded,
    logAIMemorySaved,
    logAIModalSubmit,
} from "@/utils/analytics";
import { ensureAppCheckToken, isAppCheckInitialized } from "@/utils/app-check";
import { ensureImageInAppDocuments } from "@/utils/entity-image-storage";
import { useInAppNotification } from "@/utils/InAppNotificationProvider";
import { useJourney, type LifeSphere } from "@/utils/JourneyProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { useMomentNotifications } from "@/utils/MomentNotificationProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { getFreeAIDailyLimit } from "@/utils/badge-rewards";
import { subscribeBadgeRewardsChanged } from "@/utils/badge-rewards-events";
import { cancelEventMemoryReminders } from "@/utils/event-memory-reminders";
import {
  clearEventReminderInAppForEvent,
  markEventGoldenMemoryUsed,
} from "@/utils/sfera-events";
import { showPaywallForUpgradeAccess } from "@/utils/premium-access";
import { getBadgeForStreak, updateStreakOnMemoryCreation } from "@/utils/streak-manager";
import { useSubscription } from "@/utils/SubscriptionProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    AppState,
    AppStateStatus,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Modal as RNModal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

type ModalView = "input" | "loading" | "results" | "error";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}


interface AIModalProps {
  visible: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onSend: (message: string) => Promise<void>;
  pendingResponse?: PendingAIResponse | null;
  /** Golden event AI access: one-time Create memory per event (bypasses paywall/rate limit; official name). */
  goldenEventId?: string | null;
}

interface AIMemoryItem {
  id: string;
  type: "hardTruth" | "goodFact" | "lesson";
  text: string;
  notificationMessage?: string;
}

export function AIModal({
  visible,
  onClose,
  onMinimize,
  onSend,
  pendingResponse,
  goldenEventId = null,
}: AIModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { momentColors } = useMomentColors();
  const fontScale = useFontScale();
  const t = useTranslate();
  const { language } = useLanguage();
  const { showNotification, hideNotification } = useInAppNotification();
  const { hasAIEntitlement } = useSubscription();
  const {
    profiles,
    jobs,
    familyMembers,
    friends,
    hobbies,
    addIdealizedMemory,
    addFriend,
    addFamilyMember,
    addJob,
    addHobby,
    addProfile,
  } = useJourney();
  const { addSummariesBatch } = useMomentNotifications();

  const [inputText, setInputText] = useState("");
  const [inputHeight, setInputHeight] = useState(() => 56 * fontScale);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<ModalView>("input");
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIMemoryResponse | null>(null);
  const [memoryItems, setMemoryItems] = useState<AIMemoryItem[]>([]);
  const [selectedSphere, setSelectedSphere] = useState<LifeSphere | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(
    null,
  );
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSpherePicker, setShowSpherePicker] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [showAddEntityForm, setShowAddEntityForm] = useState(false);
  const headerTitleFontSize = (windowWidth <= 430 ? 18 : 20) * fontScale;

  // Form fields for adding new entity
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityDescription, setNewEntityDescription] = useState("");
  const [newEntityRelationship, setNewEntityRelationship] = useState(""); // For family members
  const [newEntityStartDate, setNewEntityStartDate] = useState<Date | null>(
    null,
  ); // For jobs/relationships
  const [newEntityEndDate, setNewEntityEndDate] = useState<Date | null>(null); // For jobs/relationships
  const [newEntityIsCurrent, setNewEntityIsCurrent] = useState(false); // For jobs/relationships
  const [newEntityImage, setNewEntityImage] = useState<string | null>(null);
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDatePickerTemp, setStartDatePickerTemp] = useState<Date>(
    new Date(),
  );
  const [endDatePickerTemp, setEndDatePickerTemp] = useState<Date>(new Date());
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [backgroundRequestId, setBackgroundRequestId] = useState<string | null>(
    null,
  );
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [remainingAIRequests, setRemainingAIRequests] = useState<number | null>(
    null,
  );
  const [freeAIDailyLimit, setFreeAIDailyLimit] = useState(3);

  const handleAttemptClose = () => {
    if (inputText.trim().length > 0 || aiResponse) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  // Wrapper for setText that enforces max length limit
  const setInputTextWithLimit = (text: string) => {
    if (text.length > MAX_INPUT_LENGTH) {
      setInputText(text.slice(0, MAX_INPUT_LENGTH));
    } else {
      setInputText(text);
    }
  };

  const speechToText = useSpeechToText({
    language,
    getText: () => inputText,
    setText: setInputTextWithLimit,
    disabled: isProcessing,
  });
  const { isRecording, isListening } = speechToText;

  // Monitor app state to detect when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Monitor keyboard visibility to adjust mic button size
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
      },
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
      },
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Monitor keyboard visibility
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
      },
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
      },
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Character and word limits
  const MAX_INPUT_LENGTH = 500; // Maximum characters allowed (~6 sentences)
  const MIN_WORDS = 10; // Minimum words required

  // Count words in input text
  const wordCount = useMemo(() => {
    return inputText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }, [inputText]);

  const characterCount = useMemo(() => {
    return inputText.length;
  }, [inputText]);

  const exceedsMaxLength = characterCount > MAX_INPUT_LENGTH;
  const hasMinWords = wordCount >= MIN_WORDS;

  // Sfera AI subscribers with 0 remaining: disable submit (daily cap). Free users at 0: keep submit enabled; tap opens upgrade paywall via handleSend → consumeAIRequestIfAvailable.
  const hasRemainingRequests =
    goldenEventId ||
    remainingAIRequests === null ||
    (remainingAIRequests !== null && remainingAIRequests > 0) ||
    (!hasAIEntitlement && remainingAIRequests === 0);
  const canSubmit =
    hasMinWords &&
    !exceedsMaxLength &&
    !isProcessing &&
    !isRecording &&
    hasRemainingRequests;

  // Loading messages that rotate
  const loadingMessages = [
    t("ai.loading.thinking") || "AI is thinking...",
    t("ai.loading.analyzing") || "Analyzing your thoughts...",
    t("ai.loading.processing") || "Processing memories...",
    t("ai.loading.generating") || "Generating insights...",
  ];

  // Animation values
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.8);
  const pulseScale = useSharedValue(1);
  const micPulseScale = useSharedValue(1);
  const waveOpacity = useSharedValue(0);

  // Enhanced loading animations
  const sparkleScale = useSharedValue(1);
  const sparkleOpacity = useSharedValue(1);
  const loadingPulseScale = useSharedValue(1);
  const dotsOpacity = useSharedValue([0.3, 0.3, 0.3]);

  const inputRef = useRef<TextInput>(null);

  // Check for pending AI response when modal opens or when pendingResponse prop changes
  useEffect(() => {
    if (visible) {
      // Reset minimizing flag when modal opens
      isMinimizingRef.current = false;

      // Always check for pending response when modal opens
      // This handles cases where modal was minimized and response arrived
      const checkAndRestore = async () => {
        // Ensure App Check token is ready before user can submit
        // iOS-friendly approach: Use getToken(true) to request a fresh token
        // This ensures the token is available when the user presses submit
        if (isAppCheckInitialized()) {
          await ensureAppCheckToken();
        }

        // First check prop (from parent component)
        if (pendingResponse?.response) {
          // Move to loading view first
          setCurrentView("loading");
          setIsProcessing(true);
          // Process pending response from prop
          // Don't clear AsyncStorage here - keep it until user saves or discards
          try {
            await processAIResponse(pendingResponse.response);
          } catch (error) {
            setIsProcessing(false);
            const errorMsg =
              error instanceof Error
                ? error.message
                : t("ai.error.send") || "Failed to process memory";
            setErrorMessage(errorMsg);
            setCurrentView("error");
            if (backgroundRequestId) {
              await stopBackgroundAIProcessing();
              setBackgroundRequestId(null);
            }
          }
        } else {
          // Check storage for pending response (in case prop wasn't updated yet)
          await checkPendingAIResponse();
        }
      };

      checkAndRestore();
    }
  }, [visible, pendingResponse]);

  // Fetch remaining free AI memory creations when modal is open on input view (not golden event).
  // Also subscribe to badge changes so the displayed limit/remaining updates the moment a memory
  // pushes the user across the Sferas threshold while the modal is still open.
  useEffect(() => {
    if (visible && currentView === "input" && !goldenEventId) {
      const refresh = () => {
        getRemainingAIRequests(hasAIEntitlement).then(setRemainingAIRequests);
        if (!hasAIEntitlement) {
          getFreeAIDailyLimit().then(setFreeAIDailyLimit);
        }
      };
      refresh();
      const unsubscribe = subscribeBadgeRewardsChanged(refresh);
      return unsubscribe;
    } else if (!visible) {
      setRemainingAIRequests(null);
    }
  }, [visible, currentView, hasAIEntitlement, goldenEventId]);

  // Watch for pendingResponse prop changes while modal is open (for when background task completes)
  useEffect(() => {
    if (visible && isProcessing && !aiResponse && pendingResponse?.response) {
      // Response arrived via prop update (from parent component detecting it)
      setCurrentView("loading");
      setIsProcessing(true);
      (async () => {
        try {
          await processAIResponse(pendingResponse.response);
        } catch (error) {
          setIsProcessing(false);
          const errorMsg =
            error instanceof Error
              ? error.message
              : t("ai.error.send") || "Failed to process memory";
          setErrorMessage(errorMsg);
          setCurrentView("error");
          if (backgroundRequestId) {
            await stopBackgroundAIProcessing();
            setBackgroundRequestId(null);
          }
        }
      })();
    }
  }, [pendingResponse, visible, isProcessing, aiResponse]);

  // Check if there's a pending request (processing in background)
  const checkPendingRequest = async () => {
    try {
      const pendingRequest = await getPendingAIRequest();
      const isRunning = await isBackgroundTaskRunning();
      if (pendingRequest || isRunning) {
        // There's a request being processed, show loading state
        setCurrentView("loading");
        setIsProcessing(true);
        // Set background request ID if we have one
        if (pendingRequest?.requestId) {
          setBackgroundRequestId(pendingRequest.requestId);
        }
      }
    } catch (error) {
      // Failed to check pending request
    }
  };

  // Check for pending AI response or error
  const checkPendingAIResponse = async () => {
    try {
      // Ensure App Check is initialized before checking for errors/responses
      // This prevents showing stale errors from before App Check was ready
      if (!isAppCheckInitialized()) {
        return;
      }

      // First check for errors
      const pendingError = await getPendingAIError();
      if (pendingError) {
        // Only show error if it's not an App Check token error (might be stale)
        // If App Check is now initialized, clear old App Check errors
        if (pendingError.error.includes("App Check token is invalid")) {
          await clearPendingAIError();
          // Don't show the error, just clear it and let user try again
          return;
        }

        // Clear the error from storage
        await clearPendingAIError();

        // Show error to user and allow retry
        setIsProcessing(false);
        setErrorMessage(pendingError.error);
        setCurrentView("error");
        setBackgroundRequestId(null);
        return;
      }

      // Check for successful response
      const pendingResponse = await getPendingAIResponse();
      if (pendingResponse) {
        // Move to loading view first
        setCurrentView("loading");
        setIsProcessing(true);
        // If we have a pending response, process it
        // Don't clear AsyncStorage here - keep it until user saves or discards
        // (Rate limit already counted on submit when user pressed the button.)

        try {
          await processAIResponse(pendingResponse.response);
          setBackgroundRequestId(null);
        } catch (error) {
          setIsProcessing(false);
          const errorMsg =
            error instanceof Error
              ? error.message
              : t("ai.error.send") || "Failed to process memory";
          setErrorMessage(errorMsg);
          setCurrentView("error");
          setBackgroundRequestId(null);
          if (backgroundRequestId) {
            await stopBackgroundAIProcessing();
          }
        }
      } else {
        // Check if there's a pending request (still processing)
        await checkPendingRequest();
      }
    } catch (error) {
      // Failed to check pending AI response - show error
      setIsProcessing(false);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to check AI response";
      setErrorMessage(errorMsg);
      setCurrentView("error");
    }
  };

  // Process AI response and update state
  const processAIResponse = async (response: AIMemoryResponse) => {
    try {
      // Map the moments[] array into the AIMemoryItem[] format the UI expects
      const momentTypeMap: Record<string, AIMemoryItem["type"]> = {
        sunnyMoments: "goodFact",
        hardTruths: "hardTruth",
        lessonsLearned: "lesson",
      };

      const items: AIMemoryItem[] = (response.moments || []).map(
        (moment, index) => ({
          id: `${momentTypeMap[moment.type] || "goodFact"}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
          type: momentTypeMap[moment.type] || "goodFact",
          text: moment.text,
          notificationMessage:
            (moment as { notificationMessage?: string }).notificationMessage,
        }),
      );

      if (__DEV__) {
        for (const m of response.moments || []) {
          const nm = (m as { notificationMessage?: string }).notificationMessage;
          if ((m.type === "sunnyMoments" || m.type === "lessonsLearned") && !nm?.trim()) {
            console.warn("[AI Modal] Missing notificationMessage for", m.type, m.text?.slice(0, 50));
          }
        }
      }

      setAiResponse(response);
      setMemoryItems(items);

      // Map AI-suggested sphere and entity into the selection state
      const validSpheres: LifeSphere[] = [
        "relationships",
        "career",
        "family",
        "friends",
        "hobbies",
      ];

      if (response.sphere && validSpheres.includes(response.sphere)) {
        setSelectedSphere(response.sphere);

        // Try to match entityName to an existing entity in the sphere
        if (response.entityName) {
          const entityLists: Record<LifeSphere, { id: string; name: string }[]> = {
            relationships: profiles.map((p) => ({ id: p.id, name: p.name })),
            career: jobs.map((j) => ({ id: j.id, name: j.name })),
            family: familyMembers.map((f) => ({ id: f.id, name: f.name })),
            friends: friends.map((f) => ({ id: f.id, name: f.name })),
            hobbies: hobbies.map((h) => ({ id: h.id, name: h.name })),
          };

          const list = entityLists[response.sphere] || [];
          const match = list.find(
            (e) =>
              e.name.toLowerCase() === response.entityName!.toLowerCase(),
          );
          if (match) {
            setSelectedEntityId(match.id);
            setSelectedEntityName(match.name);
          }
        }
      }

      setIsProcessing(false);
      // Stay on "loading" view — results render within it when aiResponse is set
    } catch (error) {
      setIsProcessing(false);
      const errorMsg =
        error instanceof Error
          ? error.message
          : t("ai.error.send") || "Failed to process memory";
      setErrorMessage(errorMsg);
      setCurrentView("error");
      // Stop background processing if it was started
      if (backgroundRequestId) {
        await stopBackgroundAIProcessing();
        setBackgroundRequestId(null);
      }
    }
  };

  // Track if we're minimizing vs closing
  const isMinimizingRef = useRef(false);

  // Reset all state when modal closes (but not when minimized)
  useEffect(() => {
    if (!visible) {
      // Check if we're minimizing first (synchronous check)
      if (isMinimizingRef.current) {
        // Minimizing - preserve state, just reset the minimizing flag
        isMinimizingRef.current = false;
        return;
      }

      // Check if we should preserve state (has pending request/response) vs actually closing
      const shouldPreserveState = async () => {
        const pendingRequest = await getPendingAIRequest();
        const pendingResponse = await getPendingAIResponse();
        const isRunning = await isBackgroundTaskRunning();
        return !!(pendingRequest || pendingResponse || isRunning);
      };

      shouldPreserveState().then((preserve) => {
        if (!preserve) {
          // Actually closing (not minimizing) - reset all state
          // Close confirmation modal first if it's open
          setShowCloseConfirm(false);

          // Reset all state to initial values
          setInputText("");
          setIsProcessing(false);
          setCurrentView("input");
          setAiResponse(null);
          setMemoryItems([]);
          setSelectedSphere(null);
          setSelectedEntityId(null);
          setSelectedEntityName(null);
          setShowSpherePicker(false);
          setShowEntityPicker(false);
          setLoadingMessageIndex(0);

          // Stop any ongoing speech recognition
          void speechToText.stop();
        }
      });
    }
  }, [visible, backgroundRequestId]);

  // Modal entrance animation + close cleanup
  // IMPORTANT: only run close cleanup on actual visibility transitions.
  const wasVisibleRef = useRef<boolean>(false);
  useEffect(() => {
    if (visible) {
      wasVisibleRef.current = true;
      modalOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      modalScale.value = withSpring(1, { damping: 15, stiffness: 150 });

      // Subtle pulse animation for mic button (only when not recording)
      if (!isRecording) {
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.05, {
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, {
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
          -1,
          true,
        );
      }

    } else {
      // If we were never visible, don't run close cleanup (prevents hidden modal from aborting STT)
      if (!wasVisibleRef.current) return;
      wasVisibleRef.current = false;

      modalOpacity.value = withTiming(0, { duration: 200 });
      modalScale.value = withTiming(0.8, { duration: 200 });
      setInputText("");
      void speechToText.stop();
      setCurrentView("input");
      setAiResponse(null);
      setMemoryItems([]);
      setErrorMessage(null);
    }
  }, [visible]);

  // Mic pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      micPulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      waveOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      micPulseScale.value = withTiming(1, { duration: 200 });
      waveOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording]);

  // Rotate loading messages when in loading view
  useEffect(() => {
    if (currentView === "loading") {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [currentView, loadingMessages.length]);

  // Enhanced loading animations
  useEffect(() => {
    if (currentView === "loading" && !aiResponse) {
      // Sparkle pulse animation
      sparkleScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );

      // Sparkle opacity fade
      sparkleOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1000 }),
          withTiming(1, { duration: 1000 }),
        ),
        -1,
        false,
      );

      // Pulse animation for background glow
      loadingPulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );

      // Animated dots
      dotsOpacity.value = withRepeat(
        withSequence(
          withTiming([1, 0.3, 0.3], { duration: 400 }),
          withTiming([0.3, 1, 0.3], { duration: 400 }),
          withTiming([0.3, 0.3, 1], { duration: 400 }),
          withTiming([0.3, 0.3, 0.3], { duration: 400 }),
        ),
        -1,
        false,
      );
    } else {
      // Reset animations when not loading
      sparkleScale.value = 1;
      sparkleOpacity.value = 1;
      loadingPulseScale.value = 1;
      dotsOpacity.value = [0.3, 0.3, 0.3];
    }
  }, [
    currentView,
    aiResponse,
    sparkleScale,
    sparkleOpacity,
    loadingPulseScale,
    dotsOpacity,
  ]);

  const handleStartRecording = async () => {
    await speechToText.start();
  };

  const handleStopRecording = async () => {
    await speechToText.stop();
  };

  const handleSend = async () => {
    if (!inputText.trim() || !canSubmit) {
      return;
    }

    // Ensure App Check is initialized before making AI requests (skip in dev)
    if (!__DEV__ && !isAppCheckInitialized()) {
      Alert.alert(
        t("common.error") || "Error",
        "App Check is not initialized. Please wait a moment and try again.",
      );
      return;
    }

    // Golden event AI access: bypass paywall and rate limit when modal opened from passed Sfera event or notification.
    const isGoldenEventAccess = Boolean(goldenEventId);

    if (!isGoldenEventAccess) {
      // Enforce free-tier daily limit (3 by default, 5 with Sferas badge) and 30/day for Sfera AI.
      // Memory + entity creation share one pool. Atomic consume avoids race conditions.
      const consumed = await consumeAIRequestIfAvailable(hasAIEntitlement);
      if (!consumed) {
        if (!hasAIEntitlement) {
          await showPaywallForUpgradeAccess();
        } else {
          Alert.alert(
            t("ai.rateLimit.title") || "AI Request Limit Reached",
            t("ai.rateLimit.premiumMessage") ||
              "You've reached the daily limit. Try again tomorrow.",
            [{ text: t("common.ok") || "OK", style: "default" }],
          );
        }
        return;
      }
    }

    // Log analytics event for AI modal submit
    await logAIModalSubmit();

    // Move to loading view
    setCurrentView("loading");
    setIsProcessing(true);

    try {
      // Prepare sferas with enriched entities (including relationship/role metadata) for AI context
      const sferas = {
        relationships:
          profiles.length > 0
            ? profiles.map((p) => ({
                name: p.name,
                relationshipType: p.description, // Could be "ex-partner", "ex-boyfriend", etc.
                isOngoing:
                  p.relationshipEndDate === null ||
                  p.relationshipEndDate === undefined,
                startDate: p.relationshipStartDate,
                endDate: p.relationshipEndDate,
              }))
            : undefined,
        career:
          jobs.length > 0
            ? jobs.map((j) => ({
                name: j.name,
                isCurrent: j.endDate === null || j.endDate === undefined,
                startDate: j.startDate,
                endDate: j.endDate,
              }))
            : undefined,
        family:
          familyMembers.length > 0
            ? familyMembers.map((f) => ({
                name: f.name,
                relationship: f.relationship, // e.g., "Father", "Mother", "Brother", "Sister"
              }))
            : undefined,
        friends: friends.length > 0 ? friends.map((f) => f.name) : undefined,
        hobbies: hobbies.length > 0 ? hobbies.map((h) => h.name) : undefined,
      };

      // IMPORTANT: Only make ONE AI request to avoid rate limiting
      // If app is active, use foreground processing (faster). Otherwise use background task.
      if (appState === "active") {
        try {
          const response = await processMemoryPrompt(
            inputText.trim(),
            { sferas },
            language,
          );

          await processAIResponse(response);
        } catch (error) {
          setIsProcessing(false);
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          setErrorMessage(errorMsg);
          setCurrentView("error");
          // Stop background processing if it was started
          if (backgroundRequestId) {
            await stopBackgroundAIProcessing();
            setBackgroundRequestId(null);
          }
        }
      } else {
        // App is already in background, use background task
        const requestId = await startBackgroundAIProcessing(
          inputText.trim(),
          { sferas },
          undefined,
          language,
        );
        setBackgroundRequestId(requestId);
      }
    } catch (error) {
      setIsProcessing(false);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to process AI request";
      setErrorMessage(errorMsg);
      setCurrentView("error");
      // Stop background processing if it was started
      if (backgroundRequestId) {
        await stopBackgroundAIProcessing();
        setBackgroundRequestId(null);
      }
    }
  };

  const handleEditItem = (id: string, newText: string) => {
    setMemoryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: newText } : item)),
    );
  };

  const handleRemoveItem = (id: string) => {
    setMemoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRetry = async () => {
    setErrorMessage(null);
    setCurrentView("input");
    // Retry the request
    await handleSend();
  };

  const handleBackToInput = () => {
    setCurrentView("input");
    setInputText("");
    setAiResponse(null);
    setMemoryItems([]);
    setSelectedSphere(null);
    setSelectedEntityId(null);
    setSelectedEntityName(null);
  };

  // Get available entities for the selected sphere
  const availableEntitiesForSphere = useMemo(() => {
    if (!selectedSphere) return [];

    switch (selectedSphere) {
      case "relationships":
        return profiles.map((p) => ({ id: p.id, name: p.name }));
      case "career":
        return jobs.map((j) => ({ id: j.id, name: j.name }));
      case "family":
        return familyMembers.map((f) => ({ id: f.id, name: f.name }));
      case "friends":
        return friends.map((f) => ({ id: f.id, name: f.name }));
      case "hobbies":
        return hobbies.map((h) => ({ id: h.id, name: h.name }));
      default:
        return [];
    }
  }, [selectedSphere, profiles, jobs, familyMembers, friends, hobbies]);

  // Automatically show validation error when results are displayed with invalid entity
  // All spheres (relationships, career, family, friends, hobbies) require an entity
  useEffect(() => {
    const spheresRequiringEntity: LifeSphere[] = [
      "relationships",
      "career",
      "family",
      "friends",
      "hobbies",
    ];
    if (
      aiResponse &&
      selectedSphere &&
      spheresRequiringEntity.includes(selectedSphere) &&
      !selectedEntityId
    ) {
      // Entity is required but not selected - show validation error immediately
      setShowValidationErrors(true);
    }
  }, [aiResponse, selectedSphere, selectedEntityId]);

  // Handle sphere change - reset entity if sphere changes
  const handleSphereChange = (sphere: LifeSphere) => {
    setSelectedSphere(sphere);
    setSelectedEntityId(null);
    setSelectedEntityName(null);
    setShowSpherePicker(false);
  };

  // Handle entity change
  const handleEntityChange = (entityId: string, entityName: string) => {
    setSelectedEntityId(entityId);
    setSelectedEntityName(entityName);
    setShowEntityPicker(false);
    // Clear validation error when entity is selected
    if (showValidationErrors) {
      setShowValidationErrors(false);
    }
  };

  // Validate entity form
  const isEntityFormValid = () => {
    if (!newEntityName.trim()) return false;
    if (selectedSphere === "family" && !newEntityRelationship.trim())
      return false;
    return true;
  };

  // Handle saving new entity
  const handleSaveNewEntity = async () => {
    if (!isEntityFormValid()) {
      setShowValidationErrors(true);
      return;
    }

    setIsSavingEntity(true);
    try {
      const resolvedEntityImage = newEntityImage
        ? await ensureImageInAppDocuments(newEntityImage)
        : undefined;

      let newEntityId: string;

      if (selectedSphere === "family") {
        newEntityId = await addFamilyMember({
          name: newEntityName.trim(),
          description: newEntityDescription.trim() || undefined,
          relationship: newEntityRelationship.trim(),
          imageUri: resolvedEntityImage,
          setupProgress: 0,
          isCompleted: false,
        });
      } else if (selectedSphere === "friends") {
        newEntityId = await addFriend({
          name: newEntityName.trim(),
          description: newEntityDescription.trim() || undefined,
          imageUri: resolvedEntityImage,
          setupProgress: 0,
          isCompleted: false,
        });
      } else if (selectedSphere === "career") {
        newEntityId = await addJob({
          name: newEntityName.trim(),
          description: newEntityDescription.trim() || undefined,
          startDate: newEntityStartDate
            ? newEntityStartDate.toISOString().split("T")[0]
            : undefined,
          endDate: newEntityIsCurrent
            ? null
            : newEntityEndDate
              ? newEntityEndDate.toISOString().split("T")[0]
              : undefined,
          imageUri: resolvedEntityImage,
          setupProgress: 0,
          isCompleted: false,
        });
      } else if (selectedSphere === "hobbies") {
        newEntityId = await addHobby({
          name: newEntityName.trim(),
          description: newEntityDescription.trim() || undefined,
          imageUri: resolvedEntityImage,
          setupProgress: 0,
          isCompleted: false,
        });
      } else if (selectedSphere === "relationships") {
        newEntityId = await addProfile({
          name: newEntityName.trim(),
          description: newEntityDescription.trim() || undefined,
          relationshipStartDate: newEntityStartDate
            ? newEntityStartDate.toISOString().split("T")[0]
            : undefined,
          relationshipEndDate: newEntityIsCurrent
            ? null
            : newEntityEndDate
              ? newEntityEndDate.toISOString().split("T")[0]
              : undefined,
          imageUri: resolvedEntityImage,
          setupProgress: 0,
          isCompleted: false,
        });
      } else {
        throw new Error("Invalid sphere");
      }

      // Update selected entity
      setSelectedEntityId(newEntityId);
      setSelectedEntityName(newEntityName.trim());
      setShowValidationErrors(false);
      setShowAddEntityForm(false);

      // Reset form fields
      setNewEntityName("");
      setNewEntityDescription("");
      setNewEntityRelationship("");
      setNewEntityStartDate(null);
      setNewEntityEndDate(null);
      setNewEntityIsCurrent(false);
      setNewEntityImage(null);
    } catch (error) {
      Alert.alert(
        t("common.error") || "Error",
        (error as Error).message ||
          t("ai.entity.saveError") ||
          "Failed to save entity",
      );
    } finally {
      setIsSavingEntity(false);
    }
  };

  const handleSave = async () => {
    if (!aiResponse || memoryItems.length === 0 || !selectedSphere) {
      return;
    }

    // Entity is required for all spheres that support entities
    // All spheres (relationships, career, family, friends, hobbies) require an entity
    const spheresRequiringEntity: LifeSphere[] = [
      "relationships",
      "career",
      "family",
      "friends",
      "hobbies",
    ];
    const needsEntity =
      selectedSphere && spheresRequiringEntity.includes(selectedSphere);

    // If form is expanded, check if it's valid
    if (showAddEntityForm && !isEntityFormValid()) {
      setShowValidationErrors(true);
      Alert.alert(
        t("common.error") || "Error",
        t("ai.results.selectEntity") || "Please fill all required fields",
      );
      return;
    }

    // Entity is always required for these spheres
    if (needsEntity && !selectedEntityId) {
      setShowValidationErrors(true);
      Alert.alert(
        t("common.error") || "Error",
        t("ai.results.selectEntity") || "Please select an entity",
      );
      return;
    }

    // Clear validation errors if validation passes
    setShowValidationErrors(false);

    setIsProcessing(true);
    try {
      // Use selected sphere and entity
      const finalSphere = selectedSphere;
      const finalEntityId = selectedEntityId;

      if (!finalEntityId) {
        throw new Error("No entity selected");
      }

      // Convert memory items to the format expected by IdealizedMemory
      const hardTruths = memoryItems
        .filter((item) => item.type === "hardTruth")
        .map((item, index) => ({
          id: item.id,
          text: item.text,
        }));

      const goodFacts = memoryItems
        .filter((item) => item.type === "goodFact")
        .map((item, index) => ({
          id: item.id,
          text: item.text,
        }));

      const lessonsLearned = memoryItems
        .filter((item) => item.type === "lesson")
        .map((item, index) => ({
          id: item.id,
          text: item.text,
        }));

      const resolvedMemoryImage = undefined;

      // Create the memory with AI suggestions (bypass limits - AI modal allows creation beyond free tier caps)
      const memoryId = await addIdealizedMemory(
        finalEntityId,
        finalSphere,
        {
          title: aiResponse?.memory?.title || "", // Use AI-generated title
          imageUri: resolvedMemoryImage,
          hardTruths,
          goodFacts,
          lessonsLearned,
          source: 'ai',
        },
        { bypassMemoryLimit: true }
      );

      // Limit reached and user dismissed paywall - don't proceed
      if (!memoryId) {
        setIsProcessing(false);
        return;
      }

      // Persist moment notification summaries for lesson and goodFact items (batch to avoid stale state).
      // Every persisted summary must carry an AI-specific message. If the initial memory-creation call
      // did not attach `notificationMessage` to an item, we fill it via a dedicated batch AI request
      // (which itself guarantees one message per input or throws).
      const itemsNeedingSummary = memoryItems.filter(
        (item) => item.type === "lesson" || item.type === "goodFact"
      );
      const lessonsWithoutMessage = itemsNeedingSummary.filter(
        (item) => item.type === "lesson" && !item.notificationMessage?.trim()
      );
      const sunnyWithoutMessage = itemsNeedingSummary.filter(
        (item) => item.type === "goodFact" && !item.notificationMessage?.trim()
      );
      const resolvedMessages: Record<string, string> = {};
      if (lessonsWithoutMessage.length > 0 || sunnyWithoutMessage.length > 0) {
        console.log(
          `[AI Modal] Backfilling missing notificationMessages — lessons: ${lessonsWithoutMessage.length}, sunny: ${sunnyWithoutMessage.length}`
        );
        const {
          suggestNotificationMessagesForLessons,
          suggestNotificationMessagesForSunnyMoments,
        } = await import("@/utils/ai-service");
        const lang = language === "bg" ? "bg" : "en";
        const [lessonMap, sunnyMap] = await Promise.all([
          lessonsWithoutMessage.length > 0
            ? suggestNotificationMessagesForLessons(
                lessonsWithoutMessage.map((l) => ({
                  id: l.id,
                  text: l.text,
                  memoryTitle: aiResponse?.memory?.title,
                  sphere: finalSphere,
                })),
                lang
              )
            : Promise.resolve({} as Record<string, string>),
          sunnyWithoutMessage.length > 0
            ? suggestNotificationMessagesForSunnyMoments(
                sunnyWithoutMessage.map((s) => ({
                  id: s.id,
                  text: s.text,
                  memoryTitle: aiResponse?.memory?.title,
                  sphere: finalSphere,
                })),
                lang
              )
            : Promise.resolve({} as Record<string, string>),
        ]);
        Object.assign(resolvedMessages, lessonMap, sunnyMap);
      }
      const toPersist: Parameters<typeof addSummariesBatch>[0] = [];
      const unresolvedItems: { id: string; type: AIMemoryItem["type"] }[] = [];
      for (const item of itemsNeedingSummary) {
        const message =
          item.notificationMessage?.trim() || resolvedMessages[item.id]?.trim();
        if (!message) {
          unresolvedItems.push({ id: item.id, type: item.type });
          continue;
        }
        toPersist.push({
          momentId: item.id,
          memoryId,
          entityId: finalEntityId,
          sphere: finalSphere,
          momentType: item.type === "lesson" ? "lesson" : "sunny",
          momentText: item.text,
          notificationMessage: message,
          source: "ai_suggested",
        });
      }
      if (unresolvedItems.length > 0) {
        // Should be unreachable: the helper guarantees coverage or throws.
        // Log loudly instead of silently persisting partial state.
        console.error(
          `[AI Modal] Coverage gap after backfill — ${unresolvedItems.length} item(s) without notificationMessage`,
          { unresolvedItems }
        );
        throw new Error(
          `AI could not generate notification messages for ${unresolvedItems.length} item(s). Please try again.`
        );
      }
      if (toPersist.length > 0) {
        await addSummariesBatch(toPersist);
      }
      console.log(
        `[AI Modal] Persisted ${toPersist.length}/${itemsNeedingSummary.length} moment notification summaries`
      );

      // Log analytics event for AI memory saved
      await logAIMemorySaved(finalSphere, false, memoryItems.length);

      // Count AI-created memories toward streak/badges (same as manual creation).
      // This is what keeps/earns badges for AI modal saves too.
      // Don't block the save flow if streak update fails.
      try {
        const streakResult = await updateStreakOnMemoryCreation();
        const currentStreak = streakResult.data.currentStreak;

        // Mirror the same notification behavior as manual creation (AddIdealizedMemoryScreen)
        // Milestone days (1/3/7/14) are badge thresholds, so prioritize badge unlock messaging.
        const milestoneBadge =
          streakResult.newMilestones
            .map((milestone) => getBadgeForStreak(milestone))
            .find((badge): badge is NonNullable<typeof badge> => badge !== null) || null;
        const unlockedBadge = streakResult.newBadges[0] || milestoneBadge;

        if (unlockedBadge) {
          const badge = unlockedBadge;
          const emoji =
            badge.daysRequired >= 14
              ? "🏆"
              : badge.daysRequired >= 7
                ? "🌟"
                : badge.daysRequired >= 3
                  ? "🔥"
                  : "✨";

          showNotification({
            title: "New Badge Unlocked!",
            message: `You've earned the ${badge.name} badge with ${badge.daysRequired} consecutive days!`,
            emoji,
            duration: 4000,
          });
        } else if (streakResult.newMilestones.length > 0) {
          const milestone = streakResult.newMilestones[0];
          const emoji =
            milestone >= 14
              ? "🏆"
              : milestone >= 7
                ? "🌟"
                : milestone >= 3
                  ? "🔥"
                  : "✨";

          showNotification({
            title: `${milestone}-day streak!`,
            message: `Amazing! You've created memories for ${milestone} days in a row.`,
            emoji,
            duration: 4000,
          });
        } else if (streakResult.streakIncreased || streakResult.isFirstMemory) {
          const emoji =
            currentStreak >= 14
                ? "🏆"
                : currentStreak >= 7
                  ? "⭐"
                  : currentStreak >= 3
                    ? "🔥"
                    : "✨";
          let title = "";
          let message = "";

          if (currentStreak === 1) {
            title = "Streak started!";
            message =
              "You're on day 1! Keep creating memories daily to build your streak.";
          } else if (currentStreak === 2) {
            title = "Great start!";
            message = "2 days in a row! One more day until your Pulse badge.";
          } else {
            title = `${currentStreak}-day streak!`;
            message = `Amazing! You've created memories for ${currentStreak} days in a row. Keep it up!`;
          }

          showNotification({
            title,
            message,
            emoji,
            duration: 3000,
          });
        }
      } catch {
        // noop
      }

      // Clear AsyncStorage after successful save
      await clearPendingAIResponse();
      await clearPendingAIRequest();
      await stopBackgroundAIProcessing();

      // Golden event AI access: mark one-time use as consumed and clear all reminders for this event
      if (goldenEventId) {
        await markEventGoldenMemoryUsed(goldenEventId);
        await cancelEventMemoryReminders(goldenEventId);
        await clearEventReminderInAppForEvent(goldenEventId);
        hideNotification(); // dismiss the event memory reminder toast now that a memory was created
      }

      // Close the modal first
      onClose();

      // Show success alert with option to open memory
      Alert.alert(
        t("ai.save.success") || "Memory saved successfully!",
        t("ai.save.successMessage") ||
          "Your memory has been created with AI suggestions.",
        [
          {
            text: t("common.close") || "Close",
            style: "cancel",
          },
          {
            text: t("ai.openMemory") || "Open memory",
            onPress: () => {
              const detailParams: {
                sphere: LifeSphere;
                entityId: string;
                focusedMemoryId: string;
                source?: string;
                profileId?: string;
                jobId?: string;
                familyMemberId?: string;
                friendId?: string;
                hobbyId?: string;
              } = {
                sphere: finalSphere,
                entityId: finalEntityId,
                focusedMemoryId: memoryId,
                source: "ai_modal_save",
              };

              if (finalSphere === "relationships") detailParams.profileId = finalEntityId;
              else if (finalSphere === "career") detailParams.jobId = finalEntityId;
              else if (finalSphere === "family") detailParams.familyMemberId = finalEntityId;
              else if (finalSphere === "friends") detailParams.friendId = finalEntityId;
              else if (finalSphere === "hobbies") detailParams.hobbyId = finalEntityId;

              router.replace({
                pathname: "/" as const,
                params: detailParams,
              });
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        t("common.error") || "Error",
        (error as Error).message ||
          t("ai.save.error") ||
          "Failed to save memory",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }],
  }));

  const animatedMicStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: isRecording ? micPulseScale.value : pulseScale.value },
    ],
  }));

  const animatedSparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
    opacity: sparkleOpacity.value,
  }));

  const animatedPulseBgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingPulseScale.value }],
  }));

  const animatedDot1Style = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value[0],
  }));

  const animatedDot2Style = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value[1],
  }));

  const animatedDot3Style = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value[2],
  }));

  const animatedWaveStyle = useAnimatedStyle(() => ({
    opacity: waveOpacity.value * 0.4, // Make it more subtle (40% of original opacity)
    transform: [{ scale: 1 + (micPulseScale.value - 1) * 1.5 }], // Expand more but start from center
  }));

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      width: "95%",
      maxWidth: 600,
      borderRadius: 24 * fontScale,
    },
    modal: {
      backgroundColor: colors.background,
      borderRadius: 24 * fontScale,
      paddingHorizontal: 24 * fontScale,
      paddingTop: 24 * fontScale,
      paddingBottom: 28 * fontScale,
      minHeight: 440 * fontScale,
      maxHeight: "88%",
    },
    modalContainerLarge: {
      width: "95%",
      maxWidth: 600,
      borderRadius: 24 * fontScale,
    },
    modalLarge: {
      backgroundColor: colors.background,
      borderRadius: 24 * fontScale,
      paddingHorizontal: 24 * fontScale,
      paddingTop: 24 * fontScale,
      paddingBottom: 32 * fontScale,
      minHeight: 600 * fontScale,
      maxHeight: "90%",
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "center",
      marginBottom: 32 * fontScale,
      position: "relative",
      paddingRight: 40 * fontScale, // Space for close button
    },
    headerTitle: {
      textAlign: "center",
      marginBottom: 4 * fontScale,
      fontSize: headerTitleFontSize,
      lineHeight: headerTitleFontSize * 1.2,
    },
    headerSubtitle: {
      textAlign: "center",
      opacity: 0.7,
      marginTop: 0,
      paddingHorizontal: 8 * fontScale, // Extra padding to prevent overlap
    },
    closeButton: {
      position: "absolute",
      right: 0,
      top: 0,
      width: 32 * fontScale,
      height: 32 * fontScale,
      borderRadius: 16 * fontScale,
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.05)",
      justifyContent: "center",
      alignItems: "center",
    },
    minimizeButton: {
      width: 32 * fontScale,
      height: 32 * fontScale,
      borderRadius: 16 * fontScale,
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.05)",
      justifyContent: "center",
      alignItems: "center",
    },
    // removed: large standalone mic button styles (mic is now inline with the input)
    inputContainer: {
      marginBottom: 0,
      width: "100%",
    },
    inputWrapper: {
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(0, 0, 0, 0.08)",
      borderRadius: 16 * fontScale,
      borderWidth: 0,
      paddingHorizontal: 16 * fontScale,
      paddingVertical: 14 * fontScale,
      minHeight: 56 * fontScale,
    },
    textInput: {
      flex: 1,
      fontSize: 16 * fontScale,
      color: colors.text,
      textAlignVertical: "top",
      paddingRight: 8 * fontScale,
    },
    micButton: {
      width: 40 * fontScale,
      height: 40 * fontScale,
      borderRadius: 20 * fontScale,
      backgroundColor: isRecording ? colors.error || "#FF3B30" : colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 12 * fontScale,
    },
    // removed: wave ring styles for standalone mic button
    submitButton: {
      width: "100%",
      borderRadius: 16 * fontScale,
      paddingVertical: 16 * fontScale,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 24 * fontScale,
      marginBottom: 0,
      flexDirection: "row",
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    backButton: {
      position: "absolute",
      left: 0,
      width: 32 * fontScale,
      height: 32 * fontScale,
      borderRadius: 16 * fontScale,
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.05)",
      justifyContent: "center",
      alignItems: "center",
    },
    removeImageButton: {
      position: "absolute",
      top: 8 * fontScale,
      right: 8 * fontScale,
      width: 28 * fontScale,
      height: 28 * fontScale,
      borderRadius: 14 * fontScale,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    loadingViewWrapper: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      paddingVertical: 16 * fontScale,
    },
    loadingIndicatorContainer: {
      alignItems: "center",
      justifyContent: "flex-start",
      paddingVertical: 16 * fontScale,
      paddingHorizontal: 16 * fontScale,
      marginTop: 12 * fontScale,
      overflow: "visible",
    },
    animationCirclesContainer: {
      position: "relative",
      width: 110 * fontScale,
      height: 110 * fontScale,
      marginBottom: 12 * fontScale,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingGlow: {
      position: "absolute",
      width: 110 * fontScale,
      height: 110 * fontScale,
      borderRadius: 55 * fontScale,
      backgroundColor:
        (() => {
          const { r, g, b } = hexToRgb(momentColors.sunny.background);
          return `rgba(${r}, ${g}, ${b}, ${colorScheme === "dark" ? 0.15 : 0.25})`;
        })(),
      top: 0,
      left: "50%",
      marginLeft: -55 * fontScale,
    },
    aiIconWrapper: {
      position: "absolute",
      top: "50%",
      left: "50%",
      marginLeft: -36 * fontScale,
      marginTop: -36 * fontScale,
      width: 72 * fontScale,
      height: 72 * fontScale,
      alignItems: "center",
      justifyContent: "center",
    },
    aiIconContainer: {
      width: 72 * fontScale,
      height: 72 * fontScale,
      borderRadius: 36 * fontScale,
      backgroundColor:
        (() => {
          const { r, g, b } = hexToRgb(momentColors.sunny.background);
          return `rgba(${r}, ${g}, ${b}, ${colorScheme === "dark" ? 0.15 : 0.25})`;
        })(),
      justifyContent: "center",
      alignItems: "center",
      overflow: "visible",
      shadowColor: momentColors.sunny.background,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 8,
    },
    loadingMessageContainer: {
      alignItems: "center",
      marginTop: 4 * fontScale,
    },
    loadingMessage: {
      textAlign: "center",
      opacity: 0.9,
      marginBottom: 8 * fontScale,
      fontSize: 15 * fontScale,
    },
    loadingDots: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6 * fontScale,
      marginTop: 2 * fontScale,
    },
    loadingDot: {
      width: 6 * fontScale,
      height: 6 * fontScale,
      borderRadius: 3 * fontScale,
      backgroundColor: colors.primary,
    },
    progressBarContainer: {
      width: "100%",
      marginTop: 12 * fontScale,
      paddingHorizontal: 16 * fontScale,
    },
    progressBarBackground: {
      width: "100%",
      height: 4 * fontScale,
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
      borderRadius: 2 * fontScale,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 2 * fontScale,
    },
    resultsContainer: {
      flex: 1,
      marginTop: 8 * fontScale,
    },
    resultsHeader: {
      marginBottom: 16 * fontScale,
      paddingBottom: 16 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
    },
    memoryItem: {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
      borderRadius: 12 * fontScale,
      padding: 16 * fontScale,
      marginBottom: 12 * fontScale,
    },
    memoryItemHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8 * fontScale,
    },
    removeItemButton: {
      marginLeft: "auto",
      padding: 4 * fontScale,
    },
    memoryItemText: {
      fontSize: 15 * fontScale,
      color: colors.text,
      minHeight: 40 * fontScale,
    },
    saveButton: {
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: 16 * fontScale,
      paddingVertical: 16 * fontScale,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16 * fontScale,
      flexDirection: "row",
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    dropdownContainer: {
      width: "100%",
    },
    dropdownLabel: {
      marginBottom: 6 * fontScale,
      opacity: 0.7,
    },
    titleDisplay: {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
      borderRadius: 12 * fontScale,
      padding: 12 * fontScale,
      borderWidth: 1,
      borderColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
      minHeight: 44 * fontScale,
      justifyContent: "center",
    },
    dropdownButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
      borderRadius: 12 * fontScale,
      padding: 12 * fontScale,
      borderWidth: 1,
      borderColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
    },
    dropdownButtonError: {
      borderColor: "#FF3B30",
      borderWidth: 2,
    },
    helperButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8 * fontScale,
      padding: 8 * fontScale,
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 59, 48, 0.1)"
          : "rgba(255, 59, 48, 0.05)",
      borderRadius: 8 * fontScale,
      borderWidth: 1,
      borderColor: "#FF3B30",
    },
    helperText: {
      flex: 1,
      color: "#FF3B30",
    },
    helperButtonValid: {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(100, 181, 246, 0.1)"
          : "rgba(100, 181, 246, 0.05)",
      borderColor: colors.primary,
    },
    helperTextValid: {
      color: colors.primary,
    },
    addEntityForm: {
      marginTop: 16 * fontScale,
      padding: 16 * fontScale,
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.03)"
          : "rgba(0, 0, 0, 0.03)",
      borderRadius: 12 * fontScale,
      borderWidth: 1,
      borderColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
    },
    addEntityFormHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16 * fontScale,
    },
    formField: {
      marginBottom: 16 * fontScale,
    },
    formLabel: {
      marginBottom: 6 * fontScale,
      opacity: 0.8,
    },
    formInput: {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
      borderRadius: 8 * fontScale,
      padding: 12 * fontScale,
      color: colors.text,
      fontSize: 15 * fontScale,
      borderWidth: 1,
      borderColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
    },
    formInputError: {
      borderColor: "#FF3B30",
      borderWidth: 2,
    },
    formTextArea: {
      minHeight: 80 * fontScale,
      textAlignVertical: "top",
    },
    dateButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
      borderRadius: 8 * fontScale,
      padding: 12 * fontScale,
      borderWidth: 1,
      borderColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    addEntityImagePreviewContainer: {
      position: "relative",
      width: 100 * fontScale,
      height: 100 * fontScale,
      borderRadius: 8 * fontScale,
      overflow: "hidden",
    },
    addEntityImagePreview: {
      width: "100%",
      height: "100%",
    },
    addEntityRemoveImageButton: {
      position: "absolute",
      top: 4 * fontScale,
      right: 4 * fontScale,
      width: 24 * fontScale,
      height: 24 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    addEntityImageUploadButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16 * fontScale,
      paddingHorizontal: 16 * fontScale,
      borderRadius: 8 * fontScale,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: "dashed",
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(100, 181, 246, 0.05)"
          : "rgba(100, 181, 246, 0.05)",
    },
    saveEntityButton: {
      backgroundColor: colors.primary,
      borderRadius: 8 * fontScale,
      paddingVertical: 12 * fontScale,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8 * fontScale,
    },
    saveEntityButtonDisabled: {
      opacity: 0.5,
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    pickerContainer: {
      backgroundColor: colors.background,
      borderRadius: 16 * fontScale,
      width: "85%",
      maxWidth: 400,
      maxHeight: "70%",
      overflow: "hidden",
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
    },
    pickerList: {
      maxHeight: 300 * fontScale,
    },
    pickerItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
    },
    pickerItemSelected: {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)",
    },
    confirmModalContainer: {
      backgroundColor: colors.background,
      borderRadius: 16 * fontScale,
      width: "85%",
      maxWidth: 400,
      padding: 24 * fontScale,
      alignItems: "center",
    },
    confirmButtonContainer: {
      flexDirection: "row",
      width: "100%",
      gap: 12 * fontScale,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12 * fontScale,
      borderRadius: 12 * fontScale,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelButton: {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)",
    },
    discardButton: {
      backgroundColor: "#FF3B30",
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleAttemptClose}
    >
      <Pressable style={styles.overlay} onPress={handleAttemptClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
            justifyContent: isKeyboardVisible ? "flex-end" : "center",
            alignItems: "center",
            width: "100%",
            paddingBottom: isKeyboardVisible ? 16 * fontScale : 0,
          }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 24}
        >
          <Pressable
            style={
              currentView === "loading"
                ? styles.modalContainerLarge
                : styles.modalContainer
            }
            onPress={(e) => {
              e.stopPropagation();
              // Dismiss keyboard when clicking outside input
              if (isKeyboardVisible) {
                Keyboard.dismiss();
              }
            }}
          >
            <Animated.View
              style={[
                currentView === "loading" ? styles.modalLarge : styles.modal,
                animatedModalStyle,
              ]}
            >
              {/* Header */}
              {currentView !== "loading" && currentView !== "error" && (
                <View style={styles.header}>
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8 * fontScale,
                      }}
                    >
                      <ThemedText
                        weight="semibold"
                        style={styles.headerTitle}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.92}
                      >
                        {t("ai.title") || "Create a memory with Sferas AI"}
                      </ThemedText>
                    </View>
                    <ThemedText size="sm" style={styles.headerSubtitle}>
                      {t("ai.subtitle") ||
                        "Share your story and Sferas AI will form a memory with moments and lessons for you"}
                    </ThemedText>
                    {currentView !== "input" &&
                      remainingAIRequests !== null &&
                      (hasAIEntitlement && remainingAIRequests === 0 ? (
                        <ThemedText
                          size="xs"
                          style={[
                            styles.headerSubtitle,
                            {
                              marginTop: 4 * fontScale,
                              opacity: 0.8,
                            },
                          ]}
                        >
                          {t("ai.rateLimit.premiumMessage") ||
                            "You've reached the daily limit. Try again tomorrow."}
                        </ThemedText>
                      ) : (
                        <ThemedText
                          size="xs"
                          style={[
                            styles.headerSubtitle,
                            {
                              marginTop: 4 * fontScale,
                              opacity: 0.8,
                            },
                          ]}
                        >
                          {(t("ai.remainingCreations") ||
                            "{count} of {limit} free AI memory creations left today")
                            .replace("{count}", String(remainingAIRequests))
                            .replace(
                              "{limit}",
                              String(
                                hasAIEntitlement
                                  ? REQUESTS_PER_DAY_PREMIUM
                                  : freeAIDailyLimit,
                              ),
                            )}
                        </ThemedText>
                      ))}
                  </View>
                  <Pressable
                    onPress={handleAttemptClose}
                    style={styles.closeButton}
                  >
                    <MaterialIcons
                      name="close"
                      size={20 * fontScale}
                      color={colors.text}
                    />
                  </Pressable>
                </View>
              )}

              {/* Header for loading view with minimize button */}
              {currentView === "loading" && (
                <View style={styles.header}>
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8 * fontScale,
                      position: "absolute",
                      right: 0,
                    }}
                  >
                    {onMinimize && isProcessing && !aiResponse && (
                      <Pressable
                        onPress={async () => {
                          // Mark that we're minimizing (not closing) to preserve state
                          isMinimizingRef.current = true;
                          // Minimize the modal (keep processing in background)
                          onMinimize();
                        }}
                        style={styles.minimizeButton}
                      >
                        <MaterialIcons
                          name="remove"
                          size={20 * fontScale}
                          color={colors.text}
                        />
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => setShowCloseConfirm(true)}
                      style={styles.minimizeButton}
                    >
                      <MaterialIcons
                        name="close"
                        size={20 * fontScale}
                        color={colors.text}
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Input View */}
              {currentView === "input" && (
                <>
                  {/* Text Input Container */}
                  <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        ref={inputRef}
                        style={[styles.textInput, { height: inputHeight }]}
                        value={inputText}
                        onChangeText={setInputTextWithLimit}
                        maxLength={MAX_INPUT_LENGTH}
                        placeholder={
                          t("ai.placeholder.input") ||
                          "Tell a story or memory about someone from your sferas..."
                        }
                        placeholderTextColor={
                          colors.textMediumEmphasis || colors.text + "80"
                        }
                        multiline
                        onContentSizeChange={(e) => {
                          const h = e.nativeEvent.contentSize.height;
                          const minH = 56 * fontScale;
                          const maxH = 180 * fontScale;
                          setInputHeight(Math.max(minH, Math.min(maxH, h)));
                        }}
                        editable={!isRecording && !isProcessing}
                      />
                      <Animated.View style={animatedMicStyle}>
                        <TouchableOpacity
                          style={styles.micButton}
                          onPress={
                            isRecording
                              ? handleStopRecording
                              : handleStartRecording
                          }
                          disabled={isProcessing}
                          activeOpacity={0.85}
                        >
                          <MaterialIcons
                            name={isRecording ? "stop" : "mic"}
                            size={20 * fontScale}
                            color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                    {isListening && (
                      <View
                        style={{
                          marginTop: 10 * fontScale,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8 * fontScale,
                        }}
                      >
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                        <ThemedText size="sm" style={{ opacity: 0.7 }}>
                          {t("ai.listening") || "Listening..."}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Character count label - positioned between input and photo upload */}
                  <View
                    style={{
                      paddingHorizontal: 16 * fontScale,
                      marginTop: 8 * fontScale,
                      marginBottom: 8 * fontScale,
                      alignItems: "flex-end",
                    }}
                  >
                    <ThemedText
                      size="xs"
                      style={{
                        opacity: 0.8,
                        color: exceedsMaxLength
                          ? colorScheme === "dark"
                            ? "#FF6B6B"
                            : "#D93025"
                          : colors.textMediumEmphasis || colors.text + "CC",
                      }}
                    >
                      {characterCount}/{MAX_INPUT_LENGTH}
                    </ThemedText>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={!canSubmit}
                    activeOpacity={0.8}
                    style={!canSubmit && styles.submitButtonDisabled}
                  >
                    <LinearGradient
                      colors={
                        canSubmit
                          ? colorScheme === "dark"
                            ? [
                                colors.primary,
                                colors.primaryLight,
                                colors.primary,
                              ]
                            : [
                                colors.primary,
                                colors.primaryLight,
                                colors.primary,
                              ]
                          : colorScheme === "dark"
                            ? [
                                "rgba(255, 255, 255, 0.1)",
                                "rgba(255, 255, 255, 0.1)",
                              ]
                            : ["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.1)"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitButton}
                    >
                      <ThemedText
                        style={{
                          fontSize: 20 * fontScale,
                          marginRight: 8 * fontScale,
                        }}
                      >
                        ✨
                      </ThemedText>
                      <ThemedText
                        size="l"
                        weight="bold"
                        style={{ color: "#ffffff" }}
                      >
                        {t("ai.submit") || "Submit"}
                      </ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                  {remainingAIRequests !== null &&
                    (hasAIEntitlement && remainingAIRequests === 0 ? (
                      <ThemedText
                        size="xs"
                        style={[
                          styles.headerSubtitle,
                          {
                            marginTop: 8 * fontScale,
                            opacity: 0.8,
                          },
                        ]}
                      >
                        {t("ai.rateLimit.premiumMessage") ||
                          "You've reached the daily limit. Try again tomorrow."}
                      </ThemedText>
                    ) : (
                      <ThemedText
                        size="xs"
                        style={[
                          styles.headerSubtitle,
                          {
                            marginTop: 8 * fontScale,
                            opacity: 0.8,
                          },
                        ]}
                      >
                        {(t("ai.remainingCreations") ||
                          "{count} of {limit} free AI memory creations left today")
                          .replace("{count}", String(remainingAIRequests))
                          .replace(
                            "{limit}",
                            String(
                              hasAIEntitlement
                                ? REQUESTS_PER_DAY_PREMIUM
                                : freeAIDailyLimit,
                            ),
                          )}
                      </ThemedText>
                    ))}

                  {/* Validation warnings */}
                  {wordCount > 0 && wordCount < MIN_WORDS && !isProcessing && (
                    <ThemedText
                      style={{
                        color: colorScheme === "dark" ? "#FF6B6B" : "#D93025",
                        fontSize: 13 * fontScale,
                        textAlign: "center",
                        marginTop: 8,
                      }}
                    >
                      {t("ai.error.minimumWords") ||
                        "Please enter at least 10 words"}
                    </ThemedText>
                  )}
                  {exceedsMaxLength && !isProcessing && (
                    <ThemedText
                      style={{
                        color: colorScheme === "dark" ? "#FF6B6B" : "#D93025",
                        fontSize: 13 * fontScale,
                        textAlign: "center",
                        marginTop: 8,
                      }}
                    >
                      {t("ai.error.maximumLength", { max: MAX_INPUT_LENGTH }) ||
                        `Text is too long. Maximum ${MAX_INPUT_LENGTH} characters allowed.`}
                    </ThemedText>
                  )}
                </>
              )}

              {/* Error View */}
              {currentView === "error" && errorMessage && (
                <>
                  {/* Header for error view */}
                  <View style={styles.header}>
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                      }}
                    >
                      <ThemedText
                        size="l"
                        weight="semibold"
                        style={styles.headerTitle}
                      >
                        {t("ai.error.title") || "AI Processing Failed"}
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => {
                        setErrorMessage(null);
                        setCurrentView("input");
                        setIsProcessing(false);
                        if (backgroundRequestId) {
                          stopBackgroundAIProcessing();
                          setBackgroundRequestId(null);
                        }
                        onClose();
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons
                        name="close"
                        size={22 * fontScale}
                        color={colorScheme === "dark" ? "#FFFFFF" : "#000000"}
                      />
                    </TouchableOpacity>
                  </View>
                  <View
                    style={{
                      padding: 24 * fontScale,
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 300 * fontScale,
                    }}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={64 * fontScale}
                      color={colorScheme === "dark" ? "#FF6B6B" : "#D93025"}
                      style={{ marginBottom: 16 * fontScale }}
                    />
                    <ThemedText
                      size="l"
                      weight="bold"
                      style={{
                        marginBottom: 8 * fontScale,
                        textAlign: "center",
                        color: colorScheme === "dark" ? "#FF6B6B" : "#D93025",
                      }}
                    >
                      {t("ai.error.title") || "AI Processing Failed"}
                    </ThemedText>
                    <ThemedText
                      size="sm"
                      style={{
                        marginBottom: 24 * fontScale,
                        textAlign: "center",
                        opacity: 0.8,
                        paddingHorizontal: 16 * fontScale,
                      }}
                    >
                      {errorMessage}
                    </ThemedText>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12 * fontScale,
                        width: "100%",
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12 * fontScale,
                          paddingHorizontal: 24 * fontScale,
                          borderRadius: 12 * fontScale,
                          backgroundColor:
                            colorScheme === "dark"
                              ? "rgba(255, 255, 255, 0.1)"
                              : "rgba(0, 0, 0, 0.05)",
                          alignItems: "center",
                        }}
                        onPress={() => {
                          setErrorMessage(null);
                          setCurrentView("input");
                        }}
                      >
                        <ThemedText size="sm" weight="medium">
                          {t("common.cancel") || "Cancel"}
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12 * fontScale,
                          paddingHorizontal: 24 * fontScale,
                          borderRadius: 12 * fontScale,
                          overflow: "hidden",
                          position: "relative",
                        }}
                        onPress={handleRetry}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={
                            colorScheme === "dark"
                              ? [
                                  colors.primary,
                                  colors.primaryLight,
                                  colors.primary,
                                ]
                              : [
                                  colors.primary,
                                  colors.primaryLight,
                                  colors.primary,
                                ]
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFillObject}
                        >
                          <View
                            style={{
                              flex: 1,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ThemedText
                              size="sm"
                              weight="bold"
                              style={{ color: "#ffffff" }}
                            >
                              {t("common.retry") || "Retry"}
                            </ThemedText>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {/* Loading View */}
              {currentView === "loading" && !errorMessage && (
                <View style={styles.loadingViewWrapper}>
                  <ScrollView
                    style={styles.loadingContainer}
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={Platform.OS === "android"}
                  >
                    {/* Loading Indicator */}
                    {!aiResponse && (
                      <View style={styles.loadingIndicatorContainer}>
                        {/* Animation circles container */}
                        <View style={styles.animationCirclesContainer}>
                          {/* Animated background glow */}
                          <Animated.View
                            style={[styles.loadingGlow, animatedPulseBgStyle]}
                          />

                          {/* Main sparkle icon with enhanced animation - centered */}
                          <View style={styles.aiIconWrapper}>
                            <Animated.View style={animatedSparkleStyle}>
                              <View style={styles.aiIconContainer}>
                                <ThemedText
                                  style={{
                                    fontSize: 36 * fontScale,
                                    lineHeight: 36 * fontScale,
                                    textAlign: "center",
                                    includeFontPadding: false,
                                  }}
                                >
                                  ✨
                                </ThemedText>
                              </View>
                            </Animated.View>
                          </View>
                        </View>

                        {/* Loading message with animated dots */}
                        <View style={styles.loadingMessageContainer}>
                          <ThemedText
                            size="l"
                            weight="medium"
                            style={styles.loadingMessage}
                          >
                            {loadingMessages[loadingMessageIndex]}
                          </ThemedText>
                          <View style={styles.loadingDots}>
                            <Animated.View
                              style={[styles.loadingDot, animatedDot1Style]}
                            />
                            <Animated.View
                              style={[styles.loadingDot, animatedDot2Style]}
                            />
                            <Animated.View
                              style={[styles.loadingDot, animatedDot3Style]}
                            />
                          </View>
                        </View>

                        {/* Progress indicator */}
                        <View style={styles.progressBarContainer}>
                          <View style={styles.progressBarBackground}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${(loadingMessageIndex + 1) * 25}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Results (shown when AI response arrives) */}
                    {aiResponse && (
                      <>
                        {/* Memory Title */}
                        <View
                          style={[
                            styles.resultsHeader,
                            { marginTop: 24 * fontScale },
                          ]}
                        >
                          <View style={styles.dropdownContainer}>
                            <ThemedText
                              size="xs"
                              weight="medium"
                              style={styles.dropdownLabel}
                            >
                              {t("memory.title") || "Title"}
                            </ThemedText>
                            <View style={styles.titleDisplay}>
                              <ThemedText size="sm" weight="semibold">
                                {aiResponse?.memory?.title || ""}
                              </ThemedText>
                            </View>
                          </View>
                        </View>

                        {/* Sphere and Entity Selectors */}
                        <View style={styles.resultsHeader}>
                          {/* Sphere Dropdown */}
                          <View style={styles.dropdownContainer}>
                            <ThemedText
                              size="xs"
                              weight="medium"
                              style={styles.dropdownLabel}
                            >
                              {t("ai.results.sphere") || "Sfera"}
                            </ThemedText>
                            <Pressable
                              style={styles.dropdownButton}
                              onPress={() => setShowSpherePicker(true)}
                            >
                              <ThemedText size="sm" weight="semibold">
                                {selectedSphere || ""}
                              </ThemedText>
                              <MaterialIcons
                                name="arrow-drop-down"
                                size={24 * fontScale}
                                color={colors.text}
                              />
                            </Pressable>
                          </View>

                          {/* Entity Dropdown - Show when sphere is selected, hide when form is expanded */}
                          {selectedSphere && !showAddEntityForm && (
                            <View
                              style={[
                                styles.dropdownContainer,
                                { marginTop: 12 * fontScale },
                              ]}
                            >
                              <ThemedText
                                size="xs"
                                weight="medium"
                                style={styles.dropdownLabel}
                              >
                                {t("ai.results.entity") || "Entity"}
                              </ThemedText>
                              {availableEntitiesForSphere.length > 0 ? (
                                <>
                                  <Pressable
                                    style={[
                                      styles.dropdownButton,
                                      // Show error border if validation errors are shown AND no entity is selected
                                      // OR if entity is required (entities available) but not selected
                                      (showValidationErrors ||
                                        (availableEntitiesForSphere.length >
                                          0 &&
                                          !selectedEntityId)) &&
                                      !selectedEntityId
                                        ? styles.dropdownButtonError
                                        : null,
                                    ].filter(Boolean)}
                                    onPress={() => {
                                      setShowEntityPicker(true);
                                      if (showValidationErrors) {
                                        setShowValidationErrors(false);
                                      }
                                    }}
                                  >
                                    <ThemedText size="sm" weight="semibold">
                                      {selectedEntityName ||
                                        t("ai.results.selectEntity") ||
                                        "Select entity..."}
                                    </ThemedText>
                                    <MaterialIcons
                                      name="arrow-drop-down"
                                      size={24 * fontScale}
                                      color={colors.text}
                                    />
                                  </Pressable>

                                  {/* Helper text/button - always show to allow adding new entity */}
                                  <TouchableOpacity
                                    style={[
                                      styles.helperButton,
                                      selectedEntityId &&
                                        styles.helperButtonValid,
                                    ]}
                                    onPress={() => {
                                      setShowAddEntityForm(true);
                                      setShowEntityPicker(false);
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <ThemedText
                                      size="xs"
                                      style={[
                                        styles.helperText,
                                        selectedEntityId &&
                                          styles.helperTextValid,
                                      ]}
                                    >
                                      {(() => {
                                        const sphere =
                                          selectedSphere;
                                        const expandKey =
                                          sphere &&
                                          [
                                            "family",
                                            "friends",
                                            "hobbies",
                                            "relationships",
                                            "career",
                                          ].includes(sphere)
                                            ? (`ai.results.expandToAdd.${sphere}` as const)
                                            : "ai.results.expandToAdd.default";
                                        const expandText = t(expandKey);
                                        return !selectedEntityId
                                          ? `${t("ai.results.unrecognizedEntity") || "Unrecognized entity."} ${expandText}`
                                          : expandText;
                                      })()}
                                    </ThemedText>
                                    <MaterialIcons
                                      name="expand-more"
                                      size={16 * fontScale}
                                      color={
                                        selectedEntityId
                                          ? colors.primary
                                          : "#FF3B30"
                                      }
                                    />
                                  </TouchableOpacity>
                                </>
                              ) : (
                                /* No entities exist - show helper button to add first entity */
                                <TouchableOpacity
                                  style={styles.helperButton}
                                  onPress={() => {
                                    setShowAddEntityForm(true);
                                    setShowEntityPicker(false);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <ThemedText
                                    size="xs"
                                    style={styles.helperText}
                                  >
                                    {(() => {
                                      const sphere =
                                        selectedSphere;
                                      const expandKey =
                                        sphere &&
                                        [
                                          "family",
                                          "friends",
                                          "hobbies",
                                          "relationships",
                                          "career",
                                        ].includes(sphere)
                                          ? (`ai.results.expandToAdd.${sphere}` as const)
                                          : "ai.results.expandToAdd.default";
                                      return t(expandKey);
                                    })()}
                                  </ThemedText>
                                  <MaterialIcons
                                    name="expand-more"
                                    size={16 * fontScale}
                                    color={colors.primary}
                                  />
                                </TouchableOpacity>
                              )}
                            </View>
                          )}

                          {/* Expandable form for adding new entity */}
                          {showAddEntityForm && selectedSphere && (
                            <View style={styles.addEntityForm}>
                              <View style={styles.addEntityFormHeader}>
                                <ThemedText size="sm" weight="bold">
                                  {selectedSphere === "family"
                                    ? t("profile.familyMember.add") ||
                                      "Add Family Member"
                                    : selectedSphere === "friends"
                                      ? t("profile.friend.add") || "Add Friend"
                                      : selectedSphere === "career"
                                        ? t("profile.job.add") || "Add Job"
                                        : selectedSphere === "hobbies"
                                          ? t("profile.hobby.add") ||
                                            "Add Hobby"
                                          : t("profile.relationship.add") ||
                                            "Add Relationship"}
                                </ThemedText>
                                <TouchableOpacity
                                  onPress={() => {
                                    setShowAddEntityForm(false);
                                    // Reset form fields
                                    setNewEntityName("");
                                    setNewEntityDescription("");
                                    setNewEntityRelationship("");
                                    setNewEntityStartDate(null);
                                    setNewEntityEndDate(null);
                                    setNewEntityIsCurrent(false);
                                    setNewEntityImage(null);
                                  }}
                                >
                                  <MaterialIcons
                                    name="close"
                                    size={20 * fontScale}
                                    color={colors.text}
                                  />
                                </TouchableOpacity>
                              </View>

                              {/* Name field - required for all */}
                              <View style={styles.formField}>
                                <ThemedText
                                  size="xs"
                                  weight="medium"
                                  style={styles.formLabel}
                                >
                                  {t("profile.name") || "Name"} *
                                </ThemedText>
                                <TextInput
                                  style={[
                                    styles.formInput,
                                    !newEntityName.trim() &&
                                      showValidationErrors &&
                                      styles.formInputError,
                                  ]}
                                  value={newEntityName}
                                  onChangeText={setNewEntityName}
                                  placeholder={
                                    t("profile.name.placeholder") ||
                                    "Enter name"
                                  }
                                  placeholderTextColor={
                                    colorScheme === "dark"
                                      ? colors.textMediumEmphasis
                                      : colors.text + "80"
                                  }
                                />
                              </View>

                              {/* Relationship field - required for family */}
                              {selectedSphere === "family" && (
                                <View style={styles.formField}>
                                  <ThemedText
                                    size="xs"
                                    weight="medium"
                                    style={styles.formLabel}
                                  >
                                    {t("profile.familyMember.relationship") ||
                                      "Relationship"}{" "}
                                    *
                                  </ThemedText>
                                  <TextInput
                                    style={[
                                      styles.formInput,
                                      !newEntityRelationship.trim() &&
                                        showValidationErrors &&
                                        styles.formInputError,
                                    ]}
                                    value={newEntityRelationship}
                                    onChangeText={setNewEntityRelationship}
                                    placeholder={
                                      t(
                                        "profile.familyMember.relationship.placeholder",
                                      ) || "e.g., Mother, Brother"
                                    }
                                    placeholderTextColor={
                                      colorScheme === "dark"
                                        ? colors.textMediumEmphasis
                                        : colors.text + "80"
                                    }
                                  />
                                </View>
                              )}

                              {/* Date fields - for jobs and relationships */}
                              {(selectedSphere === "career" ||
                                selectedSphere === "relationships") && (
                                <>
                                  <View style={styles.formField}>
                                    <ThemedText
                                      size="xs"
                                      weight="medium"
                                      style={styles.formLabel}
                                    >
                                      {t("profile.job.startDate") ||
                                        "Start Date"}
                                    </ThemedText>
                                    <TouchableOpacity
                                      style={styles.dateButton}
                                      onPress={() => {
                                        setStartDatePickerTemp(
                                          newEntityStartDate || new Date(),
                                        );
                                        setShowStartDatePicker(true);
                                      }}
                                    >
                                      <ThemedText size="sm">
                                        {newEntityStartDate
                                          ? newEntityStartDate.toLocaleDateString()
                                          : t("profile.job.selectStartDate") ||
                                            "Select start date"}
                                      </ThemedText>
                                      <MaterialIcons
                                        name="calendar-today"
                                        size={20 * fontScale}
                                        color={colors.primary}
                                      />
                                    </TouchableOpacity>
                                    {showStartDatePicker &&
                                      (Platform.OS === "ios" ? (
                                        <RNModal
                                          visible
                                          transparent
                                          animationType="slide"
                                          onRequestClose={() =>
                                            setShowStartDatePicker(false)
                                          }
                                        >
                                          <View
                                            style={{
                                              flex: 1,
                                              justifyContent: "flex-end",
                                              backgroundColor:
                                                "rgba(0, 0, 0, 0.5)",
                                            }}
                                          >
                                            <View
                                              style={{
                                                backgroundColor:
                                                  colorScheme === "dark"
                                                    ? "#1E3A52"
                                                    : "#FFFFFF",
                                                borderTopLeftRadius: 20,
                                                borderTopRightRadius: 20,
                                                paddingTop: 20,
                                                paddingBottom: 40,
                                              }}
                                            >
                                              <View
                                                style={{
                                                  flexDirection: "row",
                                                  justifyContent:
                                                    "space-between",
                                                  alignItems: "center",
                                                  paddingHorizontal: 20,
                                                  paddingBottom: 10,
                                                  borderBottomWidth: 1,
                                                  borderBottomColor:
                                                    colorScheme === "dark"
                                                      ? "rgba(255, 255, 255, 0.1)"
                                                      : "rgba(0, 0, 0, 0.1)",
                                                }}
                                              >
                                                <TouchableOpacity
                                                  onPress={() =>
                                                    setShowStartDatePicker(
                                                      false,
                                                    )
                                                  }
                                                >
                                                  <ThemedText
                                                    size="l"
                                                    style={{
                                                      color: colors.primary,
                                                    }}
                                                  >
                                                    {t("common.cancel") ||
                                                      "Cancel"}
                                                  </ThemedText>
                                                </TouchableOpacity>
                                                <ThemedText
                                                  size="l"
                                                  weight="semibold"
                                                >
                                                  {t("profile.job.startDate") ||
                                                    "Start Date"}
                                                </ThemedText>
                                                <TouchableOpacity
                                                  onPress={() => {
                                                    setNewEntityStartDate(
                                                      startDatePickerTemp,
                                                    );
                                                    setShowStartDatePicker(
                                                      false,
                                                    );
                                                  }}
                                                >
                                                  <ThemedText
                                                    size="l"
                                                    style={{
                                                      color: colors.primary,
                                                      fontWeight: "600",
                                                    }}
                                                  >
                                                    {t("common.ok") || "OK"}
                                                  </ThemedText>
                                                </TouchableOpacity>
                                              </View>
                                              <DateTimePicker
                                                value={startDatePickerTemp}
                                                mode="date"
                                                display="spinner"
                                                onChange={(_, d) => {
                                                  if (d)
                                                    setStartDatePickerTemp(d);
                                                }}
                                                maximumDate={
                                                  newEntityEndDate || undefined
                                                }
                                                style={{ height: 200 }}
                                              />
                                            </View>
                                          </View>
                                        </RNModal>
                                      ) : (
                                        <DateTimePicker
                                          value={
                                            newEntityStartDate || new Date()
                                          }
                                          mode="date"
                                          display="default"
                                          onChange={(event, date) => {
                                            setShowStartDatePicker(false);
                                            if (event.type === "set" && date) {
                                              setNewEntityStartDate(date);
                                            }
                                          }}
                                        />
                                      ))}
                                  </View>

                                  <View style={styles.formField}>
                                    <TouchableOpacity
                                      style={styles.checkboxContainer}
                                      onPress={() => {
                                        setNewEntityIsCurrent(
                                          !newEntityIsCurrent,
                                        );
                                        if (!newEntityIsCurrent) {
                                          setNewEntityEndDate(null);
                                        }
                                      }}
                                    >
                                      <MaterialIcons
                                        name={
                                          newEntityIsCurrent
                                            ? "check-box"
                                            : "check-box-outline-blank"
                                        }
                                        size={24 * fontScale}
                                        color={
                                          newEntityIsCurrent
                                            ? colors.primary
                                            : colors.text
                                        }
                                      />
                                      <ThemedText
                                        size="sm"
                                        style={{ marginLeft: 8 * fontScale }}
                                      >
                                        {t("profile.job.current") || "Current"}
                                      </ThemedText>
                                    </TouchableOpacity>
                                  </View>

                                  {!newEntityIsCurrent && (
                                    <View style={styles.formField}>
                                      <ThemedText
                                        size="xs"
                                        weight="medium"
                                        style={styles.formLabel}
                                      >
                                        {t("profile.job.endDate") || "End Date"}
                                      </ThemedText>
                                      <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => {
                                          setEndDatePickerTemp(
                                            newEntityEndDate ||
                                              newEntityStartDate ||
                                              new Date(),
                                          );
                                          setShowEndDatePicker(true);
                                        }}
                                      >
                                        <ThemedText size="sm">
                                          {newEntityEndDate
                                            ? newEntityEndDate.toLocaleDateString()
                                            : t("profile.job.selectEndDate") ||
                                              "Select end date"}
                                        </ThemedText>
                                        <MaterialIcons
                                          name="calendar-today"
                                          size={20 * fontScale}
                                          color={colors.primary}
                                        />
                                      </TouchableOpacity>
                                      {showEndDatePicker &&
                                        (Platform.OS === "ios" ? (
                                          <RNModal
                                            visible
                                            transparent
                                            animationType="slide"
                                            onRequestClose={() =>
                                              setShowEndDatePicker(false)
                                            }
                                          >
                                            <View
                                              style={{
                                                flex: 1,
                                                justifyContent: "flex-end",
                                                backgroundColor:
                                                  "rgba(0, 0, 0, 0.5)",
                                              }}
                                            >
                                              <View
                                                style={{
                                                  backgroundColor:
                                                    colorScheme === "dark"
                                                      ? "#1E3A52"
                                                      : "#FFFFFF",
                                                  borderTopLeftRadius: 20,
                                                  borderTopRightRadius: 20,
                                                  paddingTop: 20,
                                                  paddingBottom: 40,
                                                }}
                                              >
                                                <View
                                                  style={{
                                                    flexDirection: "row",
                                                    justifyContent:
                                                      "space-between",
                                                    alignItems: "center",
                                                    paddingHorizontal: 20,
                                                    paddingBottom: 10,
                                                    borderBottomWidth: 1,
                                                    borderBottomColor:
                                                      colorScheme === "dark"
                                                        ? "rgba(255, 255, 255, 0.1)"
                                                        : "rgba(0, 0, 0, 0.1)",
                                                  }}
                                                >
                                                  <TouchableOpacity
                                                    onPress={() =>
                                                      setShowEndDatePicker(
                                                        false,
                                                      )
                                                    }
                                                  >
                                                    <ThemedText
                                                      size="l"
                                                      style={{
                                                        color: colors.primary,
                                                      }}
                                                    >
                                                      {t("common.cancel") ||
                                                        "Cancel"}
                                                    </ThemedText>
                                                  </TouchableOpacity>
                                                  <ThemedText
                                                    size="l"
                                                    weight="semibold"
                                                  >
                                                    {t("profile.job.endDate") ||
                                                      "End Date"}
                                                  </ThemedText>
                                                  <TouchableOpacity
                                                    onPress={() => {
                                                      if (
                                                        newEntityStartDate &&
                                                        endDatePickerTemp <
                                                          newEntityStartDate
                                                      ) {
                                                        Alert.alert(
                                                          t("common.error") ||
                                                            "Error",
                                                          t(
                                                            "profile.date.error.endBeforeStart",
                                                          ) ||
                                                            "End date must be after start date.",
                                                          [
                                                            {
                                                              text:
                                                                t(
                                                                  "common.ok",
                                                                ) || "OK",
                                                            },
                                                          ],
                                                        );
                                                        return;
                                                      }
                                                      setNewEntityEndDate(
                                                        endDatePickerTemp,
                                                      );
                                                      setShowEndDatePicker(
                                                        false,
                                                      );
                                                    }}
                                                  >
                                                    <ThemedText
                                                      size="l"
                                                      style={{
                                                        color: colors.primary,
                                                        fontWeight: "600",
                                                      }}
                                                    >
                                                      {t("common.ok") || "OK"}
                                                    </ThemedText>
                                                  </TouchableOpacity>
                                                </View>
                                                <DateTimePicker
                                                  value={endDatePickerTemp}
                                                  mode="date"
                                                  display="spinner"
                                                  onChange={(_, d) => {
                                                    if (d)
                                                      setEndDatePickerTemp(d);
                                                  }}
                                                  minimumDate={
                                                    newEntityStartDate ||
                                                    undefined
                                                  }
                                                  style={{ height: 200 }}
                                                />
                                              </View>
                                            </View>
                                          </RNModal>
                                        ) : (
                                          <DateTimePicker
                                            value={
                                              newEntityEndDate || new Date()
                                            }
                                            mode="date"
                                            display="default"
                                            onChange={(event, date) => {
                                              setShowEndDatePicker(false);
                                              if (
                                                event.type === "set" &&
                                                date
                                              ) {
                                                setNewEntityEndDate(date);
                                              }
                                            }}
                                          />
                                        ))}
                                    </View>
                                  )}
                                </>
                              )}

                              {/* Description field - optional for all */}
                              <View style={styles.formField}>
                                <ThemedText
                                  size="xs"
                                  weight="medium"
                                  style={styles.formLabel}
                                >
                                  {t("profile.description") || "Description"}
                                </ThemedText>
                                <TextInput
                                  style={[
                                    styles.formInput,
                                    styles.formTextArea,
                                  ]}
                                  value={newEntityDescription}
                                  onChangeText={setNewEntityDescription}
                                  placeholder={
                                    t("profile.description.placeholder") ||
                                    "Optional description"
                                  }
                                  placeholderTextColor={
                                    colorScheme === "dark"
                                      ? colors.textMediumEmphasis
                                      : colors.text + "80"
                                  }
                                  multiline
                                  numberOfLines={3}
                                  textAlignVertical="top"
                                />
                              </View>

                              {/* Image upload - optional for all */}
                              <View style={styles.formField}>
                                <ThemedText
                                  size="xs"
                                  weight="medium"
                                  style={styles.formLabel}
                                >
                                  {t("profile.image") || "Image"}
                                </ThemedText>
                                {newEntityImage ? (
                                  <View
                                    style={
                                      styles.addEntityImagePreviewContainer
                                    }
                                  >
                                    <Image
                                      source={{ uri: newEntityImage }}
                                      style={styles.addEntityImagePreview}
                                    />
                                    <TouchableOpacity
                                      style={styles.addEntityRemoveImageButton}
                                      onPress={() => setNewEntityImage(null)}
                                    >
                                      <MaterialIcons
                                        name="close"
                                        size={16 * fontScale}
                                        color="#ffffff"
                                      />
                                    </TouchableOpacity>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={styles.addEntityImageUploadButton}
                                    onPress={async () => {
                                      setIsPickingImage(true);
                                      try {
                                        const result =
                                          await ImagePicker.launchImageLibraryAsync(
                                            {
                                              mediaTypes:
                                                ImagePicker.MediaTypeOptions
                                                  .Images,
                                              allowsEditing: true,
                                              aspect: [1, 1],
                                              quality: 0.8,
                                            },
                                          );
                                        if (
                                          !result.canceled &&
                                          result.assets[0]
                                        ) {
                                          setNewEntityImage(
                                            result.assets[0].uri,
                                          );
                                        }
                                      } finally {
                                        setIsPickingImage(false);
                                      }
                                    }}
                                    disabled={isPickingImage}
                                  >
                                    {isPickingImage ? (
                                      <ActivityIndicator
                                        size="small"
                                        color={colors.primary}
                                      />
                                    ) : (
                                      <>
                                        <MaterialIcons
                                          name="add-photo-alternate"
                                          size={24 * fontScale}
                                          color={colors.primary}
                                        />
                                        <ThemedText
                                          size="xs"
                                          style={{
                                            color: colors.primary,
                                            marginTop: 4 * fontScale,
                                          }}
                                        >
                                          {t("profile.image.add") ||
                                            "Add photo"}
                                        </ThemedText>
                                      </>
                                    )}
                                  </TouchableOpacity>
                                )}
                              </View>

                              {/* Save button */}
                              <TouchableOpacity
                                style={[
                                  styles.saveEntityButton,
                                  (!isEntityFormValid() || isSavingEntity) &&
                                    styles.saveEntityButtonDisabled,
                                ]}
                                onPress={handleSaveNewEntity}
                                disabled={
                                  !isEntityFormValid() || isSavingEntity
                                }
                                activeOpacity={0.8}
                              >
                                {isSavingEntity ? (
                                  <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                  <ThemedText
                                    size="sm"
                                    weight="bold"
                                    style={{ color: "#FFFFFF" }}
                                  >
                                    {t("common.save") || "Save"}
                                  </ThemedText>
                                )}
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>

                        {/* Memory Items List */}
                        {memoryItems
                          .sort((a, b) => {
                            // Order: goodFact first, then hardTruth, then lesson
                            const order: Record<string, number> = {
                              goodFact: 0,
                              hardTruth: 1,
                              lesson: 2,
                            };
                            return (
                              (order[a.type] || 99) - (order[b.type] || 99)
                            );
                          })
                          .map((item) => (
                            <Pressable
                              key={item.id}
                              style={styles.memoryItem}
                              onPress={() => {
                                if (isKeyboardVisible) {
                                  Keyboard.dismiss();
                                }
                              }}
                            >
                              <View style={styles.memoryItemHeader}>
                                <MaterialIcons
                                  name={
                                    item.type === "hardTruth"
                                      ? "cloud"
                                      : item.type === "goodFact"
                                        ? "wb-sunny"
                                        : "lightbulb"
                                  }
                                  size={20 * fontScale}
                                  color={
                                    item.type === "hardTruth"
                                      ? "#64B5F6"
                                      : item.type === "goodFact"
                                        ? momentColors.sunny.background
                                        : momentColors.lesson.background
                                  }
                                />
                                <ThemedText
                                  size="sm"
                                  weight="medium"
                                  style={{
                                    marginLeft: 8 * fontScale,
                                    opacity: 0.7,
                                  }}
                                >
                                  {item.type === "hardTruth"
                                    ? t("ai.results.hardTruth") || "Hard Truth"
                                    : item.type === "goodFact"
                                      ? t("ai.results.goodFact") || "Good Fact"
                                      : t("ai.results.lesson") || "Lesson"}
                                </ThemedText>
                                <TouchableOpacity
                                  style={styles.removeItemButton}
                                  onPress={() => handleRemoveItem(item.id)}
                                >
                                  <MaterialIcons
                                    name="close"
                                    size={16 * fontScale}
                                    color={
                                      colors.textMediumEmphasis || colors.text
                                    }
                                  />
                                </TouchableOpacity>
                              </View>
                              <TextInput
                                style={styles.memoryItemText}
                                value={item.text}
                                onChangeText={(text) =>
                                  handleEditItem(item.id, text)
                                }
                                multiline
                                scrollEnabled={false}
                                placeholderTextColor={
                                  colors.textMediumEmphasis ||
                                  colors.text + "80"
                                }
                              />
                            </Pressable>
                          ))}
                      </>
                    )}
                  </ScrollView>

                  {/* Save Button - Always visible outside scroll */}
                  {aiResponse && memoryItems.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        (isProcessing ||
                          !selectedSphere ||
                          !selectedEntityId ||
                          (showAddEntityForm && !isEntityFormValid())) &&
                          styles.saveButtonDisabled,
                      ]}
                      onPress={handleSave}
                      disabled={
                        isProcessing ||
                        !selectedSphere ||
                        !selectedEntityId ||
                        (showAddEntityForm && !isEntityFormValid())
                      }
                      activeOpacity={0.8}
                    >
                      {isProcessing ? (
                        <>
                          <ActivityIndicator size="small" color="#ffffff" />
                          <ThemedText
                            size="l"
                            weight="bold"
                            style={{
                              color: "#ffffff",
                              marginLeft: 8 * fontScale,
                            }}
                          >
                            {t("ai.saving") || "Saving..."}
                          </ThemedText>
                        </>
                      ) : (
                        <>
                          <MaterialIcons
                            name="save"
                            size={20 * fontScale}
                            color="#ffffff"
                          />
                          <ThemedText
                            size="l"
                            weight="bold"
                            style={{
                              color: "#ffffff",
                              marginLeft: 8 * fontScale,
                            }}
                          >
                            {t("ai.save") || "Save"}
                          </ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>

        {/* Sphere Picker Modal */}
        <RNModal
          visible={showSpherePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSpherePicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowSpherePicker(false)}
          >
            <Pressable
              style={styles.pickerContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeader}>
                <ThemedText size="l" weight="bold">
                  {t("ai.results.selectSphere") || "Select Sfera"}
                </ThemedText>
                <Pressable onPress={() => setShowSpherePicker(false)}>
                  <MaterialIcons
                    name="close"
                    size={24 * fontScale}
                    color={colors.text}
                  />
                </Pressable>
              </View>
              <ScrollView style={styles.pickerList}>
                {(
                  [
                    "relationships",
                    "career",
                    "family",
                    "friends",
                    "hobbies",
                  ] as LifeSphere[]
                ).map((sphere) => {
                  const sphereLabels: Record<LifeSphere, string> = {
                    relationships:
                      t("spheres.relationships") || "Relationships",
                    career: t("spheres.career") || "Career",
                    family: t("spheres.family") || "Family",
                    friends: t("spheres.friends") || "Friends",
                    hobbies: t("spheres.hobbies") || "Hobbies",
                  };
                  return (
                    <Pressable
                      key={sphere}
                      style={[
                        styles.pickerItem,
                        selectedSphere === sphere && styles.pickerItemSelected,
                      ]}
                      onPress={() => handleSphereChange(sphere)}
                    >
                      <ThemedText
                        size="sm"
                        weight={selectedSphere === sphere ? "bold" : "normal"}
                      >
                        {sphereLabels[sphere]}
                      </ThemedText>
                      {selectedSphere === sphere && (
                        <MaterialIcons
                          name="check"
                          size={20 * fontScale}
                          color={colors.primary}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </RNModal>

        {/* Entity Picker Modal */}
        <RNModal
          visible={showEntityPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEntityPicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowEntityPicker(false)}
          >
            <Pressable
              style={styles.pickerContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeader}>
                <ThemedText size="l" weight="bold">
                  {t("ai.results.entity") || "Select Entity"}
                </ThemedText>
                <Pressable onPress={() => setShowEntityPicker(false)}>
                  <MaterialIcons
                    name="close"
                    size={24 * fontScale}
                    color={colors.text}
                  />
                </Pressable>
              </View>
              <ScrollView style={styles.pickerList}>
                {availableEntitiesForSphere.map((entity) => (
                  <Pressable
                    key={entity.id}
                    style={[
                      styles.pickerItem,
                      selectedEntityId === entity.id &&
                        styles.pickerItemSelected,
                    ]}
                    onPress={() => handleEntityChange(entity.id, entity.name)}
                  >
                    <ThemedText
                      size="sm"
                      weight={
                        selectedEntityId === entity.id ? "bold" : "normal"
                      }
                    >
                      {entity.name}
                    </ThemedText>
                    {selectedEntityId === entity.id && (
                      <MaterialIcons
                        name="check"
                        size={20 * fontScale}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </RNModal>

        {/* Close Confirmation Modal */}
        <RNModal
          visible={showCloseConfirm}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCloseConfirm(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowCloseConfirm(false)}
          >
            <Pressable
              style={styles.confirmModalContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <ThemedText
                size="l"
                weight="bold"
                style={{ marginBottom: 16 * fontScale }}
              >
                {t("ai.closeConfirm.title") || "Discard changes?"}
              </ThemedText>
              <ThemedText
                size="sm"
                style={{
                  marginBottom: 24 * fontScale,
                  opacity: 0.8,
                  textAlign: "center",
                }}
              >
                {t("ai.closeConfirm.message") ||
                  "Your progress will be lost if you close this modal."}
              </ThemedText>
              <View style={styles.confirmButtonContainer}>
                <Pressable
                  style={[styles.confirmButton, styles.cancelButton]}
                  onPress={() => setShowCloseConfirm(false)}
                >
                  <ThemedText size="sm" weight="semibold">
                    {t("common.cancel") || "Cancel"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.confirmButton, styles.discardButton]}
                  onPress={async () => {
                    setShowCloseConfirm(false);
                    // Log analytics event for AI memory discarded
                    await logAIMemoryDiscarded();
                    // Clear AsyncStorage when discarding
                    await clearPendingAIResponse();
                    await clearPendingAIRequest();
                    await stopBackgroundAIProcessing();
                    // Use setTimeout to ensure confirmation modal closes first
                    setTimeout(() => {
                      onClose();
                    }, 100);
                  }}
                >
                  <ThemedText
                    size="sm"
                    weight="semibold"
                    style={{ color: "#ffffff" }}
                  >
                    {t("ai.closeConfirm.discard") || "Discard"}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </RNModal>
      </Pressable>
    </Modal>
  );
}
