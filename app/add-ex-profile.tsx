import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { Input } from '@/library/components/input';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { TextArea } from '@/library/components/text-area';
import { UploadPicture } from '@/library/components/upload-picture';
import { useTranslate } from '@/utils/languages/use-translate';
import { useJourney } from '@/utils/JourneyProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function AddExProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { addProfile, updateProfile, getProfile } = useJourney();
  const params = useLocalSearchParams();
  const { isLargeDevice, maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  
  const isEditMode = params.edit === 'true' && params.profileId;
  const profileId = params.profileId as string | undefined;
  const existingProfile = profileId ? getProfile(profileId) : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Load existing profile data when in edit mode
  useEffect(() => {
    if (existingProfile && isEditMode) {
      const profileName = existingProfile.name || '';
      const profileDescription = existingProfile.description || '';
      const profileImage = existingProfile.imageUri || null;
      setName(profileName);
      setDescription(profileDescription);
      setSelectedImage(profileImage);
      setOriginalName(profileName);
      setOriginalDescription(profileDescription);
      setOriginalImage(profileImage);
    } else {
      // Reset original values when not in edit mode
      setOriginalName('');
      setOriginalDescription('');
      setSelectedImage(null);
      setOriginalImage(null);
    }
  }, [existingProfile, isEditMode]);

  // Check if form is valid (name is filled)
  const isFormValid = name.trim().length > 0;

  // Check if there are changes from original values (only in edit mode)
  const hasChanges = useMemo(() => {
    if (!isEditMode) {
      // In create mode, any valid form is considered "changed"
      return isFormValid;
    }
    // In edit mode, check if current values differ from original
    const nameChanged = name.trim() !== originalName.trim();
    const descriptionChanged = description.trim() !== originalDescription.trim();
    const imageChanged = selectedImage !== originalImage;
    return nameChanged || descriptionChanged || imageChanged;
  }, [isEditMode, name, description, originalName, originalDescription, selectedImage, originalImage, isFormValid]);

  // Button is enabled when form is valid AND there are changes
  const isSaveEnabled = isFormValid && hasChanges;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16 * fontScale,
          paddingTop: 8 * fontScale,
          paddingBottom: 8 * fontScale,
          marginTop: 20,
        },
        headerButton: {
          width: 48 * fontScale,
          height: 48 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerTitle: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8 * fontScale,
          flex: 1,
          justifyContent: 'center',
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
          maxWidth: maxContentWidth,
          alignSelf: 'center',
          width: '100%',
        },
        button: {
          width: '100%',
          maxWidth: maxContentWidth,
          height: 48 * fontScale,
          borderRadius: 8 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16 * fontScale,
          marginTop: 8 * fontScale,
          alignSelf: 'center',
        },
        buttonDisabled: {
          opacity: 0.5,
        },
      }),
    [fontScale, maxContentWidth]
  );

  const handleUploadPicture = async () => {
    setIsLoadingImage(true);
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setIsLoadingImage(false);
        alert('Sorry, we need camera roll permissions to upload photos!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square aspect for avatar
        quality: 1,
      });

      setIsLoadingImage(false);
      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setIsLoadingImage(false);
      alert('Failed to pick image. Please try again.');
    }
  };

  const handleDeleteImage = () => {
    setSelectedImage(null);
  };

  const handleSubmit = async () => {
    if (!isSaveEnabled) return;

    try {
      if (isEditMode && profileId) {
        // Update existing profile
        await updateProfile(profileId, {
          name: name.trim(),
          description: description.trim() || undefined,
          ...(selectedImage && { imageUri: selectedImage }),
          // Preserve other fields
        });
        // Navigate back to ex-profiles screen after edit
        router.replace('/(tabs)/ex-profiles');
      } else {
        // Save new profile to local storage
        await addProfile({
          name: name.trim(),
          description: description.trim() || undefined,
          relationshipDuration: undefined, // Can be added later
          setupProgress: 0, // Start with 0% progress
          isCompleted: false,
          ...(selectedImage && { imageUri: selectedImage }),
        });

        // Navigate back to ex-profiles screen after successful save
        router.replace('/(tabs)/ex-profiles');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} profile:`, error);
      // TODO: Show error message to user
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
          <MaterialIcons name="settings" size={20 * fontScale} color={colors.primary} />
          <ThemedText size="l" weight="bold" letterSpacing="s">
            Closure
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
            {isEditMode ? t('profile.editNewPath') : t('profile.beginNewPath')}
          </ThemedText>
          <ThemedText size="sm" weight="normal" style={styles.description}>
            {isEditMode
              ? t('profile.editNewPath.description')
              : t('profile.beginNewPath.description')}
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={t('profile.exPartnerName')}
            placeholder={t('profile.exPartnerName.placeholder')}
            value={name}
            onChangeText={setName}
          />

          <TextArea
            label={t('profile.description') + ' (Optional)'}
            placeholder={t('profile.description.example')}
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
          <ThemedText weight="bold" letterSpacing="l" style={{ color: '#ffffff' }}>
            {isEditMode ? t('common.save') : t('profile.startHealingPath')}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </TabScreenContainer>
  );
}

