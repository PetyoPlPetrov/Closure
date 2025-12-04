import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { Input } from '@/library/components/input';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { TextArea } from '@/library/components/text-area';
import { UploadPicture } from '@/library/components/upload-picture';
import { useJourney, type ExProfile } from '@/utils/JourneyProvider';
import { useSubscription } from '@/utils/SubscriptionProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function AddExProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { addProfile, updateProfile, getProfile, profiles, isLoading } = useJourney();
  const { isSubscribed } = useSubscription();
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

  // Refs to store initial values for unsaved changes detection
  const initialName = useRef('');
  const initialDescription = useRef('');
  const initialStartDate = useRef<Date | null>(null);
  const initialEndDate = useRef<Date | null>(null);
  const initialIsOngoing = useRef(false);
  const initialImage = useRef<string | null>(null);
  const isNavigatingAway = useRef(false);
  const isSaving = useRef(false);
  
  // Track initial profile count to prevent redirect after saving first profile
  const initialProfileCount = useRef<number | null>(null);

  // Navigation hook for intercepting back navigation
  const navigation = useNavigation();

  // Check subscription limit when component loads (only for new profiles, not edits)
  useEffect(() => {
    // Don't check subscription until profiles have finished loading
    if (isLoading) return;
    
    // Store initial profile count on first load
    if (initialProfileCount.current === null) {
      initialProfileCount.current = profiles.length;
    }
    
    // Don't check if we're saving or navigating away (prevents redirect after saving first profile)
    if (isSaving.current || isNavigatingAway.current) return;
    
    // Only redirect if user already had 1+ profiles when they entered this screen
    // This prevents redirect after successfully saving the first profile
    if (!isEditMode && !isSubscribed && initialProfileCount.current >= 1) {
      router.replace('/paywall');
    }
  }, [isEditMode, isSubscribed, profiles.length, isLoading]);

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
      
      // Store initial values in refs for unsaved changes detection
      initialName.current = profileName;
      initialDescription.current = profileDescription;
      initialStartDate.current = startDate;
      initialEndDate.current = endDate;
      initialIsOngoing.current = ongoing;
      initialImage.current = profileImage;
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
      
      // Reset refs for unsaved changes detection
      initialName.current = '';
      initialDescription.current = '';
      initialStartDate.current = null;
      initialEndDate.current = null;
      initialIsOngoing.current = false;
      initialImage.current = null;
      
      // Reset initial profile count when not in edit mode (new profile creation)
      initialProfileCount.current = null;
    }
  }, [existingProfile, isEditMode]);

  // Check if form is valid (name is filled, start date is chosen, and either end date or ongoing is set)
  const isFormValid = useMemo(() => {
    return name.trim().length > 0 && 
      relationshipStartDate !== null && 
      (isOngoing || relationshipEndDate !== null);
  }, [name, relationshipStartDate, isOngoing, relationshipEndDate]);

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

  // Function to check if there are unsaved changes
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
    const currentStartDateStr = relationshipStartDate ? relationshipStartDate.toISOString().split('T')[0] : '';
    const initialStartDateStr = initialStartDate.current ? initialStartDate.current.toISOString().split('T')[0] : '';
    if (currentStartDateStr !== initialStartDateStr) {
      return true;
    }
    
    // Check if end date or ongoing status changed
    const currentEndDateStr = isOngoing ? null : (relationshipEndDate ? relationshipEndDate.toISOString().split('T')[0] : '');
    const initialEndDateStr = initialIsOngoing.current ? null : (initialEndDate.current ? initialEndDate.current.toISOString().split('T')[0] : '');
    if (currentEndDateStr !== initialEndDateStr) {
      return true;
    }
    
    // Check if ongoing status changed
    if (isOngoing !== initialIsOngoing.current) {
      return true;
    }
    
    return false;
  }, [name, description, selectedImage, relationshipStartDate, relationshipEndDate, isOngoing]);

  // Intercept navigation to show confirmation dialog if there are unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Don't show dialog if we're intentionally navigating away
      if (isNavigatingAway.current) {
        return;
      }
      
      // Don't show dialog if we're saving (navigation is intentional)
      if (isSaving.current) {
        return;
      }
      
      // Don't show dialog if there are no unsaved changes
      if (!hasUnsavedChanges()) {
        return;
      }
      
      // Prevent default behavior of leaving the screen
      e.preventDefault();
      
      // Show confirmation dialog
      Alert.alert(
        t('memory.unsavedChanges.title'),
        t('memory.unsavedChanges.message'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => {
              // Do nothing, stay on screen
            },
          },
          {
            text: t('common.discard'),
            style: 'destructive',
            onPress: () => {
              // Mark as intentionally navigating away
              isNavigatingAway.current = true;
              // Navigate away
              router.back();
            },
          },
        ]
      );
    });
    
    return unsubscribe;
  }, [navigation, hasUnsavedChanges, t]);

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
          maxWidth: maxContentWidth as any,
          alignSelf: 'center',
          width: '100%',
        },
        button: {
          width: '100%',
          maxWidth: maxContentWidth as any,
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

    // Mark as saving to prevent unsaved changes dialog
    isSaving.current = true;

    // Check subscription limit for new profiles (not edits)
    // Only check if profiles have loaded (to avoid false positives)
    if (!isEditMode && !isSubscribed && !isLoading && profiles.length >= 1) {
      isSaving.current = false;
      router.replace('/paywall');
      return;
    }

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
        // Explicitly handle imageUri: if selectedImage is null, we need to clear it
        // Use undefined to clear the field (will be omitted in JSON, but the spread will overwrite)
        const updateData: Partial<ExProfile> = {
          name: name.trim(),
          description: description.trim() || undefined,
          relationshipStartDate: relationshipStartDate ? relationshipStartDate.toISOString().split('T')[0] : undefined,
          relationshipEndDate: isOngoing ? null : (relationshipEndDate ? relationshipEndDate.toISOString().split('T')[0] : undefined),
        };
        
        // Always include imageUri in update - if null, set to undefined to clear it
        if (selectedImage !== null) {
          updateData.imageUri = selectedImage;
        } else {
          // Explicitly set to undefined to clear the image
          updateData.imageUri = undefined;
        }
        
        await updateProfile(profileId, updateData);
        // Mark as navigating away to prevent unsaved changes dialog
        isNavigatingAway.current = true;
        isSaving.current = false;
        // Navigate back to spheres screen after edit
        router.replace('/(tabs)/spheres');
      } else {
        // Save new profile to local storage
        const newProfileId = await addProfile({
          name: name.trim(),
          description: description.trim() || undefined,
          relationshipDuration: undefined, // Can be added later
          relationshipStartDate: relationshipStartDate ? relationshipStartDate.toISOString().split('T')[0] : undefined,
          relationshipEndDate: isOngoing ? null : (relationshipEndDate ? relationshipEndDate.toISOString().split('T')[0] : undefined),
          setupProgress: 0, // Start with 0% progress
          isCompleted: false,
          ...(selectedImage && { imageUri: selectedImage }),
        });

        // Mark as navigating away to prevent unsaved changes dialog
        isNavigatingAway.current = true;
        isSaving.current = false;
        // Navigate to memory creation screen for the new profile
        router.replace({
          pathname: '/idealized-memories',
          params: { profileId: newProfileId },
        });
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} profile:`, error);
      isSaving.current = false;
      // TODO: Show error message to user
    }
  };

  return (
    <TabScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (hasUnsavedChanges()) {
              Alert.alert(
                t('memory.unsavedChanges.title'),
                t('memory.unsavedChanges.message'),
                [
                  {
                    text: t('common.cancel'),
                    style: 'cancel',
                  },
                  {
                    text: t('common.discard'),
                    style: 'destructive',
                    onPress: () => {
                      isNavigatingAway.current = true;
                      router.back();
                    },
                  },
                ]
              );
            } else {
              router.back();
            }
          }}
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
            label={`${t('profile.description')} (${t('common.optional')})`}
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
                {t('profile.relationshipStartDate')}
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
                <ThemedText size="l">
                  {relationshipStartDate
                    ? relationshipStartDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : t('profile.relationshipStartDate.select')}
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
                          <ThemedText size="l" style={{ color: colors.primary }}>
                            {t('common.cancel')}
                          </ThemedText>
                        </TouchableOpacity>
                        <ThemedText size="l" weight="semibold">
                          {t('profile.relationshipStartDate.selectTitle')}
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() => {
                            // If no date was selected yet, use the current date from the picker (which defaults to today)
                            if (!relationshipStartDate) {
                              setRelationshipStartDate(new Date());
                            }
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
                          <ThemedText size="l" style={{ color: colors.primary, fontWeight: '600' }}>
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
                  size="l" 
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
                  {t('profile.relationshipOngoing')}
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
                  {t('profile.relationshipEndDate')}
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
                  <ThemedText size="l">
                    {relationshipEndDate
                      ? relationshipEndDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : t('profile.relationshipEndDate.select')}
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
                            <ThemedText size="l" style={{ color: colors.primary }}>
                              {t('common.cancel')}
                            </ThemedText>
                          </TouchableOpacity>
                          <ThemedText size="l" weight="semibold">
                            {t('profile.relationshipEndDate.selectTitle')}
                          </ThemedText>
                          <TouchableOpacity
                            onPress={() => {
                              // If no date was selected yet, use the current date from the picker (which defaults to today)
                              if (!relationshipEndDate) {
                                setRelationshipEndDate(new Date());
                              }
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
                            <ThemedText size="l" style={{ color: colors.primary, fontWeight: '600' }}>
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
            {isEditMode ? t('common.save') : t('common.add')}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </TabScreenContainer>
  );
}

