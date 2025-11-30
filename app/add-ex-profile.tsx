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
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddExProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { addProfile, updateProfile, getProfile, profiles } = useJourney();
  const params = useLocalSearchParams();
  const { isLargeDevice, maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  
  const isEditMode = params.edit === 'true' && params.profileId;
  const profileId = params.profileId as string | undefined;
  const existingProfile = profileId ? getProfile(profileId) : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [relationshipStartDate, setRelationshipStartDate] = useState<Date | null>(null);
  const [relationshipEndDate, setRelationshipEndDate] = useState<Date | null>(null);
  const [isOngoing, setIsOngoing] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalStartDate, setOriginalStartDate] = useState('');
  const [originalEndDate, setOriginalEndDate] = useState('');
  const [originalIsOngoing, setOriginalIsOngoing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Load existing profile data when in edit mode
  useEffect(() => {
    if (existingProfile && isEditMode) {
      const profileName = existingProfile.name || '';
      const profileDescription = existingProfile.description || '';
      const profileImage = existingProfile.imageUri || null;
      const startDate = existingProfile.relationshipStartDate 
        ? new Date(existingProfile.relationshipStartDate) 
        : null;
      const endDate = existingProfile.relationshipEndDate 
        ? new Date(existingProfile.relationshipEndDate) 
        : null;
      const ongoing = existingProfile.relationshipEndDate === null;
      setName(profileName);
      setDescription(profileDescription);
      setSelectedImage(profileImage);
      setRelationshipStartDate(startDate);
      setRelationshipEndDate(endDate);
      setIsOngoing(ongoing);
      setOriginalName(profileName);
      setOriginalDescription(profileDescription);
      setOriginalImage(profileImage);
      setOriginalStartDate(existingProfile.relationshipStartDate || '');
      setOriginalEndDate(existingProfile.relationshipEndDate || '');
      setOriginalIsOngoing(ongoing);
    } else {
      // Reset original values when not in edit mode
      setOriginalName('');
      setOriginalDescription('');
      setSelectedImage(null);
      setOriginalImage(null);
      setRelationshipStartDate(null);
      setRelationshipEndDate(null);
      setIsOngoing(false);
      setOriginalStartDate('');
      setOriginalEndDate('');
      setOriginalIsOngoing(false);
    }
  }, [existingProfile, isEditMode]);

  // Check if form is valid (name is filled)
  const isFormValid = name.trim().length > 0;

  // Check if there's already an ongoing partner (excluding current profile if editing)
  const hasExistingOngoingPartner = useMemo(() => {
    return profiles.some(profile => 
      profile.relationshipEndDate === null && 
      (!isEditMode || profile.id !== profileId)
    );
  }, [profiles, isEditMode, profileId]);

  // Check if we can set this profile as ongoing
  const canSetAsOngoing = !hasExistingOngoingPartner || (isEditMode && existingProfile?.relationshipEndDate === null);

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
    const startDateStr = relationshipStartDate ? relationshipStartDate.toISOString().split('T')[0] : '';
    const endDateStr = isOngoing ? null : (relationshipEndDate ? relationshipEndDate.toISOString().split('T')[0] : '');
    const startDateChanged = startDateStr !== originalStartDate;
    const endDateChanged = (isOngoing ? null : endDateStr) !== originalEndDate;
    const ongoingChanged = isOngoing !== originalIsOngoing;
    return nameChanged || descriptionChanged || imageChanged || startDateChanged || endDateChanged || ongoingChanged;
  }, [isEditMode, name, description, originalName, originalDescription, selectedImage, originalImage, isFormValid, relationshipStartDate, relationshipEndDate, isOngoing, originalStartDate, originalEndDate, originalIsOngoing]);

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
        alert(t('error.cameraPermissionRequired'));
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
      alert(t('error.imagePickFailed'));
    }
  };

  const handleDeleteImage = () => {
    setSelectedImage(null);
  };

  const handleSubmit = async () => {
    if (!isSaveEnabled) return;

    // Validate: prevent setting as ongoing if there's already an ongoing partner
    if (isOngoing && hasExistingOngoingPartner && (!isEditMode || existingProfile?.relationshipEndDate !== null)) {
      Alert.alert(
        t('profile.ongoing.error.title'),
        t('profile.ongoing.error.message'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    try {
      if (isEditMode && profileId) {
        // Update existing profile
        await updateProfile(profileId, {
          name: name.trim(),
          description: description.trim() || undefined,
          ...(selectedImage && { imageUri: selectedImage }),
          relationshipStartDate: relationshipStartDate ? relationshipStartDate.toISOString().split('T')[0] : undefined,
          relationshipEndDate: isOngoing ? null : (relationshipEndDate ? relationshipEndDate.toISOString().split('T')[0] : undefined),
          // Preserve other fields
        });
        // Navigate back to spheres screen after edit
        router.replace('/(tabs)/spheres');
      } else {
        // Save new profile to local storage
        await addProfile({
          name: name.trim(),
          description: description.trim() || undefined,
          relationshipDuration: undefined, // Can be added later
          relationshipStartDate: relationshipStartDate ? relationshipStartDate.toISOString().split('T')[0] : undefined,
          relationshipEndDate: isOngoing ? null : (relationshipEndDate ? relationshipEndDate.toISOString().split('T')[0] : undefined),
          setupProgress: 0, // Start with 0% progress
          isCompleted: false,
          ...(selectedImage && { imageUri: selectedImage }),
        });

        // Navigate back to spheres screen after successful save
        router.replace('/(tabs)/spheres');
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

          {/* Date Pickers - moved above image upload */}
          <View style={{ gap: 16 * fontScale }}>
            <View>
              <ThemedText size="sm" weight="medium" style={{ marginBottom: 8 * fontScale }}>
                Relationship Start Date
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowStartDatePicker(true)}
                style={{
                  padding: 16 * fontScale,
                  borderRadius: 12 * fontScale,
                  backgroundColor: colorScheme === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.05)',
                  borderWidth: 1,
                  borderColor: colorScheme === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.1)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                activeOpacity={0.7}
              >
                <ThemedText size="m">
                  {relationshipStartDate
                    ? relationshipStartDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Select start date'}
                </ThemedText>
                <MaterialIcons name="calendar-today" size={20 * fontScale} color={colors.primary} />
              </TouchableOpacity>
              {Platform.OS === 'ios' ? (
                <Modal
                  visible={showStartDatePicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowStartDatePicker(false)}
                >
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'flex-end',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: colorScheme === 'dark' ? '#1E3A52' : '#FFFFFF',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        paddingTop: 20,
                        paddingBottom: 40,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingHorizontal: 20,
                          paddingBottom: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                          <ThemedText size="m" style={{ color: colors.primary }}>
                            {t('common.cancel')}
                          </ThemedText>
                        </TouchableOpacity>
                        <ThemedText size="l" weight="semibold">
                          Select Start Date
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() => {
                            // Validate: start date cannot be after end date
                            const currentStartDate = relationshipStartDate || new Date();
                            if (relationshipEndDate && currentStartDate > relationshipEndDate) {
                              Alert.alert(
                                t('common.error'),
                                t('profile.date.error.startAfterEnd'),
                                [{ text: t('common.ok') }]
                              );
                              return;
                            }
                            setShowStartDatePicker(false);
                          }}
                        >
                          <ThemedText size="m" style={{ color: colors.primary, fontWeight: '600' }}>
                            {t('common.ok')}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={relationshipStartDate || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            setRelationshipStartDate(selectedDate);
                            // If end date exists and is before new start date, clear it
                            if (relationshipEndDate && selectedDate > relationshipEndDate) {
                              setRelationshipEndDate(null);
                            }
                          }
                        }}
                        maximumDate={relationshipEndDate || undefined}
                        style={{ height: 200 }}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                showStartDatePicker && (
                <DateTimePicker
                  value={relationshipStartDate || new Date()}
                  mode="date"
                    display="default"
                  onChange={(event, selectedDate) => {
                      setShowStartDatePicker(false);
                      if (event.type === 'set' && selectedDate) {
                        // Validate: start date cannot be after end date
                        if (relationshipEndDate && selectedDate > relationshipEndDate) {
                          Alert.alert(
                            t('common.error'),
                            t('profile.date.error.startAfterEnd'),
                            [{ text: t('common.ok') }]
                          );
                          setRelationshipEndDate(null); // Clear invalid end date
                          return;
                        }
                      setRelationshipStartDate(selectedDate);
                    }
                  }}
                />
                )
              )}
            </View>

            <View style={{ marginTop: 8 * fontScale }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={{
                    width: 24 * fontScale,
                    height: 24 * fontScale,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    borderRadius: 4,
                    marginRight: 8 * fontScale,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isOngoing ? colors.primary : 'transparent',
                    opacity: canSetAsOngoing ? 1 : 0.5,
                  }}
                  onPress={() => {
                    if (!canSetAsOngoing && !isOngoing) {
                      Alert.alert(
                        t('profile.ongoing.error.title'),
                        t('profile.ongoing.error.message'),
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    setIsOngoing(!isOngoing);
                  }}
                  activeOpacity={canSetAsOngoing ? 0.7 : 1}
                  disabled={!canSetAsOngoing && !isOngoing}
                >
                  {isOngoing && (
                    <MaterialIcons name="check" size={16 * fontScale} color={colors.background} />
                  )}
                </TouchableOpacity>
                <ThemedText 
                  size="m" 
                  onPress={() => {
                    if (!canSetAsOngoing && !isOngoing) {
                      Alert.alert(
                        t('profile.ongoing.error.title'),
                        t('profile.ongoing.error.message'),
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    setIsOngoing(!isOngoing);
                  }}
                  style={{ opacity: canSetAsOngoing ? 1 : 0.5 }}
                >
                  Relationship is ongoing
                </ThemedText>
              </View>
              {hasExistingOngoingPartner && !isOngoing && (
                <ThemedText size="sm" style={{ color: colors.error || '#ff4444', marginTop: 4 * fontScale }}>
                  {t('profile.ongoing.warning')}
                </ThemedText>
              )}
            </View>

            {!isOngoing && (
              <View>
                <ThemedText size="sm" weight="medium" style={{ marginBottom: 8 * fontScale }}>
                  Relationship End Date
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setShowEndDatePicker(true)}
                  style={{
                    padding: 16 * fontScale,
                    borderRadius: 12 * fontScale,
                    backgroundColor: colorScheme === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                    borderWidth: 1,
                    borderColor: colorScheme === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.1)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText size="m">
                    {relationshipEndDate
                      ? relationshipEndDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : 'Select end date'}
                  </ThemedText>
                  <MaterialIcons name="calendar-today" size={20 * fontScale} color={colors.primary} />
                </TouchableOpacity>
                {Platform.OS === 'ios' ? (
                  <Modal
                    visible={showEndDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEndDatePicker(false)}
                  >
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'flex-end',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: colorScheme === 'dark' ? '#1E3A52' : '#FFFFFF',
                          borderTopLeftRadius: 20,
                          borderTopRightRadius: 20,
                          paddingTop: 20,
                          paddingBottom: 40,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingBottom: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                            <ThemedText size="m" style={{ color: colors.primary }}>
                              {t('common.cancel')}
                            </ThemedText>
                          </TouchableOpacity>
                          <ThemedText size="l" weight="semibold">
                            Select End Date
                          </ThemedText>
                          <TouchableOpacity
                            onPress={() => {
                              // Validate: end date cannot be before start date
                              const currentEndDate = relationshipEndDate || new Date();
                              if (relationshipStartDate && currentEndDate < relationshipStartDate) {
                                Alert.alert(
                                  t('common.error'),
                                  t('profile.date.error.endBeforeStart'),
                                  [{ text: t('common.ok') }]
                                );
                                return;
                              }
                              setShowEndDatePicker(false);
                            }}
                          >
                            <ThemedText size="m" style={{ color: colors.primary, fontWeight: '600' }}>
                              {t('common.ok')}
                            </ThemedText>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={relationshipEndDate || new Date()}
                          mode="date"
                          display="spinner"
                          onChange={(event, selectedDate) => {
                            if (selectedDate) {
                              // Validate: end date cannot be before start date
                              if (relationshipStartDate && selectedDate < relationshipStartDate) {
                                Alert.alert(
                                  t('common.error'),
                                  t('profile.date.error.endBeforeStart'),
                                  [{ text: t('common.ok') }]
                                );
                                return;
                              }
                              setRelationshipEndDate(selectedDate);
                            }
                          }}
                          minimumDate={relationshipStartDate || undefined}
                          style={{ height: 200 }}
                        />
                      </View>
                    </View>
                  </Modal>
                ) : (
                  showEndDatePicker && (
                  <DateTimePicker
                    value={relationshipEndDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowEndDatePicker(false);
                      if (event.type === 'set' && selectedDate) {
                        // Validate: end date cannot be before start date
                        if (relationshipStartDate && selectedDate < relationshipStartDate) {
                          Alert.alert(
                            t('common.error'),
                            t('profile.date.error.endBeforeStart'),
                            [{ text: t('common.ok') }]
                          );
                          return;
                        }
                        setRelationshipEndDate(selectedDate);
                      }
                    }}
                  />
                  )
                )}
              </View>
            )}
          </View>

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

