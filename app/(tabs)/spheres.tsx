import { AIActionModal } from "@/components/ai-action-modal";
import { ConstellationBackground } from "@/components/constellation-background";
import { AIEntityCreationModal } from "@/components/ai-entity-creation-modal";
import { AIInsightsConsentModal } from "@/components/ai-insights-consent-modal";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale, useIconScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { JobCard } from "@/library/components/job-card";
import { ProfileCard } from "@/library/components/profile-card";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import {
    getPendingEntityRequest,
    getPendingEntityResponse,
    isBackgroundEntityTaskRunning,
} from "@/utils/ai-background-processor";
import { useAIInsightsConsent } from "@/utils/AIInsightsConsentProvider";
import { useAIMemoryModal } from "@/utils/AIMemoryModalContext";
import type {
    ExProfile,
    FamilyMember,
    Friend,
    Hobby,
    Job,
    LifeSphere,
} from "@/utils/JourneyProvider";
import { useJourney } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForPremiumAccess } from "@/utils/premium-access";
import { onSpheresTabPress } from "@/utils/spheres-tab-press";
import { useSubscription } from "@/utils/SubscriptionProvider";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
    router,
    useFocusEffect,
    useLocalSearchParams,
    useNavigation,
} from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    AppState,
    AppStateStatus,
    BackHandler,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SpheresScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const {
    constellationAmount,
    constellationOpacity,
    pulsingAnimations,
  } = useVisualSettings();
  const fontScale = useFontScale();
  const iconScale = useIconScale();
  const insets = useSafeAreaInsets();
  const { maxContentWidth } = useLargeDevice();
  const {
    profiles,
    jobs,
    familyMembers,
    friends,
    hobbies,
    isLoading,
    getEntitiesBySphere,
    getOverallSunnyPercentage,
    reloadIdealizedMemories,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
    idealizedMemories,
  } = useJourney();
  const {
    hasPlusEntitlement,
    hasAIEntitlement,
    offerings,
    subscriptionStatus,
    ensureSubscriptionResolved,
  } = useSubscription();
  const t = useTranslate();
  const aiConsent = useAIInsightsConsent();
  const aiMemoryModal = useAIMemoryModal();

  // Insight button pulse animation
  const insightPulseScale = useSharedValue(1);
  const pulseEasing = Easing.inOut(Easing.ease);
  const insightPulseDuration = 1000;

  useEffect(() => {
    if (!pulsingAnimations) {
      cancelAnimation(insightPulseScale);
      insightPulseScale.value = 1;
      return;
    }
  }, [insightPulseScale, pulsingAnimations]);

  useEffect(() => {
    if (!pulsingAnimations) return;
    const runInsightPulse = () => {
      insightPulseScale.value = withSequence(
        withTiming(1.2, {
          duration: insightPulseDuration,
          easing: pulseEasing,
        }),
        withTiming(1, {
          duration: insightPulseDuration,
          easing: pulseEasing,
        }),
      );
    };
    // Rarely trigger insight pulse: first after 8s, then every 20–30s
    const initialDelay = 8000;
    const minInterval = 20000;
    const maxInterval = 30000;
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = (useInitialDelay: boolean) => {
      const delay = useInitialDelay
        ? initialDelay
        : minInterval + Math.random() * (maxInterval - minInterval);
      timeoutId = setTimeout(() => {
        runInsightPulse();
        scheduleNext(false);
      }, delay);
    };
    scheduleNext(true);
    return () => clearTimeout(timeoutId);
  }, [insightPulseScale, pulsingAnimations]);

  const insightPulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: insightPulseScale.value }],
  }));

  // Reload memories when screen comes into focus (e.g., after running mock data script)
  useFocusEffect(
    useCallback(() => {
      reloadIdealizedMemories();
    }, [reloadIdealizedMemories]),
  );

  const params = useLocalSearchParams();

  // Initialize state from params
  const [selectedSphere, setSelectedSphere] = useState<LifeSphere | null>(
    () => {
      const initialSphere = (params.selectedSphere as LifeSphere) || null;
      return initialSphere;
    },
  );

  // Use a ref to track previous params to detect changes
  const prevParamsRef = React.useRef<string | undefined>(
    params.selectedSphere as string | undefined,
  );
  // Flag to ignore param sync when we just cleared state ourselves
  const ignoringParamSyncRef = React.useRef(false);

  // Sync params to state immediately when they change
  // This runs on every render to catch param changes that useEffect might miss
  React.useLayoutEffect(() => {
    // If we just cleared selectedSphere ourselves, skip until params catch up
    if (ignoringParamSyncRef.current) {
      const currentSphereParam = params.selectedSphere as LifeSphere | undefined;
      if (!currentSphereParam) {
        // Params have caught up, stop ignoring
        ignoringParamSyncRef.current = false;
        prevParamsRef.current = undefined;
      }
      return;
    }

    const currentSphereParam = params.selectedSphere as LifeSphere | undefined;

    // Only sync FROM URL params TO state when URL params actually change
    // Don't clear state if URL param is missing but state exists (state might be set by user interaction)
    if (currentSphereParam && prevParamsRef.current !== currentSphereParam) {
      prevParamsRef.current = currentSphereParam;
      setSelectedSphere(currentSphereParam);
    } else if (!currentSphereParam && prevParamsRef.current !== undefined) {
      // Only clear if URL param was explicitly removed (prevParamsRef had a value)
      prevParamsRef.current = undefined;
      setSelectedSphere(null);
    }
  });
  const [aiActionModalVisible, setAiActionModalVisible] = useState(false);
  const [aiEntityCreationModalVisible, setAiEntityCreationModalVisible] =
    useState(false);
  const [pendingEntityResponse, setPendingEntityResponse] = useState<any>(null);
  const [aiInsightsConsentVisible, setAiInsightsConsentVisible] =
    useState(false);
  const pendingAIIconActionRef = useRef<null | "open_ai">(null);

  const openEntityAIModal = useCallback(() => {
    setAiActionModalVisible(false);
    setAiEntityCreationModalVisible(true);
  }, []);

  // Poll for pending entity creation response
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isCleanedUp = false;

    const checkForResponse = async () => {
      if (isCleanedUp) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }

      try {
        const pendingResponse = await getPendingEntityResponse();
        if (pendingResponse && !isCleanedUp) {
          setPendingEntityResponse(pendingResponse);
          if (!aiEntityCreationModalVisible) {
            openEntityAIModal();
          }
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }

        const pendingRequest = await getPendingEntityRequest();
        const isRunning = await isBackgroundEntityTaskRunning();
        if (!pendingRequest && !isRunning) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (error) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    const shouldPoll = async () => {
      const pendingRequest = await getPendingEntityRequest();
      const isRunning = await isBackgroundEntityTaskRunning();
      return !!(pendingRequest || isRunning);
    };

    shouldPoll().then((poll) => {
      if (poll) {
        checkForResponse();
        intervalId = setInterval(checkForResponse, 2000);
      }
    });

    return () => {
      isCleanedUp = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [aiEntityCreationModalVisible]);

  // Check for pending entity response when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          const pendingResponse = await getPendingEntityResponse();
          if (pendingResponse) {
            setPendingEntityResponse(pendingResponse);
            if (!aiEntityCreationModalVisible) {
              openEntityAIModal();
            }
          }
        }
      },
    );

    const checkPending = async () => {
      const pendingResponse = await getPendingEntityResponse();
      if (pendingResponse) {
        setPendingEntityResponse(pendingResponse);
        if (!aiEntityCreationModalVisible) {
          openEntityAIModal();
        }
      }
    };
    checkPending();

    return () => {
      subscription.remove();
    };
  }, [aiEntityCreationModalVisible]);

  const handleSelectCreateMemory = () => {
    aiMemoryModal?.openMemoryModal();
  };

  const handleSelectCreateEntity = () => {
    openEntityAIModal();
  };

  const handleEntityCreated = () => {
    // Reload entities after creation
    // The JourneyProvider will automatically update, but we can trigger a refresh if needed
  };

  // Update selectedSphere when params change (e.g., when navigating back from edit screen)
  // Use useFocusEffect to ensure it runs every time the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const currentSphere = params.selectedSphere as LifeSphere | undefined;

      // Always update if params have changed or if state doesn't match params
      if (
        currentSphere &&
        (prevParamsRef.current !== currentSphere ||
          selectedSphere !== currentSphere)
      ) {
        prevParamsRef.current = currentSphere;
        setSelectedSphere(currentSphere);
      } else if (!currentSphere && selectedSphere !== null) {
        prevParamsRef.current = undefined;
        setSelectedSphere(null);
      }
    }, [params, selectedSphere]),
  );

  // Also update when params change (backup for when screen is already focused)
  React.useEffect(() => {
    const currentSphere = params.selectedSphere as LifeSphere | undefined;

    // Always update if params have changed or if state doesn't match params
    if (
      currentSphere &&
      (prevParamsRef.current !== currentSphere ||
        selectedSphere !== currentSphere)
    ) {
      prevParamsRef.current = currentSphere;
      setSelectedSphere(currentSphere);
    } else if (!currentSphere && selectedSphere !== null) {
      prevParamsRef.current = undefined;
      setSelectedSphere(null);
    }
  }, [params.selectedSphere, selectedSphere]);

  // Use a ref to always get the current selectedSphere value in the callback
  const selectedSphereRef = React.useRef<LifeSphere | null>(null);

  // Keep ref in sync with state
  React.useEffect(() => {
    selectedSphereRef.current = selectedSphere;
  }, [selectedSphere]);

  // Function to clear selected sphere and params
  const clearSelectedSphere = React.useCallback(() => {
    ignoringParamSyncRef.current = true;
    prevParamsRef.current = undefined;
    setSelectedSphere(null);
    router.setParams({ selectedSphere: undefined });
  }, []);

  // Get navigation object for handling back button on iOS
  const navigation = useNavigation();

  // Handle back button press (Android) and navigation back (iOS)
  React.useEffect(() => {
    // Android: Handle hardware back button
    const handleBackPress = () => {
      const currentSelectedSphere = selectedSphereRef.current;
      if (currentSelectedSphere) {
        clearSelectedSphere();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );

    // iOS: Handle navigation back button using beforeRemove event
    const unsubscribeBeforeRemove = navigation.addListener(
      "beforeRemove",
      (e: any) => {
        const currentSelectedSphere = selectedSphereRef.current;
        if (currentSelectedSphere) {
          // Prevent default navigation
          e.preventDefault();
          // Clear the selected sphere instead
          clearSelectedSphere();
        }
        // If no sphere is selected, allow default navigation
      },
    );

    return () => {
      backHandler.remove();
      unsubscribeBeforeRemove();
    };
  }, [clearSelectedSphere, navigation]);

  // Handle Home tab press while on spheres flow: reset to orbit overview, or go back to home if already there
  useEffect(() => {
    return onSpheresTabPress(() => {
      if (selectedSphereRef.current !== null) {
        // Navigate to spheres orbit overview (clears any sub-screens and selected sphere)
        ignoringParamSyncRef.current = true;
        prevParamsRef.current = undefined;
        setSelectedSphere(null);
        router.replace('/(tabs)/spheres');
      } else {
        router.navigate("/");
      }
    });
  }, []);

  // Calculate entity-level scores for comparison
  const _entityComparisons = useMemo(() => {
    const calculateEntityScore = (
      entityId: string,
      sphereType: LifeSphere,
    ): number => {
      const memories =
        sphereType === "relationships"
          ? getIdealizedMemoriesByProfileId(entityId)
          : getIdealizedMemoriesByEntityId(entityId, sphereType);

      let totalClouds = 0;
      let totalSuns = 0;

      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });

      const total = totalClouds + totalSuns;
      if (total === 0) return 0;

      const percentage = (totalSuns / total) * 100;
      return Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
    };

    const relationships = profiles
      .map((p) => ({
        id: p.id,
        name: p.name,
        score: calculateEntityScore(p.id, "relationships"),
        isOngoing: !p.relationshipEndDate,
        entity: p,
      }))
      .filter((e) => e.score > 0)
      .sort((a, b) => {
        // Sort: ongoing first, then by score descending
        if (a.isOngoing && !b.isOngoing) return -1;
        if (!a.isOngoing && b.isOngoing) return 1;
        return b.score - a.score;
      });

    const jobsList = jobs
      .map((j) => ({
        id: j.id,
        name: j.name,
        score: calculateEntityScore(j.id, "career"),
        isOngoing: !j.endDate,
        entity: j,
      }))
      .filter((e) => e.score > 0)
      .sort((a, b) => {
        // Sort: ongoing first, then by score descending
        if (a.isOngoing && !b.isOngoing) return -1;
        if (!a.isOngoing && b.isOngoing) return 1;
        return b.score - a.score;
      });

    const familyMembersList = familyMembers
      .map((f) => ({
        id: f.id,
        name: f.name,
        score: calculateEntityScore(f.id, "family"),
        isOngoing: true, // Family members are always "ongoing"
        entity: f,
      }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score);

    const friendsList = friends
      .map((f) => ({
        id: f.id,
        name: f.name,
        score: calculateEntityScore(f.id, "friends"),
        isOngoing: true, // Friends are always "ongoing"
        entity: f,
      }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score);

    const hobbiesList = hobbies
      .map((h) => ({
        id: h.id,
        name: h.name,
        score: calculateEntityScore(h.id, "hobbies"),
        isOngoing: true, // Hobbies are always "ongoing"
        entity: h,
      }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score);

    return {
      relationships,
      career: jobsList,
      family: familyMembersList,
      friends: friendsList,
      hobbies: hobbiesList,
    };
  }, [
    profiles,
    jobs,
    familyMembers,
    friends,
    hobbies,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  ]);

  const spheres: {
    type: LifeSphere;
    icon: string;
    label: string;
    entities: (ExProfile | Job | FamilyMember | Friend | Hobby)[];
  }[] = useMemo(
    () => [
      {
        type: "relationships",
        icon: "favorite",
        label: t("spheres.relationships"),
        entities: getEntitiesBySphere("relationships") as ExProfile[],
      },
      {
        type: "career",
        icon: "work",
        label: t("spheres.career"),
        entities: getEntitiesBySphere("career") as Job[],
      },
      {
        type: "family",
        icon: "family-restroom",
        label: t("spheres.family"),
        entities: getEntitiesBySphere("family") as FamilyMember[],
      },
      {
        type: "friends",
        icon: "people",
        label: t("spheres.friends"),
        entities: getEntitiesBySphere("friends") as Friend[],
      },
      {
        type: "hobbies",
        icon: "sports-esports",
        label: t("spheres.hobbies"),
        entities: getEntitiesBySphere("hobbies") as Hobby[],
      },
    ],
    [getEntitiesBySphere, t],
  );

  // Recently edited strip (manual edit overview): top entities by updatedAt
  const allEntitiesFlat = useMemo(() => {
    const result: {
      id: string;
      name: string;
      sphere: LifeSphere;
      updatedAt: string;
      memoryCount: number;
      imageUri?: string;
    }[] = [];

    const countMemories = (id: string, sphere: LifeSphere) =>
      sphere === "relationships"
        ? getIdealizedMemoriesByProfileId(id).length
        : getIdealizedMemoriesByEntityId(id, sphere).length;

    profiles.forEach((e) =>
      result.push({
        id: e.id,
        name: e.name,
        sphere: "relationships",
        updatedAt: e.updatedAt,
        memoryCount: countMemories(e.id, "relationships"),
        imageUri: e.imageUri,
      }),
    );
    jobs.forEach((e) =>
      result.push({
        id: e.id,
        name: e.name,
        sphere: "career",
        updatedAt: e.updatedAt,
        memoryCount: countMemories(e.id, "career"),
        imageUri: e.imageUri,
      }),
    );
    familyMembers.forEach((e) =>
      result.push({
        id: e.id,
        name: e.name,
        sphere: "family",
        updatedAt: e.updatedAt,
        memoryCount: countMemories(e.id, "family"),
        imageUri: e.imageUri,
      }),
    );
    friends.forEach((e) =>
      result.push({
        id: e.id,
        name: e.name,
        sphere: "friends",
        updatedAt: e.updatedAt,
        memoryCount: countMemories(e.id, "friends"),
        imageUri: e.imageUri,
      }),
    );
    hobbies.forEach((e) =>
      result.push({
        id: e.id,
        name: e.name,
        sphere: "hobbies",
        updatedAt: e.updatedAt,
        memoryCount: countMemories(e.id, "hobbies"),
        imageUri: e.imageUri,
      }),
    );
    return result;
  }, [
    profiles,
    jobs,
    familyMembers,
    friends,
    hobbies,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  ]);

  const subsectionEntities = useMemo(() => {
    if (allEntitiesFlat.length === 0) return [];
    return [...allEntitiesFlat]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
  }, [allEntitiesFlat]);

  const getSphereAccentColor = (sphereType: LifeSphere): string => {
    const scheme = (colorScheme ?? "dark") as "light" | "dark";
    if (scheme === "light") {
      switch (sphereType) {
        case "relationships":
          return "#D32F2F";
        case "career":
          return "#1976D2";
        case "family":
          return "#388E3C";
        case "friends":
          return "#7B1FA2";
        case "hobbies":
          return "#F57C00";
        default:
          return "#1976D2";
      }
    }
    switch (sphereType) {
      case "relationships":
        return "#E57373";
      case "career":
        return "#64B5F6";
      case "family":
        return "#81C784";
      case "friends":
        return "#BA68C8";
      case "hobbies":
        return "#FFB74D";
      default:
        return "#64B5F6";
    }
  };

  const _overallPercentage = useMemo(
    () => getOverallSunnyPercentage(),
    [getOverallSunnyPercentage],
  );

  // Calculate sunny percentage for each sphere
  // Calculate sphere data: total moments (for distribution) and sunny percentage (for quality)
  const sphereData = useMemo(() => {
    const calculateSphereData = (sphereType: LifeSphere) => {
      const entities = getEntitiesBySphere(sphereType);
      if (entities.length === 0) {
        return { totalMoments: 0, sunnyPercentage: 0 };
      }

      let totalClouds = 0;
      let totalSuns = 0;

      entities.forEach((entity) => {
        const memories =
          sphereType === "relationships" && "id" in entity
            ? getIdealizedMemoriesByProfileId(entity.id)
            : getIdealizedMemoriesByEntityId(entity.id, sphereType);

        memories.forEach((memory) => {
          totalClouds += (memory.hardTruths || []).length;
          totalSuns += (memory.goodFacts || []).length;
        });
      });

      const totalMoments = totalClouds + totalSuns;
      const sunnyPercentage =
        totalMoments > 0 ? (totalSuns / totalMoments) * 100 : 0;

      return {
        totalMoments,
        sunnyPercentage: Math.max(
          0,
          Math.min(100, isNaN(sunnyPercentage) ? 0 : sunnyPercentage),
        ),
      };
    };

    return {
      relationships: calculateSphereData("relationships"),
      career: calculateSphereData("career"),
      family: calculateSphereData("family"),
      friends: calculateSphereData("friends"),
      hobbies: calculateSphereData("hobbies"),
    };
  }, [
    getEntitiesBySphere,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  ]);

  // Calculate distribution percentages (for segment sizes)
  const sphereDistribution = useMemo(() => {
    const totalAllMoments =
      sphereData.relationships.totalMoments +
      sphereData.career.totalMoments +
      sphereData.family.totalMoments;

    if (totalAllMoments === 0) {
      return {
        relationships: 33.33,
        career: 33.33,
        family: 33.33,
      };
    }

    return {
      relationships:
        (sphereData.relationships.totalMoments / totalAllMoments) * 100,
      career: (sphereData.career.totalMoments / totalAllMoments) * 100,
      family: (sphereData.family.totalMoments / totalAllMoments) * 100,
    };
  }, [sphereData]);

  // Keep sphereScores for insights (sunny percentage)
  const sphereScores = useMemo(
    () => ({
      relationships: sphereData.relationships.sunnyPercentage,
      career: sphereData.career.sunnyPercentage,
      family: sphereData.family.sunnyPercentage,
      friends: sphereData.friends.sunnyPercentage,
      hobbies: sphereData.hobbies.sunnyPercentage,
    }),
    [sphereData],
  );

  // Calculate entity-level scores and generate detailed insights
  const insights = useMemo(() => {
    const insightsList: {
      sphere: LifeSphere;
      message: string;
      priority: "high" | "medium" | "low";
      details?: { entityName: string; percentage: number; comparison?: string };
    }[] = [];

    // Helper to calculate entity score
    const calculateEntityScore = (
      entityId: string,
      sphereType: LifeSphere,
    ): number => {
      const memories =
        sphereType === "relationships"
          ? getIdealizedMemoriesByProfileId(entityId)
          : getIdealizedMemoriesByEntityId(entityId, sphereType);

      let totalClouds = 0;
      let totalSuns = 0;

      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });

      const total = totalClouds + totalSuns;
      if (total === 0) return 0;

      const percentage = (totalSuns / total) * 100;
      return Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
    };

    // Relationships analysis
    const relationshipsEntities = profiles.filter(
      (p) => p.relationshipStartDate || p.relationshipEndDate !== undefined,
    );
    if (relationshipsEntities.length > 0) {
      const currentRelationships = relationshipsEntities.filter(
        (p) => !p.relationshipEndDate,
      );
      const pastRelationships = relationshipsEntities.filter(
        (p) => p.relationshipEndDate,
      );

      // Analyze current relationships
      currentRelationships.forEach((profile) => {
        const score = calculateEntityScore(profile.id, "relationships");
        // Only generate insights if there are memories and score is below 50%
        if (score > 0 && score < 50) {
          // Compare with past relationships that have memories
          const pastScoresWithData = pastRelationships
            .map((p) => calculateEntityScore(p.id, "relationships"))
            .filter((s) => s > 0); // Only include past relationships with memories

          const avgPastScore =
            pastScoresWithData.length > 0
              ? pastScoresWithData.reduce((a, b) => a + b, 0) /
                pastScoresWithData.length
              : null;

          let messageKey = "insights.relationships.current.low";
          let comparison: string | undefined = undefined;

          if (avgPastScore !== null && avgPastScore < 50) {
            // Pattern detected - similar low scores across relationships
            messageKey = "insights.relationships.pattern.current";
            comparison = `This is similar to your past relationships (avg ${Math.round(avgPastScore)}% sunny).`;
          } else if (avgPastScore !== null) {
            comparison = `Your past relationships averaged ${Math.round(avgPastScore)}% sunny.`;
          }

          insightsList.push({
            sphere: "relationships",
            message: messageKey,
            priority: score < 30 ? "high" : "medium",
            details: {
              entityName: profile.name,
              percentage: Math.round(score),
              comparison: comparison,
            },
          });
        }
      });
    }

    // Career analysis
    const careerEntities = jobs.filter((j) => j.startDate);
    if (careerEntities.length > 0) {
      const currentJobs = careerEntities.filter((j) => !j.endDate);
      const pastJobs = careerEntities.filter((j) => j.endDate);

      // Analyze current jobs
      currentJobs.forEach((job) => {
        const score = calculateEntityScore(job.id, "career");
        // Only generate insights if there are memories and score is below 50%
        if (score > 0 && score < 50) {
          const pastScoresWithData = pastJobs
            .map((j) => calculateEntityScore(j.id, "career"))
            .filter((s) => s > 0); // Only include past jobs with memories

          const avgPastScore =
            pastScoresWithData.length > 0
              ? pastScoresWithData.reduce((a, b) => a + b, 0) /
                pastScoresWithData.length
              : null;

          let messageKey = "insights.career.current.low";
          let comparison: string | undefined = undefined;

          if (avgPastScore !== null && avgPastScore < 50) {
            // Pattern detected - similar low scores across jobs
            messageKey = "insights.career.pattern.current";
            comparison = `This pattern is similar to your previous jobs (avg ${Math.round(avgPastScore)}% positive).`;
          } else if (avgPastScore !== null) {
            comparison = `Your previous jobs averaged ${Math.round(avgPastScore)}% positive moments.`;
          }

          insightsList.push({
            sphere: "career",
            message: messageKey,
            priority: score < 30 ? "high" : "medium",
            details: {
              entityName: job.name,
              percentage: Math.round(score),
              comparison: comparison,
            },
          });
        }
      });
    }

    // Family analysis - compare all family members
    if (familyMembers.length > 1) {
      const familyScores = familyMembers
        .map((member) => ({
          member,
          score: calculateEntityScore(member.id, "family"),
        }))
        .filter(({ score }) => score > 0); // Only include members with memories

      if (familyScores.length > 1) {
        const lowScoreMembers = familyScores.filter(
          ({ score }) => score > 0 && score < 50,
        );
        const avgScore =
          familyScores.reduce((sum, { score }) => sum + score, 0) /
          familyScores.length;

        lowScoreMembers.forEach(({ member, score }) => {
          let messageKey = "insights.family.member.low";
          let comparison: string | undefined = undefined;

          if (avgScore < 50) {
            // Pattern detected - similar low scores across family
            messageKey = "insights.family.pattern";
            comparison = `This is similar to other family relationships (avg ${Math.round(avgScore)}% positive).`;
          }

          insightsList.push({
            sphere: "family",
            message: messageKey,
            priority: score < 30 ? "high" : "medium",
            details: {
              entityName: member.name,
              percentage: Math.round(score),
              comparison: comparison,
            },
          });
        });
      } else if (
        familyScores.length === 1 &&
        familyScores[0].score > 0 &&
        familyScores[0].score < 50
      ) {
        // Single family member with low score
        insightsList.push({
          sphere: "family",
          message: "insights.family.member.low",
          priority: familyScores[0].score < 30 ? "high" : "medium",
          details: {
            entityName: familyScores[0].member.name,
            percentage: Math.round(familyScores[0].score),
          },
        });
      }
    }

    return insightsList;
  }, [
    profiles,
    jobs,
    familyMembers,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  ]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 8 * fontScale,
          marginTop: 70,
        },
        headerButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
        },
        content: {
          flex: 1,
          paddingHorizontal: 12 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 0,
          paddingBottom: 0,
        },
        manualEditContent: {
          flex: 1,
          paddingHorizontal: 16 * fontScale,
          alignItems: "stretch",
          justifyContent: "flex-start",
          paddingTop: 0,
          paddingBottom: 0,
        },
        manualEditTopBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          paddingBottom: 8 * fontScale,
        },
        manualEditExitButton: {
          width: 44 * fontScale,
          height: 44 * fontScale,
          borderRadius: 22 * fontScale,
          backgroundColor: "rgba(26, 47, 74, 0.85)",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "rgba(100, 181, 246, 0.4)",
        },
        manualEditTitleRight: {
          flex: 1,
          marginLeft: 16 * fontScale,
          letterSpacing: 0.35,
          textAlign: "right",
        },
        manualEditScroll: {
          flexGrow: 1,
          paddingHorizontal: 2 * fontScale,
          paddingTop: 28 * fontScale,
          paddingBottom: 32 * fontScale,
          maxWidth: maxContentWidth as any,
          width: "100%",
          alignSelf: "center",
        },
        manualEditRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 16 * fontScale,
          paddingHorizontal: 16 * fontScale,
          marginBottom: 14 * fontScale,
          borderRadius: 10 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(100, 181, 246, 0.28)"
              : "rgba(25, 118, 210, 0.22)",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(26, 47, 74, 0.5)"
              : "rgba(255, 255, 255, 0.72)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: colorScheme === "dark" ? 0.25 : 0.08,
          shadowRadius: 3,
          elevation: 2,
        },
        manualEditIconBox: {
          width: 44 * fontScale,
          height: 44 * fontScale,
          borderRadius: 10 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14 * fontScale,
          borderWidth: 1,
        },
        manualEditSubtitle: {
          marginTop: 4 * fontScale,
        },
        subsectionSectionLabel: {
          marginBottom: 12 * fontScale,
        },
        subsectionCard: {
          width: 100 * fontScale,
          padding: 10 * fontScale,
          marginRight: 10 * fontScale,
          borderRadius: 10 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(100,181,246,0.2)"
              : "rgba(0,0,0,0.1)",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.03)",
        },
        subsectionCardImage: {
          width: "100%",
          height: 56 * fontScale,
          borderRadius: 6 * fontScale,
        },
        insightsButtonContainer: {
          marginTop: 0,
          borderRadius: 16 * fontScale,
          overflow: "hidden",
          shadowColor: "#8b5cf6",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 10,
          width:
            (Dimensions.get("window").width - 48 * fontScale - 32 * fontScale) /
            2, // Match sphere card width
          minWidth: 100 * fontScale,
          maxWidth: 180 * fontScale,
          flexShrink: 0,
        },
        insightsButtonContainerCentered: {
          position: "absolute",
          borderRadius: 24 * fontScale, // Circular - reduced from 30
          width: 48 * fontScale, // Reduced from 60
          height: 48 * fontScale, // Reduced from 60
          zIndex: 10,
          // Shadow/elevation effect
          shadowColor: "#8b5cf6",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 12,
          // Border for additional visual depth
          borderWidth: 3,
          borderColor: "rgba(255, 255, 255, 0.3)",
        },
        insightsButtonGradientCircular: {
          width: "100%",
          height: "100%",
          borderRadius: 24 * fontScale, // Reduced from 30 to match container
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden", // Keep gradient circular
        },
        insightsIconContainerCircular: {
          position: "relative",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        },
        insightsButtonGradient: {
          borderRadius: 16 * fontScale,
          padding: 14 * fontScale,
        },
        insightsButtonContent: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12 * fontScale,
          width: "100%",
        },
        insightsIconContainer: {
          position: "relative",
          width: 48 * fontScale,
          height: 48 * fontScale,
          borderRadius: 24 * fontScale,
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          alignItems: "center",
          justifyContent: "center",
        },
        insightsTextContainer: {
          flex: 1,
          gap: 2 * fontScale,
        },
        insightsButtonTitle: {
          color: "#ffffff",
          fontWeight: "700",
        },
        insightsButtonSubtitle: {
          color: "rgba(255, 255, 255, 0.9)",
          opacity: 0.9,
        },
        entityList: {
          gap: 12 * fontScale,
        },
        entityCard: {
          flexDirection: "row",
          alignItems: "center",
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          gap: 12 * fontScale,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: colorScheme === "dark" ? 0.3 : 0.15,
          shadowRadius: 4,
          elevation: 3,
        },
        entityImage: {
          width: 48 * fontScale,
          height: 48 * fontScale,
          borderRadius: 24 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? Colors.dark.surfaceElevated1 // Use elevation-based surface color
              : "rgba(125, 211, 252, 0.3)",
        },
        entityInfo: {
          flex: 1,
          gap: 4 * fontScale,
        },
        emptyState: {
          alignItems: "center",
          justifyContent: "center",
          padding: 32 * fontScale,
          gap: 16 * fontScale,
        },
        emptyIcon: {
          width: 80 * fontScale * iconScale,
          height: 80 * fontScale * iconScale,
          borderRadius: 40 * fontScale * iconScale,
          backgroundColor:
            colorScheme === "dark"
              ? Colors.dark.surfaceElevated1 // Use elevation-based surface color
              : "rgba(125, 211, 252, 0.3)",
          alignItems: "center",
          justifyContent: "center",
        },
        iconContainer: {
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24 * fontScale,
        },
        addButton: {
          marginTop: 8 * fontScale,
          paddingHorizontal: 24 * fontScale,
          paddingVertical: 12 * fontScale,
          borderRadius: 8 * fontScale,
          backgroundColor: colors.primary,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        listContent: {
          padding: 16 * fontScale,
          paddingBottom: 100 * fontScale,
          gap: 16 * fontScale,
          alignItems: "center",
          backgroundColor: "transparent", // Ensure transparent so gradient shows through
        },
        listContentWrapper: {
          maxWidth: maxContentWidth as any,
          width: "100%",
          alignSelf: "center",
          backgroundColor: "transparent", // Ensure transparent so gradient shows through
          gap: 12 * fontScale, // Add gap between list items
        },
        fabContainer: {
          position: "absolute",
          bottom: 26 * fontScale,
          right: 16 * fontScale,
          zIndex: 10,
        },
        fabButton: {
          width: 56 * fontScale,
          height: 56 * fontScale,
          borderRadius: 28 * fontScale,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        },
        scrollContent: {
          flexGrow: 1,
          justifyContent: "center",
          maxWidth: maxContentWidth as any,
          alignSelf: "center",
          width: "100%",
          paddingHorizontal: 16 * fontScale,
          backgroundColor: "transparent", // Ensure transparent so gradient shows through
        },
        textContainer: {
          alignItems: "center",
          gap: 8 * fontScale,
          maxWidth: 480 * fontScale,
        },
        heading: {
          textAlign: "center",
        },
        description: {
          textAlign: "center",
          maxWidth: 480 * fontScale,
        },
        button: {
          width: "100%",
          minWidth: 84 * fontScale,
          maxWidth: 480 * fontScale,
          height: 48 * fontScale,
          borderRadius: 8 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16 * fontScale,
          marginTop: 32 * fontScale,
        },
        buttonText: {},
        wheelContainer: {
          marginBottom: 32 * fontScale,
          padding: 20 * fontScale,
          borderRadius: 16 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
        },
        wheelTitle: {
          textAlign: "center",
          marginBottom: 8 * fontScale,
        },
        wheelSubtitle: {
          textAlign: "center",
          opacity: 0.7,
          marginBottom: 24 * fontScale,
        },
        wheelWrapper: {
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 20 * fontScale,
        },
        scoresContainer: {
          marginTop: 24 * fontScale,
          gap: 16 * fontScale,
        },
        scoreItem: {
          marginBottom: 12 * fontScale,
          borderRadius: 12 * fontScale,
          padding: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.03)"
              : "rgba(0, 0, 0, 0.03)",
        },
        scoreRowTouchable: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12 * fontScale,
          marginBottom: 8 * fontScale,
        },
        scoreRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12 * fontScale,
          marginBottom: 8 * fontScale,
        },
        scoreLabel: {
          flex: 1,
        },
        scoreValue: {
          minWidth: 50 * fontScale,
          textAlign: "right",
        },
        scoreBarContainer: {
          height: 6 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          borderRadius: 3 * fontScale,
          overflow: "hidden",
        },
        scoreBar: {
          height: "100%",
          borderRadius: 3 * fontScale,
        },
        insightsContainer: {
          marginTop: 32 * fontScale,
          gap: 16 * fontScale,
        },
        insightsTitle: {
          marginBottom: 12 * fontScale,
        },
        insightItem: {
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.03)"
              : "rgba(0, 0, 0, 0.03)",
          borderLeftWidth: 4,
          marginBottom: 12 * fontScale,
        },
        insightHeader: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8 * fontScale,
          marginBottom: 8 * fontScale,
        },
        insightSphere: {
          flex: 1,
        },
        insightMessage: {
          opacity: 0.8,
          lineHeight: 20 * fontScale,
        },
        insightPercentage: {
          marginTop: 4 * fontScale,
          fontWeight: "600",
        },
        comparisonContainer: {
          marginTop: 16 * fontScale,
          paddingTop: 16 * fontScale,
          borderTopWidth: 1,
          borderTopColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
        comparisonSection: {
          marginBottom: 16 * fontScale,
        },
        comparisonSectionTitle: {
          marginBottom: 12 * fontScale,
          opacity: 0.8,
        },
        entityComparisonItem: {
          marginBottom: 12 * fontScale,
        },
        entityComparisonName: {
          marginBottom: 6 * fontScale,
          opacity: 0.9,
        },
        entityComparisonRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8 * fontScale,
        },
        entityScoreBarContainer: {
          flex: 1,
          height: 4 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          borderRadius: 2 * fontScale,
          overflow: "hidden",
        },
        entityScoreBar: {
          height: "100%",
          borderRadius: 2 * fontScale,
        },
        entityScoreValue: {
          minWidth: 40 * fontScale,
          textAlign: "right",
        },
        suggestionContainer: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8 * fontScale,
          marginTop: 16 * fontScale,
          padding: 12 * fontScale,
          borderRadius: 8 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? Colors.dark.surfaceElevated1 // Use elevation-based surface color
              : "rgba(125, 211, 252, 0.2)",
        },
        suggestionText: {
          flex: 1,
          opacity: 0.9,
          lineHeight: 20 * fontScale,
        },
        percentageExplanation: {
          marginTop: 16 * fontScale,
          marginBottom: 8 * fontScale,
          paddingHorizontal: 20 * fontScale,
          paddingVertical: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          borderRadius: 8 * fontScale,
        },
        percentageExplanationText: {
          opacity: 0.7,
          lineHeight: 18 * fontScale,
          textAlign: "center",
        },
      }),
    [
      fontScale,
      iconScale,
      colorScheme,
      colors.primary,
      colors.primaryLight,
      colors.text,
      colors.icon,
      colors.error,
      maxContentWidth,
    ],
  );

  const handleSpherePress = (sphere: LifeSphere) => {
    // Check if the sphere has any moments (floating things) - this determines if it's visually empty
    const hasMoments = sphereData[sphere].totalMoments > 0;

    // Check if sphere has entities
    let hasEntities = false;
    switch (sphere) {
      case "relationships":
        hasEntities = profiles.length > 0;
        break;
      case "career":
        hasEntities = jobs.length > 0;
        break;
      case "family":
        hasEntities = familyMembers.length > 0;
        break;
      case "friends":
        hasEntities = friends.length > 0;
        break;
      case "hobbies":
        hasEntities = hobbies.length > 0;
        break;
    }

    // Determine the new selected sphere
    let newSelectedSphere: LifeSphere | null;
    if (!hasMoments) {
      newSelectedSphere = sphere;
    } else {
      newSelectedSphere = selectedSphere === sphere ? null : sphere;
    }

    // Update state and URL params together to keep them in sync
    setSelectedSphere(newSelectedSphere);
    prevParamsRef.current = newSelectedSphere || undefined;

    // Update URL params without pushing a new history entry
    if (newSelectedSphere) {
      router.setParams({ selectedSphere: newSelectedSphere });
    } else {
      router.setParams({ selectedSphere: undefined });
    }
  };

  const handleSubsectionEntityPress = (entityId: string, sphere: LifeSphere) => {
    switch (sphere) {
      case "relationships":
        router.push({
          pathname: "/edit-profile",
          params: { profileId: entityId, returnTo: "spheres-overview" },
        });
        break;
      case "career":
        router.push({
          pathname: "/edit-job",
          params: { jobId: entityId, returnTo: "spheres-overview" },
        });
        break;
      case "family":
        router.push({
          pathname: "/edit-family-member",
          params: { memberId: entityId, returnTo: "spheres-overview" },
        });
        break;
      case "friends":
        router.push({
          pathname: "/edit-friend",
          params: { friendId: entityId, returnTo: "spheres-overview" },
        });
        break;
      case "hobbies":
        router.push({
          pathname: "/edit-hobby",
          params: { hobbyId: entityId, returnTo: "spheres-overview" },
        });
        break;
    }
  };

  const handleEntityPress = (entity: ExProfile | Job, sphere: LifeSphere) => {
    if (sphere === "relationships") {
      // For relationships, navigate to home screen with selected sphere
      router.push({
        pathname: "/(tabs)" as const,
        params: { sphere: "relationships", entityId: entity.id },
      });
    } else {
      // For other spheres, navigate to home screen
      router.push({
        pathname: "/(tabs)" as const,
        params: { sphere, entityId: entity.id },
      });
    }
  };

  const handleMorePress = (profile: ExProfile) => {
    router.push({
      pathname: "/edit-profile",
      params: { profileId: profile.id },
    });
  };

  const handleAddEntity = (sphere: LifeSphere) => {
    // Paywall is shown on Save in add-entity screens, not here
    switch (sphere) {
      case "relationships":
        router.push("/add-ex-profile");
        break;
      case "career":
        router.push("/add-job");
        break;
      case "family":
        router.push("/add-family-member");
        break;
      case "friends":
        router.push("/add-friend");
        break;
      case "hobbies":
        router.push("/add-hobby");
        break;
    }
  };

  // Define these before the loading check to use in hooks
  const selectedSphereData = selectedSphere
    ? spheres.find((s) => s.type === selectedSphere)
    : null;
  // Use the actual data sources directly instead of relying on selectedSphereData
  const relationshipsProfiles =
    selectedSphere === "relationships" ? profiles : [];
  const careerJobs = selectedSphere === "career" ? jobs : [];
  const familyMembersList = selectedSphere === "family" ? familyMembers : [];
  const friendsList = selectedSphere === "friends" ? friends : [];
  const hobbiesList = selectedSphere === "hobbies" ? hobbies : [];

  // Check if any entity has at least one memory - moved before loading check
  const hasAnyRelationshipMemory = useMemo(() => {
    return relationshipsProfiles.some((profile) => {
      const memories = getIdealizedMemoriesByProfileId(profile.id);
      return memories.length > 0;
    });
  }, [relationshipsProfiles, getIdealizedMemoriesByProfileId]);

  const hasAnyCareerMemory = useMemo(() => {
    return careerJobs.some((job) => {
      const memories = getIdealizedMemoriesByEntityId(job.id, "career");
      return memories.length > 0;
    });
  }, [careerJobs, getIdealizedMemoriesByEntityId]);

  const hasAnyFamilyMemory = useMemo(() => {
    return familyMembersList.some((member) => {
      const memories = getIdealizedMemoriesByEntityId(member.id, "family");
      return memories.length > 0;
    });
  }, [familyMembersList, getIdealizedMemoriesByEntityId]);

  const hasAnyFriendMemory = useMemo(() => {
    return friendsList.some((friend) => {
      const memories = getIdealizedMemoriesByEntityId(friend.id, "friends");
      return memories.length > 0;
    });
  }, [friendsList, getIdealizedMemoriesByEntityId]);

  const hasAnyHobbyMemory = useMemo(() => {
    return hobbiesList.some((hobby) => {
      const memories = getIdealizedMemoriesByEntityId(hobby.id, "hobbies");
      return memories.length > 0;
    });
  }, [hobbiesList, getIdealizedMemoriesByEntityId]);

  if (isLoading) {
    return (
      <TabScreenContainer>
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <View style={styles.headerTitle} />
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </TabScreenContainer>
    );
  }

  const handleJobMorePress = (job: Job) => {
    router.push({
      pathname: "/edit-job",
      params: {
        jobId: job.id,
        returnTo: "spheres",
        returnSphere: "career", // Preserve the selected sphere
      },
    });
  };

  // Show relationships profiles view (ex-profiles content) when relationships sphere is selected
  if (selectedSphere === "relationships") {
    return (
      <TabScreenContainer>
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              clearSelectedSphere();
            }}
            style={styles.headerButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24 * fontScale}
              color={colors.text}
            />
          </Pressable>
          <ThemedText
            size="l"
            weight="bold"
            letterSpacing="s"
            style={styles.headerTitle}
          >
            {t("spheres.relationships")}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        {profiles.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: "transparent" }}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="psychology"
                size={100 * fontScale * iconScale}
                color={
                  colorScheme === "dark" ? colors.primaryLight : colors.primary
                }
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText
                size="l"
                weight="bold"
                letterSpacing="s"
                style={styles.heading}
              >
                {t("profile.emptyState.title")}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t("profile.emptyState.description")}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => handleAddEntity("relationships")}
            >
              <ThemedText
                weight="bold"
                letterSpacing="l"
                style={styles.buttonText}
              >
                {t("profile.emptyState.button")}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={{ backgroundColor: "transparent" }}
            >
              <View style={styles.listContentWrapper}>
                {relationshipsProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onPress={() => handleMorePress(profile)}
                    onMorePress={() => handleMorePress(profile)}
                  />
                ))}
              </View>
            </ScrollView>
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity("relationships")}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="add"
                  size={24 * fontScale}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </TabScreenContainer>
    );
  }

  // Show career jobs view when career sphere is selected
  if (selectedSphere === "career") {
    return (
      <TabScreenContainer>
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              clearSelectedSphere();
            }}
            style={styles.headerButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24 * fontScale}
              color={colors.text}
            />
          </Pressable>
          <ThemedText
            size="l"
            weight="bold"
            letterSpacing="s"
            style={styles.headerTitle}
          >
            {t("spheres.career")}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        {!jobs || !Array.isArray(jobs) || jobs.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: "transparent" }}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="work"
                size={100 * fontScale * iconScale}
                color={
                  colorScheme === "dark" ? colors.primaryLight : colors.primary
                }
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText
                size="l"
                weight="bold"
                letterSpacing="s"
                style={styles.heading}
              >
                {t("job.jobEmptyState.title")}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t("job.jobEmptyState.description")}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push("/add-job")}
            >
              <ThemedText
                weight="bold"
                letterSpacing="l"
                style={styles.buttonText}
              >
                {t("job.jobEmptyState.button")}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={{ backgroundColor: "transparent" }}
            >
              <View style={styles.listContentWrapper}>
                {careerJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onPress={() => handleJobMorePress(job)}
                    onMorePress={() => handleJobMorePress(job)}
                  />
                ))}
              </View>
            </ScrollView>
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity("career")}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="add"
                  size={24 * fontScale}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </TabScreenContainer>
    );
  }

  // Show family members view when family sphere is selected
  if (selectedSphere === "family") {
    const handleFamilyMemberMorePress = (member: FamilyMember) => {
      router.push({
        pathname: "/edit-family-member",
        params: { memberId: member.id },
      });
    };

    return (
      <TabScreenContainer>
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              clearSelectedSphere();
            }}
            style={styles.headerButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24 * fontScale}
              color={colors.text}
            />
          </Pressable>
          <ThemedText
            size="l"
            weight="bold"
            letterSpacing="s"
            style={styles.headerTitle}
          >
            {t("spheres.family")}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        {familyMembers.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: "transparent" }}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="family-restroom"
                size={100 * fontScale * iconScale}
                color={
                  colorScheme === "dark" ? colors.primaryLight : colors.primary
                }
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText
                size="l"
                weight="bold"
                letterSpacing="s"
                style={styles.heading}
              >
                {t("profile.familyEmptyState.title")}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t("profile.familyEmptyState.description")}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push("/add-family-member")}
            >
              <ThemedText
                weight="bold"
                letterSpacing="l"
                style={styles.buttonText}
              >
                {t("profile.familyEmptyState.button")}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={{ backgroundColor: "transparent" }}
            >
              <View style={styles.listContentWrapper}>
                {familyMembersList.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.entityCard}
                    onPress={() => handleFamilyMemberMorePress(member)}
                    activeOpacity={0.7}
              hitSlop={12}
                  >
                    {member.imageUri ? (
                      <Image
                        source={{ uri: member.imageUri }}
                        style={styles.entityImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.entityImage,
                          { alignItems: "center", justifyContent: "center" },
                        ]}
                      >
                        <MaterialIcons
                          name="person"
                          size={24 * fontScale}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    <View style={styles.entityInfo}>
                      <ThemedText size="l" weight="bold">
                        {member.name}
                      </ThemedText>
                      {member.relationship && (
                        <ThemedText size="sm" style={{ opacity: 0.7 }}>
                          {member.relationship}
                        </ThemedText>
                      )}
                      {member.description && (
                        <ThemedText
                          size="xs"
                          style={{ opacity: 0.6 }}
                          numberOfLines={1}
                        >
                          {member.description}
                        </ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleFamilyMemberMorePress(member)}
                      style={{ padding: 8 * fontScale }}
                    >
                      <MaterialIcons
                        name="more-vert"
                        size={24 * fontScale}
                        color={colors.icon}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity("family")}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="add"
                  size={24 * fontScale}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </TabScreenContainer>
    );
  }

  if (selectedSphere === "friends") {
    const handleFriendMorePress = (friend: Friend) => {
      router.push({
        pathname: "/edit-friend",
        params: { friendId: friend.id },
      });
    };

    return (
      <TabScreenContainer>
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              clearSelectedSphere();
            }}
            style={styles.headerButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24 * fontScale}
              color={colors.text}
            />
          </Pressable>
          <ThemedText
            size="l"
            weight="bold"
            letterSpacing="s"
            style={styles.headerTitle}
          >
            {t("spheres.friends")}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        {friends.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: "transparent" }}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="people"
                size={100 * fontScale * iconScale}
                color={
                  colorScheme === "dark" ? colors.primaryLight : colors.primary
                }
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText
                size="l"
                weight="bold"
                letterSpacing="s"
                style={styles.heading}
              >
                {t("profile.friendEmptyState.title")}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t("profile.friendEmptyState.description")}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push("/add-friend")}
            >
              <ThemedText
                weight="bold"
                letterSpacing="l"
                style={styles.buttonText}
              >
                {t("profile.friendEmptyState.button")}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={{ backgroundColor: "transparent" }}
            >
              <View style={styles.listContentWrapper}>
                {friendsList.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.entityCard}
                    onPress={() => handleFriendMorePress(friend)}
                    activeOpacity={0.7}
              hitSlop={12}
                  >
                    {friend.imageUri ? (
                      <Image
                        source={{ uri: friend.imageUri }}
                        style={styles.entityImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.entityImage,
                          { alignItems: "center", justifyContent: "center" },
                        ]}
                      >
                        <MaterialIcons
                          name="people"
                          size={24 * fontScale}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    <View style={styles.entityInfo}>
                      <ThemedText size="l" weight="bold">
                        {friend.name}
                      </ThemedText>
                      {friend.description && (
                        <ThemedText
                          size="xs"
                          style={{ opacity: 0.6 }}
                          numberOfLines={1}
                        >
                          {friend.description}
                        </ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleFriendMorePress(friend)}
                      style={{ padding: 8 * fontScale }}
                    >
                      <MaterialIcons
                        name="more-vert"
                        size={24 * fontScale}
                        color={colors.icon}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity("friends")}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="add"
                  size={24 * fontScale}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </TabScreenContainer>
    );
  }

  if (selectedSphere === "hobbies") {
    const handleHobbyMorePress = (hobby: Hobby) => {
      router.push({
        pathname: "/edit-hobby",
        params: { hobbyId: hobby.id },
      });
    };

    return (
      <TabScreenContainer>
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              clearSelectedSphere();
            }}
            style={styles.headerButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24 * fontScale}
              color={colors.text}
            />
          </Pressable>
          <ThemedText
            size="l"
            weight="bold"
            letterSpacing="s"
            style={styles.headerTitle}
          >
            {t("spheres.hobbies")}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        {hobbies.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: "transparent" }}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="sports-esports"
                size={100 * fontScale * iconScale}
                color={
                  colorScheme === "dark" ? colors.primaryLight : colors.primary
                }
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText
                size="l"
                weight="bold"
                letterSpacing="s"
                style={styles.heading}
              >
                {t("profile.hobbyEmptyState.title")}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t("profile.hobbyEmptyState.description")}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push("/add-hobby")}
            >
              <ThemedText
                weight="bold"
                letterSpacing="l"
                style={styles.buttonText}
              >
                {t("profile.hobbyEmptyState.button")}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={{ backgroundColor: "transparent" }}
            >
              <View style={styles.listContentWrapper}>
                {hobbiesList.map((hobby) => (
                  <TouchableOpacity
                    key={hobby.id}
                    style={styles.entityCard}
                    onPress={() => handleHobbyMorePress(hobby)}
                    activeOpacity={0.7}
              hitSlop={12}
                  >
                    {hobby.imageUri ? (
                      <Image
                        source={{ uri: hobby.imageUri }}
                        style={styles.entityImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.entityImage,
                          { alignItems: "center", justifyContent: "center" },
                        ]}
                      >
                        <MaterialIcons
                          name="sports-esports"
                          size={24 * fontScale}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    <View style={styles.entityInfo}>
                      <ThemedText size="l" weight="bold">
                        {hobby.name}
                      </ThemedText>
                      {hobby.description && (
                        <ThemedText
                          size="xs"
                          style={{ opacity: 0.6 }}
                          numberOfLines={1}
                        >
                          {hobby.description}
                        </ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleHobbyMorePress(hobby)}
                      style={{ padding: 8 * fontScale }}
                    >
                      <MaterialIcons
                        name="more-vert"
                        size={24 * fontScale}
                        color={colors.icon}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity("hobbies")}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="add"
                  size={24 * fontScale}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </TabScreenContainer>
    );
  }

  return (
    <TabScreenContainer>
      <ConstellationBackground
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        constellationAmount={constellationAmount}
        constellationOpacity={constellationOpacity}
      />
      <View style={styles.manualEditContent}>
        {!selectedSphere && (
          <>
            <View
              style={[
                styles.manualEditTopBar,
                { paddingTop: insets.top + 14 },
              ]}
            >
              <Pressable
                onPress={() => {
                  router.navigate("/");
                }}
                style={styles.manualEditExitButton}
                accessibilityRole="button"
                accessibilityLabel={t("spheres.exitManualEdit")}
              >
                <MaterialIcons
                  name="logout"
                  size={22 * fontScale}
                  color="#64B5F6"
                />
              </Pressable>
              <ThemedText
                size="l"
                weight="bold"
                style={styles.manualEditTitleRight}
                numberOfLines={2}
              >
                {t("spheres.manualEditMode")}
              </ThemedText>
            </View>
            <ScrollView
              style={{ width: "100%", flex: 1 }}
              contentContainerStyle={styles.manualEditScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            {allEntitiesFlat.length > 0 && (
              <View style={{ marginBottom: 24 * fontScale }}>
                <ThemedText
                  size="xs"
                  weight="semibold"
                  emphasis="medium"
                  style={styles.subsectionSectionLabel}
                >
                  {t("spheres.recentlyEdited")}
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 2 * fontScale,
                    paddingBottom: 4,
                  }}
                >
                  {subsectionEntities.map((entity) => {
                    const accent = getSphereAccentColor(entity.sphere);
                    return (
                      <TouchableOpacity
                        key={entity.id}
                        style={[
                          styles.subsectionCard,
                          { borderLeftColor: accent, borderLeftWidth: 3 },
                        ]}
                        onPress={() =>
                          handleSubsectionEntityPress(entity.id, entity.sphere)
                        }
                        activeOpacity={0.85}
                      >
                        {entity.imageUri ? (
                          <Image
                            source={{ uri: entity.imageUri }}
                            style={styles.subsectionCardImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.subsectionCardImage,
                              {
                                backgroundColor: accent + "22",
                                justifyContent: "center",
                                alignItems: "center",
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={
                                (spheres.find((s) => s.type === entity.sphere)
                                  ?.icon as any) ?? "circle"
                              }
                              size={18 * fontScale * iconScale}
                              color={accent}
                            />
                          </View>
                        )}
                        <ThemedText
                          size="xs"
                          weight="semibold"
                          numberOfLines={1}
                          style={{ marginTop: 6 * fontScale }}
                        >
                          {entity.name}
                        </ThemedText>
                        <ThemedText size="xs" emphasis="disabled" numberOfLines={1}>
                          {entity.memoryCount}{" "}
                          {entity.memoryCount === 1
                            ? t("spheres.memory")
                            : t("spheres.memories")}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            {spheres.map((sphere) => {
              const accent = getSphereAccentColor(sphere.type);
              const count = sphere.entities.length;
              return (
                <TouchableOpacity
                  key={sphere.type}
                  style={[
                    styles.manualEditRow,
                    { borderLeftWidth: 3, borderLeftColor: accent },
                  ]}
                  onPress={() => handleSpherePress(sphere.type)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.manualEditIconBox,
                      {
                        borderColor: accent + "99",
                        backgroundColor:
                          colorScheme === "dark"
                            ? "rgba(255, 255, 255, 0.06)"
                            : "rgba(0, 0, 0, 0.04)",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={sphere.icon as any}
                      size={26 * fontScale * iconScale}
                      color={accent}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText weight="semibold" size="m" numberOfLines={1}>
                      {sphere.label}
                    </ThemedText>
                    <ThemedText
                      size="xs"
                      emphasis="medium"
                      style={styles.manualEditSubtitle}
                    >
                      {count}{" "}
                      {count === 1 ? t("spheres.entity") : t("spheres.entities")}
                    </ThemedText>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={22 * fontScale}
                    color={colors.icon}
                    style={{ opacity: 0.45 }}
                  />
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          </>
        )}

        <AIInsightsConsentModal
          visible={aiInsightsConsentVisible}
          onEnable={() => {
            setAiInsightsConsentVisible(false);
            const pending = pendingAIIconActionRef.current;
            pendingAIIconActionRef.current = null;
            void aiConsent.setChoice("enabled").then(() => {
              if (pending === "open_ai") {
                setAiActionModalVisible(true);
              }
            });
          }}
          onMaybeLater={() => {
            void aiConsent.setChoice("maybe_later").then(() => {
              pendingAIIconActionRef.current = null;
              setAiInsightsConsentVisible(false);
            });
          }}
        />

        {/* AI Action Modal */}
        {aiActionModalVisible && (
          <AIActionModal
            visible={aiActionModalVisible}
            onClose={() => setAiActionModalVisible(false)}
            onSelectCreateMemory={handleSelectCreateMemory}
            hasEntities={
              profiles.length +
                jobs.length +
                familyMembers.length +
                friends.length +
                hobbies.length >
              0
            }
          />
        )}

        {/* AI Entity Creation Modal */}
        {aiEntityCreationModalVisible && (
          <AIEntityCreationModal
            visible={aiEntityCreationModalVisible}
            onClose={() => {
              setAiEntityCreationModalVisible(false);
              setPendingEntityResponse(null);
            }}
            onCreateMemory={handleSelectCreateMemory}
            onMinimize={() => {
              setAiEntityCreationModalVisible(false);
            }}
            pendingResponse={pendingEntityResponse}
            onEntityCreated={handleEntityCreated}
          />
        )}

      </View>
    </TabScreenContainer>
  );
}
