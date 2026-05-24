import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { Input } from "@/library/components/input";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { TextArea } from "@/library/components/text-area";
import { UploadPicture } from "@/library/components/upload-picture";
import { ensureImageInAppDocuments } from "@/utils/entity-image-storage";
import { useJourney } from "@/utils/JourneyProvider";
import { useSubscription } from "@/utils/SubscriptionProvider";
import { getFreeEntityLimitPerSfera } from "@/utils/badge-rewards";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForAnySubscriptionAccess } from "@/utils/premium-access";
import { getSphereAccentColor } from "@/utils/sphere-styles";
import { useUnsavedChanges } from "@/utils/UnsavedChangesContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddJobScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const sphereAccent = getSphereAccentColor(
    "career",
    (colorScheme ?? "dark") as "light" | "dark",
  );
  const fontScale = useFontScale();
  const { addJob, updateJob, getJob, jobs } = useJourney();
  const { ensureSubscriptionResolved } = useSubscription();
  const params = useLocalSearchParams();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  const { registerScreen, resetScreen } = useUnsavedChanges();
  const navigation = useNavigation();

  const isEditMode = params.edit === "true" && params.jobId;
  const jobId = params.jobId as string | undefined;
  const existingJob = jobId ? getJob(jobId) : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isCurrent, setIsCurrent] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [originalName, setOriginalName] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");
  const [originalStartDate, setOriginalStartDate] = useState("");
  const [originalEndDate, setOriginalEndDate] = useState("");
  const [originalIsCurrent, setOriginalIsCurrent] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Track initial job count to prevent redirect after saving first job
  const isSaving = useRef(false);
  const isNavigatingAway = useRef(false);

  // Refs to track initial values for unsaved changes detection
  const initialName = useRef("");
  const initialDescription = useRef("");
  const initialImage = useRef<string | null>(null);
  const initialStartDate = useRef<Date | null>(null);
  const initialEndDate = useRef<Date | null>(null);
  const initialIsCurrent = useRef(false);

  // Load existing job data when in edit mode
  useEffect(() => {
    if (existingJob && isEditMode) {
      const jobName = existingJob.name || "";
      const jobDescription = existingJob.description || "";
      const jobImage = existingJob.imageUri || null;
      const start = existingJob.startDate
        ? new Date(existingJob.startDate)
        : null;
      const end = existingJob.endDate ? new Date(existingJob.endDate) : null;
      const current = existingJob.endDate === null;
      setName(jobName);
      setDescription(jobDescription);
      setSelectedImage(jobImage);
      setStartDate(start);
      setEndDate(end);
      setIsCurrent(current);
      setOriginalName(jobName);
      setOriginalDescription(jobDescription);
      setOriginalImage(jobImage);
      setOriginalStartDate(existingJob.startDate || "");
      setOriginalEndDate(existingJob.endDate || "");
      setOriginalIsCurrent(current);

      // Store initial values in refs for unsaved changes detection
      initialName.current = jobName;
      initialDescription.current = jobDescription;
      initialImage.current = jobImage;
      initialStartDate.current = start;
      initialEndDate.current = end;
      initialIsCurrent.current = current;
    } else {
      // Reset values when not in edit mode
      setName("");
      setDescription("");
      setOriginalName("");
      setOriginalDescription("");
      setSelectedImage(null);
      setOriginalImage(null);
      setStartDate(null);
      setEndDate(null);
      setIsCurrent(false);
      setOriginalStartDate("");
      setOriginalEndDate("");
      setOriginalIsCurrent(false);

      // Reset initial values
      initialName.current = "";
      initialDescription.current = "";
      initialImage.current = null;
      initialStartDate.current = null;
      initialEndDate.current = null;
      initialIsCurrent.current = false;
    }
  }, [existingJob, isEditMode]);

  // Check if form is valid (name is filled)
  const isFormValid = name.trim().length > 0;

  // Check if there are changes from original values (only in edit mode)
  const hasChanges = useMemo(() => {
    if (!isEditMode) {
      return isFormValid;
    }
    const nameChanged = name.trim() !== originalName.trim();
    const descriptionChanged =
      description.trim() !== originalDescription.trim();
    const imageChanged = selectedImage !== originalImage;
    const startDateStr = startDate ? startDate.toISOString().split("T")[0] : "";
    const endDateStr = isCurrent
      ? null
      : endDate
        ? endDate.toISOString().split("T")[0]
        : "";
    const startDateChanged = startDateStr !== originalStartDate;
    const endDateChanged = (isCurrent ? null : endDateStr) !== originalEndDate;
    const currentChanged = isCurrent !== originalIsCurrent;
    return (
      nameChanged ||
      descriptionChanged ||
      imageChanged ||
      startDateChanged ||
      endDateChanged ||
      currentChanged
    );
  }, [
    isEditMode,
    name,
    description,
    originalName,
    originalDescription,
    selectedImage,
    originalImage,
    isFormValid,
    startDate,
    endDate,
    isCurrent,
    originalStartDate,
    originalEndDate,
    originalIsCurrent,
  ]);

  const isSaveEnabled = isFormValid && hasChanges;

  // Function to check if there are unsaved changes (for navigation interception)
  const hasUnsavedChanges = useCallback(() => {
    // Check if name changed
    if (name.trim() !== initialName.current.trim()) {
      return true;
    }

    // Check if description changed
    if (description.trim() !== initialDescription.current.trim()) {
      return true;
    }

    // Check if image changed
    if (selectedImage !== initialImage.current) {
      return true;
    }

    // Check if start date changed
    const currentStartDateStr = startDate
      ? startDate.toISOString().split("T")[0]
      : "";
    const initialStartDateStr = initialStartDate.current
      ? initialStartDate.current.toISOString().split("T")[0]
      : "";
    if (currentStartDateStr !== initialStartDateStr) {
      return true;
    }

    // Check if end date changed
    const currentEndDateStr = isCurrent
      ? null
      : endDate
        ? endDate.toISOString().split("T")[0]
        : "";
    const initialEndDateStr = initialIsCurrent.current
      ? null
      : initialEndDate.current
        ? initialEndDate.current.toISOString().split("T")[0]
        : "";
    if (currentEndDateStr !== initialEndDateStr) {
      return true;
    }

    // Check if current status changed
    if (isCurrent !== initialIsCurrent.current) {
      return true;
    }

    return false;
  }, [name, description, selectedImage, startDate, endDate, isCurrent]);

  // Register this screen with unsaved changes context
  useEffect(() => {
    const screenId = "add-job";

    const resetToInitialState = () => {
      setName(initialName.current);
      setDescription(initialDescription.current);
      setSelectedImage(initialImage.current);
      setStartDate(initialStartDate.current);
      setEndDate(initialEndDate.current);
      setIsCurrent(initialIsCurrent.current);
    };

    const unregister = registerScreen(
      screenId,
      () => {
        if (!navigation.isFocused()) return false;
        // Return true if there are unsaved changes AND we're not navigating away or saving
        const result = !isNavigatingAway.current && !isSaving.current && hasUnsavedChanges();
        return result;
      },
      resetToInitialState
    );

    return () => {
      unregister();
    };
  }, [navigation, registerScreen, hasUnsavedChanges]);

  // Listen for navigation events to show confirmation dialog
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (
        isNavigatingAway.current ||
        isSaving.current ||
        !hasUnsavedChanges()
      ) {
        return; // Don't show dialog
      }

      e.preventDefault();
      Alert.alert(
        t("memory.unsavedChanges.title"),
        t("memory.unsavedChanges.message"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.discard"),
            style: "destructive",
            onPress: () => {
              resetScreen("add-job");
              isNavigatingAway.current = true;
              router.back();
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, t]);

  // Reset navigation flag and sync state with initial values when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // Reset the navigating away flag
      isNavigatingAway.current = false;

      // If we navigated away and came back, reset state to match initial values
      // This prevents showing the unsaved changes dialog for old changes after discarding
      if (isEditMode && existingJob) {
        // In edit mode, reset to existing job values
        setName(initialName.current);
        setDescription(initialDescription.current);
        setSelectedImage(initialImage.current);
        setStartDate(initialStartDate.current);
        setEndDate(initialEndDate.current);
        setIsCurrent(initialIsCurrent.current);
      } else {
        // In create mode, reset to empty values
        setName(initialName.current);
        setDescription(initialDescription.current);
        setSelectedImage(initialImage.current);
        setStartDate(initialStartDate.current);
        setEndDate(initialEndDate.current);
        setIsCurrent(initialIsCurrent.current);
      }

    });

    return unsubscribe;
  }, [navigation]);

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
          marginTop: 70 * fontScale,
        },
        headerButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        },
        headerTitle: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8 * fontScale,
          flex: 1,
          justifyContent: "center",
        },
        scrollContent: {
          padding: 16 * fontScale,
          gap: 24 * fontScale,
        },
        title: {
          marginBottom: 8 * fontScale,
        },
        description: {
          marginBottom: 24 * fontScale,
        },
        form: {
          gap: 20 * fontScale,
          maxWidth: maxContentWidth as any,
          alignSelf: "center",
          width: "100%",
        },
        button: {
          width: "100%",
          maxWidth: maxContentWidth as any,
          height: 48 * fontScale,
          borderRadius: 8 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16 * fontScale,
          marginTop: 8 * fontScale,
          alignSelf: "center",
        },
        buttonDisabled: {
          opacity: 0.5,
        },
      }),
    [fontScale, maxContentWidth],
  );

  const handleUploadPicture = async () => {
    setIsLoadingImage(true);
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setIsLoadingImage(false);
        alert(t("error.cameraPermissionRequired"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      setIsLoadingImage(false);
      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch {
      setIsLoadingImage(false);
      alert(t("error.imagePickFailed"));
    }
  };

  const handleDeleteImage = () => {
    setSelectedImage(null);
  };

  const handleSubmit = async () => {
    if (!isSaveEnabled) return;

    // Check subscription limit for new jobs (not edits) - show paywall on Save
    const freeEntityLimit = await getFreeEntityLimitPerSfera();
    if (!isEditMode && jobs.length >= freeEntityLimit) {
      const { hasEntityLimitEntitlement } =
        await ensureSubscriptionResolved();
      if (!hasEntityLimitEntitlement) {
        const subscribed = await showPaywallForAnySubscriptionAccess();
        if (!subscribed) return;
      }
    }

    // Mark as saving to prevent useEffect redirect
    isSaving.current = true;

    try {
      if (isEditMode && jobId) {
        await updateJob(jobId, {
          name: name.trim(),
          description: description.trim() || undefined,
          ...(selectedImage && {
            imageUri: await ensureImageInAppDocuments(selectedImage),
          }),
          startDate: startDate
            ? startDate.toISOString().split("T")[0]
            : undefined,
          endDate: isCurrent
            ? null
            : endDate
              ? endDate.toISOString().split("T")[0]
              : undefined,
        });
        const updated = getJob(jobId);
        if (updated) {
          const jobName = updated.name || "";
          const jobDescription = updated.description || "";
          const jobImage = updated.imageUri || null;
          const start = updated.startDate ? new Date(updated.startDate) : null;
          const end = updated.endDate ? new Date(updated.endDate) : null;
          const current = updated.endDate === null;
          setOriginalName(jobName);
          setOriginalDescription(jobDescription);
          setOriginalImage(jobImage);
          setOriginalStartDate(updated.startDate || "");
          setOriginalEndDate(updated.endDate || "");
          setOriginalIsCurrent(current);
          initialName.current = jobName;
          initialDescription.current = jobDescription;
          initialImage.current = jobImage;
          initialStartDate.current = start;
          initialEndDate.current = end;
          initialIsCurrent.current = current;
        }
        isSaving.current = false;
      } else {
        const newJobId = await addJob({
          name: name.trim(),
          description: description.trim() || undefined,
          startDate: startDate
            ? startDate.toISOString().split("T")[0]
            : undefined,
          endDate: isCurrent
            ? null
            : endDate
              ? endDate.toISOString().split("T")[0]
              : undefined,
          setupProgress: 0,
          isCompleted: false,
          ...(selectedImage && {
            imageUri: await ensureImageInAppDocuments(selectedImage),
          }),
        });
        // Navigate to memory creation screen for the new job
        // Reset saving flag before navigation
        isSaving.current = false;
        router.replace({
          pathname: "/idealized-memories",
          params: { entityId: newJobId, sphere: "career" },
        });
        return; // Exit early to prevent any further execution
      }
    } catch {
      // Error saving job
      isSaving.current = false;
    }
  };

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            router.navigate({
              pathname: '/(tabs)/spheres',
              params: { selectedSphere: 'career' }
            });
          }}
          activeOpacity={0.7}
              hitSlop={12}
        >
          <MaterialIcons
            name="arrow-back"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <MaterialIcons
            name="work"
            size={20 * fontScale}
            color={sphereAccent}
          />
          <ThemedText size="l" weight="bold" letterSpacing="s">
            {isEditMode ? t("job.editJob.title") : t("job.addJob")}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <ThemedText
            size="xl"
            weight="bold"
            letterSpacing="s"
            style={styles.title}
          >
            {isEditMode ? t("job.editJob.title") : t("job.addNewJob")}
          </ThemedText>
          <ThemedText size="sm" weight="normal" style={styles.description}>
            {isEditMode
              ? t("job.editJob.description")
              : t("job.addJob.description")}
          </ThemedText>
        </View>

        <View style={styles.form}>
          <Input
            label={t("job.jobTitleAndCompany")}
            placeholder={t("job.jobTitleAndCompany.placeholder")}
            value={name}
            onChangeText={setName}
          />

          <TextArea
            label={`${t("job.jobDescription")} (${t("common.optional")})`}
            placeholder={t("job.description.placeholder")}
            value={description}
            onChangeText={(text) => {
              if (text.length <= 30) {
                setDescription(text);
              }
            }}
            maxLength={30}
            showCharCount={true}
            rows={2}
          />

          <View style={{ gap: 16 * fontScale }}>
            <View>
              <ThemedText
                size="sm"
                weight="medium"
                style={{ marginBottom: 8 * fontScale }}
              >
                {t("job.startDate")}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowStartDatePicker(true)}
                style={{
                  padding: 16 * fontScale,
                  borderRadius: 12 * fontScale,
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.05)",
                  borderWidth: 1,
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                activeOpacity={0.7}
              hitSlop={12}
              >
                <ThemedText size="l">
                  {startDate
                    ? startDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : t("job.startDate.select")}
                </ThemedText>
                <MaterialIcons
                  name="calendar-today"
                  size={20 * fontScale}
                  color={sphereAccent}
                />
              </TouchableOpacity>
              {Platform.OS === "ios" ? (
                <Modal
                  visible={showStartDatePicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowStartDatePicker(false)}
                >
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "flex-end",
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    <View
                      style={{
                        backgroundColor:
                          colorScheme === "dark" ? "#1E3A52" : "#FFFFFF",
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        paddingTop: 20,
                        paddingBottom: 40,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
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
                          onPress={() => setShowStartDatePicker(false)}
                        >
                          <ThemedText
                            size="l"
                            style={{ color: sphereAccent }}
                          >
                            {t("common.cancel")}
                          </ThemedText>
                        </TouchableOpacity>
                        <ThemedText size="l" weight="semibold">
                          {t("job.startDate.selectTitle")}
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() => {
                            // Validate: start date cannot be after end date
                            const currentStartDate = startDate || new Date();
                            if (endDate && currentStartDate > endDate) {
                              Alert.alert(
                                t("common.error"),
                                t("profile.date.error.startAfterEnd"),
                                [{ text: t("common.ok") }],
                              );
                              return;
                            }
                            setShowStartDatePicker(false);
                          }}
                        >
                          <ThemedText
                            size="l"
                            style={{ color: sphereAccent, fontWeight: "600" }}
                          >
                            {t("common.ok")}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={startDate || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            setStartDate(selectedDate);
                            // If end date exists and is before new start date, clear it
                            if (endDate && selectedDate > endDate) {
                              setEndDate(null);
                            }
                          }
                        }}
                        maximumDate={endDate || undefined}
                        style={{ height: 200 * fontScale }}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                showStartDatePicker && (
                  <DateTimePicker
                    value={startDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowStartDatePicker(false);
                      if (event.type === "set" && selectedDate) {
                        // Validate: start date cannot be after end date
                        if (endDate && selectedDate > endDate) {
                          Alert.alert(
                            t("common.error"),
                            t("profile.date.error.startAfterEnd"),
                            [{ text: t("common.ok") }],
                          );
                          setEndDate(null); // Clear invalid end date
                          return;
                        }
                        setStartDate(selectedDate);
                      }
                    }}
                  />
                )
              )}
            </View>

            <View style={{ marginTop: 8 * fontScale }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <TouchableOpacity
                  style={{
                    width: 24 * fontScale,
                    height: 24 * fontScale,
                    borderWidth: 2,
                    borderColor: sphereAccent,
                    borderRadius: 4,
                    marginRight: 8 * fontScale,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isCurrent ? sphereAccent : "transparent",
                  }}
                  onPress={() => setIsCurrent(!isCurrent)}
                  activeOpacity={0.7}
                >
                  {isCurrent && (
                    <MaterialIcons
                      name="check"
                      size={16 * fontScale}
                      color="#ffffff"
                    />
                  )}
                </TouchableOpacity>
                <ThemedText size="l" onPress={() => setIsCurrent(!isCurrent)}>
                  {t("job.currentJob")}
                </ThemedText>
              </View>
            </View>

            {!isCurrent && (
              <View>
                <ThemedText
                  size="sm"
                  weight="medium"
                  style={{ marginBottom: 8 * fontScale }}
                >
                  {t("job.endDate")}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setShowEndDatePicker(true)}
                  style={{
                    padding: 16 * fontScale,
                    borderRadius: 12 * fontScale,
                    backgroundColor:
                      colorScheme === "dark"
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(0, 0, 0, 0.05)",
                    borderWidth: 1,
                    borderColor:
                      colorScheme === "dark"
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText size="l">
                    {endDate
                      ? endDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : t("job.endDate.select")}
                  </ThemedText>
                  <MaterialIcons
                    name="calendar-today"
                    size={20 * fontScale}
                    color={sphereAccent}
                  />
                </TouchableOpacity>
                {Platform.OS === "ios" ? (
                  <Modal
                    visible={showEndDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEndDatePicker(false)}
                  >
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "flex-end",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      <View
                        style={{
                          backgroundColor:
                            colorScheme === "dark" ? "#1E3A52" : "#FFFFFF",
                          borderTopLeftRadius: 20,
                          borderTopRightRadius: 20,
                          paddingTop: 20,
                          paddingBottom: 40,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
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
                            onPress={() => setShowEndDatePicker(false)}
                          >
                            <ThemedText
                              size="l"
                              style={{ color: sphereAccent }}
                            >
                              {t("common.cancel")}
                            </ThemedText>
                          </TouchableOpacity>
                          <ThemedText size="l" weight="semibold">
                            {t("job.endDate.selectTitle")}
                          </ThemedText>
                          <TouchableOpacity
                            onPress={() => {
                              // Validate: end date cannot be before start date
                              const currentEndDate = endDate || new Date();
                              if (startDate && currentEndDate < startDate) {
                                Alert.alert(
                                  t("common.error"),
                                  t("profile.date.error.endBeforeStart"),
                                  [{ text: t("common.ok") }],
                                );
                                return;
                              }
                              setShowEndDatePicker(false);
                            }}
                          >
                            <ThemedText
                              size="l"
                              style={{
                                color: sphereAccent,
                                fontWeight: "600",
                              }}
                            >
                              {t("common.ok")}
                            </ThemedText>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={endDate || new Date()}
                          mode="date"
                          display="spinner"
                          onChange={(event, selectedDate) => {
                            if (selectedDate) {
                              // Validate: end date cannot be before start date
                              if (startDate && selectedDate < startDate) {
                                Alert.alert(
                                  t("common.error"),
                                  t("profile.date.error.endBeforeStart"),
                                  [{ text: t("common.ok") }],
                                );
                                return;
                              }
                              setEndDate(selectedDate);
                            }
                          }}
                          minimumDate={startDate || undefined}
                          style={{ height: 200 * fontScale }}
                        />
                      </View>
                    </View>
                  </Modal>
                ) : (
                  showEndDatePicker && (
                    <DateTimePicker
                      value={endDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowEndDatePicker(false);
                        if (event.type === "set" && selectedDate) {
                          // Validate: end date cannot be before start date
                          if (startDate && selectedDate < startDate) {
                            Alert.alert(
                              t("common.error"),
                              t("profile.date.error.endBeforeStart"),
                              [{ text: t("common.ok") }],
                            );
                            return;
                          }
                          setEndDate(selectedDate);
                        }
                      }}
                    />
                  )
                )}
              </View>
            )}
          </View>

          <UploadPicture
            label={t("job.companyLogo")}
            onPress={handleUploadPicture}
            onDelete={handleDeleteImage}
            imageUri={selectedImage}
            isLoading={isLoadingImage}
            hasImage={!!selectedImage}
            avatarMode={true}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: sphereAccent },
            !isSaveEnabled && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!isSaveEnabled}
        >
          <ThemedText
            weight="bold"
            letterSpacing="l"
            style={{ color: "#ffffff" }}
          >
            {isEditMode ? t("common.save") : t("job.addJob")}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </TabScreenContainer>
  );
}
