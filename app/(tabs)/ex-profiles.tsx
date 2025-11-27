import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale, useIconScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { ActionSheet } from '@/library/components/action-sheet';
import { ConfirmationModal } from '@/library/components/confirmation-modal';
import { FloatingActionButton } from '@/library/components/floating-action-button';
import { ProfileCard } from '@/library/components/profile-card';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useTranslate } from '@/utils/languages/use-translate';
import type { ExProfile } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ExProfilesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const iconScale = useIconScale();
  const { maxContentWidth } = useLargeDevice();
  const { profiles, isLoading, deleteProfile } = useJourney();
  const t = useTranslate();

  const [selectedProfile, setSelectedProfile] = useState<ExProfile | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const hasProfiles = profiles.length > 0;

  const handleMorePress = (profile: ExProfile) => {
    setSelectedProfile(profile);
    setActionSheetVisible(true);
  };

  const handleEditProfile = () => {
    if (selectedProfile) {
      router.push({
        pathname: '/edit-profile',
        params: { profileId: selectedProfile.id },
      });
      setActionSheetVisible(false);
      setSelectedProfile(null);
    }
  };

  const handleDeletePress = () => {
    // Close action sheet but keep selectedProfile
    // Don't clear selectedProfile here - we need it for the confirmation modal
    setActionSheetVisible(false);
    // Open confirmation modal immediately
    setDeleteConfirmVisible(true);
  };

  const handleDeleteConfirm = async () => {
    console.log('handleDeleteConfirm called');
    
    if (!selectedProfile) {
      console.warn('No profile selected for deletion');
      setDeleteConfirmVisible(false);
      setSelectedProfile(null);
      return;
    }

    const profileIdToDelete = selectedProfile.id;
    const profileName = selectedProfile.name;

    try {
      console.log('Deleting profile:', profileIdToDelete, profileName);
      console.log('Profiles before delete:', profiles.length);
      console.log('Profile IDs before delete:', profiles.map(p => p.id));
      
      // Delete the profile
      await deleteProfile(profileIdToDelete);
      
      console.log('Profile deleted successfully, profiles should update now');
      
      // Close modal after successful deletion
      setDeleteConfirmVisible(false);
      setSelectedProfile(null);
    } catch (error) {
      console.error('Error deleting profile:', error);
      // Still close modal even on error
      setDeleteConfirmVisible(false);
      setSelectedProfile(null);
      // TODO: Show error message to user
    }
  };

  const actionSheetOptions = selectedProfile
    ? [
        {
          label: t('profile.actionSheet.edit'),
          icon: 'edit' as const,
          onPress: handleEditProfile,
        },
        {
          label: t('profile.actionSheet.delete'),
          icon: 'delete' as const,
          onPress: handleDeletePress,
          destructive: true,
        },
      ]
    : [];

  // Memoize dynamic styles that scale with device size
  // Only recalculate when fontScale changes
  const styles = useMemo(() => StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16 * fontScale,
      paddingTop: 8 * fontScale,
      paddingBottom: 8 * fontScale,
      marginTop: 50,
    },
    headerButton: {
      width: 48 * fontScale,
      height: 48 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    listContent: {
      padding: 16 * fontScale,
      paddingBottom: 100 * fontScale, // Space for FAB
      gap: 16 * fontScale,
      alignItems: 'center',
    },
    listContentWrapper: {
      maxWidth: maxContentWidth,
      width: '100%',
      alignSelf: 'center',
    },
    fabContainer: {
      position: 'absolute',
      bottom: 26 * fontScale, // Lower position
      right: 16 * fontScale,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
      width: '100%',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16 * fontScale,
      paddingVertical: 24 * fontScale,
      gap: 24 * fontScale,
      maxWidth: maxContentWidth,
      width: '100%',
    },
    iconContainer: {
      width: 200 * fontScale * iconScale,
      height: 200 * fontScale * iconScale,
      borderRadius: 100 * fontScale * iconScale,
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: '100%',
      aspectRatio: 1,
    },
    textContainer: {
      alignItems: 'center',
      gap: 8 * fontScale,
      maxWidth: 480 * fontScale,
    },
    heading: {
      textAlign: 'center',
    },
    description: {
      textAlign: 'center',
      maxWidth: 480 * fontScale,
    },
    button: {
      width: '100%',
      minWidth: 84 * fontScale,
      maxWidth: 480 * fontScale,
      height: 48 * fontScale,
      borderRadius: 8 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16 * fontScale,
    },
    buttonText: {
    },
  }), [fontScale, iconScale]);

  if (isLoading) {
    return (
      <TabScreenContainer>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            {t('tab.exProfiles')}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </TabScreenContainer>
    );
  }

  return (
    <TabScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerButton} />
        <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
          {t('tab.exProfiles')}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      {hasProfiles ? (
        <>
          {/* Profile List */}
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.listContentWrapper}>
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onPress={() => {
                    // TODO: Navigate to profile detail screen
                    console.log('Profile pressed:', profile.id);
                  }}
                  onMorePress={() => handleMorePress(profile)}
                />
              ))}
            </View>
          </ScrollView>
          {/* Floating Action Button */}
          <View style={styles.fabContainer}>
            <FloatingActionButton
              onPress={() => router.push('/add-ex-profile')}
              icon="add"
            />
          </View>
        </>
      ) : (
        /* Empty State */
        <ScrollView
          contentContainerStyle={[styles.scrollContent, styles.content]}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  colorScheme === 'dark'
                    ? 'rgba(14, 165, 233, 0.5)'
                    : 'rgba(125, 211, 252, 0.3)',
              },
            ]}
          >
            <MaterialIcons
              name="psychology"
              size={100 * fontScale * iconScale}
              color={colorScheme === 'dark' ? colors.primaryLight : colors.primary}
              style={{ fontWeight: '200' }}
            />
          </View>

          {/* Heading and Description */}
          <View style={styles.textContainer}>
            <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.heading}>
              {t('profile.emptyState.title')}
            </ThemedText>
            <ThemedText size="sm" weight="normal" style={styles.description}>
              {t('profile.emptyState.description')}
            </ThemedText>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => router.push('/add-ex-profile')}
          >
            <ThemedText weight="bold" letterSpacing="l" style={styles.buttonText}>
              {t('profile.emptyState.button')}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Action Sheet */}
      <ActionSheet
        visible={actionSheetVisible}
        title={selectedProfile ? `${selectedProfile.name}'s Profile` : ''}
        options={actionSheetOptions}
        onCancel={() => {
          setActionSheetVisible(false);
          setSelectedProfile(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteConfirmVisible && !!selectedProfile}
        title={t('profile.delete.confirm')}
        message={selectedProfile ? t('profile.delete.confirm.message.withName').replace('{name}', selectedProfile.name) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setActionSheetVisible(false);
          setSelectedProfile(null);
        }}
        destructive
      />
    </TabScreenContainer>
  );
}

