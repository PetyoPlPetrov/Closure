import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale, useIconScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { JobCard } from '@/library/components/job-card';
import { ProfileCard } from '@/library/components/profile-card';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { WalkthroughModal } from '@/library/components/walkthrough-modal';
import type { ExProfile, FamilyMember, Friend, Hobby, Job, LifeSphere } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import { ENABLE_REVENUECAT } from '@/utils/revenuecat-wrapper';
import { onSpheresTabPress } from '@/utils/spheres-tab-press';
import { useSplash } from '@/utils/SplashAnimationProvider';
import { useSubscription } from '@/utils/SubscriptionProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Sparkled Dots Component - animated glowing dots (copied from index.tsx)
const SparkledDots = React.memo(function SparkledDots({
  avatarSize,
  avatarCenterX,
  avatarCenterY,
  colorScheme,
}: {
  avatarSize: number;
  avatarCenterX: number;
  avatarCenterY: number;
  colorScheme: 'light' | 'dark';
}) {
  const { isTablet } = useLargeDevice();
  
  // Generate random positions for dots around the avatar
  // Create more dots with better visibility
  const dots = React.useMemo(() => {
    const numDots = isTablet ? 35 : 25; // Increased from 18/12 to 35/25 for more density
    const minRadius = avatarSize / 2 + 20; // Start closer to avatar
    const maxRadius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.42; // Extend to near sphere positions
    
    return Array.from({ length: numDots }, (_, i) => {
      // Random angle and radius for scattered effect
      const angle = Math.random() * 2 * Math.PI;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const x = avatarCenterX + Math.cos(angle) * radius;
      const y = avatarCenterY + Math.sin(angle) * radius;
      
      // Medium size range for better visibility (2-4px)
      const size = 2 + Math.random() * 2;
      
      // Random delay for staggered animation
      const delay = Math.random() * 2000;
      
      // Random animation duration (2.5-4 seconds)
      const duration = 2500 + Math.random() * 1500;
      
      return { x, y, size, delay, duration, id: i };
    });
  }, [avatarSize, avatarCenterX, avatarCenterY, isTablet]);
  
  return (
    <>
      {dots.map((dot) => (
        <SparkledDot
          key={dot.id}
          x={dot.x}
          y={dot.y}
          size={dot.size}
          delay={dot.delay}
          duration={dot.duration}
          colorScheme={colorScheme}
        />
      ))}
    </>
  );
});

// Individual Sparkled Dot Component
const SparkledDot = React.memo(function SparkledDot({
  x,
  y,
  size,
  delay,
  duration,
  colorScheme,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  colorScheme: 'light' | 'dark';
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);
  
  React.useEffect(() => {
    // Scale up animation
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 })
    );
    
    // Fade in first, then start pulsing with better visibility
    opacity.value = withDelay(
      delay,
      withTiming(0.7, { 
        duration: 600, 
        easing: Easing.out(Easing.ease) 
      }, (finished) => {
        if (finished) {
          // After fade in completes, start pulsing (between 0.4 and 0.7 for better visibility)
          opacity.value = withRepeat(
            withTiming(0.4, { duration, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
          );
        }
      })
    );
  }, [delay, duration, opacity, scale]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  
  // More visible glow color based on theme
  const glowColor = colorScheme === 'dark' 
    ? 'rgba(255, 255, 255, 0.65)' // Increased from 0.4 to 0.65
    : 'rgba(255, 215, 0, 0.55)'; // Increased from 0.3 to 0.55
  
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: glowColor,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8, // Increased from 0.6
          shadowRadius: size * 2, // Increased from size * 1.5
          elevation: 6, // Increased from 4
        },
        animatedStyle,
      ]}
    />
  );
});

