import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { LifeSphere, useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { AIEntitySuggestion } from '@/utils/ai-service';

type AIEntityResultsViewProps = {
  sphere: 'family' | 'friends' | 'hobbies' | 'relationships' | 'career';
  entities: AIEntitySuggestion[];
  onSave: (entities: AIEntitySuggestion[]) => Promise<void>;
  onCancel: () => void;
};

export function AIEntityResultsView({
  sphere,
  entities: initialEntities,
  onSave,
  onCancel,
}: AIEntityResultsViewProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();
  const { addFamilyMember, addFriend, addHobby, addProfile, addJob } = useJourney();

  const [entities, setEntities] = useState<AIEntitySuggestion[]>(initialEntities);
  const [isSaving, setIsSaving] = useState(false);
  const [datePickerEntityIndex, setDatePickerEntityIndex] = useState<number | null>(null);
  const [datePickerField, setDatePickerField] = useState<'startDate' | 'endDate' | null>(null);
  const [pickingImageForEntityIndex, setPickingImageForEntityIndex] = useState<number | null>(null);

  // Sort entities: current relationships/jobs first
  const sortedEntities = useMemo(() => {
    if (sphere === 'relationships' || sphere === 'career') {
      return [...entities].sort((a, b) => {
        // Current entities (isCurrent === true) come first
        if (a.isCurrent === true && b.isCurrent !== true) return -1;
        if (a.isCurrent !== true && b.isCurrent === true) return 1;
        // If both have same isCurrent status, maintain original order
        return 0;
      });
    }
    // For other spheres, return as-is
    return entities;
  }, [entities, sphere]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
        },
        scrollContent: {
          padding: 16 * fontScale,
          paddingBottom: 100 * fontScale, // Space for save button
        },
        entityCard: {
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.05)',
          borderRadius: 12 * fontScale,
          padding: 16 * fontScale,
          marginBottom: 12 * fontScale,
        },
        entityHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12 * fontScale,
        },
        entityTitle: {
          flex: 1,
        },
        deleteButton: {
          width: 32 * fontScale,
          height: 32 * fontScale,
          borderRadius: 16 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 0, 0, 0.2)' 
            : 'rgba(255, 0, 0, 0.1)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        fieldContainer: {
          marginBottom: 12 * fontScale,
        },
        fieldLabel: {
          marginBottom: 6 * fontScale,
          opacity: 0.7,
        },
        fieldInput: {
          padding: 12 * fontScale,
          borderRadius: 8 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.08)' 
            : 'rgba(0, 0, 0, 0.08)',
          color: colors.text,
          fontSize: 15 * fontScale,
        },
        dateButton: {
          padding: 12 * fontScale,
          borderRadius: 8 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.08)' 
            : 'rgba(0, 0, 0, 0.08)',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'transparent',
        },
        dateButtonError: {
          borderColor: '#FF4444',
          borderWidth: 2,
        },
        toggleButton: {
          padding: 8 * fontScale,
          borderRadius: 8 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
          marginRight: 8 * fontScale,
        },
        toggleButtonActive: {
          backgroundColor: colors.primary,
        },
        toggleButtonText: {
          color: colors.text,
        },
        toggleButtonTextActive: {
          color: '#FFFFFF',
        },
        saveButtonContainer: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16 * fontScale,
          backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
        },
        saveButton: {
          height: 48 * fontScale,
          borderRadius: 12 * fontScale,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
        },
        saveButtonDisabled: {
          opacity: 0.5,
        },
        errorText: {
          color: '#FF4444',
          fontSize: 12 * fontScale,
          marginTop: 4 * fontScale,
        },
        imageContainer: {
          marginBottom: 12 * fontScale,
        },
        imageLabel: {
          marginBottom: 6 * fontScale,
          opacity: 0.7,
        },
        imageWrapper: {
          position: 'relative',
        },
        imagePreview: {
          width: '100%',
          height: 200 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.05)',
        },
        imagePlaceholder: {
          width: '100%',
          height: 200 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.05)',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
          borderStyle: 'dashed',
        },
        imageButton: {
          padding: 12 * fontScale,
          borderRadius: 8 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
        imageRemoveButton: {
          position: 'absolute',
          top: 8 * fontScale,
          right: 8 * fontScale,
          width: 32 * fontScale,
          height: 32 * fontScale,
          borderRadius: 16 * fontScale,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [fontScale, colorScheme, colors]
  );

  const updateEntity = (index: number, updates: Partial<AIEntitySuggestion>) => {
    const updated = [...entities];
    updated[index] = { ...updated[index], ...updates };
    setEntities(updated);
  };


  const findEntityIndex = (entity: AIEntitySuggestion): number => {
    return entities.findIndex(e => 
      e.name === entity.name && 
      e.isCurrent === entity.isCurrent &&
      e.startDate === entity.startDate &&
      e.endDate === entity.endDate &&
      e.relationship === entity.relationship
    );
  };

  const deleteEntity = (entity: AIEntitySuggestion) => {
    Alert.alert(
      t('common.delete') || 'Delete',
      t('common.confirmDelete') || 'Are you sure you want to delete this entity?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: () => {
            const index = findEntityIndex(entity);
            if (index >= 0) {
              const updated = entities.filter((_, i) => i !== index);
              setEntities(updated);
            }
          },
        },
      ]
    );
  };

  const handlePickImage = async (entity: AIEntitySuggestion) => {
    const index = findEntityIndex(entity);
    if (index < 0) return;
    
    setPickingImageForEntityIndex(index);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error') || 'Error',
          t('error.cameraPermissionRequired') || 'Camera permission is required to upload images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        updateEntity(index, { imageUri: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert(
        t('common.error') || 'Error',
        t('error.imagePickFailed') || 'Failed to pick image.'
      );
    } finally {
      setPickingImageForEntityIndex(null);
    }
  };

  const handleRemoveImage = (entity: AIEntitySuggestion) => {
    const index = findEntityIndex(entity);
    if (index >= 0) {
      updateEntity(index, { imageUri: undefined });
    }
  };

  const validateEntities = (): boolean => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      
      // Name is always required
      if (!entity.name || entity.name.trim().length === 0) {
        return false;
      }

      // Sphere-specific validations
      if (sphere === 'family' && !entity.relationship) {
        return false;
      }
      
      if (sphere === 'relationships' || sphere === 'career') {
        if (entity.isCurrent === undefined) {
          return false;
        }
        if (!entity.startDate) {
          return false;
        }
        if (entity.isCurrent === false && !entity.endDate) {
          return false;
        }
        // Validate that end date is after start date
        if (entity.startDate && entity.endDate) {
          const startDate = new Date(entity.startDate);
          const endDate = new Date(entity.endDate);
          if (endDate <= startDate) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateEntities()) {
      Alert.alert(
        t('common.error') || 'Error',
        t('ai.entity.validationError') || 'Please fill in all required fields for all entities.'
      );
      return;
    }

    setIsSaving(true);
    try {
      for (const entity of entities) {
        if (sphere === 'family') {
          await addFamilyMember({
            name: entity.name.trim(),
            relationship: entity.relationship?.trim(),
            description: entity.description?.trim(),
            imageUri: entity.imageUri,
            sphere: 'family',
            setupProgress: 0,
            isCompleted: false,
          });
        } else if (sphere === 'friends') {
          await addFriend({
            name: entity.name.trim(),
            description: entity.description?.trim(),
            imageUri: entity.imageUri,
            sphere: 'friends',
            setupProgress: 0,
            isCompleted: false,
          });
        } else if (sphere === 'hobbies') {
          await addHobby({
            name: entity.name.trim(),
            description: entity.description?.trim(),
            imageUri: entity.imageUri,
            sphere: 'hobbies',
            setupProgress: 0,
            isCompleted: false,
          });
        } else if (sphere === 'relationships') {
          // Format dates to ensure they're in YYYY-MM-DD format
          let formattedStartDate: string | undefined;
          if (entity.startDate) {
            try {
              const date = new Date(entity.startDate);
              if (!isNaN(date.getTime())) {
                formattedStartDate = date.toISOString().split('T')[0];
              } else {
                // If date parsing fails, try to use the string as-is if it's already in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(entity.startDate)) {
                  formattedStartDate = entity.startDate;
                }
              }
            } catch {
              // If date parsing fails, try to use the string as-is if it's already in YYYY-MM-DD format
              if (/^\d{4}-\d{2}-\d{2}$/.test(entity.startDate)) {
                formattedStartDate = entity.startDate;
              }
            }
          }

          let formattedEndDate: string | null = null;
          if (entity.endDate) {
            try {
              const date = new Date(entity.endDate);
              if (!isNaN(date.getTime())) {
                formattedEndDate = date.toISOString().split('T')[0];
              } else {
                // If date parsing fails, try to use the string as-is if it's already in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(entity.endDate)) {
                  formattedEndDate = entity.endDate;
                }
              }
            } catch {
              // If date parsing fails, try to use the string as-is if it's already in YYYY-MM-DD format
              if (/^\d{4}-\d{2}-\d{2}$/.test(entity.endDate)) {
                formattedEndDate = entity.endDate;
              }
            }
          }

          await addProfile({
            name: entity.name.trim(),
            description: entity.description?.trim(),
            relationshipStartDate: formattedStartDate,
            relationshipEndDate: formattedEndDate,
            imageUri: entity.imageUri,
            sphere: 'relationships',
            setupProgress: 0,
            isCompleted: false,
          });
        } else if (sphere === 'career') {
          // Format dates to ensure they're in YYYY-MM-DD format
          let formattedStartDate: string | undefined;
          if (entity.startDate) {
            try {
              const date = new Date(entity.startDate);
              if (!isNaN(date.getTime())) {
                formattedStartDate = date.toISOString().split('T')[0];
              } else {
                // If date parsing fails, try to use the string as-is if it's already in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(entity.startDate)) {
                  formattedStartDate = entity.startDate;
                }
              }
            } catch {
              // If date parsing fails, try to use the string as-is if it's already in YYYY-MM-DD format
              if (/^\d{4}-\d{2}-\d{2}$/.test(entity.startDate)) {
                formattedStartDate = entity.startDate;
              }
            }
          }

          let formattedEndDate: string | null = null;
          if (entity.endDate) {
            try {
              const date = new Date(entity.endDate);
              if (!isNaN(date.getTime())) {
                formattedEndDate = date.toISOString().split('T')[0];
              } else {
                // If date parsing fails, try to use the string as-is if it's already in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(entity.endDate)) {
                  formattedEndDate = entity.endDate;
                }
              }
            } catch {
              // If date parsing fails, try to use the string as-is if it's already in YYYY-MM-DD format
              if (/^\d{4}-\d{2}-\d{2}$/.test(entity.endDate)) {
                formattedEndDate = entity.endDate;
              }
            }
          }

          await addJob({
            name: entity.name.trim(),
            description: entity.description?.trim(),
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            imageUri: entity.imageUri,
            setupProgress: 0,
            isCompleted: false,
          });
        }
      }

      await onSave(entities);
    } catch (error: any) {
      Alert.alert(
        t('common.error') || 'Error',
        error.message || t('ai.entity.saveError') || 'Failed to save entities'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const parseDate = (dateString: string): Date => {
    try {
      return new Date(dateString);
    } catch {
      return new Date();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {sortedEntities.map((entity, displayIndex) => {
          const entityIndex = findEntityIndex(entity);
          const index = entityIndex >= 0 ? entityIndex : displayIndex;
          
          return (
          <View key={`${entity.name}-${entity.isCurrent}-${entity.startDate}-${displayIndex}`} style={styles.entityCard}>
            <View style={styles.entityHeader}>
              <ThemedText size="l" weight="bold" style={styles.entityTitle}>
                {entity.name || `Entity ${displayIndex + 1}`}
              </ThemedText>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteEntity(entity)}
              >
                <MaterialIcons name="delete" size={18 * fontScale} color="#FF4444" />
              </TouchableOpacity>
            </View>

            {/* Name field */}
            <View style={styles.fieldContainer}>
              <ThemedText size="s" style={styles.fieldLabel}>
                {t('common.name') || 'Name'} *
              </ThemedText>
              <TextInput
                style={styles.fieldInput}
                value={entity.name || ''}
                onChangeText={(text) => updateEntity(index, { name: text })}
                placeholder={t('common.name') || 'Name'}
                placeholderTextColor={colors.muted}
              />
              {!entity.name || entity.name.trim().length === 0 ? (
                <ThemedText size="xs" style={styles.errorText}>
                  {t('common.required') || 'Required'}
                </ThemedText>
              ) : null}
            </View>

            {/* Sphere-specific fields */}
            {sphere === 'family' && (
              <View style={styles.fieldContainer}>
                <ThemedText size="s" style={styles.fieldLabel}>
                  {t('profile.familyMember.relationship') || 'Relationship'} *
                </ThemedText>
                <TextInput
                  style={styles.fieldInput}
                  value={entity.relationship || ''}
                  onChangeText={(text) => {
                    const idx = findEntityIndex(entity);
                    if (idx >= 0) updateEntity(idx, { relationship: text });
                  }}
                  placeholder={t('profile.familyMember.relationship') || 'e.g., Brother, Sister, Mother'}
                  placeholderTextColor={colors.muted}
                />
                {!entity.relationship || entity.relationship.trim().length === 0 ? (
                  <ThemedText size="xs" style={styles.errorText}>
                    {t('common.required') || 'Required'}
                  </ThemedText>
                ) : null}
              </View>
            )}

            {sphere === 'relationships' && (
              <>
                <View style={styles.fieldContainer}>
                  <ThemedText size="s" style={styles.fieldLabel}>
                    {t('profile.relationship.status') || 'Status'} *
                  </ThemedText>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        entity.isCurrent === true && styles.toggleButtonActive,
                      ]}
                      onPress={() => {
                        const idx = findEntityIndex(entity);
                        if (idx >= 0) updateEntity(idx, { isCurrent: true, endDate: null });
                      }}
                    >
                      <ThemedText
                        size="s"
                        style={entity.isCurrent === true ? styles.toggleButtonTextActive : styles.toggleButtonText}
                      >
                        {t('profile.relationship.current') || 'Current'}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        entity.isCurrent === false && styles.toggleButtonActive,
                      ]}
                      onPress={() => {
                        const idx = findEntityIndex(entity);
                        if (idx >= 0) updateEntity(idx, { isCurrent: false });
                      }}
                    >
                      <ThemedText
                        size="s"
                        style={entity.isCurrent === false ? styles.toggleButtonTextActive : styles.toggleButtonText}
                      >
                        {t('profile.relationship.past') || 'Past'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  {entity.isCurrent === undefined ? (
                    <ThemedText size="xs" style={styles.errorText}>
                      {t('common.required') || 'Required'}
                    </ThemedText>
                  ) : null}
                </View>

                <View style={styles.fieldContainer}>
                  <ThemedText size="s" style={styles.fieldLabel}>
                    {t('profile.relationshipStartDate') || 'Start Date'} *
                  </ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      !entity.startDate && styles.dateButtonError,
                    ]}
                    onPress={() => {
                      const idx = findEntityIndex(entity);
                      if (idx >= 0) {
                        setDatePickerEntityIndex(idx);
                        setDatePickerField('startDate');
                      }
                    }}
                  >
                    <ThemedText size="m">
                      {entity.startDate ? formatDate(entity.startDate) : t('common.selectDate') || 'Select date'}
                    </ThemedText>
                    <MaterialIcons name="calendar-today" size={20 * fontScale} color={colors.text} />
                  </TouchableOpacity>
                  {!entity.startDate ? (
                    <ThemedText size="xs" style={styles.errorText}>
                      {t('common.required') || 'Required'}
                    </ThemedText>
                  ) : null}
                </View>

                {entity.isCurrent === false && (
                  <View style={styles.fieldContainer}>
                    <ThemedText size="s" style={styles.fieldLabel}>
                      {t('profile.relationshipEndDate') || 'End Date'} *
                    </ThemedText>
                    <TouchableOpacity
                      style={[
                        styles.dateButton,
                        (!entity.endDate || (entity.startDate && entity.endDate && new Date(entity.endDate) <= new Date(entity.startDate))) && styles.dateButtonError,
                      ]}
                      onPress={() => {
                        const idx = findEntityIndex(entity);
                        if (idx >= 0) {
                          setDatePickerEntityIndex(idx);
                          setDatePickerField('endDate');
                        }
                      }}
                    >
                      <ThemedText size="m">
                        {entity.endDate ? formatDate(entity.endDate) : t('common.selectDate') || 'Select date'}
                      </ThemedText>
                      <MaterialIcons name="calendar-today" size={20 * fontScale} color={colors.text} />
                    </TouchableOpacity>
                    {!entity.endDate ? (
                      <ThemedText size="xs" style={styles.errorText}>
                        {t('common.required') || 'Required'}
                      </ThemedText>
                    ) : entity.startDate && entity.endDate && new Date(entity.endDate) <= new Date(entity.startDate) ? (
                      <ThemedText size="xs" style={styles.errorText}>
                        {t('profile.date.error.endBeforeStart') || 'End date must be after start date.'}
                      </ThemedText>
                    ) : null}
                  </View>
                )}
              </>
            )}

            {sphere === 'career' && (
              <>
                <View style={styles.fieldContainer}>
                  <ThemedText size="s" style={styles.fieldLabel}>
                    {t('profile.relationship.status') || 'Status'} *
                  </ThemedText>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        entity.isCurrent === true && styles.toggleButtonActive,
                      ]}
                      onPress={() => {
                        const idx = findEntityIndex(entity);
                        if (idx >= 0) updateEntity(idx, { isCurrent: true, endDate: null });
                      }}
                    >
                      <ThemedText
                        size="s"
                        style={entity.isCurrent === true ? styles.toggleButtonTextActive : styles.toggleButtonText}
                      >
                        {t('profile.relationship.current') || 'Current'}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        entity.isCurrent === false && styles.toggleButtonActive,
                      ]}
                      onPress={() => {
                        const idx = findEntityIndex(entity);
                        if (idx >= 0) updateEntity(idx, { isCurrent: false });
                      }}
                    >
                      <ThemedText
                        size="s"
                        style={entity.isCurrent === false ? styles.toggleButtonTextActive : styles.toggleButtonText}
                      >
                        {t('profile.relationship.past') || 'Past'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  {entity.isCurrent === undefined ? (
                    <ThemedText size="xs" style={styles.errorText}>
                      {t('common.required') || 'Required'}
                    </ThemedText>
                  ) : null}
                </View>

                <View style={styles.fieldContainer}>
                  <ThemedText size="s" style={styles.fieldLabel}>
                    {t('profile.relationship.startDate') || 'Start Date'} *
                  </ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      !entity.startDate && styles.dateButtonError,
                    ]}
                    onPress={() => {
                      const idx = findEntityIndex(entity);
                      if (idx >= 0) {
                        setDatePickerEntityIndex(idx);
                        setDatePickerField('startDate');
                      }
                    }}
                  >
                    <ThemedText size="m">
                      {entity.startDate ? formatDate(entity.startDate) : t('common.selectDate') || 'Select date'}
                    </ThemedText>
                    <MaterialIcons name="calendar-today" size={20 * fontScale} color={colors.text} />
                  </TouchableOpacity>
                  {!entity.startDate ? (
                    <ThemedText size="xs" style={styles.errorText}>
                      {t('common.required') || 'Required'}
                    </ThemedText>
                  ) : null}
                </View>

                {entity.isCurrent === false && (
                  <View style={styles.fieldContainer}>
                    <ThemedText size="s" style={styles.fieldLabel}>
                      {t('profile.relationship.endDate') || 'End Date'} *
                    </ThemedText>
                    <TouchableOpacity
                      style={[
                        styles.dateButton,
                        (!entity.endDate || (entity.startDate && entity.endDate && new Date(entity.endDate) <= new Date(entity.startDate))) && styles.dateButtonError,
                      ]}
                      onPress={() => {
                        const idx = findEntityIndex(entity);
                        if (idx >= 0) {
                          setDatePickerEntityIndex(idx);
                          setDatePickerField('endDate');
                        }
                      }}
                    >
                      <ThemedText size="m">
                        {entity.endDate ? formatDate(entity.endDate) : t('common.selectDate') || 'Select date'}
                      </ThemedText>
                      <MaterialIcons name="calendar-today" size={20 * fontScale} color={colors.text} />
                    </TouchableOpacity>
                    {!entity.endDate ? (
                      <ThemedText size="xs" style={styles.errorText}>
                        {t('common.required') || 'Required'}
                      </ThemedText>
                    ) : entity.startDate && entity.endDate && new Date(entity.endDate) <= new Date(entity.startDate) ? (
                      <ThemedText size="xs" style={styles.errorText}>
                        {t('profile.date.error.endBeforeStart') || 'End date must be after start date.'}
                      </ThemedText>
                    ) : null}
                  </View>
                )}
              </>
            )}

            {/* Image field (optional for all) */}
            <View style={styles.imageContainer}>
              <ThemedText size="s" style={styles.imageLabel}>
                {t('common.photo') || 'Photo'}
              </ThemedText>
              <View style={styles.imageWrapper}>
                {entity.imageUri ? (
                  <>
                    <Image
                      source={{ uri: entity.imageUri }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.imageRemoveButton}
                      onPress={() => handleRemoveImage(entity)}
                    >
                      <MaterialIcons name="close" size={18 * fontScale} color="#FFFFFF" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.imagePlaceholder}
                    onPress={() => handlePickImage(entity)}
                    disabled={pickingImageForEntityIndex === index}
                  >
                    {pickingImageForEntityIndex === index ? (
                      <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                      <>
                        <MaterialIcons 
                          name="add-photo-alternate" 
                          size={32 * fontScale} 
                          color={colors.muted} 
                        />
                        <ThemedText size="s" style={{ marginTop: 8 * fontScale, opacity: 0.7 }}>
                          {t('common.addPhoto') || 'Add Photo'}
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Description field (optional for all) */}
            <View style={styles.fieldContainer}>
              <ThemedText size="s" style={styles.fieldLabel}>
                {t('common.description') || 'Description'}
              </ThemedText>
              <TextInput
                style={[styles.fieldInput, { minHeight: 60 * fontScale }]}
                value={entity.description || ''}
                onChangeText={(text) => {
                  const idx = findEntityIndex(entity);
                  if (idx >= 0) updateEntity(idx, { description: text });
                }}
                placeholder={t('common.description') || 'Optional description'}
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        );
        })}

        {entities.length === 0 && (
          <View style={{ padding: 32 * fontScale, alignItems: 'center' }}>
            <ThemedText size="m" style={{ opacity: 0.7 }}>
              {t('ai.entity.noEntities') || 'No entities found'}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Date Picker */}
      {datePickerEntityIndex !== null && datePickerField && (
        <DateTimePicker
          value={datePickerField === 'startDate' 
            ? (entities[datePickerEntityIndex]?.startDate ? parseDate(entities[datePickerEntityIndex].startDate!) : new Date())
            : (entities[datePickerEntityIndex]?.endDate ? parseDate(entities[datePickerEntityIndex].endDate!) : new Date())
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setDatePickerEntityIndex(null);
              setDatePickerField(null);
            }
            if (selectedDate && datePickerEntityIndex !== null) {
              const dateString = selectedDate.toISOString().split('T')[0];
              const entity = entities[datePickerEntityIndex];
              
              if (datePickerField === 'startDate') {
                // When start date changes, clear end date
                updateEntity(datePickerEntityIndex, {
                  startDate: dateString,
                  endDate: undefined,
                });
              } else if (datePickerField === 'endDate') {
                // Validate end date is after start date
                if (entity.startDate) {
                  const startDate = new Date(entity.startDate);
                  const newEndDate = new Date(dateString);
                  if (newEndDate <= startDate) {
                    Alert.alert(
                      t('common.error') || 'Error',
                      t('profile.date.error.endBeforeStart') || 'End date must be after start date.'
                    );
                    if (Platform.OS === 'ios') {
                      setDatePickerEntityIndex(null);
                      setDatePickerField(null);
                    }
                    return;
                  }
                }
                updateEntity(datePickerEntityIndex, {
                  [datePickerField]: dateString,
                });
              }
              
              if (Platform.OS === 'ios') {
                setDatePickerEntityIndex(null);
                setDatePickerField(null);
              }
            } else if (Platform.OS === 'ios' && event.type === 'dismissed') {
              setDatePickerEntityIndex(null);
              setDatePickerField(null);
            }
          }}
        />
      )}

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!validateEntities() || isSaving || entities.length === 0) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!validateEntities() || isSaving || entities.length === 0}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              (!validateEntities() || isSaving || entities.length === 0)
                ? colorScheme === 'dark'
                  ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.1)']
                  : ['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)']
                : ['#4A90E2', '#357ABD', '#2E6DA4']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
            borderRadius={12 * fontScale}
          />
          <ThemedText size="l" weight="bold" style={{ color: '#FFFFFF' }}>
            {isSaving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
