import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { Input } from '@/library/components/input';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { TextArea } from '@/library/components/text-area';
import { UploadPicture } from '@/library/components/upload-picture';
import { useJourney } from '@/utils/JourneyProvider';
import { useSubscription } from '@/utils/SubscriptionProvider';
import { showPaywallForPremiumAccess } from '@/utils/premium-access';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function AddFriendScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { addFriend, updateFriend, getFriend, friends } = useJourney();
  const { isSubscribed } = useSubscription();
  const params = useLocalSearchParams();
  const { isLargeDevice, maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  
  const isEditMode = params.edit === 'true' && params.friendId;
  const friendId = params.friendId as string | undefined;
  const existingFriend = friendId ? getFriend(friendId) : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track initial friend count to prevent redirect after saving first friend
  const initialFriendCount = useRef<number | null>(null);

  // Check subscription limit when component loads (only for new friends, not edits)
  useEffect(() => {
    // Store initial friend count on first load
    if (initialFriendCount.current === null) {
      initialFriendCount.current = friends.length;
    }
    
    // Don't check if we're saving (prevents redirect after saving first friend)
    if (isSaving) return;
    
    // Only redirect if user already had 2+ friends when they entered this screen
    // This allows 2 free friends per sphere before paywall
    if (!isEditMode && !isSubscribed && initialFriendCount.current >= 2) {
      (async () => {
        const subscribed = await showPaywallForPremiumAccess();
        if (!subscribed) {
          router.back();
        }
      })();
    }
  }, [isEditMode, isSubscribed, friends.length, isSaving]);

  // Load existing friend data when in edit mode
  useEffect(() => {
    if (isEditMode && existingFriend) {
      setName(existingFriend.name || '');
      setDescription(existingFriend.description || '');
      setSelectedImage(existingFriend.imageUri || null);
    }
  }, [isEditMode, existingFriend]);

  const handleUploadPicture = async () => {
    try {
      setIsLoadingImage(true);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert(t('error.cameraPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      setIsLoadingImage(false);
      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      setIsLoadingImage(false);
      alert(t('error.imagePickFailed'));
    }
  };

  const handleDeleteImage = () => {
    setSelectedImage(null);
  };

  const isSaveEnabled = name.trim().length > 0 && !isSaving;

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('profile.friend.name.required'));
      return;
    }

    // Check subscription limit for new friends (not edits)
    // Only check if user already had 1+ friends when they entered this screen
    if (!isEditMode && !isSubscribed && initialFriendCount.current !== null && initialFriendCount.current >= 2) {
      // Show paywall (custom in dev, RevenueCat in prod)
      const subscribed = await showPaywallForPremiumAccess();
      if (!subscribed) return; // User cancelled or didn't subscribe
      // User subscribed, continue to save
    }

    setIsSaving(true);
    try {
      if (isEditMode && friendId) {
        await updateFriend(friendId, {
          name: name.trim(),
          description: description.trim() || undefined,
          imageUri: selectedImage || undefined,
        });
      } else {
        const newFriendId = await addFriend({
          name: name.trim(),
          description: description.trim() || undefined,
          imageUri: selectedImage || undefined,
          setupProgress: 0,
          isCompleted: false,
        });
        // Navigate to memory creation screen for the new friend
        router.replace({
          pathname: '/idealized-memories',
          params: { entityId: newFriendId, sphere: 'friends' },
        });
        return; // Exit early to avoid the router.replace below
      }

      // For edit mode, navigate back to tabs
      router.replace('/(tabs)/' as any);
    } catch (error) {
      Alert.alert(t('common.error'), t('error.saveFailed'));
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
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <MaterialIcons name="people" size={20 * fontScale} color={colors.primary} />
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
          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.title}>
            {isEditMode ? t('profile.editFriend') : t('profile.addFriend')}
          </ThemedText>
          <ThemedText size="sm" weight="normal" style={styles.description}>
            {isEditMode
              ? t('profile.editFriend.description')
              : t('profile.addFriend.description')}
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={t('profile.name')}
            placeholder={t('profile.friendName.placeholder')}
            value={name}
            onChangeText={setName}
          />

          <TextArea
            label={`${t('profile.description')} (${t('common.optional')})`}
            placeholder={t('profile.description.placeholder')}
            value={description}
            onChangeText={setDescription}
            maxLength={100}
            showCharCount={true}
            rows={3}
          />

          <UploadPicture 
            label={t('profile.uploadPicture')}
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
            <ThemedText weight="bold" letterSpacing="l" style={{ color: '#ffffff' }}>
              {isEditMode ? t('common.save') : t('profile.addFriend')}
            </ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </TabScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    marginTop: 70,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

