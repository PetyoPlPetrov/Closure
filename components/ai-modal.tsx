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
    AI_MODAL_RESULTS_DRAFT_VERSION,
    clearAIModalResultsDraft,
    getAIModalResultsDraft,
    getAIModalSessionKey,
    saveAIModalResultsDraft,
    type AIModalResultsDraftV1,
} from "@/utils/ai-modal-results-draft";
import {
  consumeAIRequestIfAvailable,
  getRemainingAIRequests,
  REQUESTS_PER_DAY_PREMIUM,
} from "@/utils/ai-rate-limiter";
import { processMemoryPrompt, processMomentsOnlyPrompt, type AIMemoryResponse, type AIMomentsOnlyResponse } from "@/utils/ai-service";
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
import { useFreeDailyAI } from "@/utils/FreeDailyAIProvider";
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** Onboarding Sfera AI bundle: lock entity/sphere and bypass daily AI consumption. */
  onboardingSferaAI?: {
    sphere: LifeSphere;
    entityId: string;
    entityName: string;
    contextBlurb: string;
  } | null;
  /** After successful save during onboarding bundle — skips post-save alert/open-memory sheet. */
  onOnboardingAIMemoryCommitted?: () => void;
}

interface AIMemoryItem {
  id: string;
  type: "hardTruth" | "goodFact" | "lesson";
  text: string;
  notificationMessage?: string;
}

interface AIMemoryDraft {
  id: string;
  title: string;
  items: AIMemoryItem[];
  sphere: LifeSphere | null;
  entityId: string | null;
  entityName: string | null;
}

