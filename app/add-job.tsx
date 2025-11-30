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
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddJobScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { addJob, updateJob, getJob } = useJourney();
  const params = useLocalSearchParams();
  const { maxContentWidth } = useLargeDevice();
  const t = useTranslate();
  
  const isEditMode = params.edit === 'true' && params.jobId;
  const jobId = params.jobId as string | undefined;
  const existingJob = jobId ? getJob(jobId) : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isCurrent, setIsCurrent] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalStartDate, setOriginalStartDate] = useState('');
  const [originalEndDate, setOriginalEndDate] = useState('');
  const [originalIsCurrent, setOriginalIsCurrent] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Load existing job data when in edit mode
  useEffect(() => {
    if (existingJob && isEditMode) {
      const jobName = existingJob.name || '';
      const jobDescription = existingJob.description || '';
      const jobImage = existingJob.imageUri || null;
      const start = existingJob.startDate 
        ? new Date(existingJob.startDate) 
        : null;
      const end = existingJob.endDate 
        ? new Date(existingJob.endDate) 
        : null;
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
      setOriginalStartDate(existingJob.startDate || '');
      setOriginalEndDate(existingJob.endDate || '');
      setOriginalIsCurrent(current);
    } else {
      // Reset values when not in edit mode
      setOriginalName('');
      setOriginalDescription('');
      setSelectedImage(null);
      setOriginalImage(null);
      setStartDate(null);
      setEndDate(null);
      setIsCurrent(false);
      setOriginalStartDate('');
      setOriginalEndDate('');
      setOriginalIsCurrent(false);
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
    const descriptionChanged = description.trim() !== originalDescription.trim();
    const imageChanged = selectedImage !== originalImage;
    const startDateStr = startDate ? startDate.toISOString().split('T')[0] : '';
    const endDateStr = isCurrent ? null : (endDate ? endDate.toISOString().split('T')[0] : '');
    const startDateChanged = startDateStr !== originalStartDate;
    const endDateChanged = (isCurrent ? null : endDateStr) !== originalEndDate;
    const currentChanged = isCurrent !== originalIsCurrent;
    return nameChanged || descriptionChanged || imageChanged || startDateChanged || endDateChanged || currentChanged;
  }, [isEditMode, name, description, originalName, originalDescription, selectedImage, originalImage, isFormValid, startDate, endDate, isCurrent, originalStartDate, originalEndDate, originalIsCurrent]);

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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setIsLoadingImage(false);
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

    try {
      if (isEditMode && jobId) {
        await updateJob(jobId, {
          name: name.trim(),
          description: description.trim() || undefined,
          ...(selectedImage && { imageUri: selectedImage }),
          startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
          endDate: isCurrent ? null : (endDate ? endDate.toISOString().split('T')[0] : undefined),
        });
        router.replace('/(tabs)/spheres');
      } else {
        await addJob({
          name: name.trim(),
          description: description.trim() || undefined,
          startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
          endDate: isCurrent ? null : (endDate ? endDate.toISOString().split('T')[0] : undefined),
          setupProgress: 0,
          isCompleted: false,
          ...(selectedImage && { imageUri: selectedImage }),
        });
        router.replace('/(tabs)/spheres');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} job:`, error);
    }
  };

  return (
    <TabScreenContainer>
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
          <MaterialIcons name="work" size={20 * fontScale} color={colors.primary} />
          <ThemedText size="l" weight="bold" letterSpacing="s">
            {isEditMode ? 'Edit Job' : 'Add Job'}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.title}>
            {isEditMode ? 'Edit Job' : 'Add New Job'}
          </ThemedText>
          <ThemedText size="sm" weight="normal" style={styles.description}>
            {isEditMode
              ? 'Update your job information and track your career journey.'
              : 'Track your career journey by adding a job position.'}
          </ThemedText>
        </View>

        <View style={styles.form}>
          <Input
            label="Job Title / Company Name"
            placeholder="e.g., Software Engineer at Google"
            value={name}
            onChangeText={setName}
          />

          <TextArea
            label="Description (Optional)"
            placeholder="Brief description of the role..."
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
              <ThemedText size="sm" weight="medium" style={{ marginBottom: 8 * fontScale }}>
                Start Date
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
                  {startDate
                    ? startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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
                            const currentStartDate = startDate || new Date();
                            if (endDate && currentStartDate > endDate) {
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
                        style={{ height: 200 }}
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
                      if (event.type === 'set' && selectedDate) {
                        // Validate: start date cannot be after end date
                        if (endDate && selectedDate > endDate) {
                          Alert.alert(
                            t('common.error'),
                            t('profile.date.error.startAfterEnd'),
                            [{ text: t('common.ok') }]
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
                    backgroundColor: isCurrent ? colors.primary : 'transparent',
                  }}
                  onPress={() => setIsCurrent(!isCurrent)}
                  activeOpacity={0.7}
                >
                  {isCurrent && (
                    <MaterialIcons name="check" size={16 * fontScale} color={colors.background} />
                  )}
                </TouchableOpacity>
                <ThemedText 
                  size="m" 
                  onPress={() => setIsCurrent(!isCurrent)}
                >
                  Current job
                </ThemedText>
              </View>
            </View>

            {!isCurrent && (
              <View>
                <ThemedText size="sm" weight="medium" style={{ marginBottom: 8 * fontScale }}>
                  End Date
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
                    {endDate
                      ? endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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
                              const currentEndDate = endDate || new Date();
                              if (startDate && currentEndDate < startDate) {
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
                          value={endDate || new Date()}
                          mode="date"
                          display="spinner"
                          onChange={(event, selectedDate) => {
                            if (selectedDate) {
                              // Validate: end date cannot be before start date
                              if (startDate && selectedDate < startDate) {
                                Alert.alert(
                                  t('common.error'),
                                  t('profile.date.error.endBeforeStart'),
                                  [{ text: t('common.ok') }]
                                );
                                return;
                              }
                              setEndDate(selectedDate);
                            }
                          }}
                          minimumDate={startDate || undefined}
                          style={{ height: 200 }}
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
                        if (event.type === 'set' && selectedDate) {
                          // Validate: end date cannot be before start date
                          if (startDate && selectedDate < startDate) {
                            Alert.alert(
                              t('common.error'),
                              t('profile.date.error.endBeforeStart'),
                              [{ text: t('common.ok') }]
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
            label="Company Logo / Image (Optional)"
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
            { backgroundColor: colors.primary },
            !isSaveEnabled && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!isSaveEnabled}
        >
          <ThemedText weight="bold" letterSpacing="l" style={{ color: '#ffffff' }}>
            {isEditMode ? 'Save' : 'Add Job'}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </TabScreenContainer>
  );
}


