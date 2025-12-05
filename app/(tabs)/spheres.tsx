import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale, useIconScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { ActionSheet } from '@/library/components/action-sheet';
import { ConfirmationModal } from '@/library/components/confirmation-modal';
import { JobCard } from '@/library/components/job-card';
import { ProfileCard } from '@/library/components/profile-card';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { WalkthroughModal } from '@/library/components/walkthrough-modal';
import type { ExProfile, FamilyMember, Friend, Hobby, Job, LifeSphere } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useSplash } from '@/utils/SplashAnimationProvider';
import { useSubscription } from '@/utils/SubscriptionProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function SpheresScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const iconScale = useIconScale();
  const { maxContentWidth, isLargeDevice } = useLargeDevice();
  const { profiles, jobs, familyMembers, friends, hobbies, isLoading, getEntitiesBySphere, getOverallSunnyPercentage, deleteProfile, deleteJob, deleteFamilyMember, deleteFriend, deleteHobby, reloadIdealizedMemories, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId, idealizedMemories } = useJourney();
  const { isSubscribed } = useSubscription();
  const { isAnimationComplete, isVisible: isSplashVisible } = useSplash();
  const t = useTranslate();
  
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);

  const checkSubscriptionLimit = (sphere: LifeSphere): boolean => {
    if (isSubscribed) return true; // Subscribed users can create unlimited
    
    switch (sphere) {
      case 'relationships':
        return profiles.length < 1;
      case 'career':
        return jobs.length < 1;
      case 'family':
        return familyMembers.length < 1;
      case 'friends':
        return friends.length < 1;
      case 'hobbies':
        return hobbies.length < 1;
      default:
        return true;
    }
  };

  const showSubscriptionPrompt = (sphere: LifeSphere) => {
    // Directly navigate to paywall without showing alert
    router.push('/paywall');
  };
  
  // Reload memories when screen comes into focus (e.g., after running mock data script)
  useFocusEffect(
    useCallback(() => {
      reloadIdealizedMemories().then((count) => {
        // Check for walkthrough after reloading memories
        const checkWalkthrough = async () => {
          // Wait for loading to complete AND splash animation to finish AND splash to be hidden
          if (!isLoading && isAnimationComplete && !isSplashVisible) {
            const totalEntities = profiles.length + jobs.length + familyMembers.length + friends.length + hobbies.length;
            const totalMemories = count; // Use the reloaded count
            
            if (totalEntities === 0 && totalMemories === 0) {
              // Wait 1 second after splash animation finishes and spheres tab is visible
              setTimeout(() => {
                setWalkthroughVisible(true);
              }, 1000);
            }
          }
        };
        
        checkWalkthrough();
      });
    }, [reloadIdealizedMemories, isLoading, isAnimationComplete, isSplashVisible, profiles.length, jobs.length, familyMembers.length, friends.length, hobbies.length])
  );

  // Check for first launch and show walkthrough if no memories exist
  useEffect(() => {
    const checkAndShowWalkthrough = async () => {
      try {
        // Wait for loading to complete AND splash animation to finish AND splash to be hidden
        if (!isLoading && isAnimationComplete && !isSplashVisible) {
          // Check if there are any entities or memories
          const totalEntities = profiles.length + jobs.length + familyMembers.length + friends.length + hobbies.length;
          const totalMemories = idealizedMemories.length;
          
          // If no entities and no memories, show walkthrough (regardless of previous flag)
          // This handles both first launch and data cleared scenarios
          if (totalEntities === 0 && totalMemories === 0) {
            // Wait 1 second after splash animation finishes and spheres tab is visible
            setTimeout(() => {
              setWalkthroughVisible(true);
            }, 1000);
          }
        }
      } catch (error) {
        // Error checking walkthrough
      }
    };
    
    checkAndShowWalkthrough();
  }, [isLoading, isAnimationComplete, isSplashVisible, profiles.length, jobs.length, familyMembers.length, friends.length, hobbies.length, idealizedMemories.length]);

  const handleWalkthroughDismiss = useCallback(async () => {
    try {
      const WALKTHROUGH_SHOWN_KEY = '@sferas:walkthrough_shown';
      await AsyncStorage.setItem(WALKTHROUGH_SHOWN_KEY, 'true');
      setWalkthroughVisible(false);
    } catch (error) {
      setWalkthroughVisible(false);
    }
  }, []);

  const [selectedSphere, setSelectedSphere] = useState<LifeSphere | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ExProfile | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [expandedSphere, setExpandedSphere] = useState<LifeSphere | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);
  const [familyMemberActionSheetVisible, setFamilyMemberActionSheetVisible] = useState(false);
  const [familyMemberDeleteConfirmVisible, setFamilyMemberDeleteConfirmVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendActionSheetVisible, setFriendActionSheetVisible] = useState(false);
  const [friendDeleteConfirmVisible, setFriendDeleteConfirmVisible] = useState(false);
  const [selectedHobby, setSelectedHobby] = useState<Hobby | null>(null);
  const [hobbyActionSheetVisible, setHobbyActionSheetVisible] = useState(false);
  const [hobbyDeleteConfirmVisible, setHobbyDeleteConfirmVisible] = useState(false);
  const [jobActionSheetVisible, setJobActionSheetVisible] = useState(false);
  const [jobDeleteConfirmVisible, setJobDeleteConfirmVisible] = useState(false);

  // Calculate entity-level scores for comparison
  const entityComparisons = useMemo(() => {
    const calculateEntityScore = (entityId: string, sphereType: LifeSphere): number => {
      const memories = sphereType === 'relationships'
        ? getIdealizedMemoriesByProfileId(entityId)
        : getIdealizedMemoriesByEntityId(entityId, sphereType);
      
      let totalClouds = 0;
      let totalSuns = 0;
      
      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });
      
      const total = totalClouds + totalSuns;
      if (total === 0) return 0;
      
      const percentage = (totalSuns / total) * 100;
      return Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
    };

    const relationships = profiles
      .map(p => ({
        id: p.id,
        name: p.name,
        score: calculateEntityScore(p.id, 'relationships'),
        isOngoing: !p.relationshipEndDate,
        entity: p,
      }))
      .filter(e => e.score > 0)
      .sort((a, b) => {
        // Sort: ongoing first, then by score descending
        if (a.isOngoing && !b.isOngoing) return -1;
        if (!a.isOngoing && b.isOngoing) return 1;
        return b.score - a.score;
      });

    const jobsList = jobs
      .map(j => ({
        id: j.id,
        name: j.name,
        score: calculateEntityScore(j.id, 'career'),
        isOngoing: !j.endDate,
        entity: j,
      }))
      .filter(e => e.score > 0)
      .sort((a, b) => {
        // Sort: ongoing first, then by score descending
        if (a.isOngoing && !b.isOngoing) return -1;
        if (!a.isOngoing && b.isOngoing) return 1;
        return b.score - a.score;
      });

    const familyMembersList = familyMembers
      .map(f => ({
        id: f.id,
        name: f.name,
        score: calculateEntityScore(f.id, 'family'),
        isOngoing: true, // Family members are always "ongoing"
        entity: f,
      }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score);

    const friendsList = friends
      .map(f => ({
        id: f.id,
        name: f.name,
        score: calculateEntityScore(f.id, 'friends'),
        isOngoing: true, // Friends are always "ongoing"
        entity: f,
      }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score);

    const hobbiesList = hobbies
      .map(h => ({
        id: h.id,
        name: h.name,
        score: calculateEntityScore(h.id, 'hobbies'),
        isOngoing: true, // Hobbies are always "ongoing"
        entity: h,
      }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score);

    return {
      relationships,
      career: jobsList,
      family: familyMembersList,
      friends: friendsList,
      hobbies: hobbiesList,
    };
  }, [profiles, jobs, familyMembers, friends, hobbies, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  const spheres: { type: LifeSphere; icon: string; label: string; entities: (ExProfile | Job | FamilyMember | Friend | Hobby)[] }[] = useMemo(() => [
    {
      type: 'relationships',
      icon: 'favorite',
      label: t('spheres.relationships'),
      entities: getEntitiesBySphere('relationships') as ExProfile[],
    },
    {
      type: 'career',
      icon: 'work',
      label: t('spheres.career'),
      entities: getEntitiesBySphere('career') as Job[],
    },
    {
      type: 'family',
      icon: 'family-restroom',
      label: t('spheres.family'),
      entities: getEntitiesBySphere('family') as FamilyMember[],
    },
    {
      type: 'friends',
      icon: 'people',
      label: t('spheres.friends'),
      entities: getEntitiesBySphere('friends') as Friend[],
    },
    {
      type: 'hobbies',
      icon: 'sports-esports',
      label: t('spheres.hobbies'),
      entities: getEntitiesBySphere('hobbies') as Hobby[],
    },
  ], [getEntitiesBySphere, t]);

  const overallPercentage = useMemo(() => getOverallSunnyPercentage(), [getOverallSunnyPercentage]);

  // Calculate sunny percentage for each sphere
  // Calculate sphere data: total moments (for distribution) and sunny percentage (for quality)
  const sphereData = useMemo(() => {
    const calculateSphereData = (sphereType: LifeSphere) => {
      const entities = getEntitiesBySphere(sphereType);
      if (entities.length === 0) return { totalMoments: 0, sunnyPercentage: 0 };

      let totalClouds = 0;
      let totalSuns = 0;

      entities.forEach((entity) => {
        const memories = sphereType === 'relationships' && 'id' in entity
          ? getIdealizedMemoriesByProfileId(entity.id)
          : getIdealizedMemoriesByEntityId(entity.id, sphereType);

        memories.forEach((memory) => {
          totalClouds += (memory.hardTruths || []).length;
          totalSuns += (memory.goodFacts || []).length;
        });
      });

      const totalMoments = totalClouds + totalSuns;
      const sunnyPercentage = totalMoments > 0 
        ? (totalSuns / totalMoments) * 100 
        : 0;

      return {
        totalMoments,
        sunnyPercentage: Math.max(0, Math.min(100, isNaN(sunnyPercentage) ? 0 : sunnyPercentage)),
      };
    };

    return {
      relationships: calculateSphereData('relationships'),
      career: calculateSphereData('career'),
      family: calculateSphereData('family'),
      friends: calculateSphereData('friends'),
      hobbies: calculateSphereData('hobbies'),
    };
  }, [getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  // Calculate distribution percentages (for segment sizes)
  const sphereDistribution = useMemo(() => {
    const totalAllMoments = sphereData.relationships.totalMoments + 
                           sphereData.career.totalMoments + 
                           sphereData.family.totalMoments;
    
    if (totalAllMoments === 0) {
      return {
        relationships: 33.33,
        career: 33.33,
        family: 33.33,
      };
    }

    return {
      relationships: (sphereData.relationships.totalMoments / totalAllMoments) * 100,
      career: (sphereData.career.totalMoments / totalAllMoments) * 100,
      family: (sphereData.family.totalMoments / totalAllMoments) * 100,
    };
  }, [sphereData]);

  // Keep sphereScores for insights (sunny percentage)
  const sphereScores = useMemo(() => ({
    relationships: sphereData.relationships.sunnyPercentage,
    career: sphereData.career.sunnyPercentage,
    family: sphereData.family.sunnyPercentage,
    friends: sphereData.friends.sunnyPercentage,
    hobbies: sphereData.hobbies.sunnyPercentage,
  }), [sphereData]);

  // Calculate entity-level scores and generate detailed insights
  const insights = useMemo(() => {
    const insightsList: { 
      sphere: LifeSphere; 
      message: string; 
      priority: 'high' | 'medium' | 'low';
      details?: { entityName: string; percentage: number; comparison?: string };
    }[] = [];

    // Helper to calculate entity score
    const calculateEntityScore = (entityId: string, sphereType: LifeSphere): number => {
      const memories = sphereType === 'relationships'
        ? getIdealizedMemoriesByProfileId(entityId)
        : getIdealizedMemoriesByEntityId(entityId, sphereType);
      
      let totalClouds = 0;
      let totalSuns = 0;
      
      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });
      
      const total = totalClouds + totalSuns;
      if (total === 0) return 0;
      
      const percentage = (totalSuns / total) * 100;
      return Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
    };

    // Relationships analysis
    const relationshipsEntities = profiles.filter(p => 
      p.relationshipStartDate || p.relationshipEndDate !== undefined
    );
    if (relationshipsEntities.length > 0) {
      const currentRelationships = relationshipsEntities.filter(p => !p.relationshipEndDate);
      const pastRelationships = relationshipsEntities.filter(p => p.relationshipEndDate);
      
      // Analyze current relationships
      currentRelationships.forEach(profile => {
        const score = calculateEntityScore(profile.id, 'relationships');
        // Only generate insights if there are memories and score is below 50%
        if (score > 0 && score < 50) {
          // Compare with past relationships that have memories
          const pastScoresWithData = pastRelationships
            .map(p => calculateEntityScore(p.id, 'relationships'))
            .filter(s => s > 0); // Only include past relationships with memories
          
          const avgPastScore = pastScoresWithData.length > 0 
            ? pastScoresWithData.reduce((a, b) => a + b, 0) / pastScoresWithData.length 
            : null;
          
          let messageKey = 'insights.relationships.current.low';
          let comparison: string | undefined = undefined;
          
          if (avgPastScore !== null && avgPastScore < 50) {
            // Pattern detected - similar low scores across relationships
            messageKey = 'insights.relationships.pattern.current';
            comparison = `This is similar to your past relationships (avg ${Math.round(avgPastScore)}% sunny).`;
          } else if (avgPastScore !== null) {
            comparison = `Your past relationships averaged ${Math.round(avgPastScore)}% sunny.`;
          }
          
          insightsList.push({
            sphere: 'relationships',
            message: messageKey,
            priority: score < 30 ? 'high' : 'medium',
            details: {
              entityName: profile.name,
              percentage: Math.round(score),
              comparison: comparison,
            },
          });
        }
      });
    }

    // Career analysis
    const careerEntities = jobs.filter(j => j.startDate);
    if (careerEntities.length > 0) {
      const currentJobs = careerEntities.filter(j => !j.endDate);
      const pastJobs = careerEntities.filter(j => j.endDate);
      
      // Analyze current jobs
      currentJobs.forEach(job => {
        const score = calculateEntityScore(job.id, 'career');
        // Only generate insights if there are memories and score is below 50%
        if (score > 0 && score < 50) {
          const pastScoresWithData = pastJobs
            .map(j => calculateEntityScore(j.id, 'career'))
            .filter(s => s > 0); // Only include past jobs with memories
          
          const avgPastScore = pastScoresWithData.length > 0 
            ? pastScoresWithData.reduce((a, b) => a + b, 0) / pastScoresWithData.length 
            : null;
          
          let messageKey = 'insights.career.current.low';
          let comparison: string | undefined = undefined;
          
          if (avgPastScore !== null && avgPastScore < 50) {
            // Pattern detected - similar low scores across jobs
            messageKey = 'insights.career.pattern.current';
            comparison = `This pattern is similar to your previous jobs (avg ${Math.round(avgPastScore)}% positive).`;
          } else if (avgPastScore !== null) {
            comparison = `Your previous jobs averaged ${Math.round(avgPastScore)}% positive moments.`;
          }
          
          insightsList.push({
            sphere: 'career',
            message: messageKey,
            priority: score < 30 ? 'high' : 'medium',
            details: {
              entityName: job.name,
              percentage: Math.round(score),
              comparison: comparison,
            },
          });
        }
      });
    }

    // Family analysis - compare all family members
    if (familyMembers.length > 1) {
      const familyScores = familyMembers
        .map(member => ({
          member,
          score: calculateEntityScore(member.id, 'family'),
        }))
        .filter(({ score }) => score > 0); // Only include members with memories
      
      if (familyScores.length > 1) {
        const lowScoreMembers = familyScores.filter(({ score }) => score > 0 && score < 50);
        const avgScore = familyScores.reduce((sum, { score }) => sum + score, 0) / familyScores.length;
        
        lowScoreMembers.forEach(({ member, score }) => {
          let messageKey = 'insights.family.member.low';
          let comparison: string | undefined = undefined;
          
          if (avgScore < 50) {
            // Pattern detected - similar low scores across family
            messageKey = 'insights.family.pattern';
            comparison = `This is similar to other family relationships (avg ${Math.round(avgScore)}% positive).`;
          }
          
          insightsList.push({
            sphere: 'family',
            message: messageKey,
            priority: score < 30 ? 'high' : 'medium',
            details: {
              entityName: member.name,
              percentage: Math.round(score),
              comparison: comparison,
            },
          });
        });
      } else if (familyScores.length === 1 && familyScores[0].score > 0 && familyScores[0].score < 50) {
        // Single family member with low score
        insightsList.push({
          sphere: 'family',
          message: 'insights.family.member.low',
          priority: familyScores[0].score < 30 ? 'high' : 'medium',
          details: {
            entityName: familyScores[0].member.name,
            percentage: Math.round(familyScores[0].score),
          },
        });
      }
    }

    return insightsList;
  }, [profiles, jobs, familyMembers, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  const styles = useMemo(() => StyleSheet.create({
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
      flex: 1,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 12 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 0, // Remove top padding to allow better centering
      paddingBottom: 0, // Remove bottom padding to allow better centering
    },
    mainContentWrapper: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      maxHeight: Dimensions.get('window').height - 200 * fontScale, // Account for header and safe area
      gap: 24 * fontScale, // Add gap between sphere grid and insights button
    },
    mainContentContainer: {
      width: '100%',
      alignItems: 'center',
      alignSelf: 'stretch',
      flexShrink: 1,
      ...(!isLargeDevice && { paddingLeft: 18 * fontScale }),
    },
    sphereGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12 * fontScale,
      justifyContent: 'center',
      flexShrink: 1,
      minHeight: 100 * fontScale,
      minWidth: 100 * fontScale,
    },
    sphereCard: {
      width: (Dimensions.get('window').width - 48 * fontScale - 32 * fontScale) / 2, // Screen width minus padding and gap, divided by 2
      minWidth: 100 * fontScale,
      maxWidth: 180 * fontScale,
      aspectRatio: 1,
      borderRadius: 12 * fontScale,
      overflow: 'hidden', // Required for gradient to respect borderRadius
      borderWidth: 1,
      borderColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' // Subtle border with low opacity
        : 'rgba(125, 211, 252, 0.4)',
    },
    sphereCardContent: {
      flex: 1,
      padding: 12 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6 * fontScale,
    },
    sphereCardActive: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    sphereIcon: {
      marginBottom: 4 * fontScale,
    },
    sphereLabel: {
      textAlign: 'center',
      fontSize: 14 * fontScale, // Increased from 11
    },
    sphereCount: {
      textAlign: 'center',
      fontSize: 10 * fontScale,
      color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#333333', // Darker color for better contrast in light mode
    },
    insightsButtonContainer: {
      marginTop: 0, // Remove marginTop since gap is handled by mainContentWrapper
      borderRadius: 16 * fontScale,
      overflow: 'hidden',
      shadowColor: '#8b5cf6',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
      width: '100%',
      maxWidth: maxContentWidth as any,
      alignSelf: 'center',
      flexShrink: 0,
    },
    insightsButtonGradient: {
      borderRadius: 16 * fontScale,
      padding: 14 * fontScale,
    },
    insightsButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12 * fontScale,
            width: '100%',

    },
    insightsIconContainer: {
      position: 'relative',
      width: 48 * fontScale,
      height: 48 * fontScale,
      borderRadius: 24 * fontScale,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sparkleIcon: {
      position: 'absolute',
      top: -4,
      right: -4,
    },
    insightsTextContainer: {
      flex: 1,
      gap: 2 * fontScale,
    },
    insightsButtonTitle: {
      color: '#ffffff',
      fontWeight: '700',
    },
    insightsButtonSubtitle: {
      color: 'rgba(255, 255, 255, 0.9)',
      opacity: 0.9,
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
        ? Colors.dark.surfaceElevated1 // Use elevation-based surface color
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
        ? Colors.dark.surfaceElevated1 // Use elevation-based surface color
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
      maxWidth: maxContentWidth as any,
      width: '100%',
      alignSelf: 'center',
    },
    fabContainer: {
      position: 'absolute',
      bottom: 26 * fontScale,
      right: 16 * fontScale,
      zIndex: 10,
    },
    fabButton: {
      width: 56 * fontScale,
      height: 56 * fontScale,
      borderRadius: 28 * fontScale,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      maxWidth: maxContentWidth as any,
      alignSelf: 'center',
      width: '100%',
      paddingHorizontal: 16 * fontScale,
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
      marginTop: 32 * fontScale,
    },
    buttonText: {},
    wheelContainer: {
      marginBottom: 32 * fontScale,
      padding: 20 * fontScale,
      borderRadius: 16 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
    },
    wheelTitle: {
      textAlign: 'center',
      marginBottom: 8 * fontScale,
    },
    wheelSubtitle: {
      textAlign: 'center',
      opacity: 0.7,
      marginBottom: 24 * fontScale,
    },
    wheelWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 20 * fontScale,
    },
    scoresContainer: {
      marginTop: 24 * fontScale,
      gap: 16 * fontScale,
    },
    scoreItem: {
      marginBottom: 12 * fontScale,
      borderRadius: 12 * fontScale,
      padding: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.03)' 
        : 'rgba(0, 0, 0, 0.03)',
    },
    scoreRowTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12 * fontScale,
      marginBottom: 8 * fontScale,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12 * fontScale,
      marginBottom: 8 * fontScale,
    },
    scoreLabel: {
      flex: 1,
    },
    scoreValue: {
      minWidth: 50 * fontScale,
      textAlign: 'right',
    },
    scoreBarContainer: {
      height: 6 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 3 * fontScale,
      overflow: 'hidden',
    },
    scoreBar: {
      height: '100%',
      borderRadius: 3 * fontScale,
    },
    insightsContainer: {
      marginTop: 32 * fontScale,
      gap: 16 * fontScale,
    },
    insightsTitle: {
      marginBottom: 12 * fontScale,
    },
    insightItem: {
      padding: 16 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.03)' 
        : 'rgba(0, 0, 0, 0.03)',
      borderLeftWidth: 4,
      marginBottom: 12 * fontScale,
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8 * fontScale,
      marginBottom: 8 * fontScale,
    },
    insightSphere: {
      flex: 1,
    },
    insightMessage: {
      opacity: 0.8,
      lineHeight: 20 * fontScale,
    },
    insightPercentage: {
      marginTop: 4 * fontScale,
      fontWeight: '600',
    },
    comparisonContainer: {
      marginTop: 16 * fontScale,
      paddingTop: 16 * fontScale,
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    comparisonSection: {
      marginBottom: 16 * fontScale,
    },
    comparisonSectionTitle: {
      marginBottom: 12 * fontScale,
      opacity: 0.8,
    },
    entityComparisonItem: {
      marginBottom: 12 * fontScale,
    },
    entityComparisonName: {
      marginBottom: 6 * fontScale,
      opacity: 0.9,
    },
    entityComparisonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8 * fontScale,
    },
    entityScoreBarContainer: {
      flex: 1,
      height: 4 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 2 * fontScale,
      overflow: 'hidden',
    },
    entityScoreBar: {
      height: '100%',
      borderRadius: 2 * fontScale,
    },
    entityScoreValue: {
      minWidth: 40 * fontScale,
      textAlign: 'right',
    },
    suggestionContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8 * fontScale,
      marginTop: 16 * fontScale,
      padding: 12 * fontScale,
      borderRadius: 8 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? Colors.dark.surfaceElevated1 // Use elevation-based surface color
        : 'rgba(125, 211, 252, 0.2)',
    },
    suggestionText: {
      flex: 1,
      opacity: 0.9,
      lineHeight: 20 * fontScale,
    },
    percentageExplanation: {
      marginTop: 16 * fontScale,
      marginBottom: 8 * fontScale,
      paddingHorizontal: 20 * fontScale,
      paddingVertical: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 8 * fontScale,
    },
    percentageExplanationText: {
      opacity: 0.7,
      lineHeight: 18 * fontScale,
      textAlign: 'center',
    },
  }), [fontScale, iconScale, colorScheme, colors, maxContentWidth, isLargeDevice]);

  const handleSpherePress = (sphere: LifeSphere) => {
    // Check if the sphere has any moments (floating things) - this determines if it's visually empty
    const hasMoments = sphereData[sphere].totalMoments > 0;
    
    // If sphere has no moments (empty sphere on main screen), always show empty state
    // If sphere has moments, toggle selection as before
    if (!hasMoments) {
      setSelectedSphere(sphere);
    } else {
      setSelectedSphere(selectedSphere === sphere ? null : sphere);
    }
  };

  const handleEntityPress = (entity: ExProfile | Job, sphere: LifeSphere) => {
    if (sphere === 'relationships') {
      // For relationships, navigate to home screen with selected sphere
      router.push({
        pathname: '/(tabs)' as const,
        params: { sphere: 'relationships', entityId: entity.id },
      });
    } else {
      // For other spheres, navigate to home screen
      router.push({
        pathname: '/(tabs)' as const,
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
    if (!checkSubscriptionLimit(sphere)) {
      showSubscriptionPrompt(sphere);
      return;
    }
    
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
      case 'friends':
        router.push('/add-friend');
        break;
      case 'hobbies':
        router.push('/add-hobby');
        break;
    }
  };

  // Define these before the loading check to use in hooks
  const selectedSphereData = selectedSphere ? spheres.find(s => s.type === selectedSphere) : null;
  // Use the actual data sources directly instead of relying on selectedSphereData
  const relationshipsProfiles = selectedSphere === 'relationships' ? profiles : [];
  const careerJobs = selectedSphere === 'career' ? jobs : [];
  const familyMembersList = selectedSphere === 'family' ? familyMembers : [];
  
  // Check if any entity has at least one memory - moved before loading check
  const hasAnyRelationshipMemory = useMemo(() => {
    return relationshipsProfiles.some(profile => {
      const memories = getIdealizedMemoriesByProfileId(profile.id);
      return memories.length > 0;
    });
  }, [relationshipsProfiles, getIdealizedMemoriesByProfileId]);
  
  const hasAnyCareerMemory = useMemo(() => {
    return careerJobs.some(job => {
      const memories = getIdealizedMemoriesByEntityId(job.id, 'career');
      return memories.length > 0;
    });
  }, [careerJobs, getIdealizedMemoriesByEntityId]);
  
  const hasAnyFamilyMemory = useMemo(() => {
    return familyMembersList.some(member => {
      const memories = getIdealizedMemoriesByEntityId(member.id, 'family');
      return memories.length > 0;
    });
  }, [familyMembersList, getIdealizedMemoriesByEntityId]);

  if (isLoading) {
    return (
      <TabScreenContainer>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            {t('spheres.title')}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </TabScreenContainer>
    );
  }
  
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
      setJobDeleteConfirmVisible(false);
      setSelectedJob(null);
    }
  };
  
  const jobActionSheetOptions = selectedJob
    ? [
        {
          label: t('job.jobActionSheet.edit'),
          icon: 'edit' as const,
          onPress: handleEditJob,
        },
        {
          label: t('job.jobActionSheet.delete'),
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
          <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            {t('spheres.relationships')}
          </ThemedText>
          {hasAnyRelationshipMemory ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.replace({ pathname: '/(tabs)' })}
              activeOpacity={0.7}
            >
              <ThemedText style={{ 
                color: colorScheme === 'dark' 
                  ? colors.textHighEmphasis || '#FFFFFF' 
                  : '#11181C', 
                fontSize: 14 
              }}>
                {t('common.done')}
              </ThemedText>
            </TouchableOpacity>
          ) : relationshipsProfiles.length > 0 ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                if (!checkSubscriptionLimit('relationships')) {
                  showSubscriptionPrompt('relationships');
                } else {
                  router.push('/add-ex-profile');
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24 * fontScale} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {profiles.length === 0 ? (
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
              onPress={() => {
                if (!checkSubscriptionLimit('relationships')) {
                  showSubscriptionPrompt('relationships');
                } else {
                  router.push('/add-ex-profile');
                }
              }}
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
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity('relationships')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={24 * fontScale} color="#ffffff" />
              </TouchableOpacity>
            </View>
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
          <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            {t('spheres.career')}
          </ThemedText>
          {hasAnyCareerMemory ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.replace({ pathname: '/(tabs)' })}
              activeOpacity={0.7}
            >
              <ThemedText style={{ 
                color: colorScheme === 'dark' 
                  ? colors.textHighEmphasis || '#FFFFFF' 
                  : '#11181C', 
                fontSize: 14 
              }}>
                {t('common.done')}
              </ThemedText>
            </TouchableOpacity>
          ) : careerJobs.length > 0 ? (
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

        {(!jobs || !Array.isArray(jobs) || jobs.length === 0) ? (
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
                {t('job.jobEmptyState.title')}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t('job.jobEmptyState.description')}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push('/add-job')}
            >
              <ThemedText weight="bold" letterSpacing="l" style={styles.buttonText}>
                {t('job.jobEmptyState.button')}
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
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity('career')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={24 * fontScale} color="#ffffff" />
              </TouchableOpacity>
            </View>
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
          title={t('job.jobDelete.confirm')}
          message={selectedJob ? t('job.jobDelete.confirm.message.withName').replace('{name}', selectedJob.name) : ''}
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
        setFamilyMemberDeleteConfirmVisible(false);
        setSelectedFamilyMember(null);
      }
    };
    
    const familyMemberActionSheetOptions = selectedFamilyMember
      ? [
          {
            label: t('profile.familyActionSheet.edit'),
            icon: 'edit' as const,
            onPress: handleEditFamilyMember,
          },
          {
            label: t('profile.familyActionSheet.delete'),
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
          <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            {t('spheres.family')}
          </ThemedText>
          {hasAnyFamilyMemory ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.replace({ pathname: '/(tabs)' })}
              activeOpacity={0.7}
            >
              <ThemedText style={{ 
                color: colorScheme === 'dark' 
                  ? colors.textHighEmphasis || '#FFFFFF' 
                  : '#11181C', 
                fontSize: 14 
              }}>
                {t('common.done')}
              </ThemedText>
            </TouchableOpacity>
          ) : familyMembersList.length > 0 ? (
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

        {familyMembers.length === 0 ? (
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
                {t('profile.familyEmptyState.title')}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t('profile.familyEmptyState.description')}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push('/add-family-member')}
            >
              <ThemedText weight="bold" letterSpacing="l" style={styles.buttonText}>
                {t('profile.familyEmptyState.button')}
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
                        contentFit="cover"
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
                      <ThemedText size="l" weight="bold">
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
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity('family')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={24 * fontScale} color="#ffffff" />
              </TouchableOpacity>
            </View>
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
          title={t('profile.familyDelete.confirm')}
          message={selectedFamilyMember ? t('profile.familyDelete.confirm.message.withName').replace('{name}', selectedFamilyMember.name) : ''}
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

  if (selectedSphere === 'friends') {
    const handleFriendMorePress = (friend: Friend) => {
      setSelectedFriend(friend);
      setFriendActionSheetVisible(true);
    };
    
    const handleEditFriend = () => {
      if (selectedFriend) {
        router.push({
          pathname: '/edit-friend',
          params: { friendId: selectedFriend.id },
        });
        setFriendActionSheetVisible(false);
        setSelectedFriend(null);
      }
    };
    
    const handleFriendDeletePress = () => {
      setFriendActionSheetVisible(false);
      setFriendDeleteConfirmVisible(true);
    };
    
    const handleFriendDeleteConfirm = async () => {
      if (selectedFriend) {
        try {
          await deleteFriend(selectedFriend.id);
          setFriendDeleteConfirmVisible(false);
          setSelectedFriend(null);
        } catch (error) {
          setFriendDeleteConfirmVisible(false);
          setSelectedFriend(null);
        }
      }
    };
    
    const friendActionSheetOptions = selectedFriend
      ? [
          {
            label: t('profile.friendActionSheet.edit'),
            icon: 'edit' as const,
            onPress: handleEditFriend,
          },
          {
            label: t('profile.friendActionSheet.delete'),
            icon: 'delete' as const,
            onPress: handleFriendDeletePress,
            destructive: true,
          },
        ]
      : [];

    const friendsList = selectedSphere === 'friends' ? friends : [];
    const hasAnyFriendMemory = useMemo(() => {
      return friendsList.some(friend => {
        const memories = getIdealizedMemoriesByEntityId(friend.id, 'friends');
        return memories.length > 0;
      });
    }, [friendsList, getIdealizedMemoriesByEntityId]);

    return (
      <TabScreenContainer>
        <View style={styles.header}>
          <Pressable
            onPress={() => setSelectedSphere(null)}
            style={styles.headerButton}
          >
            <MaterialIcons name="arrow-back" size={24 * fontScale} color={colors.text} />
          </Pressable>
          <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            {t('spheres.friends')}
          </ThemedText>
          {hasAnyFriendMemory ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.replace({ pathname: '/(tabs)' })}
              activeOpacity={0.7}
            >
              <ThemedText style={{ 
                color: colorScheme === 'dark' 
                  ? colors.textHighEmphasis || '#FFFFFF' 
                  : '#11181C', 
                fontSize: 14 
              }}>
                {t('common.done')}
              </ThemedText>
            </TouchableOpacity>
          ) : friendsList.length > 0 ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/add-friend')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24 * fontScale} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {friends.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="people"
                size={100 * fontScale * iconScale}
                color={colorScheme === 'dark' ? colors.primaryLight : colors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.heading}>
                {t('profile.friendEmptyState.title')}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t('profile.friendEmptyState.description')}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push('/add-friend')}
            >
              <ThemedText weight="bold" letterSpacing="l" style={styles.buttonText}>
                {t('profile.friendEmptyState.button')}
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
                {friendsList.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.entityCard}
                    onPress={() => handleFriendMorePress(friend)}
                    activeOpacity={0.7}
                  >
                    {friend.imageUri ? (
                      <Image
                        source={{ uri: friend.imageUri }}
                        style={styles.entityImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.entityImage, { alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons
                          name="people"
                          size={24 * fontScale}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    <View style={styles.entityInfo}>
                      <ThemedText size="l" weight="bold">
                        {friend.name}
                      </ThemedText>
                      {friend.description && (
                        <ThemedText size="xs" style={{ opacity: 0.6 }} numberOfLines={1}>
                          {friend.description}
                        </ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleFriendMorePress(friend)}
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
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity('friends')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={24 * fontScale} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <ActionSheet
          visible={friendActionSheetVisible}
          title={selectedFriend ? `${selectedFriend.name}` : ''}
          options={friendActionSheetOptions}
          onCancel={() => {
            setFriendActionSheetVisible(false);
            setSelectedFriend(null);
          }}
        />

        <ConfirmationModal
          visible={friendDeleteConfirmVisible && !!selectedFriend}
          title={t('profile.friendDelete.confirm')}
          message={selectedFriend ? t('profile.friendDelete.confirm.message.withName').replace('{name}', selectedFriend.name) : ''}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleFriendDeleteConfirm}
          onCancel={() => {
            setFriendDeleteConfirmVisible(false);
            setFriendActionSheetVisible(false);
            setSelectedFriend(null);
          }}
          destructive
        />
      </TabScreenContainer>
    );
  }

  if (selectedSphere === 'hobbies') {
    const handleHobbyMorePress = (hobby: Hobby) => {
      setSelectedHobby(hobby);
      setHobbyActionSheetVisible(true);
    };
    
    const handleEditHobby = () => {
      if (selectedHobby) {
        router.push({
          pathname: '/edit-hobby',
          params: { hobbyId: selectedHobby.id },
        });
        setHobbyActionSheetVisible(false);
        setSelectedHobby(null);
      }
    };
    
    const handleHobbyDeletePress = () => {
      setHobbyActionSheetVisible(false);
      setHobbyDeleteConfirmVisible(true);
    };
    
    const handleHobbyDeleteConfirm = async () => {
      if (selectedHobby) {
        try {
          await deleteHobby(selectedHobby.id);
          setHobbyDeleteConfirmVisible(false);
          setSelectedHobby(null);
        } catch (error) {
          setHobbyDeleteConfirmVisible(false);
          setSelectedHobby(null);
        }
      }
    };
    
    const hobbyActionSheetOptions = selectedHobby
      ? [
          {
            label: t('profile.hobbyActionSheet.edit'),
            icon: 'edit' as const,
            onPress: handleEditHobby,
          },
          {
            label: t('profile.hobbyActionSheet.delete'),
            icon: 'delete' as const,
            onPress: handleHobbyDeletePress,
            destructive: true,
          },
        ]
      : [];

    const hobbiesList = selectedSphere === 'hobbies' ? hobbies : [];
    const hasAnyHobbyMemory = useMemo(() => {
      return hobbiesList.some(hobby => {
        const memories = getIdealizedMemoriesByEntityId(hobby.id, 'hobbies');
        return memories.length > 0;
      });
    }, [hobbiesList, getIdealizedMemoriesByEntityId]);

    return (
      <TabScreenContainer>
        <View style={styles.header}>
          <Pressable
            onPress={() => setSelectedSphere(null)}
            style={styles.headerButton}
          >
            <MaterialIcons name="arrow-back" size={24 * fontScale} color={colors.text} />
          </Pressable>
          <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.headerTitle}>
            {t('spheres.hobbies')}
          </ThemedText>
          {hasAnyHobbyMemory ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.replace({ pathname: '/(tabs)' })}
              activeOpacity={0.7}
            >
              <ThemedText style={{ 
                color: colorScheme === 'dark' 
                  ? colors.textHighEmphasis || '#FFFFFF' 
                  : '#11181C', 
                fontSize: 14 
              }}>
                {t('common.done')}
              </ThemedText>
            </TouchableOpacity>
          ) : hobbiesList.length > 0 ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/add-hobby')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24 * fontScale} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {hobbies.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="sports-esports"
                size={100 * fontScale * iconScale}
                color={colorScheme === 'dark' ? colors.primaryLight : colors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.heading}>
                {t('profile.hobbyEmptyState.title')}
              </ThemedText>
              <ThemedText size="sm" weight="normal" style={styles.description}>
                {t('profile.hobbyEmptyState.description')}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => router.push('/add-hobby')}
            >
              <ThemedText weight="bold" letterSpacing="l" style={styles.buttonText}>
                {t('profile.hobbyEmptyState.button')}
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
                {hobbiesList.map((hobby) => (
                  <TouchableOpacity
                    key={hobby.id}
                    style={styles.entityCard}
                    onPress={() => handleHobbyMorePress(hobby)}
                    activeOpacity={0.7}
                  >
                    {hobby.imageUri ? (
                      <Image
                        source={{ uri: hobby.imageUri }}
                        style={styles.entityImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.entityImage, { alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons
                          name="sports-esports"
                          size={24 * fontScale}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    <View style={styles.entityInfo}>
                      <ThemedText size="l" weight="bold">
                        {hobby.name}
                      </ThemedText>
                      {hobby.description && (
                        <ThemedText size="xs" style={{ opacity: 0.6 }} numberOfLines={1}>
                          {hobby.description}
                        </ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleHobbyMorePress(hobby)}
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
            <View style={styles.fabContainer}>
              <TouchableOpacity
                style={styles.fabButton}
                onPress={() => handleAddEntity('hobbies')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={24 * fontScale} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <ActionSheet
          visible={hobbyActionSheetVisible}
          title={selectedHobby ? `${selectedHobby.name}` : ''}
          options={hobbyActionSheetOptions}
          onCancel={() => {
            setHobbyActionSheetVisible(false);
            setSelectedHobby(null);
          }}
        />

        <ConfirmationModal
          visible={hobbyDeleteConfirmVisible && !!selectedHobby}
          title={t('profile.hobbyDelete.confirm')}
          message={selectedHobby ? t('profile.hobbyDelete.confirm.message.withName').replace('{name}', selectedHobby.name) : ''}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleHobbyDeleteConfirm}
          onCancel={() => {
            setHobbyDeleteConfirmVisible(false);
            setHobbyActionSheetVisible(false);
            setSelectedHobby(null);
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
          {t('spheres.title')}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <View 
        style={styles.content}
      >
        {/* Sphere Selection Grid - only show when no sphere is selected */}
        {!selectedSphere && (
          <View style={styles.mainContentWrapper}>
            <View style={styles.mainContentContainer}>
              <View style={styles.sphereGrid}>
                {spheres.map((sphere) => {
                  // Get sphere-specific colors - theme-aware for proper contrast
                  // Light mode: Use darker, more saturated colors for contrast against light grey backgrounds
                  // Dark mode: Use desaturated colors for reduced eye strain and better readability
                  const getSphereColor = (sphereType: LifeSphere): string => {
                    if (colorScheme === 'light') {
                      // Light mode: Use darker, more saturated colors for better contrast
                      // Following Material Design principles for light surfaces
                      switch (sphereType) {
                        case 'relationships':
                          return '#D32F2F'; // Darker red for better contrast
                        case 'career':
                          return '#1976D2'; // Darker blue for better contrast
                        case 'family':
                          return '#388E3C'; // Darker green for better contrast
                        case 'friends':
                          return '#7B1FA2'; // Darker purple for better contrast
                        case 'hobbies':
                          return '#F57C00'; // Darker orange for better contrast
                        default:
                          return '#1976D2'; // Default to darker blue
                      }
                    } else {
                      // Dark mode: Use desaturated colors (Material Design 300 palette)
                      // These work well against dark backgrounds and reduce eye strain
                      switch (sphereType) {
                        case 'relationships':
                          return '#E57373'; // Desaturated red
                        case 'career':
                          return '#64B5F6'; // Desaturated blue
                        case 'family':
                          return '#81C784'; // Desaturated green
                        case 'friends':
                          return '#BA68C8'; // Desaturated purple
                        case 'hobbies':
                          return '#FFB74D'; // Desaturated orange
                        default:
                          return '#64B5F6'; // Default to desaturated blue
                      }
                    }
                  };
                  
                  const sphereColor = getSphereColor(sphere.type);
                  const isActive = expandedSphere === sphere.type;
                  
                  // Very subtle gradient colors for dark mode (from slightly darker to slightly lighter blue-grey)
                  const darkGradientColors = ['#223041', '#243041', '#263041'] as const;
                  // Very subtle grey gradient for light mode (darker for better contrast with darker icon colors)
                  const lightGradientColors = ['rgb(170, 170, 170)', 'rgb(180, 180, 180)', 'rgb(175, 175, 175)'] as const;
                  
                  // Active state gradient (slightly brighter)
                  const darkActiveGradientColors = ['#2D3A4F', '#2F3A4F', '#313A4F'] as const;
                  const lightActiveGradientColors = ['rgb(190, 190, 190)', 'rgb(200, 200, 200)', 'rgb(195, 195, 195)'] as const;
                  
                  return (
                    <TouchableOpacity
                      key={sphere.type}
                      style={[styles.sphereCard, isActive && styles.sphereCardActive]}
                      onPress={() => handleSpherePress(sphere.type)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={
                          colorScheme === 'dark'
                            ? (isActive ? darkActiveGradientColors : darkGradientColors)
                            : (isActive ? lightActiveGradientColors : lightGradientColors)
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.sphereCardContent}
                      >
                        <MaterialIcons
                          name={sphere.icon as any}
                          size={32 * fontScale * iconScale}
                          color={sphereColor}
                          style={styles.sphereIcon}
                        />
                        <ThemedText size="xs" weight="bold" style={styles.sphereLabel}>
                          {sphere.label}
                        </ThemedText>
                        <ThemedText size="xs" style={styles.sphereCount}>
                          {sphere.entities.length} {sphere.entities.length === 1 ? t('spheres.item') : t('spheres.items')}
                        </ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Premium Insights Button */}
            <TouchableOpacity
              style={styles.insightsButtonContainer}
              onPress={() => {
                if (!isSubscribed) {
                  router.push('/paywall');
                } else {
                  router.push('/insights');
                }
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={
                  colorScheme === 'dark'
                    ? ['#BA68C8', '#9575CD', '#64B5F6', '#4DB6AC'] // Desaturated purple-to-blue gradient
                    : ['#a78bfa', '#818cf8', '#60a5fa', '#38bdf8']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.insightsButtonGradient}
              >
                <View style={styles.insightsButtonContent}>
                  <View style={styles.insightsIconContainer}>
                    <MaterialIcons name="insights" size={28 * fontScale} color="#ffffff" />
                    <MaterialIcons
                      name="auto-awesome"
                      size={14 * fontScale}
                      color="#FFD700"
                      style={styles.sparkleIcon}
                    />
                  </View>
                  <View style={styles.insightsTextContainer}>
                    <ThemedText size="sm" weight="bold" style={styles.insightsButtonTitle}>
                      {t('insights.wheelOfLife.title')}
                    </ThemedText>
                    <ThemedText size="xs" style={styles.insightsButtonSubtitle}>
                      {t('insights.wheelOfLife.subtitle')}
                    </ThemedText>
                  </View>
                  <MaterialIcons name="arrow-forward" size={20 * fontScale} color="#ffffff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Walkthrough Modal */}
      <WalkthroughModal
        visible={walkthroughVisible}
        onDismiss={handleWalkthroughDismiss}
      />
    </TabScreenContainer>
  );
}