export function AIModal({
  visible,
  onClose,
  onMinimize,
  onSend,
  pendingResponse,
  goldenEventId = null,
  onboardingSferaAI = null,
  onOnboardingAIMemoryCommitted,
}: AIModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { momentColors } = useMomentColors();
  const fontScale = useFontScale();
  const t = useTranslate();
  const { language, resolvedSpeechToTextLanguage } = useLanguage();
  const { showNotification, hideNotification } = useInAppNotification();
  const { hasAIEntitlement } = useSubscription();
  const { freeDailyAILimit } = useFreeDailyAI();
  const {
    profiles,
    jobs,
    familyMembers,
    friends,
    hobbies,
    idealizedMemories,
    addIdealizedMemory,
    updateIdealizedMemory,
    getIdealizedMemoriesByEntityId,
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
  const [memoryDrafts, setMemoryDrafts] = useState<AIMemoryDraft[]>([]);
  const [expandedDraftIds, setExpandedDraftIds] = useState<string[]>([]);
  const [spherePickerDraftId, setSpherePickerDraftId] = useState<string | null>(
    null,
  );
  const [entityPickerDraftId, setEntityPickerDraftId] = useState<string | null>(
    null,
  );
  const [addEntityDraftId, setAddEntityDraftId] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSpherePicker, setShowSpherePicker] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
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
  const [freeAIDailyLimit, setFreeAIDailyLimit] = useState(freeDailyAILimit);

  // "Add to existing memory" mode state
  const [addToExistingMemory, setAddToExistingMemory] = useState(false);
  const [selectedExistingSphere, setSelectedExistingSphere] = useState<LifeSphere | null>(null);
  const [selectedExistingEntityId, setSelectedExistingEntityId] = useState<string | null>(null);
  const [selectedExistingEntityName, setSelectedExistingEntityName] = useState<string | null>(null);
  const [selectedExistingMemoryId, setSelectedExistingMemoryId] = useState<string | null>(null);
  const [selectedExistingMemoryTitle, setSelectedExistingMemoryTitle] = useState<string | null>(null);
  const [showMemoryPicker, setShowMemoryPicker] = useState(false);
  const [memoryPickerSearch, setMemoryPickerSearch] = useState("");
  const [showTopLevelSpherePicker, setShowTopLevelSpherePicker] = useState(false);
  const [showTopLevelEntityPicker, setShowTopLevelEntityPicker] = useState(false);

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
    language: resolvedSpeechToTextLanguage,
    getText: () => inputText,
    setText: setInputTextWithLimit,
    disabled: isProcessing,
  });
  const { isRecording, isListening } = speechToText;

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

  const bypassDailyAiQuota = Boolean(goldenEventId || onboardingSferaAI);

  // Sfera AI subscribers with 0 remaining: disable submit (daily cap). Free users at 0: keep submit enabled; tap opens upgrade paywall via handleSend → consumeAIRequestIfAvailable.
  const hasRemainingRequests =
    bypassDailyAiQuota ||
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
    t("ai.loading.thinking"),
    t("ai.loading.analyzing"),
    t("ai.loading.processing"),
    t("ai.loading.generating"),
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

  const openContextRef = useRef<{
    goldenEventId: string | null | undefined;
    onboardingSferaAI: AIModalProps["onboardingSferaAI"];
  }>({ goldenEventId: null, onboardingSferaAI: null });

  const unsavedResultsSnapshotRef = useRef<Omit<
    AIModalResultsDraftV1,
    "version" | "timestamp" | "sessionKey"
  > | null>(null);

  const persistReviewDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  /** Writes current unsaved review snapshot to AsyncStorage (used on close, debounced while editing, and on app background). */
  const flushAIModalReviewDraftToStorage = useCallback(async () => {
    const snap = unsavedResultsSnapshotRef.current;
    const ctx = openContextRef.current;
    if (
      !snap?.aiResponse ||
      !snap.memoryDrafts.some((d) => d.items.length > 0)
    ) {
      return;
    }
    const sessionKey = getAIModalSessionKey({
      goldenEventId: ctx.goldenEventId ?? null,
      onboardingSferaAI: ctx.onboardingSferaAI ?? null,
    });
    await saveAIModalResultsDraft({
      version: AI_MODAL_RESULTS_DRAFT_VERSION,
      timestamp: Date.now(),
      sessionKey,
      ...snap,
    });
  }, []);

  /** Removes AsyncStorage draft + in-RAM snapshot so close/save/discard cannot resurrect old state. */
  const forgetPersistedAIModalReviewState = useCallback(async () => {
    if (persistReviewDraftTimerRef.current) {
      clearTimeout(persistReviewDraftTimerRef.current);
      persistReviewDraftTimerRef.current = null;
    }
    unsavedResultsSnapshotRef.current = null;
    await clearAIModalResultsDraft();
  }, []);

  // App state: used for foreground AI send + persist unsaved review when app leaves foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
      if (nextAppState === "background" || nextAppState === "inactive") {
        void flushAIModalReviewDraftToStorage();
      }
    });
    return () => subscription.remove();
  }, [flushAIModalReviewDraftToStorage]);

  const pendingResponseRef = useRef(pendingResponse);
  useEffect(() => {
    pendingResponseRef.current = pendingResponse;
  }, [pendingResponse]);

  useEffect(() => {
    openContextRef.current = { goldenEventId, onboardingSferaAI };
  }, [goldenEventId, onboardingSferaAI]);

  // While the modal is open, keep a snapshot for AsyncStorage if the user closes without saving.
  // Also debounce-write to disk so force-kill shortly after editing still leaves a recoverable draft.
  useEffect(() => {
    if (persistReviewDraftTimerRef.current) {
      clearTimeout(persistReviewDraftTimerRef.current);
      persistReviewDraftTimerRef.current = null;
    }

    if (!visible) {
      return;
    }
    if (
      aiResponse &&
      memoryDrafts.some((d) => d.items.length > 0)
    ) {
      unsavedResultsSnapshotRef.current = {
        aiResponse,
        memoryDrafts,
        expandedDraftIds,
        inputText,
        addEntityDraftId,
        showValidationErrors,
        newEntityName,
        newEntityDescription,
        newEntityRelationship,
        newEntityStartDateIso: newEntityStartDate
          ? newEntityStartDate.toISOString()
          : null,
        newEntityEndDateIso: newEntityEndDate
          ? newEntityEndDate.toISOString()
          : null,
        newEntityIsCurrent,
        newEntityImage,
        addToExistingMemory,
        selectedExistingSphere,
        selectedExistingEntityId,
        selectedExistingEntityName,
        selectedExistingMemoryId,
        selectedExistingMemoryTitle,
      };
      persistReviewDraftTimerRef.current = setTimeout(() => {
        persistReviewDraftTimerRef.current = null;
        void flushAIModalReviewDraftToStorage();
      }, 700);
    }

    return () => {
      if (persistReviewDraftTimerRef.current) {
        clearTimeout(persistReviewDraftTimerRef.current);
        persistReviewDraftTimerRef.current = null;
      }
    };
  }, [
    visible,
    aiResponse,
    memoryDrafts,
    expandedDraftIds,
    inputText,
    addEntityDraftId,
    showValidationErrors,
    newEntityName,
    newEntityDescription,
    newEntityRelationship,
    newEntityStartDate,
    newEntityEndDate,
    newEntityIsCurrent,
    newEntityImage,
    addToExistingMemory,
    selectedExistingSphere,
    selectedExistingEntityId,
    selectedExistingEntityName,
    selectedExistingMemoryId,
    selectedExistingMemoryTitle,
    flushAIModalReviewDraftToStorage,
  ]);

  // Boot: pending AI pipeline, then restored unsaved review draft, then fresh onboarding/default.
  useEffect(() => {
    if (!visible) return;
    isMinimizingRef.current = false;
    let cancelled = false;

    const boot = async () => {
      if (isAppCheckInitialized()) {
        await ensureAppCheckToken();
      }
      if (cancelled) return;

      const sessionKey = getAIModalSessionKey({
        goldenEventId: goldenEventId ?? null,
        onboardingSferaAI: onboardingSferaAI ?? null,
      });

      const propPending = pendingResponseRef.current?.response;
      if (propPending) {
        setCurrentView("loading");
        setIsProcessing(true);
        try {
          await processAIResponse(propPending);
        } catch (error) {
          setIsProcessing(false);
          const errorMsg =
            error instanceof Error
              ? error.message
              : t("ai.error.send");
          setErrorMessage(errorMsg);
          setCurrentView("error");
          if (backgroundRequestId) {
            await stopBackgroundAIProcessing();
            setBackgroundRequestId(null);
          }
        }
        return;
      }

      const pendingResp = await getPendingAIResponse();
      const pendingReq = await getPendingAIRequest();
      const isRunning = await isBackgroundTaskRunning();
      if (cancelled) return;

      if (pendingResp || pendingReq || isRunning) {
        await checkPendingAIResponse();
        return;
      }

      const draft = await getAIModalResultsDraft();
      if (cancelled) return;

      if (draft && draft.sessionKey !== sessionKey) {
        await clearAIModalResultsDraft();
      } else if (
        draft &&
        draft.sessionKey === sessionKey &&
        Array.isArray(draft.memoryDrafts) &&
        draft.memoryDrafts.some((m) => m.items?.length > 0)
      ) {
        setAiResponse(draft.aiResponse);
        const migratedDrafts: AIMemoryDraft[] = draft.memoryDrafts.map((m) => ({
          ...m,
          sphere:
            m.sphere ??
            draft.selectedSphere ??
            null,
          entityId: m.entityId ?? draft.selectedEntityId ?? null,
          entityName: m.entityName ?? draft.selectedEntityName ?? null,
        }));
        setMemoryDrafts(migratedDrafts);
        const restoredExpanded =
          draft.expandedDraftIds && draft.expandedDraftIds.length > 0
            ? draft.expandedDraftIds
            : migratedDrafts.map((d) => d.id);
        setExpandedDraftIds(restoredExpanded);
        setSpherePickerDraftId(null);
        setEntityPickerDraftId(null);
        setAddEntityDraftId(draft.addEntityDraftId ?? null);
        setInputText(draft.inputText ?? "");
        setShowValidationErrors(draft.showValidationErrors ?? false);
        setNewEntityName(draft.newEntityName ?? "");
        setNewEntityDescription(draft.newEntityDescription ?? "");
        setNewEntityRelationship(draft.newEntityRelationship ?? "");
        setNewEntityStartDate(
          draft.newEntityStartDateIso
            ? new Date(draft.newEntityStartDateIso)
            : null,
        );
        setNewEntityEndDate(
          draft.newEntityEndDateIso
            ? new Date(draft.newEntityEndDateIso)
            : null,
        );
        setNewEntityIsCurrent(draft.newEntityIsCurrent ?? false);
        setNewEntityImage(draft.newEntityImage ?? null);
        // Restore "add to existing memory" state
        setAddToExistingMemory(draft.addToExistingMemory ?? false);
        setSelectedExistingSphere(draft.selectedExistingSphere ?? null);
        setSelectedExistingEntityId(draft.selectedExistingEntityId ?? null);
        setSelectedExistingEntityName(draft.selectedExistingEntityName ?? null);
        setSelectedExistingMemoryId(draft.selectedExistingMemoryId ?? null);
        setSelectedExistingMemoryTitle(draft.selectedExistingMemoryTitle ?? null);
        setCurrentView("loading");
        setIsProcessing(false);
        setErrorMessage(null);
        setBackgroundRequestId(null);
        return;
      }

      if (onboardingSferaAI) {
        setSpherePickerDraftId(null);
        setEntityPickerDraftId(null);
        setAddEntityDraftId(null);
        setShowSpherePicker(false);
        setShowEntityPicker(false);
        setInputText("");
        setAiResponse(null);
        setMemoryDrafts([]);
        setExpandedDraftIds([]);
        setCurrentView("input");
        setErrorMessage(null);
        setShowValidationErrors(false);
        setBackgroundRequestId(null);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [
    visible,
    goldenEventId,
    onboardingSferaAI?.entityId,
    onboardingSferaAI?.sphere,
    onboardingSferaAI?.entityName,
    onboardingSferaAI?.contextBlurb,
  ]);

  // Fetch remaining free AI memory creations when modal is open on input view (not golden event).
  // Also subscribe to badge changes so the displayed limit/remaining updates the moment a memory
  // pushes the user across the Sferas threshold while the modal is still open.
  useEffect(() => {
    if (
      visible &&
      currentView === "input" &&
      !goldenEventId &&
      !onboardingSferaAI
    ) {
      const refresh = () => {
        getRemainingAIRequests(hasAIEntitlement, freeDailyAILimit).then(setRemainingAIRequests);
        if (!hasAIEntitlement) {
          getFreeAIDailyLimit(freeDailyAILimit).then(setFreeAIDailyLimit);
        }
      };
      refresh();
      const unsubscribe = subscribeBadgeRewardsChanged(refresh);
      return unsubscribe;
    } else if (!visible) {
      setRemainingAIRequests(null);
    }
  }, [visible, currentView, hasAIEntitlement, goldenEventId, onboardingSferaAI, freeDailyAILimit]);

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
              : t("ai.error.send");
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
              : t("ai.error.send");
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
      await forgetPersistedAIModalReviewState();
      // Map response memories into draft cards. Fallback to legacy single-memory shape.
      const momentTypeMap: Record<string, AIMemoryItem["type"]> = {
        sunnyMoments: "goodFact",
        hardTruths: "hardTruth",
        lessonsLearned: "lesson",
      };

      const responseMemories =
        response.memories && response.memories.length > 0
          ? response.memories
          : response.memory && response.moments
            ? [
                {
                  memory: response.memory,
                  moments: response.moments,
                  sphere: response.sphere,
                  entityName: response.entityName,
                },
              ]
            : [];

      const validSpheres: LifeSphere[] = [
        "relationships",
        "career",
        "family",
        "friends",
        "hobbies",
      ];

      const entityLists: Record<LifeSphere, { id: string; name: string }[]> = {
        relationships: profiles.map((p) => ({ id: p.id, name: p.name })),
        career: jobs.map((j) => ({ id: j.id, name: j.name })),
        family: familyMembers.map((f) => ({ id: f.id, name: f.name })),
        friends: friends.map((f) => ({ id: f.id, name: f.name })),
        hobbies: hobbies.map((h) => ({ id: h.id, name: h.name })),
      };

      const drafts: AIMemoryDraft[] = responseMemories.map((entry, memoryIndex) => {
        const items: AIMemoryItem[] = (entry.moments || []).map((moment, index) => ({
          id: `${momentTypeMap[moment.type] || "goodFact"}_${Date.now()}_${memoryIndex}_${index}_${Math.random().toString(36).slice(2, 8)}`,
          type: momentTypeMap[moment.type] || "goodFact",
          text: moment.text,
          notificationMessage:
            (moment as { notificationMessage?: string }).notificationMessage,
        }));

        if (onboardingSferaAI) {
          return {
            id: `memory_${Date.now()}_${memoryIndex}_${Math.random().toString(36).slice(2, 8)}`,
            title: entry.memory?.title?.trim() || `Memory ${memoryIndex + 1}`,
            items,
            sphere: onboardingSferaAI.sphere,
            entityId: onboardingSferaAI.entityId,
            entityName: onboardingSferaAI.entityName,
          };
        }

        const rawSphere = entry.sphere ?? response.sphere;
        const sphere: LifeSphere | null =
          rawSphere && validSpheres.includes(rawSphere as LifeSphere)
            ? (rawSphere as LifeSphere)
            : null;
        const suggestedName = (entry.entityName ?? response.entityName ?? "").trim();

        let entityId: string | null = null;
        let entityName: string | null = suggestedName || null;
        if (sphere && suggestedName) {
          const list = entityLists[sphere] || [];
          const match = list.find(
            (e) => e.name.toLowerCase() === suggestedName.toLowerCase(),
          );
          if (match) {
            entityId = match.id;
            entityName = match.name;
          }
        }

        return {
          id: `memory_${Date.now()}_${memoryIndex}_${Math.random().toString(36).slice(2, 8)}`,
          title: entry.memory?.title?.trim() || `Memory ${memoryIndex + 1}`,
          items,
          sphere,
          entityId,
          entityName,
        };
      });

      if (__DEV__) {
        for (const entry of responseMemories) {
          for (const m of entry.moments || []) {
            const nm = (m as { notificationMessage?: string }).notificationMessage;
            if (
              (m.type === "sunnyMoments" || m.type === "lessonsLearned") &&
              !nm?.trim()
            ) {
              console.warn(
                "[AI Modal] Missing notificationMessage for",
                m.type,
                m.text?.slice(0, 50),
              );
            }
          }
        }
      }

      setAiResponse(response);
      setMemoryDrafts(drafts);
      // Expand all cards by default so Sfera / entity / moments are visible without an extra tap.
      setExpandedDraftIds(drafts.map((d) => d.id));

      setSpherePickerDraftId(null);
      setEntityPickerDraftId(null);
      setAddEntityDraftId(null);

      setIsProcessing(false);
      // Stay on "loading" view — results render within it when aiResponse is set
    } catch (error) {
      setIsProcessing(false);
      const errorMsg =
        error instanceof Error
          ? error.message
          : t("ai.error.send");
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

      shouldPreserveState().then(async (preserve) => {
        if (!preserve) {
          // Actually closing (not minimizing) - reset all state
          // Close confirmation modal first if it's open
          setShowCloseConfirm(false);

          const snap = unsavedResultsSnapshotRef.current;
          if (
            snap?.aiResponse &&
            snap.memoryDrafts.some((d) => d.items.length > 0)
          ) {
            await flushAIModalReviewDraftToStorage();
          }
          unsavedResultsSnapshotRef.current = null;

          // Reset all state to initial values
          setInputText("");
          setIsProcessing(false);
          setCurrentView("input");
          setAiResponse(null);
          setMemoryDrafts([]);
          setExpandedDraftIds([]);
          setSpherePickerDraftId(null);
          setEntityPickerDraftId(null);
          setAddEntityDraftId(null);
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
      setMemoryDrafts([]);
      setExpandedDraftIds([]);
      setSpherePickerDraftId(null);
      setEntityPickerDraftId(null);
      setAddEntityDraftId(null);
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

  // "Add to existing memory" top-level picker handlers
  const handleTopLevelSphereSelect = useCallback((sphere: LifeSphere) => {
    setSelectedExistingSphere(sphere);
    setSelectedExistingEntityId(null);
    setSelectedExistingEntityName(null);
    setSelectedExistingMemoryId(null);
    setSelectedExistingMemoryTitle(null);
    setShowTopLevelSpherePicker(false);
  }, []);

  const handleTopLevelEntitySelect = useCallback((entityId: string, entityName: string) => {
    setSelectedExistingEntityId(entityId);
    setSelectedExistingEntityName(entityName);
    setSelectedExistingMemoryId(null);
    setSelectedExistingMemoryTitle(null);
    setShowTopLevelEntityPicker(false);
  }, []);

  const handleMemorySelect = useCallback((memoryId: string, memoryTitle: string) => {
    setSelectedExistingMemoryId(memoryId);
    setSelectedExistingMemoryTitle(memoryTitle);
    setShowMemoryPicker(false);
  }, []);

  const processAIMomentsOnlyResponse = useCallback(async (response: AIMomentsOnlyResponse) => {
    try {
      await forgetPersistedAIModalReviewState();
      const momentTypeMap: Record<string, AIMemoryItem["type"]> = {
        sunnyMoments: "goodFact",
        hardTruths: "hardTruth",
        lessonsLearned: "lesson",
      };

      const items: AIMemoryItem[] = (response.moments || []).map((moment, index) => ({
        id: `${momentTypeMap[moment.type] || "goodFact"}_${Date.now()}_0_${index}_${Math.random().toString(36).slice(2, 8)}`,
        type: momentTypeMap[moment.type] || "goodFact",
        text: moment.text,
        notificationMessage: moment.notificationMessage,
      }));

      const draft: AIMemoryDraft = {
        id: `moments_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: "",
        items,
        sphere: null,
        entityId: null,
        entityName: null,
      };

      setAiResponse({ memories: [] } as any);
      setMemoryDrafts([draft]);
      setExpandedDraftIds([draft.id]);
      // Stay on "loading" view — results render within it when aiResponse is set (same as normal flow)
      setIsProcessing(false);
    } catch (error) {
      console.error("[AI Modal] Failed to process moments-only response:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to process AI response",
      );
      setCurrentView("error");
      setIsProcessing(false);
    }
  }, [forgetPersistedAIModalReviewState]);

  const handleSend = async () => {
    if (!inputText.trim() || !canSubmit) {
      return;
    }

    // Ensure App Check is initialized before making AI requests (skip in dev)
    if (!__DEV__ && !isAppCheckInitialized()) {
      Alert.alert(t("common.error"), "App Check is not ready. Please try again.");

      return;
    }

    // Golden / onboarding bundle: bypass paywall and rate limit when applicable.
    if (!bypassDailyAiQuota) {
      // Enforce free-tier daily limit (3 by default, 5 with Sferas badge) and 30/day for Sfera AI.
      // Memory + entity creation share one pool. Atomic consume avoids race conditions.
      const consumed = await consumeAIRequestIfAvailable(hasAIEntitlement, freeDailyAILimit);
      if (!consumed) {
        if (!hasAIEntitlement) {
          await showPaywallForUpgradeAccess();
        } else {
          Alert.alert(
            t("ai.rateLimit.title"),
            t("ai.rateLimit.premiumMessage"),
            [{ text: t("common.ok"), style: "default" }],
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
      // Prepare sferas for AI: include descriptions/roles so indirect references ("my mother", etc.) map to the right name.
      const sferas = {
        relationships:
          profiles.length > 0
            ? profiles.map((p) => ({
                name: p.name,
                description: p.description?.trim() || undefined,
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
                description: j.description?.trim() || undefined,
                isCurrent: j.endDate === null || j.endDate === undefined,
                startDate: j.startDate,
                endDate: j.endDate,
              }))
            : undefined,
        family:
          familyMembers.length > 0
            ? familyMembers.map((f) => ({
                name: f.name,
                relationship: f.relationship?.trim() || undefined,
                description: f.description?.trim() || undefined,
              }))
            : undefined,
        friends:
          friends.length > 0
            ? friends.map((f) => ({
                name: f.name,
                description: f.description?.trim() || undefined,
              }))
            : undefined,
        hobbies:
          hobbies.length > 0
            ? hobbies.map((h) => ({
                name: h.name,
                description: h.description?.trim() || undefined,
              }))
            : undefined,
      };

      const narrativeAppendix =
        onboardingSferaAI?.contextBlurb?.trim()
          ? `Focus entity: "${onboardingSferaAI.entityName}" (${onboardingSferaAI.sphere}).\n${onboardingSferaAI.contextBlurb.trim()}`
          : undefined;

      // IMPORTANT: Only make ONE AI request to avoid rate limiting
      // If app is active, use foreground processing (faster). Otherwise use background task.
      if (appState === "active") {
        try {
          if (addToExistingMemory) {
            // Moments-only mode: simpler/faster AI call, always foreground
            const response = await processMomentsOnlyPrompt(
              inputText.trim(),
              { sferas },
              language,
            );
            await processAIMomentsOnlyResponse(response);
          } else {
            const response = await processMemoryPrompt(
              inputText.trim(),
              { sferas },
              language,
              undefined,
              narrativeAppendix,
            );
            await processAIResponse(response);
          }
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
      } else if (addToExistingMemory) {
        // Moments-only mode doesn't support background processing; wait for foreground
        try {
          const response = await processMomentsOnlyPrompt(
            inputText.trim(),
            { sferas },
            language,
          );
          await processAIMomentsOnlyResponse(response);
        } catch (error) {
          setIsProcessing(false);
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          setErrorMessage(errorMsg);
          setCurrentView("error");
        }
      } else {
        // App is already in background, use background task
        const requestId = await startBackgroundAIProcessing(
          inputText.trim(),
          { sferas },
          undefined,
          language,
          narrativeAppendix,
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

  const handleToggleDraftExpanded = (draftId: string) => {
    setExpandedDraftIds((prev) =>
      prev.includes(draftId)
        ? prev.filter((id) => id !== draftId)
        : [...prev, draftId],
    );
  };

  const handleEditItem = (draftId: string, id: string, newText: string) => {
    setMemoryDrafts((prev) =>
      prev.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              items: draft.items.map((item) =>
                item.id === id ? { ...item, text: newText } : item,
              ),
            }
          : draft,
      ),
    );
  };

  const handleRemoveItem = (draftId: string, id: string) => {
    setMemoryDrafts((prev) =>
      prev.map((draft) =>
        draft.id === draftId
          ? { ...draft, items: draft.items.filter((item) => item.id !== id) }
          : draft,
      ),
    );
  };

  const handleEditDraftTitle = (draftId: string, title: string) => {
    setMemoryDrafts((prev) =>
      prev.map((draft) =>
        draft.id === draftId ? { ...draft, title } : draft,
      ),
    );
  };

  const handleRetry = async () => {
    setErrorMessage(null);
    setCurrentView("input");
    // Retry the request
    await handleSend();
  };

  const handleBackToInput = () => {
    void forgetPersistedAIModalReviewState();
    setCurrentView("input");
    setInputText("");
    setAiResponse(null);
    setMemoryDrafts([]);
    setExpandedDraftIds([]);
    setSpherePickerDraftId(null);
    setEntityPickerDraftId(null);
    setAddEntityDraftId(null);
    // Reset add-to-existing state
    setSelectedExistingSphere(null);
    setSelectedExistingEntityId(null);
    setSelectedExistingEntityName(null);
    setSelectedExistingMemoryId(null);
    setSelectedExistingMemoryTitle(null);
  };

  const isMemoryDraftComplete = (d: AIMemoryDraft) =>
    Boolean(d.sphere && d.entityId && d.items.length > 0);

  const entityPickerEntities = useMemo(() => {
    if (!entityPickerDraftId) return [];
    const draft = memoryDrafts.find((x) => x.id === entityPickerDraftId);
    const sphere = draft?.sphere;
    if (!sphere) return [];
    switch (sphere) {
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
  }, [
    entityPickerDraftId,
    memoryDrafts,
    profiles,
    jobs,
    familyMembers,
    friends,
    hobbies,
  ]);

  const listEntitiesForSphere = (
    sphere: LifeSphere | null,
  ): { id: string; name: string }[] => {
    if (!sphere) return [];
    switch (sphere) {
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
  };

  const spherePickerLabels = useMemo(
    (): Record<LifeSphere, string> => ({
      relationships: t("spheres.relationships"),
      career: t("spheres.career"),
      family: t("spheres.family"),
      friends: t("spheres.friends"),
      hobbies: t("spheres.hobbies"),
    }),
    [t],
  );

  const sphereForActiveAddEntity = useMemo(() => {
    if (!addEntityDraftId) return null;
    return memoryDrafts.find((d) => d.id === addEntityDraftId)?.sphere ?? null;
  }, [addEntityDraftId, memoryDrafts]);

  const addEntityFormBlocksSave = Boolean(
    addEntityDraftId &&
      (!sphereForActiveAddEntity ||
        !newEntityName.trim() ||
        (sphereForActiveAddEntity === "family" &&
          !newEntityRelationship.trim())),
  );

  // "Add to existing memory" computed values
  const topLevelEntities = useMemo(() => {
    return listEntitiesForSphere(selectedExistingSphere);
  }, [selectedExistingSphere, profiles, jobs, familyMembers, friends, hobbies]);

  const existingMemoriesForEntity = useMemo(() => {
    if (!selectedExistingEntityId || !selectedExistingSphere) return [];
    return getIdealizedMemoriesByEntityId(selectedExistingEntityId, selectedExistingSphere);
  }, [selectedExistingEntityId, selectedExistingSphere, idealizedMemories]);

  const filteredMemoriesForPicker = useMemo(() => {
    if (!memoryPickerSearch.trim()) return existingMemoriesForEntity;
    const q = memoryPickerSearch.trim().toLowerCase();
    return existingMemoriesForEntity.filter((m) => m.title.toLowerCase().includes(q));
  }, [existingMemoriesForEntity, memoryPickerSearch]);

  const addToExistingReady =
    addToExistingMemory &&
    Boolean(selectedExistingSphere) &&
    Boolean(selectedExistingEntityId) &&
    Boolean(selectedExistingMemoryId) &&
    memoryDrafts.length > 0 &&
    memoryDrafts.some((d) => d.items.length > 0);

  const allMemoryDraftsReady = addToExistingMemory
    ? Boolean(addToExistingReady)
    : memoryDrafts.length > 0 &&
      memoryDrafts.every(isMemoryDraftComplete) &&
      !addEntityFormBlocksSave;

  useEffect(() => {
    if (addEntityDraftId == null) return;
    setNewEntityName("");
    setNewEntityDescription("");
    setNewEntityRelationship("");
    setNewEntityStartDate(null);
    setNewEntityEndDate(null);
    setNewEntityIsCurrent(false);
    setNewEntityImage(null);
  }, [addEntityDraftId]);

  const applyDraftSphere = (draftId: string, sphere: LifeSphere) => {
    setMemoryDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? { ...d, sphere, entityId: null, entityName: null }
          : d,
      ),
    );
    setShowSpherePicker(false);
    setSpherePickerDraftId(null);
  };

  const applyDraftEntity = (
    draftId: string,
    entityId: string,
    entityName: string,
  ) => {
    setMemoryDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId ? { ...d, entityId, entityName } : d,
      ),
    );
    setShowEntityPicker(false);
    setEntityPickerDraftId(null);
    if (showValidationErrors) setShowValidationErrors(false);
  };

  const isEntityFormValid = () => {
    if (!addEntityDraftId || !sphereForActiveAddEntity) return false;
    if (!newEntityName.trim()) return false;
    if (
      sphereForActiveAddEntity === "family" &&
      !newEntityRelationship.trim()
    )
      return false;
    return true;
  };

  // Handle saving new entity
  const handleSaveNewEntity = async () => {
    if (!isEntityFormValid() || !addEntityDraftId || !sphereForActiveAddEntity) {
      setShowValidationErrors(true);
      return;
    }

    const targetDraftId = addEntityDraftId;
    const sphere = sphereForActiveAddEntity;

    setIsSavingEntity(true);
    try {
      const resolvedEntityImage = newEntityImage
        ? await ensureImageInAppDocuments(newEntityImage)
        : undefined;

      let newEntityId: string;

      if (sphere === "family") {
        newEntityId = await addFamilyMember({
          name: newEntityName.trim(),
          description: newEntityDescription.trim() || undefined,
          relationship: newEntityRelationship.trim(),
          imageUri: resolvedEntityImage,
          setupProgress: 0,
          isCompleted: false,
        });
      } else if (sphere === "friends") {
        newEntityId = await addFriend({
          name: newEntityName.trim(),
          description: newEntityDescription.trim() || undefined,
          imageUri: resolvedEntityImage,
          setupProgress: 0,
          isCompleted: false,
        });
      } else if (sphere === "career") {
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
      } else if (sphere === "hobbies") {
        newEntityId = await addHobby({
          name: newEntityName.trim(),
          description: newEntityDescription.trim() || undefined,
          imageUri: resolvedEntityImage,
          setupProgress: 0,
          isCompleted: false,
        });
      } else if (sphere === "relationships") {
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

      setMemoryDrafts((prev) =>
        prev.map((d) =>
          d.id === targetDraftId
            ? {
                ...d,
                entityId: newEntityId,
                entityName: newEntityName.trim(),
              }
            : d,
        ),
      );
      setShowValidationErrors(false);
      setAddEntityDraftId(null);

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
        t("common.error"),
        (error as Error).message ||
          t("ai.entity.saveError"),
      );
    } finally {
      setIsSavingEntity(false);
    }
  };

  const handleSaveToExisting = async () => {
    if (!selectedExistingMemoryId || !selectedExistingSphere || !selectedExistingEntityId) return;
    if (!memoryDrafts[0] || memoryDrafts[0].items.length === 0) return;

    setIsProcessing(true);
    try {
      const draft = memoryDrafts[0];
      const existingMemory = existingMemoriesForEntity.find((m) => m.id === selectedExistingMemoryId);
      if (!existingMemory) throw new Error("Memory not found");

      const newHardTruths = draft.items
        .filter((i) => i.type === "hardTruth")
        .map((i) => ({ id: i.id, text: i.text }));
      const newGoodFacts = draft.items
        .filter((i) => i.type === "goodFact")
        .map((i) => ({ id: i.id, text: i.text }));
      const newLessons = draft.items
        .filter((i) => i.type === "lesson")
        .map((i) => ({ id: i.id, text: i.text }));

      await updateIdealizedMemory(selectedExistingMemoryId, {
        hardTruths: [...(existingMemory.hardTruths || []), ...newHardTruths],
        goodFacts: [...(existingMemory.goodFacts || []), ...newGoodFacts],
        lessonsLearned: [...(existingMemory.lessonsLearned || []), ...newLessons],
      });

      // Handle notification messages for lesson/sunny moments
      const itemsNeedingSummary = draft.items.filter(
        (item) => item.type === "lesson" || item.type === "goodFact",
      );
      const lessonsWithoutMessage = itemsNeedingSummary.filter(
        (item) => item.type === "lesson" && !item.notificationMessage?.trim(),
      );
      const sunnyWithoutMessage = itemsNeedingSummary.filter(
        (item) => item.type === "goodFact" && !item.notificationMessage?.trim(),
      );

      const resolvedMessages: Record<string, string> = {};
      if (lessonsWithoutMessage.length > 0 || sunnyWithoutMessage.length > 0) {
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
                  memoryTitle: existingMemory.title,
                  sphere: selectedExistingSphere,
                })),
                lang,
              )
            : Promise.resolve({} as Record<string, string>),
          sunnyWithoutMessage.length > 0
            ? suggestNotificationMessagesForSunnyMoments(
                sunnyWithoutMessage.map((s) => ({
                  id: s.id,
                  text: s.text,
                  memoryTitle: existingMemory.title,
                  sphere: selectedExistingSphere,
                })),
                lang,
              )
            : Promise.resolve({} as Record<string, string>),
        ]);
        Object.assign(resolvedMessages, lessonMap, sunnyMap);
      }

      const toPersist: Parameters<typeof addSummariesBatch>[0] = [];
      for (const item of itemsNeedingSummary) {
        const message =
          item.notificationMessage?.trim() || resolvedMessages[item.id]?.trim();
        if (!message) continue;
        toPersist.push({
          momentId: item.id,
          memoryId: selectedExistingMemoryId,
          entityId: selectedExistingEntityId,
          sphere: selectedExistingSphere,
          momentType: item.type === "lesson" ? "lesson" : "sunny",
          momentText: item.text,
          notificationMessage: message,
          source: "ai_suggested",
        });
      }
      if (toPersist.length > 0) {
        await addSummariesBatch(toPersist);
      }

      await logAIMemorySaved(selectedExistingSphere, false, draft.items.length);

      // Streak update
      try {
        const streakResult = await updateStreakOnMemoryCreation();
        const currentStreak = streakResult.data.currentStreak;
        const milestoneBadge =
          streakResult.newMilestones
            .map((milestone) => getBadgeForStreak(milestone))
            .find((badge): badge is NonNullable<typeof badge> => badge !== null) || null;
        const unlockedBadge = streakResult.newBadges[0] || milestoneBadge;

        if (unlockedBadge) {
          const badge = unlockedBadge;
          const emoji =
            badge.daysRequired >= 14 ? "🏆" : badge.daysRequired >= 7 ? "🌟" : badge.daysRequired >= 3 ? "🔥" : "✨";
          showNotification({ title: "New Badge Unlocked!", message: `You've earned the ${badge.name} badge with ${badge.daysRequired} consecutive days!`, emoji, duration: 4000 });
        } else if (streakResult.newMilestones.length > 0) {
          const milestone = streakResult.newMilestones[0];
          const emoji = milestone >= 14 ? "🏆" : milestone >= 7 ? "🌟" : milestone >= 3 ? "🔥" : "✨";
          showNotification({ title: `${milestone}-day streak!`, message: `Amazing! You've created memories for ${milestone} days in a row.`, emoji, duration: 4000 });
        } else if (streakResult.streakIncreased || streakResult.isFirstMemory) {
          const emoji = currentStreak >= 14 ? "🏆" : currentStreak >= 7 ? "⭐" : currentStreak >= 3 ? "🔥" : "✨";
          const title = currentStreak === 1 ? "Streak started!" : currentStreak === 2 ? "Great start!" : `${currentStreak}-day streak!`;
          const message = currentStreak === 1 ? "You're on day 1! Keep creating memories daily to build your streak." : currentStreak === 2 ? "2 days in a row! One more day until your Pulse badge." : `Amazing! You've created memories for ${currentStreak} days in a row. Keep it up!`;
          showNotification({ title, message, emoji, duration: 3000 });
        }
      } catch {
        // noop
      }

      await clearPendingAIResponse();
      await clearPendingAIRequest();
      await stopBackgroundAIProcessing();
      await forgetPersistedAIModalReviewState();

      onClose();

      Alert.alert(
        t("ai.save.updated"),
        t("ai.save.updatedMessage"),
        [
          { text: t("common.close"), style: "cancel" },
          {
            text: t("ai.openMemory"),
            onPress: () => {
              const openSphere = selectedExistingSphere!;
              const openEntityId = selectedExistingEntityId!;
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
                sphere: openSphere,
                entityId: openEntityId,
                focusedMemoryId: selectedExistingMemoryId!,
                source: "ai_modal_update",
              };

              if (openSphere === "relationships") detailParams.profileId = openEntityId;
              else if (openSphere === "career") detailParams.jobId = openEntityId;
              else if (openSphere === "family") detailParams.familyMemberId = openEntityId;
              else if (openSphere === "friends") detailParams.friendId = openEntityId;
              else if (openSphere === "hobbies") detailParams.hobbyId = openEntityId;

              router.replace({
                pathname: "/" as const,
                params: detailParams,
              });
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(t("common.error"), (error as Error).message || t("ai.save.error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (addToExistingMemory) {
      await handleSaveToExisting();
      return;
    }

    if (!aiResponse || memoryDrafts.length === 0) {
      return;
    }

    if (!allMemoryDraftsReady) {
      setShowValidationErrors(true);
      Alert.alert(
        t("common.error"),
        t("ai.results.completeAllCards"),
      );
      return;
    }

    setShowValidationErrors(false);

    setIsProcessing(true);
    try {
      const draftsToSave = memoryDrafts.filter(
        (draft) =>
          draft.items.length > 0 &&
          draft.sphere &&
          draft.entityId,
      );
      if (draftsToSave.length === 0) {
        throw new Error("No memory items available to save.");
      }

      const savedMemoryIds: string[] = [];
      let totalSavedItemsCount = 0;

      for (const draft of draftsToSave) {
        const finalSphere = draft.sphere!;
        const finalEntityId = draft.entityId!;
        const hardTruths = draft.items
          .filter((item) => item.type === "hardTruth")
          .map((item) => ({
            id: item.id,
            text: item.text,
          }));

        const goodFacts = draft.items
          .filter((item) => item.type === "goodFact")
          .map((item) => ({
            id: item.id,
            text: item.text,
          }));

        const lessonsLearned = draft.items
          .filter((item) => item.type === "lesson")
          .map((item) => ({
            id: item.id,
            text: item.text,
          }));

        const memoryId = await addIdealizedMemory(
          finalEntityId,
          finalSphere,
          {
            title: draft.title || "",
            imageUri: undefined,
            hardTruths,
            goodFacts,
            lessonsLearned,
            source: "ai",
          },
          { bypassMemoryLimit: true },
        );

        // Limit reached and user dismissed paywall - don't proceed
        if (!memoryId) {
          setIsProcessing(false);
          return;
        }

        savedMemoryIds.push(memoryId);
        totalSavedItemsCount += draft.items.length;

        const itemsNeedingSummary = draft.items.filter(
          (item) => item.type === "lesson" || item.type === "goodFact",
        );
        const lessonsWithoutMessage = itemsNeedingSummary.filter(
          (item) => item.type === "lesson" && !item.notificationMessage?.trim(),
        );
        const sunnyWithoutMessage = itemsNeedingSummary.filter(
          (item) => item.type === "goodFact" && !item.notificationMessage?.trim(),
        );

        const resolvedMessages: Record<string, string> = {};
        if (lessonsWithoutMessage.length > 0 || sunnyWithoutMessage.length > 0) {
          console.log(
            `[AI Modal] Backfilling missing notificationMessages — lessons: ${lessonsWithoutMessage.length}, sunny: ${sunnyWithoutMessage.length}`,
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
                    memoryTitle: draft.title,
                    sphere: finalSphere,
                  })),
                  lang,
                )
              : Promise.resolve({} as Record<string, string>),
            sunnyWithoutMessage.length > 0
              ? suggestNotificationMessagesForSunnyMoments(
                  sunnyWithoutMessage.map((s) => ({
                    id: s.id,
                    text: s.text,
                    memoryTitle: draft.title,
                    sphere: finalSphere,
                  })),
                  lang,
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
          console.error(
            `[AI Modal] Coverage gap after backfill — ${unresolvedItems.length} item(s) without notificationMessage`,
            { unresolvedItems },
          );
          throw new Error(
            `AI could not generate notification messages for ${unresolvedItems.length} item(s). Please try again.`,
          );
        }
        if (toPersist.length > 0) {
          await addSummariesBatch(toPersist);
        }
        console.log(
          `[AI Modal] Persisted ${toPersist.length}/${itemsNeedingSummary.length} moment notification summaries`,
        );
      }

      // Log analytics event for AI memory saved (sphere from last saved memory)
      await logAIMemorySaved(
        draftsToSave[draftsToSave.length - 1]!.sphere!,
        false,
        totalSavedItemsCount,
      );

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
      await forgetPersistedAIModalReviewState();

      // Golden event AI access: mark one-time use as consumed and clear all reminders for this event
      if (goldenEventId) {
        await markEventGoldenMemoryUsed(goldenEventId);
        await cancelEventMemoryReminders(goldenEventId);
        await clearEventReminderInAppForEvent(goldenEventId);
        hideNotification(); // dismiss the event memory reminder toast now that a memory was created
      }

      // Close the modal first
      onClose();

      if (onOnboardingAIMemoryCommitted) {
        await Promise.resolve(onOnboardingAIMemoryCommitted());
      } else {
        // Show success alert with option to open memory
        Alert.alert(
          t("ai.save.success"),
          t("ai.save.successMessage"),
          [
            {
              text: t("common.close"),
              style: "cancel",
            },
            {
              text: t("ai.openMemory"),
              onPress: () => {
                const first = draftsToSave[0]!;
                const openSphere = first.sphere!;
                const openEntityId = first.entityId!;
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
                  sphere: openSphere,
                  entityId: openEntityId,
                  focusedMemoryId: savedMemoryIds[0]!,
                  source: "ai_modal_save",
                };

                if (openSphere === "relationships") detailParams.profileId = openEntityId;
                else if (openSphere === "career") detailParams.jobId = openEntityId;
                else if (openSphere === "family") detailParams.familyMemberId = openEntityId;
                else if (openSphere === "friends") detailParams.friendId = openEntityId;
                else if (openSphere === "hobbies") detailParams.hobbyId = openEntityId;

                router.replace({
                  pathname: "/" as const,
                  params: detailParams,
                });
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert(
        t("common.error"),
        (error as Error).message ||
          t("ai.save.error"),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const closeAddEntityFormWithoutSave = () => {
    setAddEntityDraftId(null);
    setNewEntityName("");
    setNewEntityDescription("");
    setNewEntityRelationship("");
    setNewEntityStartDate(null);
    setNewEntityEndDate(null);
    setNewEntityIsCurrent(false);
    setNewEntityImage(null);
    setShowValidationErrors(false);
  };

  const renderAddEntityFormForDraft = (draft: AIMemoryDraft) => {
    if (addEntityDraftId !== draft.id || !draft.sphere) return null;
    const formSphere = draft.sphere;
    return (
                                <View style={styles.addEntityForm}>
                                  <View style={styles.addEntityFormHeader}>
                                    <ThemedText size="sm" weight="bold">
                                      {formSphere === "family"
                                        ? t("profile.familyMember.add")
                                        : formSphere === "friends"
                                          ? t("profile.friend.add")
                                          : formSphere === "career"
                                            ? t("profile.job.add")
                                            : formSphere === "hobbies"
                                              ? t("profile.hobby.add")
                                              : t("profile.relationship.add")}
                                    </ThemedText>
                                    <TouchableOpacity
                                      onPress={closeAddEntityFormWithoutSave}
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
                                      {t("profile.name")} *
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
                                        t("profile.name.placeholder")
                                      }
                                      placeholderTextColor={
                                        colorScheme === "dark"
                                          ? colors.textMediumEmphasis
                                          : colors.text + "80"
                                      }
                                    />
                                  </View>

                                  {/* Relationship field - required for family */}
                                  {formSphere === "family" && (
                                    <View style={styles.formField}>
                                      <ThemedText
                                        size="xs"
                                        weight="medium"
                                        style={styles.formLabel}
                                      >
                                        {t("profile.familyMember.relationship")}{" "}
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
                                          )
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
                                  {(formSphere === "career" ||
                                    formSphere === "relationships") && (
                                    <>
                                      <View style={styles.formField}>
                                        <ThemedText
                                          size="xs"
                                          weight="medium"
                                          style={styles.formLabel}
                                        >
                                          {t("profile.job.startDate")}
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
                                              : t("profile.job.selectStartDate")}
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
                                                        {t("common.cancel")}
                                                      </ThemedText>
                                                    </TouchableOpacity>
                                                    <ThemedText
                                                      size="l"
                                                      weight="semibold"
                                                    >
                                                      {t("profile.job.startDate")}
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
                                                        {t("common.ok")}
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
                                                    style={{ height: 200 * fontScale }}
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
                                            {t("profile.job.current")}
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
                                            {t("profile.job.endDate")}
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
                                                : t("profile.job.selectEndDate")}
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
                                                          {t("common.cancel")}
                                                        </ThemedText>
                                                      </TouchableOpacity>
                                                      <ThemedText
                                                        size="l"
                                                        weight="semibold"
                                                      >
                                                        {t("profile.job.endDate")}
                                                      </ThemedText>
                                                      <TouchableOpacity
                                                        onPress={() => {
                                                          if (
                                                            newEntityStartDate &&
                                                            endDatePickerTemp <
                                                              newEntityStartDate
                                                          ) {
                                                            Alert.alert(
                                                              t("common.error"),
                                                              t(
                                                                "profile.date.error.endBeforeStart",
                                                              ),
                                                              [
                                                                {
                                                                  text:
                                                                    t(
                                                                      "common.ok",
                                                                    ),
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
                                                          {t("common.ok")}
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
                                                      style={{ height: 200 * fontScale }}
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
                                      {t("profile.description")}
                                    </ThemedText>
                                    <TextInput
                                      style={[
                                        styles.formInput,
                                        styles.formTextArea,
                                      ]}
                                      value={newEntityDescription}
                                      onChangeText={setNewEntityDescription}
                                      placeholder={
                                        t("profile.description.placeholder")
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
                                      {t("profile.image")}
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
                                              {t("profile.image.add")}
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
                                        {t("common.save")}
                                      </ThemedText>
                                    )}
                                  </TouchableOpacity>
                                </View>
    );
  };

  const spherePickerTargetDraft =
    spherePickerDraftId != null
      ? memoryDrafts.find((d) => d.id === spherePickerDraftId)
      : undefined;
  const spherePickerSelected = spherePickerTargetDraft?.sphere ?? null;

  const entityPickerTargetDraft =
    entityPickerDraftId != null
      ? memoryDrafts.find((d) => d.id === entityPickerDraftId)
      : undefined;

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
      maxWidth: 600 * fontScale,
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
      maxWidth: 600 * fontScale,
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
      backgroundColor: isRecording
        ? colors.error || "#FF3B30"
        : colorScheme === "light"
          ? Colors.dark.primary
          : colors.primary,
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
      position: "relative",
      paddingHorizontal: 18 * fontScale,
    },
    submitButtonContent: {
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      gap: 8 * fontScale,
    },
    submitButtonDisabled: {
      opacity: 1,
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
    suggestedMemoriesIntro: {
      marginBottom: 14 * fontScale,
      paddingBottom: 14 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.08)",
    },
    memoryDraftCardWrap: {
      position: "relative" as const,
      marginBottom: 14 * fontScale,
    },
    memoryDraftReviewDot: {
      position: "absolute" as const,
      top: 10 * fontScale,
      right: 12 * fontScale,
      width: 10 * fontScale,
      height: 10 * fontScale,
      borderRadius: 5 * fontScale,
      backgroundColor: "#FF3B30",
      zIndex: 2,
    },
    memoryDraftCard: {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.06)"
          : "rgba(0, 0, 0, 0.04)",
      borderWidth: 1,
      borderColor:
        colorScheme === "dark"
          ? "rgba(100, 181, 246, 0.35)"
          : "rgba(74, 144, 226, 0.45)",
      borderRadius: 16 * fontScale,
      padding: 14 * fontScale,
    },
    memoryDraftCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10 * fontScale,
      marginBottom: 0,
    },
    memoryDraftTitleField: {
      marginTop: 14 * fontScale,
      marginBottom: 10 * fontScale,
    },
    memoryDraftTitleInput: {
      marginTop: 6 * fontScale,
      fontSize: 16 * fontScale,
      lineHeight: 22 * fontScale,
      color: colors.text,
      borderWidth: 1,
      borderColor:
        colorScheme === "dark"
          ? "rgba(255, 255, 255, 0.14)"
          : "rgba(0, 0, 0, 0.12)",
      borderRadius: 12 * fontScale,
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 10 * fontScale,
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
                        {t("ai.title")}
                      </ThemedText>
                    </View>
                    <ThemedText size="sm" style={styles.headerSubtitle}>
                      {t("ai.subtitle")}
                    </ThemedText>
                    {currentView !== "input" &&
                      !onboardingSferaAI &&
                      remainingAIRequests !== null &&
                      (hasAIEntitlement || freeAIDailyLimit > 0) &&
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
                          {t("ai.rateLimit.premiumMessage")}
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
                          {t("ai.remainingCreations")
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
                          t("ai.placeholder.input")
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
                          color={
                            colorScheme === "light"
                              ? Colors.dark.primary
                              : colors.primary
                          }
                        />
                        <ThemedText size="sm" style={{ opacity: 0.7 }}>
                          {t("ai.listening")}
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

                  {/* Add to existing memory toggle */}
                  {!onboardingSferaAI && !goldenEventId && idealizedMemories.length > 0 && (
                    <Pressable
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16 * fontScale,
                        marginBottom: 8 * fontScale,
                        gap: 8 * fontScale,
                      }}
                      onPress={() => setAddToExistingMemory((prev) => !prev)}
                    >
                      <MaterialIcons
                        name={
                          addToExistingMemory
                            ? "check-box"
                            : "check-box-outline-blank"
                        }
                        size={22 * fontScale}
                        color={
                          addToExistingMemory
                            ? colors.primary
                            : colors.textMediumEmphasis || colors.text + "80"
                        }
                      />
                      <ThemedText size="sm" style={{ opacity: 0.85 }}>
                        {t("ai.addToExisting")}
                      </ThemedText>
                    </Pressable>
                  )}

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
                                "rgba(255, 255, 255, 0.3)",
                                "rgba(255, 255, 255, 0.28)",
                              ]
                            : ["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.18)"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitButton}
                    >
                      <View
                        style={styles.submitButtonContent}
                        pointerEvents="none"
                      >
                        <ThemedText
                          style={{
                            fontSize: 20 * fontScale,
                            color:
                              canSubmit
                                ? "#FFFFFF"
                                : colorScheme === "dark"
                                  ? "#FFFFFF"
                                  : "#1F2937",
                          }}
                        >
                          ✨
                        </ThemedText>
                        <ThemedText
                          size="l"
                          weight="bold"
                          style={{
                            color:
                              canSubmit
                                ? "#FFFFFF"
                                : colorScheme === "dark"
                                  ? "#FFFFFF"
                                  : "#1F2937",
                          }}
                        >
                          {t("ai.submit")}
                        </ThemedText>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                  {remainingAIRequests !== null &&
                    !onboardingSferaAI &&
                    (hasAIEntitlement || freeAIDailyLimit > 0) &&
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
                        {t("ai.rateLimit.premiumMessage")}
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
                        {t("ai.remainingCreations")
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
                      {t("ai.error.minimumWords")}
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
                      {t("ai.error.maximumLength", { max: MAX_INPUT_LENGTH })}
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
                        {t("ai.error.title")}
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
                      {t("ai.error.title")}
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
                          {t("common.cancel")}
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
                              {t("common.retry")}
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

                    {/* Results — Add to Existing Memory mode */}
                    {aiResponse && addToExistingMemory && memoryDrafts[0] && (
                      <>
                        {/* Top-level dropdowns — always visible, disabled until previous is filled */}
                        <View style={{ paddingHorizontal: 16 * fontScale, marginTop: 20 * fontScale }}>
                          {/* Sfera picker */}
                          <View style={styles.dropdownContainer}>
                            <ThemedText size="xs" weight="medium" style={styles.dropdownLabel}>
                              {t("ai.results.sphere")}
                            </ThemedText>
                            <Pressable
                              style={[
                                styles.dropdownButton,
                                !selectedExistingSphere
                                  ? { borderColor: colorScheme === "dark" ? "#FF6B6B" : "#D93025", borderWidth: 1.5 }
                                  : null,
                              ].filter(Boolean)}
                              onPress={() => setShowTopLevelSpherePicker(true)}
                            >
                              <ThemedText size="sm" weight="semibold">
                                {selectedExistingSphere
                                  ? spherePickerLabels[selectedExistingSphere]
                                  : t("ai.results.selectSphere")}
                              </ThemedText>
                              <MaterialIcons name="arrow-drop-down" size={24 * fontScale} color={colors.text} />
                            </Pressable>
                          </View>

                          {/* Entity picker — always visible, disabled when no sphere */}
                          <View style={[styles.dropdownContainer, { marginTop: 12 * fontScale }]}>
                            <ThemedText
                              size="xs"
                              weight="medium"
                              style={[styles.dropdownLabel, !selectedExistingSphere && { opacity: 0.4 }]}
                            >
                              {t("ai.results.entity")}
                            </ThemedText>
                            <Pressable
                              style={[
                                styles.dropdownButton,
                                !selectedExistingSphere && { opacity: 0.4 },
                                selectedExistingSphere && !selectedExistingEntityId
                                  ? { borderColor: colorScheme === "dark" ? "#FF6B6B" : "#D93025", borderWidth: 1.5 }
                                  : null,
                              ].filter(Boolean)}
                              onPress={() => {
                                if (selectedExistingSphere) setShowTopLevelEntityPicker(true);
                              }}
                              disabled={!selectedExistingSphere}
                            >
                              <ThemedText size="sm" weight="semibold">
                                {selectedExistingEntityName || t("ai.results.selectEntity")}
                              </ThemedText>
                              <MaterialIcons name="arrow-drop-down" size={24 * fontScale} color={colors.text} />
                            </Pressable>
                          </View>

                          {/* Memory picker — always visible, disabled when no entity */}
                          <View style={[styles.dropdownContainer, { marginTop: 12 * fontScale }]}>
                            <ThemedText
                              size="xs"
                              weight="medium"
                              style={[styles.dropdownLabel, !selectedExistingEntityId && { opacity: 0.4 }]}
                            >
                              {t("ai.results.memory")}
                            </ThemedText>
                            {selectedExistingEntityId && existingMemoriesForEntity.length === 0 ? (
                              <ThemedText size="sm" style={{ opacity: 0.6, paddingVertical: 8 * fontScale }}>
                                {t("ai.results.noMemories")}
                              </ThemedText>
                            ) : (
                              <Pressable
                                style={[
                                  styles.dropdownButton,
                                  !selectedExistingEntityId && { opacity: 0.4 },
                                  selectedExistingEntityId && !selectedExistingMemoryId
                                    ? { borderColor: colorScheme === "dark" ? "#FF6B6B" : "#D93025", borderWidth: 1.5 }
                                    : null,
                                ].filter(Boolean)}
                                onPress={() => {
                                  if (selectedExistingEntityId) {
                                    setMemoryPickerSearch("");
                                    setShowMemoryPicker(true);
                                  }
                                }}
                                disabled={!selectedExistingEntityId}
                              >
                                <ThemedText size="sm" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                                  {selectedExistingMemoryTitle || t("ai.results.selectMemory")}
                                </ThemedText>
                                <MaterialIcons name="arrow-drop-down" size={24 * fontScale} color={colors.text} />
                              </Pressable>
                            )}
                          </View>
                        </View>

                        {/* Moments list */}
                        <View style={{ paddingHorizontal: 16 * fontScale, marginTop: 16 * fontScale }}>
                          {memoryDrafts[0].items
                            .slice()
                            .sort((a, b) => {
                              const order: Record<string, number> = {
                                goodFact: 0,
                                hardTruth: 1,
                                lesson: 2,
                              };
                              return (order[a.type] || 99) - (order[b.type] || 99);
                            })
                            .map((item) => (
                              <Pressable
                                key={item.id}
                                style={styles.memoryItem}
                                onPress={() => {
                                  if (isKeyboardVisible) Keyboard.dismiss();
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
                                        ? Colors.dark.primary
                                        : item.type === "goodFact"
                                          ? momentColors.sunny.background
                                          : momentColors.lesson.background
                                    }
                                  />
                                  <ThemedText
                                    size="sm"
                                    weight="medium"
                                    style={{ marginLeft: 8 * fontScale, opacity: 0.7 }}
                                  >
                                    {item.type === "hardTruth"
                                      ? t("ai.results.hardTruth")
                                      : item.type === "goodFact"
                                        ? t("ai.results.goodFact")
                                        : t("ai.results.lesson")}
                                  </ThemedText>
                                  <TouchableOpacity
                                    style={styles.removeItemButton}
                                    onPress={() => handleRemoveItem(memoryDrafts[0].id, item.id)}
                                  >
                                    <MaterialIcons
                                      name="close"
                                      size={16 * fontScale}
                                      color={colors.textMediumEmphasis || colors.text}
                                    />
                                  </TouchableOpacity>
                                </View>
                                <TextInput
                                  style={styles.memoryItemText}
                                  value={item.text}
                                  onChangeText={(text) =>
                                    handleEditItem(memoryDrafts[0].id, item.id, text)
                                  }
                                  multiline
                                  scrollEnabled={false}
                                  placeholderTextColor={colors.textMediumEmphasis || colors.text + "80"}
                                />
                              </Pressable>
                            ))}
                        </View>
                      </>
                    )}

                    {/* Results (shown when AI response arrives) — Normal mode */}
                    {aiResponse && !addToExistingMemory && (
                      <>
                        {/* Suggested memories — cards first so they are not pushed below the fold */}
                        <View
                          style={[
                            styles.suggestedMemoriesIntro,
                            { marginTop: 20 * fontScale },
                          ]}
                        >
                          <ThemedText size="m" weight="bold">
                            {t("ai.results.suggestedMemories")}
                          </ThemedText>
                          <ThemedText
                            size="xs"
                            style={{
                              marginTop: 6 * fontScale,
                              opacity: 0.72,
                              lineHeight: 18 * fontScale,
                            }}
                          >
                            {t("ai.results.suggestedMemoriesHint")}
                          </ThemedText>
                        </View>

                        {memoryDrafts.map((draft, draftIndex) => {
                          const isExpanded = expandedDraftIds.includes(draft.id);
                          const draftEntities = listEntitiesForSphere(draft.sphere);
                          return (
                            <View
                              key={draft.id}
                              style={styles.memoryDraftCardWrap}
                            >
                              {!isMemoryDraftComplete(draft) ? (
                                <View
                                  style={styles.memoryDraftReviewDot}
                                  pointerEvents="none"
                                />
                              ) : null}
                              <View style={styles.memoryDraftCard}>
                                <TouchableOpacity
                                  style={styles.memoryDraftCardHeader}
                                  onPress={() =>
                                    handleToggleDraftExpanded(draft.id)
                                  }
                                  activeOpacity={0.85}
                                  accessibilityRole="button"
                                  accessibilityState={{ expanded: isExpanded }}
                                  accessibilityLabel={
                                    t("ai.results.memoryCardToggle") as string
                                  }
                                >
                                  <View style={{ flex: 1, minWidth: 0 }}>
                                    <ThemedText
                                      size="sm"
                                      weight="bold"
                                      numberOfLines={2}
                                    >
                                      {draft.title || `Memory ${draftIndex + 1}`}
                                    </ThemedText>
                                    <ThemedText
                                      size="xs"
                                      style={{
                                        marginTop: 4 * fontScale,
                                        opacity: 0.7,
                                      }}
                                    >
                                      {`${draft.items.length} ${draft.items.length === 1 ? "moment" : "moments"}`}
                                      {!isExpanded
                                        ? ` · ${t("ai.results.tapToExpand")}`
                                        : ""}
                                    </ThemedText>
                                  </View>
                                  <MaterialIcons
                                    name={
                                      isExpanded ? "expand-less" : "expand-more"
                                    }
                                    size={26 * fontScale}
                                    color={colors.primary}
                                  />
                                </TouchableOpacity>

                                {isExpanded ? (
                                  <>
                                    <View style={styles.memoryDraftTitleField}>
                                      <ThemedText
                                        size="xs"
                                        weight="medium"
                                        style={styles.dropdownLabel}
                                      >
                                        {t("memory.title")}
                                      </ThemedText>
                                      <TextInput
                                        style={styles.memoryDraftTitleInput}
                                        value={draft.title}
                                        onChangeText={(text) =>
                                          handleEditDraftTitle(draft.id, text)
                                        }
                                        placeholder={
                                          t("memory.title.placeholder")
                                        }
                                        placeholderTextColor={
                                          colors.textMediumEmphasis ||
                                          colors.text + "80"
                                        }
                                      />
                                    </View>

                                    <View
                                      style={{
                                        marginTop: 4 * fontScale,
                                        paddingTop: 14 * fontScale,
                                        borderTopWidth: 1,
                                        borderTopColor:
                                          colorScheme === "dark"
                                            ? "rgba(255, 255, 255, 0.08)"
                                            : "rgba(0, 0, 0, 0.06)",
                                      }}
                                    >
                                      <View style={styles.dropdownContainer}>
                                        <ThemedText
                                          size="xs"
                                          weight="medium"
                                          style={styles.dropdownLabel}
                                        >
                                          {t("ai.results.sphere")}
                                        </ThemedText>
                                        {onboardingSferaAI ? (
                                          <View style={styles.dropdownButton}>
                                            <ThemedText
                                              size="sm"
                                              weight="semibold"
                                            >
                                              {draft.sphere
                                                ? (t(
                                                    `onboarding.sphere.${draft.sphere}`,
                                                  ) || draft.sphere)
                                                : "—"}
                                            </ThemedText>
                                          </View>
                                        ) : (
                                          <Pressable
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                              setSpherePickerDraftId(draft.id);
                                              setShowSpherePicker(true);
                                            }}
                                          >
                                            <ThemedText
                                              size="sm"
                                              weight="semibold"
                                            >
                                              {draft.sphere
                                                ? spherePickerLabels[draft.sphere]
                                                : t("ai.results.selectSphere")}
                                            </ThemedText>
                                            <MaterialIcons
                                              name="arrow-drop-down"
                                              size={24 * fontScale}
                                              color={colors.text}
                                            />
                                          </Pressable>
                                        )}
                                      </View>

                                      {draft.sphere &&
                                      addEntityDraftId !== draft.id ? (
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
                                            {t("ai.results.entity")}
                                          </ThemedText>
                                          {onboardingSferaAI ? (
                                            <View style={styles.dropdownButton}>
                                              <ThemedText
                                                size="sm"
                                                weight="semibold"
                                              >
                                                {draft.entityName || ""}
                                              </ThemedText>
                                            </View>
                                          ) : draftEntities.length > 0 ? (
                                            <>
                                              <Pressable
                                                style={[
                                                  styles.dropdownButton,
                                                  !draft.entityId &&
                                                  (showValidationErrors ||
                                                    draftEntities.length > 0)
                                                    ? styles.dropdownButtonError
                                                    : null,
                                                ].filter(Boolean)}
                                                onPress={() => {
                                                  setEntityPickerDraftId(
                                                    draft.id,
                                                  );
                                                  setShowEntityPicker(true);
                                                  if (showValidationErrors) {
                                                    setShowValidationErrors(
                                                      false,
                                                    );
                                                  }
                                                }}
                                              >
                                                <ThemedText
                                                  size="sm"
                                                  weight="semibold"
                                                >
                                                  {draft.entityName ||
                                                    t(
                                                      "ai.results.selectEntity",
                                                    )}
                                                </ThemedText>
                                                <MaterialIcons
                                                  name="arrow-drop-down"
                                                  size={24 * fontScale}
                                                  color={colors.text}
                                                />
                                              </Pressable>
                                              <TouchableOpacity
                                                style={[
                                                  styles.helperButton,
                                                  draft.entityId &&
                                                    styles.helperButtonValid,
                                                ]}
                                                onPress={() => {
                                                  setAddEntityDraftId(draft.id);
                                                  setShowEntityPicker(false);
                                                  setExpandedDraftIds((prev) =>
                                                    prev.includes(draft.id)
                                                      ? prev
                                                      : [...prev, draft.id],
                                                  );
                                                }}
                                                activeOpacity={0.7}
                                              >
                                                <ThemedText
                                                  size="xs"
                                                  style={[
                                                    styles.helperText,
                                                    draft.entityId &&
                                                      styles.helperTextValid,
                                                  ]}
                                                >
                                                  {(() => {
                                                    const sphere = draft.sphere;
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
                                                    return !draft.entityId
                                                      ? `${t("ai.results.unrecognizedEntity")} ${expandText}`
                                                      : expandText;
                                                  })()}
                                                </ThemedText>
                                                <MaterialIcons
                                                  name="expand-more"
                                                  size={16 * fontScale}
                                                  color={
                                                    draft.entityId
                                                      ? colors.primary
                                                      : "#FF3B30"
                                                  }
                                                />
                                              </TouchableOpacity>
                                            </>
                                          ) : (
                                            <TouchableOpacity
                                              style={styles.helperButton}
                                              onPress={() => {
                                                setAddEntityDraftId(draft.id);
                                                setShowEntityPicker(false);
                                                setExpandedDraftIds((prev) =>
                                                  prev.includes(draft.id)
                                                    ? prev
                                                    : [...prev, draft.id],
                                                );
                                              }}
                                              activeOpacity={0.7}
                                            >
                                              <ThemedText
                                                size="xs"
                                                style={styles.helperText}
                                              >
                                                {(() => {
                                                  const sphere = draft.sphere;
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
                                      ) : null}

                                      {renderAddEntityFormForDraft(draft)}
                                    </View>

                                    {draft.items
                                    .slice()
                                    .sort((a, b) => {
                                      const order: Record<string, number> = {
                                        goodFact: 0,
                                        hardTruth: 1,
                                        lesson: 2,
                                      };
                                      return (
                                        (order[a.type] || 99) -
                                        (order[b.type] || 99)
                                      );
                                    })
                                    .map((item) => (
                                      <Pressable
                                        key={item.id}
                                        style={styles.memoryItem}
                                        onPress={() => {
                                          if (isKeyboardVisible)
                                            Keyboard.dismiss();
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
                                                ? Colors.dark.primary
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
                                              ? t("ai.results.hardTruth")
                                              : item.type === "goodFact"
                                                ? t("ai.results.goodFact")
                                                : t("ai.results.lesson")}
                                          </ThemedText>
                                          <TouchableOpacity
                                            style={styles.removeItemButton}
                                            onPress={() =>
                                              handleRemoveItem(draft.id, item.id)
                                            }
                                          >
                                            <MaterialIcons
                                              name="close"
                                              size={16 * fontScale}
                                              color={
                                                colors.textMediumEmphasis ||
                                                colors.text
                                              }
                                            />
                                          </TouchableOpacity>
                                        </View>
                                        <TextInput
                                          style={styles.memoryItemText}
                                          value={item.text}
                                          onChangeText={(text) =>
                                            handleEditItem(draft.id, item.id, text)
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
                                ) : null}
                              </View>
                            </View>
                          );
                        })}

                      </>
                    )}
                  </ScrollView>

                  {/* Save Button - Always visible outside scroll */}
                  {aiResponse &&
                    memoryDrafts.some((draft) => draft.items.length > 0) && (
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        (isProcessing || !allMemoryDraftsReady) &&
                          styles.saveButtonDisabled,
                      ]}
                      onPress={handleSave}
                      disabled={isProcessing || !allMemoryDraftsReady}
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
                            {t("ai.saving")}
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
                            {t("ai.save")}
                          </ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {/* Hint text for add-to-existing when fields not filled */}
                  {aiResponse && addToExistingMemory && !addToExistingReady && (
                    <ThemedText
                      size="xs"
                      style={{
                        textAlign: "center",
                        marginTop: 8 * fontScale,
                        opacity: 0.7,
                        color: colorScheme === "dark" ? "#FF6B6B" : "#D93025",
                      }}
                    >
                      {t("ai.results.fillAllRequired")}
                    </ThemedText>
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
          onRequestClose={() => {
            setShowSpherePicker(false);
            setSpherePickerDraftId(null);
          }}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => {
              setShowSpherePicker(false);
              setSpherePickerDraftId(null);
            }}
          >
            <Pressable
              style={styles.pickerContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeader}>
                <ThemedText size="l" weight="bold">
                  {t("ai.results.selectSphere")}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setShowSpherePicker(false);
                    setSpherePickerDraftId(null);
                  }}
                >
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
                      t("spheres.relationships"),
                    career: t("spheres.career"),
                    family: t("spheres.family"),
                    friends: t("spheres.friends"),
                    hobbies: t("spheres.hobbies"),
                  };
                  return (
                    <Pressable
                      key={sphere}
                      style={[
                        styles.pickerItem,
                        spherePickerSelected === sphere &&
                          styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        if (spherePickerDraftId) {
                          applyDraftSphere(spherePickerDraftId, sphere);
                        } else {
                          setShowSpherePicker(false);
                        }
                      }}
                    >
                      <ThemedText
                        size="sm"
                        weight={
                          spherePickerSelected === sphere ? "bold" : "normal"
                        }
                      >
                        {sphereLabels[sphere]}
                      </ThemedText>
                      {spherePickerSelected === sphere && (
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
          onRequestClose={() => {
            setShowEntityPicker(false);
            setEntityPickerDraftId(null);
          }}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => {
              setShowEntityPicker(false);
              setEntityPickerDraftId(null);
            }}
          >
            <Pressable
              style={styles.pickerContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeader}>
                <ThemedText size="l" weight="bold">
                  {t("ai.results.entityPickerTitle")}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setShowEntityPicker(false);
                    setEntityPickerDraftId(null);
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={24 * fontScale}
                    color={colors.text}
                  />
                </Pressable>
              </View>
              <ScrollView style={styles.pickerList}>
                {entityPickerEntities.map((entity) => (
                  <Pressable
                    key={entity.id}
                    style={[
                      styles.pickerItem,
                      entityPickerTargetDraft?.entityId === entity.id &&
                        styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      if (entityPickerDraftId) {
                        applyDraftEntity(
                          entityPickerDraftId,
                          entity.id,
                          entity.name,
                        );
                      } else {
                        setShowEntityPicker(false);
                      }
                    }}
                  >
                    <ThemedText
                      size="sm"
                      weight={
                        entityPickerTargetDraft?.entityId === entity.id
                          ? "bold"
                          : "normal"
                      }
                    >
                      {entity.name}
                    </ThemedText>
                    {entityPickerTargetDraft?.entityId === entity.id && (
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

        {/* Top-Level Sphere Picker Modal (Add to Existing) */}
        <RNModal
          visible={showTopLevelSpherePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTopLevelSpherePicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowTopLevelSpherePicker(false)}
          >
            <Pressable
              style={styles.pickerContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeader}>
                <ThemedText size="l" weight="bold">
                  {t("ai.results.selectSphere")}
                </ThemedText>
                <Pressable onPress={() => setShowTopLevelSpherePicker(false)}>
                  <MaterialIcons name="close" size={24 * fontScale} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.pickerList}>
                {(["relationships", "career", "family", "friends", "hobbies"] as LifeSphere[]).map((sphere) => (
                  <Pressable
                    key={sphere}
                    style={[
                      styles.pickerItem,
                      selectedExistingSphere === sphere && styles.pickerItemSelected,
                    ]}
                    onPress={() => handleTopLevelSphereSelect(sphere)}
                  >
                    <ThemedText
                      size="sm"
                      weight={selectedExistingSphere === sphere ? "bold" : "normal"}
                    >
                      {spherePickerLabels[sphere]}
                    </ThemedText>
                    {selectedExistingSphere === sphere && (
                      <MaterialIcons name="check" size={20 * fontScale} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </RNModal>

        {/* Top-Level Entity Picker Modal (Add to Existing) */}
        <RNModal
          visible={showTopLevelEntityPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTopLevelEntityPicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowTopLevelEntityPicker(false)}
          >
            <Pressable
              style={styles.pickerContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeader}>
                <ThemedText size="l" weight="bold">
                  {t("ai.results.entityPickerTitle")}
                </ThemedText>
                <Pressable onPress={() => setShowTopLevelEntityPicker(false)}>
                  <MaterialIcons name="close" size={24 * fontScale} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.pickerList}>
                {topLevelEntities.map((entity) => (
                  <Pressable
                    key={entity.id}
                    style={[
                      styles.pickerItem,
                      selectedExistingEntityId === entity.id && styles.pickerItemSelected,
                    ]}
                    onPress={() => handleTopLevelEntitySelect(entity.id, entity.name)}
                  >
                    <ThemedText
                      size="sm"
                      weight={selectedExistingEntityId === entity.id ? "bold" : "normal"}
                    >
                      {entity.name}
                    </ThemedText>
                    {selectedExistingEntityId === entity.id && (
                      <MaterialIcons name="check" size={20 * fontScale} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </RNModal>

        {/* Memory Picker Modal (Add to Existing) */}
        <RNModal
          visible={showMemoryPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMemoryPicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowMemoryPicker(false)}
          >
            <Pressable
              style={styles.pickerContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeader}>
                <ThemedText size="l" weight="bold">
                  {t("ai.results.memoryPickerTitle")}
                </ThemedText>
                <Pressable onPress={() => setShowMemoryPicker(false)}>
                  <MaterialIcons name="close" size={24 * fontScale} color={colors.text} />
                </Pressable>
              </View>
              <TextInput
                style={[
                  styles.memoryDraftTitleInput,
                  {
                    marginHorizontal: 16 * fontScale,
                    marginBottom: 8 * fontScale,
                  },
                ]}
                value={memoryPickerSearch}
                onChangeText={setMemoryPickerSearch}
                placeholder={t("ai.results.searchMemory")}
                placeholderTextColor={colors.textMediumEmphasis || colors.text + "80"}
              />
              <ScrollView
                style={styles.pickerList}
                keyboardShouldPersistTaps="handled"
              >
                {filteredMemoriesForPicker.map((memory) => (
                  <Pressable
                    key={memory.id}
                    style={[
                      styles.pickerItem,
                      selectedExistingMemoryId === memory.id && styles.pickerItemSelected,
                    ]}
                    onPress={() => handleMemorySelect(memory.id, memory.title)}
                  >
                    <ThemedText
                      size="sm"
                      weight={selectedExistingMemoryId === memory.id ? "bold" : "normal"}
                      numberOfLines={2}
                      style={{ flex: 1 }}
                    >
                      {memory.title}
                    </ThemedText>
                    {selectedExistingMemoryId === memory.id && (
                      <MaterialIcons name="check" size={20 * fontScale} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
                {filteredMemoriesForPicker.length === 0 && (
                  <ThemedText
                    size="sm"
                    style={{
                      padding: 16 * fontScale,
                      opacity: 0.6,
                      textAlign: "center",
                    }}
                  >
                    {t("ai.results.noMemories")}
                  </ThemedText>
                )}
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
                {t("ai.closeConfirm.title")}
              </ThemedText>
              <ThemedText
                size="sm"
                style={{
                  marginBottom: 24 * fontScale,
                  opacity: 0.8,
                  textAlign: "center",
                }}
              >
                {t("ai.closeConfirm.message")}
              </ThemedText>
              <View style={styles.confirmButtonContainer}>
                <Pressable
                  style={[styles.confirmButton, styles.cancelButton]}
                  onPress={() => setShowCloseConfirm(false)}
                >
                  <ThemedText size="sm" weight="semibold">
                    {t("common.cancel")}
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
                    await forgetPersistedAIModalReviewState();
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
                    {t("ai.closeConfirm.discard")}
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
