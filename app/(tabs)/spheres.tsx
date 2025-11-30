import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale, useIconScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { ActionSheet } from '@/library/components/action-sheet';
import { ConfirmationModal } from '@/library/components/confirmation-modal';
import { ProfileCard } from '@/library/components/profile-card';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useTranslate } from '@/utils/languages/use-translate';
import type { LifeSphere, ExProfile, Job, FamilyMember } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { JobCard } from '@/library/components/job-card';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function SpheresScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const iconScale = useIconScale();
  const { maxContentWidth } = useLargeDevice();
  const { profiles, jobs, familyMembers, isLoading, getEntitiesBySphere, getOverallSunnyPercentage, deleteProfile, deleteJob, deleteFamilyMember, reloadIdealizedMemories } = useJourney();
  const t = useTranslate();
  
  // Reload memories when screen comes into focus (e.g., after running mock data script)
  useFocusEffect(
    useCallback(() => {
      console.log('[SpheresScreen] Reloading memories on focus...');
      reloadIdealizedMemories().then((count) => {
        console.log(`[SpheresScreen] Reloaded ${count} memories from storage`);
      });
    }, [reloadIdealizedMemories])
  );

  const [selectedSphere, setSelectedSphere] = useState<LifeSphere | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ExProfile | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const spheres: { type: LifeSphere; icon: string; label: string; entities: (ExProfile | Job | FamilyMember)[] }[] = useMemo(() => [
    {
      type: 'relationships',
      icon: 'favorite',
      label: 'Relationships',
      entities: getEntitiesBySphere('relationships') as ExProfile[],
    },
    {
      type: 'career',
      icon: 'work',
      label: 'Career',
      entities: getEntitiesBySphere('career') as Job[],
    },
    {
      type: 'family',
      icon: 'family-restroom',
      label: 'Family',
      entities: getEntitiesBySphere('family') as FamilyMember[],
    },
  ], [getEntitiesBySphere]);

  const overallPercentage = useMemo(() => getOverallSunnyPercentage(), [getOverallSunnyPercentage]);

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
    content: {
      flex: 1,
      padding: 16 * fontScale,
      gap: 24 * fontScale,
    },
    sphereGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16 * fontScale,
      justifyContent: 'center',
    },
    sphereCard: {
      width: (maxContentWidth - 48 * fontScale) / 3,
      minWidth: 100 * fontScale,
      aspectRatio: 1,
      borderRadius: 16 * fontScale,
      padding: 16 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(14, 165, 233, 0.1)' 
        : 'rgba(125, 211, 252, 0.2)',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' 
        ? 'rgba(14, 165, 233, 0.3)' 
        : 'rgba(125, 211, 252, 0.4)',
    },
    sphereCardActive: {
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(14, 165, 233, 0.3)' 
        : 'rgba(125, 211, 252, 0.4)',
      borderColor: colors.primaryLight,
      borderWidth: 2,
    },
    sphereIcon: {
      marginBottom: 4 * fontScale,
    },
    sphereLabel: {
      textAlign: 'center',
    },
    sphereCount: {
      textAlign: 'center',
      opacity: 0.7,
    },
    entityList: {
      gap: 12 * fontScale,
    },
    entityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      gap: 12 * fontScale,
    },
    entityImage: {
      width: 48 * fontScale,
      height: 48 * fontScale,
      borderRadius: 24 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(14, 165, 233, 0.2)' 
        : 'rgba(125, 211, 252, 0.3)',
    },
    entityInfo: {
      flex: 1,
      gap: 4 * fontScale,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32 * fontScale,
      gap: 16 * fontScale,
    },
    emptyIcon: {
      width: 80 * fontScale * iconScale,
      height: 80 * fontScale * iconScale,
      borderRadius: 40 * fontScale * iconScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(14, 165, 233, 0.2)' 
        : 'rgba(125, 211, 252, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
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
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      padding: 16 * fontScale,
      paddingBottom: 100 * fontScale,
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
      bottom: 26 * fontScale,
      right: 16 * fontScale,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
      width: '100%',
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
    buttonText: {},
  }), [fontScale, iconScale, colorScheme, colors, maxContentWidth]);

  const handleSpherePress = (sphere: LifeSphere) => {
    setSelectedSphere(selectedSphere === sphere ? null : sphere);
  };

  const handleEntityPress = (entity: ExProfile | Job, sphere: LifeSphere) => {
    if (sphere === 'relationships') {
      // For relationships, navigate to home screen with selected sphere
      router.push({
        pathname: '/(tabs)/',
        params: { sphere: 'relationships', entityId: entity.id },
      });
    } else {
      // For other spheres, navigate to home screen
      router.push({
        pathname: '/(tabs)/',
        params: { sphere, entityId: entity.id },
      });
    }
  };
  
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
    setActionSheetVisible(false);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProfile) {
      setDeleteConfirmVisible(false);
      setSelectedProfile(null);
      return;
    }

    const profileIdToDelete = selectedProfile.id;

    try {
      await deleteProfile(profileIdToDelete);
      setDeleteConfirmVisible(false);
      setSelectedProfile(null);
    } catch (error) {
      console.error('Error deleting profile:', error);
      setDeleteConfirmVisible(false);
      setSelectedProfile(null);
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

  const handleAddEntity = (sphere: LifeSphere) => {
    switch (sphere) {
      case 'relationships':
        router.push('/add-ex-profile');
        break;
      case 'career':
        router.push('/add-job');
        break;
      case 'family':
        router.push('/add-family-member');
        break;
    }
  };

  if (isLoading) {
    return (
      <TabScreenContainer>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            Life Spheres
          </ThemedText>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </TabScreenContainer>
    );
  }

  const selectedSphereData = selectedSphere ? spheres.find(s => s.type === selectedSphere) : null;
  const relationshipsProfiles = selectedSphere === 'relationships' ? (selectedSphereData?.entities as ExProfile[] || []) : [];
  const careerJobs = selectedSphere === 'career' ? (selectedSphereData?.entities as Job[] || []) : [];
  const familyMembersList = selectedSphere === 'family' ? (selectedSphereData?.entities as FamilyMember[] || []) : [];
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);
  const [familyMemberActionSheetVisible, setFamilyMemberActionSheetVisible] = useState(false);
  const [familyMemberDeleteConfirmVisible, setFamilyMemberDeleteConfirmVisible] = useState(false);
  const [jobActionSheetVisible, setJobActionSheetVisible] = useState(false);
  const [jobDeleteConfirmVisible, setJobDeleteConfirmVisible] = useState(false);
  
  const handleJobMorePress = (job: Job) => {
    setSelectedJob(job);
    setJobActionSheetVisible(true);
  };
  
  const handleEditJob = () => {
    if (selectedJob) {
      router.push({
        pathname: '/edit-job',
        params: { jobId: selectedJob.id },
      });
      setJobActionSheetVisible(false);
      setSelectedJob(null);
    }
  };
  
  const handleJobDeletePress = () => {
    setJobActionSheetVisible(false);
    setJobDeleteConfirmVisible(true);
  };
  
  const handleJobDeleteConfirm = async () => {
    if (!selectedJob) {
      setJobDeleteConfirmVisible(false);
      setSelectedJob(null);
      return;
    }
    
    try {
      await deleteJob(selectedJob.id);
      setJobDeleteConfirmVisible(false);
      setSelectedJob(null);
    } catch (error) {
      console.error('Error deleting job:', error);
      setJobDeleteConfirmVisible(false);
      setSelectedJob(null);
    }
  };
  
  const jobActionSheetOptions = selectedJob
    ? [
        {
          label: 'Edit',
          icon: 'edit' as const,
          onPress: handleEditJob,
        },
        {
          label: 'Delete',
          icon: 'delete' as const,
          onPress: handleJobDeletePress,
          destructive: true,
        },
      ]
    : [];

  // Show relationships profiles view (ex-profiles content) when relationships sphere is selected
  if (selectedSphere === 'relationships') {
    return (
      <TabScreenContainer>
        <View style={styles.header}>
          <Pressable
            onPress={() => setSelectedSphere(null)}
            style={styles.headerButton}
          >
            <MaterialIcons name="arrow-back" size={24 * fontScale} color={colors.text} />
          </Pressable>
          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            Relationships
          </ThemedText>
          {relationshipsProfiles.length > 0 ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/add-ex-profile')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24 * fontScale} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {relationshipsProfiles.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="psychology"
                size={100 * fontScale * iconScale}
                color={colorScheme === 'dark' ? colors.primaryLight : colors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.heading}>
                {t('profile.emptyState.title')}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t('profile.emptyState.description')}
              </ThemedText>
            </View>
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
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
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
          </>
        )}

        <ActionSheet
          visible={actionSheetVisible}
          title={selectedProfile ? `${selectedProfile.name}'s Profile` : ''}
          options={actionSheetOptions}
          onCancel={() => {
            setActionSheetVisible(false);
            setSelectedProfile(null);
          }}
        />

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

  // Show career jobs view when career sphere is selected
  if (selectedSphere === 'career') {
    return (
      <TabScreenContainer>
        <View style={styles.header}>
          <Pressable
            onPress={() => setSelectedSphere(null)}
            style={styles.headerButton}
          >
            <MaterialIcons name="arrow-back" size={24 * fontScale} color={colors.text} />
          </Pressable>
          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            Career
          </ThemedText>
          {careerJobs.length > 0 ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/add-job')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24 * fontScale} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {careerJobs.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="work"
                size={100 * fontScale * iconScale}
                color={colorScheme === 'dark' ? colors.primaryLight : colors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.heading}>
                No jobs yet
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                Start tracking your career journey
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push('/add-job')}
            >
              <ThemedText weight="bold" letterSpacing="l" style={styles.buttonText}>
                Add Job
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
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
          </>
        )}

        <ActionSheet
          visible={jobActionSheetVisible}
          title={selectedJob ? `${selectedJob.name}` : ''}
          options={jobActionSheetOptions}
          onCancel={() => {
            setJobActionSheetVisible(false);
            setSelectedJob(null);
          }}
        />

        <ConfirmationModal
          visible={jobDeleteConfirmVisible && !!selectedJob}
          title="Delete Job"
          message={selectedJob ? `Are you sure you want to delete "${selectedJob.name}"? This action cannot be undone.` : ''}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleJobDeleteConfirm}
          onCancel={() => {
            setJobDeleteConfirmVisible(false);
            setJobActionSheetVisible(false);
            setSelectedJob(null);
          }}
          destructive
        />
      </TabScreenContainer>
    );
  }

  // Show family members view when family sphere is selected
  if (selectedSphere === 'family') {
    const handleFamilyMemberMorePress = (member: FamilyMember) => {
      setSelectedFamilyMember(member);
      setFamilyMemberActionSheetVisible(true);
    };
    
    const handleEditFamilyMember = () => {
      if (selectedFamilyMember) {
        router.push({
          pathname: '/edit-family-member',
          params: { memberId: selectedFamilyMember.id },
        });
        setFamilyMemberActionSheetVisible(false);
        setSelectedFamilyMember(null);
      }
    };
    
    const handleFamilyMemberDeletePress = () => {
      setFamilyMemberActionSheetVisible(false);
      setFamilyMemberDeleteConfirmVisible(true);
    };
    
    const handleFamilyMemberDeleteConfirm = async () => {
      if (!selectedFamilyMember) {
        setFamilyMemberDeleteConfirmVisible(false);
        setSelectedFamilyMember(null);
        return;
      }
      
      try {
        await deleteFamilyMember(selectedFamilyMember.id);
        setFamilyMemberDeleteConfirmVisible(false);
        setSelectedFamilyMember(null);
      } catch (error) {
        console.error('Error deleting family member:', error);
        setFamilyMemberDeleteConfirmVisible(false);
        setSelectedFamilyMember(null);
      }
    };
    
    const familyMemberActionSheetOptions = selectedFamilyMember
      ? [
          {
            label: 'Edit',
            icon: 'edit' as const,
            onPress: handleEditFamilyMember,
          },
          {
            label: 'Delete',
            icon: 'delete' as const,
            onPress: handleFamilyMemberDeletePress,
            destructive: true,
          },
        ]
      : [];

    return (
      <TabScreenContainer>
        <View style={styles.header}>
          <Pressable
            onPress={() => setSelectedSphere(null)}
            style={styles.headerButton}
          >
            <MaterialIcons name="arrow-back" size={24 * fontScale} color={colors.text} />
          </Pressable>
          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            Family
          </ThemedText>
          {familyMembersList.length > 0 ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/add-family-member')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24 * fontScale} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {familyMembersList.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="family-restroom"
                size={100 * fontScale * iconScale}
                color={colorScheme === 'dark' ? colors.primaryLight : colors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.heading}>
                No family members yet
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                Start tracking your family relationships
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push('/add-family-member')}
            >
              <ThemedText weight="bold" letterSpacing="l" style={styles.buttonText}>
                Add Family Member
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.listContentWrapper}>
                {familyMembersList.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.entityCard}
                    onPress={() => handleFamilyMemberMorePress(member)}
                    activeOpacity={0.7}
                  >
                    {member.imageUri ? (
                      <Image
                        source={{ uri: member.imageUri }}
                        style={styles.entityImage}
                      />
                    ) : (
                      <View style={[styles.entityImage, { alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons
                          name="person"
                          size={24 * fontScale}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    <View style={styles.entityInfo}>
                      <ThemedText size="m" weight="bold">
                        {member.name}
                      </ThemedText>
                      {member.relationship && (
                        <ThemedText size="sm" style={{ opacity: 0.7 }}>
                          {member.relationship}
                        </ThemedText>
                      )}
                      {member.description && (
                        <ThemedText size="xs" style={{ opacity: 0.6 }} numberOfLines={1}>
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
          </>
        )}

        <ActionSheet
          visible={familyMemberActionSheetVisible}
          title={selectedFamilyMember ? `${selectedFamilyMember.name}` : ''}
          options={familyMemberActionSheetOptions}
          onCancel={() => {
            setFamilyMemberActionSheetVisible(false);
            setSelectedFamilyMember(null);
          }}
        />

        <ConfirmationModal
          visible={familyMemberDeleteConfirmVisible && !!selectedFamilyMember}
          title="Delete Family Member"
          message={selectedFamilyMember ? `Are you sure you want to delete "${selectedFamilyMember.name}"? This action cannot be undone.` : ''}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleFamilyMemberDeleteConfirm}
          onCancel={() => {
            setFamilyMemberDeleteConfirmVisible(false);
            setFamilyMemberActionSheetVisible(false);
            setSelectedFamilyMember(null);
          }}
          destructive
        />
      </TabScreenContainer>
    );
  }

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerButton} />
        <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
          Life Spheres
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 * fontScale }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sphere Selection Grid - only show when no sphere is selected */}
        {!selectedSphere && (
          <View style={styles.sphereGrid}>
            {spheres.map((sphere) => (
              <TouchableOpacity
                key={sphere.type}
                style={styles.sphereCard}
                onPress={() => handleSpherePress(sphere.type)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={sphere.icon as any}
                  size={40 * fontScale * iconScale}
                  color={colors.primary}
                  style={styles.sphereIcon}
                />
                <ThemedText size="sm" weight="bold" style={styles.sphereLabel}>
                  {sphere.label}
                </ThemedText>
                <ThemedText size="xs" style={styles.sphereCount}>
                  {sphere.entities.length} {sphere.entities.length === 1 ? 'item' : 'items'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </TabScreenContainer>
  );
}

