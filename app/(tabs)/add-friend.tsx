import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { Input } from "@/library/components/input";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { TextArea } from "@/library/components/text-area";
import { UploadPicture } from "@/library/components/upload-picture";
import { ensureImageInAppDocuments } from "@/utils/entity-image-storage";
import { useJourney } from "@/utils/JourneyProvider";
import { useSubscription } from "@/utils/SubscriptionProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForAnySubscriptionAccess } from "@/utils/premium-access";
import { useUnsavedChanges } from "@/utils/UnsavedChangesContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

export default function AddFriendScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { addFriend, updateFriend, getFriend, friends } = useJourney();
  const { ensureSubscriptionResolved } = useSubscription();
  const params = useLocalSearchParams();
  const t = useTranslate();
  const { registerScreen, resetScreen } = useUnsavedChanges();
  const navigation = useNavigation();

  const isEditMode = params.edit === "true" && params.friendId;
  const friendId = params.friendId as string | undefined;
  const existingFriend = friendId ? getFriend(friendId) : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs for navigation and initial values tracking
  const isNavigatingAway = useRef(false);
  const initialName = useRef("");
  const initialDescription = useRef("");
  const initialImage = useRef<string | null>(null);

  // Track initial friend count to prevent redirect after saving first friend
  // Load existing friend data when in edit mode
  useEffect(() => {
    if (isEditMode && existingFriend) {
      const friendName = existingFriend.name || "";
      const friendDesc = existingFriend.description || "";
      const friendImg = existingFriend.imageUri || null;

      setName(friendName);
      setDescription(friendDesc);
      setSelectedImage(friendImg);

      // Store initial values in refs
      initialName.current = friendName;
      initialDescription.current = friendDesc;
      initialImage.current = friendImg;
    } else {
      // Reset initial values
      initialName.current = "";
      initialDescription.current = "";
      initialImage.current = null;
    }
  }, [isEditMode, existingFriend]);

  const handleUploadPicture = async () => {
    try {
      setIsLoadingImage(true);

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
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

  const isSaveEnabled = name.trim().length > 0 && !isSaving;

  // Function to check if there are unsaved changes (for navigation interception)
  const hasUnsavedChanges = useCallback(() => {
    if (name.trim() !== initialName.current.trim()) return true;
    if (description.trim() !== initialDescription.current.trim()) return true;
    if (selectedImage !== initialImage.current) return true;
    return false;
  }, [name, description, selectedImage]);

  // Register this screen with unsaved changes context
  useEffect(() => {
    const screenId = "add-friend";

    const resetToInitialState = () => {
      setName(initialName.current);
      setDescription(initialDescription.current);
      setSelectedImage(initialImage.current);
    };

    const unregister = registerScreen(
      screenId,
      () => {
        return !isNavigatingAway.current && !isSaving && hasUnsavedChanges();
      },
      resetToInitialState
    );
    return unregister;
  }, [registerScreen, hasUnsavedChanges, isSaving]);

  // Listen for navigation events to show confirmation dialog
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isNavigatingAway.current || isSaving || !hasUnsavedChanges()) {
        return;
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
              resetScreen("add-friend");
              isNavigatingAway.current = true;
              router.back();
            },
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges, isSaving, t]);

  // Reset navigation flag and sync state with initial values when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      isNavigatingAway.current = false;
      // Reset state to match initial values to prevent stale unsaved changes
      setName(initialName.current);
      setDescription(initialDescription.current);
      setSelectedImage(initialImage.current);
    });
    return unsubscribe;
  }, [navigation]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.error"), t("profile.friend.name.required"));
      return;
    }

    // Check subscription limit for new friends (not edits) - show paywall on Save
    if (!isEditMode && friends.length >= 2) {
      const { hasEntityLimitEntitlement } =
        await ensureSubscriptionResolved();
      if (!hasEntityLimitEntitlement) {
        const subscribed = await showPaywallForAnySubscriptionAccess();
        if (!subscribed) return;
      }
    }

    setIsSaving(true);
    try {
      if (isEditMode && friendId) {
        await updateFriend(friendId, {
          name: name.trim(),
          description: description.trim() || undefined,
          imageUri: selectedImage
            ? await ensureImageInAppDocuments(selectedImage)
            : undefined,
        });
        const saved = getFriend(friendId);
        if (saved) {
          initialName.current = saved.name || "";
          initialDescription.current = saved.description || "";
          initialImage.current = saved.imageUri || null;
        }
      } else {
        const newFriendId = await addFriend({
          name: name.trim(),
          description: description.trim() || undefined,
          imageUri: selectedImage
            ? await ensureImageInAppDocuments(selectedImage)
            : undefined,
          setupProgress: 0,
          isCompleted: false,
        });
        // Navigate to memory creation screen for the new friend
        router.replace({
          pathname: "/idealized-memories",
          params: { entityId: newFriendId, sphere: "friends" },
        });
        return; // Exit early to avoid the router.replace below
      }
    } catch {
      Alert.alert(t("common.error"), t("error.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TabScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            router.navigate({
              pathname: '/(tabs)/spheres',
              params: { selectedSphere: 'friends' }
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
            name="people"
            size={20 * fontScale}
            color={colors.primary}
          />
          <ThemedText size="l" weight="bold" letterSpacing="s">
            Sferas
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title and Description */}
        <View>
          <ThemedText
            size="xl"
            weight="bold"
            letterSpacing="s"
            style={styles.title}
          >
            {isEditMode ? t("profile.editFriend") : t("profile.addFriend")}
          </ThemedText>
          <ThemedText size="sm" weight="normal" style={styles.description}>
            {isEditMode
              ? t("profile.editFriend.description")
              : t("profile.addFriend.description")}
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={t("profile.name")}
            placeholder={t("profile.friendName.placeholder")}
            value={name}
            onChangeText={setName}
          />

          <TextArea
            label={`${t("profile.description")} (${t("common.optional")})`}
            placeholder={t("profile.description.placeholder")}
            value={description}
            onChangeText={setDescription}
            maxLength={100}
            showCharCount={true}
            rows={3}
          />

          <UploadPicture
            label={t("profile.uploadPicture")}
            onPress={handleUploadPicture}
            onDelete={handleDeleteImage}
            imageUri={selectedImage}
            isLoading={isLoadingImage}
            hasImage={!!selectedImage}
            avatarMode={true}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            !isSaveEnabled && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!isSaveEnabled}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText
              weight="bold"
              letterSpacing="l"
              style={{ color: "#ffffff" }}
            >
              {isEditMode ? t("common.save") : t("profile.addFriend")}
            </ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </TabScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    marginTop: 70,
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
    gap: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 24,
    opacity: 0.7,
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