export default function SpheresScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const iconScale = useIconScale();
  const { maxContentWidth, isLargeDevice } = useLargeDevice();
  const { profiles, jobs, familyMembers, friends, hobbies, isLoading, getEntitiesBySphere, getOverallSunnyPercentage, deleteProfile, deleteJob, deleteFamilyMember, deleteFriend, deleteHobby, reloadIdealizedMemories, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId, idealizedMemories } = useJourney();
  const { isSubscribed, presentPaywallIfNeeded, offerings } = useSubscription();
  const { isAnimationComplete, isVisible: isSplashVisible } = useSplash();
  const t = useTranslate();
  
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);
  const containerRef = useRef<View>(null);
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number; x: number; y: number } | null>(null);
  
  // Pulse animation for Insights button
  const pulseScale = useSharedValue(1);
  
  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.25, { // Increased from 1.12 to 1.25 to compensate for smaller base size
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      true // Reverse animation
    );
  }, [pulseScale]);
  
  const pulseAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

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
  const [expandedSphere, setExpandedSphere] = useState<LifeSphere | null>(null);
  
  // Use a ref to always get the current selectedSphere value in the callback
  const selectedSphereRef = React.useRef<LifeSphere | null>(null);
  
  // Keep ref in sync with state
  React.useEffect(() => {
    selectedSphereRef.current = selectedSphere;
  }, [selectedSphere]);
  
  // Listen for spheres tab press events - only when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Listen for tab press events
      const unsubscribe = onSpheresTabPress(() => {
        const currentSelectedSphere = selectedSphereRef.current;
        
        // Check if there's a selected sphere - if so, clear it to return to main view
        if (currentSelectedSphere) {
          setSelectedSphere(null);
        }
      });
      
      return () => {
        unsubscribe();
      };
    }, []) // Empty deps - we use ref for current value
  );

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
      paddingTop: 20 * fontScale,
      paddingBottom: 8 * fontScale,
      marginTop: 70,
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
      paddingHorizontal: 12 * fontScale,
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
      position: 'relative',
    },
    mainContentContainer: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      flexShrink: 1,
    },
    sphereGrid: {
      width: '100%',
      height: '100%',
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sphereCardPositioned: {
      position: 'absolute',
    },
    sphereCard: {
      width: (Dimensions.get('window').width - 48 * fontScale - 32 * fontScale) / 2, // Screen width minus padding and gap, divided by 2
      minWidth: 100 * fontScale,
      maxWidth: 140 * fontScale,
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
      marginTop: 0,
      borderRadius: 16 * fontScale,
      overflow: 'hidden',
      shadowColor: '#8b5cf6',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
      width: (Dimensions.get('window').width - 48 * fontScale - 32 * fontScale) / 2, // Match sphere card width
      minWidth: 100 * fontScale,
      maxWidth: 180 * fontScale,
      flexShrink: 0,
    },
    insightsButtonContainerCentered: {
      position: 'absolute',
      borderRadius: 24 * fontScale, // Circular - reduced from 30
      width: 48 * fontScale, // Reduced from 60
      height: 48 * fontScale, // Reduced from 60
      zIndex: 10,
      // Shadow/elevation effect
      shadowColor: '#8b5cf6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 12,
      // Border for additional visual depth
      borderWidth: 3,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    insightsButtonGradientCircular: {
      width: '100%',
      height: '100%',
      borderRadius: 24 * fontScale, // Reduced from 30 to match container
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden', // Keep gradient circular
    },
    insightsIconContainerCircular: {
      position: 'relative',
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: 'transparent', // Ensure transparent so gradient shows through
    },
    listContentWrapper: {
      maxWidth: maxContentWidth as any,
      width: '100%',
      alignSelf: 'center',
      backgroundColor: 'transparent', // Ensure transparent so gradient shows through
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
      backgroundColor: 'transparent', // Ensure transparent so gradient shows through
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
      router.push({
        pathname: '/edit-profile',
      params: { profileId: profile.id },
    });
  };


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
  const friendsList = selectedSphere === 'friends' ? friends : [];
  const hobbiesList = selectedSphere === 'hobbies' ? hobbies : [];
  
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

  const hasAnyFriendMemory = useMemo(() => {
    return friendsList.some(friend => {
      const memories = getIdealizedMemoriesByEntityId(friend.id, 'friends');
      return memories.length > 0;
    });
  }, [friendsList, getIdealizedMemoriesByEntityId]);

  const hasAnyHobbyMemory = useMemo(() => {
    return hobbiesList.some(hobby => {
      const memories = getIdealizedMemoriesByEntityId(hobby.id, 'hobbies');
      return memories.length > 0;
    });
  }, [hobbiesList, getIdealizedMemoriesByEntityId]);

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
      router.push({
        pathname: '/edit-job',
      params: { jobId: job.id },
    });
  };
  

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
            <View style={styles.headerButton} />
        </View>

        {profiles.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: 'transparent' }}
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
              style={{ backgroundColor: 'transparent' }}
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
            <View style={styles.headerButton} />
        </View>

        {(!jobs || !Array.isArray(jobs) || jobs.length === 0) ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: 'transparent' }}
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
              style={{ backgroundColor: 'transparent' }}
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

      </TabScreenContainer>
    );
  }

  // Show family members view when family sphere is selected
  if (selectedSphere === 'family') {
    const handleFamilyMemberMorePress = (member: FamilyMember) => {
        router.push({
          pathname: '/edit-family-member',
        params: { memberId: member.id },
      });
    };
    

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
            <View style={styles.headerButton} />
        </View>

        {familyMembers.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: 'transparent' }}
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
              style={{ backgroundColor: 'transparent' }}
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

      </TabScreenContainer>
    );
  }

  if (selectedSphere === 'friends') {
    const handleFriendMorePress = (friend: Friend) => {
        router.push({
          pathname: '/edit-friend',
        params: { friendId: friend.id },
      });
    };
    


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
            <View style={styles.headerButton} />
        </View>

        {friends.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: 'transparent' }}
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
              style={{ backgroundColor: 'transparent' }}
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

      </TabScreenContainer>
    );
  }

  if (selectedSphere === 'hobbies') {
    const handleHobbyMorePress = (hobby: Hobby) => {
        router.push({
          pathname: '/edit-hobby',
        params: { hobbyId: hobby.id },
      });
    };
    


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
            <View style={styles.headerButton} />
        </View>

        {hobbies.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.content]}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: 'transparent' }}
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
              style={{ backgroundColor: 'transparent' }}
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
          <View 
            style={styles.mainContentWrapper}
            ref={containerRef}
            onLayout={(event) => {
              const { width, height, x, y } = event.nativeEvent.layout;
              setContainerLayout({ width, height, x, y });
            }}
          >
            <View style={styles.mainContentContainer}>
              {/* Calculate center point relative to container - this will be used for both Insights button and sphere cards */}
              {containerLayout && (() => {
                // Calculate center based on the actual visual space
                // The center should be in the middle of the circle formed by the boxes
                const centerX = containerLayout.width / 2;
                
                // Pre-calculate values used by both button and cards
                const radius = 140 * fontScale;
                const screenWidth = Dimensions.get('window').width;
                // Calculate card width with smaller max size
                const calculatedCardWidth = (screenWidth - 48 * fontScale - 32 * fontScale) / 2;
                const cardWidth = Math.min(calculatedCardWidth, 140 * fontScale);
                const cardHalfWidth = cardWidth / 2;
                const cardHalfHeight = cardWidth / 2; // Cards are square (aspectRatio: 1)
                
                // Calculate the visual center Y by finding the midpoint between topmost and bottommost cards
                // Top card is at angle 90° (top), bottom card is at angle -90° (bottom)
                // Card centers are at: centerY + radius * sin(angle)
                const topCardAngle = 90 * (Math.PI / 180);
                const bottomCardAngle = -90 * (Math.PI / 180);
                
                // Calculate where card centers would be (relative to container top)
                const containerCenterY = containerLayout.height / 2;
                const topCardCenterY = containerCenterY + radius * Math.sin(topCardAngle);
                const bottomCardCenterY = containerCenterY + radius * Math.sin(bottomCardAngle);
                
                // The visual center is the midpoint between the top and bottom card centers
                // This ensures the button is centered in the actual space between boxes
                const centerY = (topCardCenterY + bottomCardCenterY) / 2;
                
                // Offset to move button lower (add 30px to move it down)
                const buttonOffsetY = 22 * fontScale;
                const buttonCenterY = centerY + buttonOffsetY;
                
                return (
                  <>
                    {/* Sparkled Dots around center */}
                    <SparkledDots
                      avatarSize={48 * fontScale} // Size of the Insights button
                      avatarCenterX={centerX}
                      avatarCenterY={buttonCenterY}
                      colorScheme={colorScheme ?? 'dark'}
                    />
                    
                    {/* Insights button in the center - circular */}
                    <AnimatedView
                      style={[
                        styles.insightsButtonContainerCentered,
                        {
                          left: centerX - 24 * fontScale, // Center horizontally (button width is 48)
                          top: buttonCenterY - 24 * fontScale, // Center vertically (button height is 48)
                        },
                        pulseAnimatedStyle,
                      ]}
                    >
                      <TouchableOpacity
                        style={{ width: '100%', height: '100%' }}
                        onPress={async () => {
                          // If RevenueCat is disabled, go straight to insights
                          if (!ENABLE_REVENUECAT) {
                            router.push('/insights');
                            return;
                          }

                          // Otherwise, check entitlement via paywall
                          const hasAccess = await presentPaywallIfNeeded('Sfera Premium', offerings || undefined);
                          if (hasAccess) {
                            router.push('/insights');
                          }
                        }}
                        activeOpacity={0.9}
                      >
                        <LinearGradient
                        colors={
                          colorScheme === 'dark'
                            ? ['#E91E63', '#F06292', '#FF8A80', '#FF6B9D'] // Vibrant pink-to-coral gradient for better contrast
                            : ['#ec4899', '#f472b6', '#fb7185', '#fda4af']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.insightsButtonGradientCircular}
                      >
                        {/* Inner circle for better icon contrast */}
                        <View style={{
                          position: 'absolute',
                          width: '70%',
                          height: '70%',
                          borderRadius: 1000,
                          backgroundColor: 'rgba(0, 0, 0, 0.25)',
                          alignSelf: 'center',
                          top: '15%',
                        }} />
                        <View style={styles.insightsIconContainerCircular}>
                          <MaterialIcons name="insights" size={24 * fontScale} color="#ffffff" style={{ textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }} />
                          <MaterialIcons
                            name="auto-awesome"
                            size={12 * fontScale}
                            color="#FFD700"
                            style={styles.sparkleIcon}
                          />
                        </View>
                      </LinearGradient>
                      </TouchableOpacity>
                    </AnimatedView>

                    {/* Sphere boxes arranged in a circle around the Insights button */}
              <View style={styles.sphereGrid}>
                      {spheres.map((sphere, index) => {
                        // Calculate circular positions for 5 spheres
                        // Start from top (90 degrees) and distribute evenly (360/5 = 72 degrees apart)
                        let angle = (90 - (index * 72)) * (Math.PI / 180); // Convert to radians, start from top
                        
                        // Move hobbies and career boxes to middle position to overlap both upper and bottom boxes
                        // Career is index 1 (top-right at 18°), Hobbies is index 4 (bottom-left at -126°)
                        if (sphere.type === 'career') {
                          // Move career to middle-right position (around 0° to -20°)
                          // This positions it between top-right and bottom, overlapping both
                          angle = 10 * (Math.PI / 180); // Middle-right position
                        } else if (sphere.type === 'hobbies') {
                          // Move hobbies to middle-left position, slightly down (around 175°)
                          // This positions it between top-left and bottom, overlapping both
                          angle = 145 * (Math.PI / 155); // Middle-left position, slightly down
                        } else if (sphere.type === 'friends') {
                          // Move friends box up to top-left position
                          // Friends is at index 3, default angle would be (90 - 216) = -126° = 234° (bottom-left)
                          // To move to top-left, set to around 135° (top-left)
                          angle = 260 * (Math.PI / 200); // Position at top-left (135°)
                        } else if (sphere.type === 'family') {
                          // Move family box up (from default position)  
                          // Family is at index 2, default angle would be (90 - 144) = -54° = 306°
                          // To move up towards top (90°), we need to increase the angle
                          // Calculate default and then adjust
                          const defaultAngleDeg = 85 - (index * 65);
                          angle = (defaultAngleDeg - 25) * (Math.PI / 180); // Move up by 15 degrees
                        }
                        
                        // Position cards around the center point (same as Insights button)
                        // The center point is the center of the circle, so we position cards relative to that
                        const x = centerX + radius * Math.cos(angle) - cardHalfWidth; // Subtract half card width
                        const y = centerY + radius * Math.sin(angle) - cardHalfHeight; // Subtract half card height
                  
                  // Get sphere-specific colors - theme-aware for proper contrast
                  const getSphereColor = (sphereType: LifeSphere): string => {
                    if (colorScheme === 'light') {
                      switch (sphereType) {
                        case 'relationships':
                          return '#D32F2F';
                        case 'career':
                          return '#1976D2';
                        case 'family':
                          return '#388E3C';
                        case 'friends':
                          return '#7B1FA2';
                        case 'hobbies':
                          return '#F57C00';
                        default:
                          return '#1976D2';
                      }
                    } else {
                      switch (sphereType) {
                        case 'relationships':
                          return '#E57373';
                        case 'career':
                          return '#64B5F6';
                        case 'family':
                          return '#81C784';
                        case 'friends':
                          return '#BA68C8';
                        case 'hobbies':
                          return '#FFB74D';
                        default:
                          return '#64B5F6';
                      }
                    }
                  };
                  
                  const sphereColor = getSphereColor(sphere.type);
                  const isActive = expandedSphere === sphere.type;
                  
                  const darkGradientColors = ['#223041', '#243041', '#263041'] as const;
                  const lightGradientColors = ['rgb(170, 170, 170)', 'rgb(180, 180, 180)', 'rgb(175, 175, 175)'] as const;
                  const darkActiveGradientColors = ['#2D3A4F', '#2F3A4F', '#313A4F'] as const;
                  const lightActiveGradientColors = ['rgb(190, 190, 190)', 'rgb(200, 200, 200)', 'rgb(195, 195, 195)'] as const;
                  
                  return (
                    <TouchableOpacity
                      key={sphere.type}
                      style={[
                        styles.sphereCard,
                        styles.sphereCardPositioned,
                        isActive && styles.sphereCardActive,
                        {
                          left: x,
                          top: y,
                        },
                      ]}
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
                  </>
                );
              })()}
            </View>
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

