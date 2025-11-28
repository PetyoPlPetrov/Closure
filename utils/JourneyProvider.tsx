import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@closure:ex_profiles';
const IDEALIZED_MEMORIES_KEY = '@closure:idealized_memories';

export type SectionCompletion = {
  idealizedMemories: boolean;
  emotionalDebtLedger: boolean;
};

export type ProcessingAccountability = {
  isCompleted: boolean;
};

export type IdentityFutureFocus = {
  isCompleted: boolean;
};

export type ExProfile = {
  id: string;
  name: string;
  description?: string; // Short description (max 30 characters)
  relationshipDuration?: string; // e.g., "2 years", "6 months" (deprecated, use dates instead)
  relationshipStartDate?: string; // ISO date string
  relationshipEndDate?: string | null; // ISO date string or null for ongoing
  imageUri?: string; // Profile picture URI
  setupProgress: number; // 0-100
  isCompleted: boolean;
  sections?: {
    realityCheck?: SectionCompletion;
    processingAccountability?: ProcessingAccountability;
    identityFutureFocus?: IdentityFutureFocus;
  };
  createdAt: string;
  updatedAt: string;
};

export type IdealizedMemory = {
  id: string;
  profileId: string;
  title: string;
  description?: string;
  imageUri?: string;
  hardTruths: {
    id: string;
    text: string;
    x?: number; // Cloud position X
    y?: number; // Cloud position Y
  }[];
  goodFacts?: {
    id: string;
    text: string;
    x?: number; // Sun position X
    y?: number; // Sun position Y
  }[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Calculate setup progress based on personal info completion and memories
 * Personal Info: 50% total
 *   - Name (required): 33.33%
 *   - Description (optional): 33.33%
 *   - Image (optional): 33.34%
 * Memories: 50% total
 *   - At least 7 memories: 50%
 * Total: 100%
 */
export function calculateSetupProgress(
  profile: ExProfile,
  memoryCount: number
): number {
  let progress = 0;
  
  // Personal Info: 50% total
  const personalInfoProgress = 50;
  let personalInfoCompleted = 0;
  
  // Name is required (33.33% of personal info = 16.67% of total)
  if (profile.name && profile.name.trim().length > 0) {
    personalInfoCompleted += 33.33;
  }
  
  // Description is optional (33.33% of personal info = 16.67% of total)
  if (profile.description && profile.description.trim().length > 0) {
    personalInfoCompleted += 33.33;
  }
  
  // Image is optional (33.34% of personal info = 16.67% of total)
  if (profile.imageUri) {
    personalInfoCompleted += 33.34;
  }
  
  // Calculate personal info percentage (out of 50%)
  progress += (personalInfoProgress * personalInfoCompleted) / 100;
  
  // Memories: 50% total if at least 7 memories exist
  if (memoryCount >= 7) {
    progress += 50;
  } else {
    // Partial progress for memories (linear scale up to 7)
    progress += (50 * memoryCount) / 7;
  }
  
  return Math.round(Math.min(progress, 100));
}

/**
 * Custom hook to load profiles from AsyncStorage
 * Returns [profiles, isLoading, error]
 */
function useProfiles(): [ExProfile[], boolean, Error | null, (profiles: ExProfile[]) => void] {
  const [profiles, setProfiles] = useState<ExProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedProfiles = JSON.parse(stored) as ExProfile[];
          // Load memories first to calculate progress
          const storedMemories = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
          const parsedMemories = storedMemories ? JSON.parse(storedMemories) as IdealizedMemory[] : [];
          
          // Recalculate setupProgress for all profiles on load
          const profilesWithUpdatedProgress = parsedProfiles.map((profile) => {
            const memoryCount = parsedMemories.filter(m => m.profileId === profile.id).length;
            const progress = calculateSetupProgress(profile, memoryCount);
            return {
              ...profile,
              setupProgress: progress,
              isCompleted: progress === 100,
            };
          });
          setProfiles(profilesWithUpdatedProgress);
        } else {
          setProfiles([]);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load profiles');
        setError(error);
        console.error('Error loading profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, []);

  return [profiles, isLoading, error, setProfiles];
}

type JourneyContextType = {
  profiles: ExProfile[];
  isLoading: boolean;
  error: Error | null;
  addProfile: (profile: Omit<ExProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProfile: (id: string, updates: Partial<ExProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  getProfile: (id: string) => ExProfile | undefined;
  // Idealized Memories
  idealizedMemories: IdealizedMemory[];
  addIdealizedMemory: (
    profileId: string,
    memory: Omit<IdealizedMemory, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateIdealizedMemory: (id: string, updates: Partial<IdealizedMemory>) => Promise<void>;
  deleteIdealizedMemory: (id: string) => Promise<void>;
  getIdealizedMemoriesByProfileId: (profileId: string) => IdealizedMemory[];
};

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

interface JourneyProviderProps {
  children: ReactNode;
}

export function JourneyProvider({ children }: JourneyProviderProps) {
  const [profiles, isLoading, error, setProfiles] = useProfiles();
  const [idealizedMemories, setIdealizedMemories] = useState<IdealizedMemory[]>([]);

  // Load idealized memories on mount
  useEffect(() => {
    const loadIdealizedMemories = async () => {
      try {
        const stored = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
        if (stored) {
          const parsedMemories = JSON.parse(stored) as IdealizedMemory[];
          setIdealizedMemories(parsedMemories);
        }
      } catch (err) {
        console.error('Error loading idealized memories:', err);
      }
    };
    loadIdealizedMemories();
  }, []);

  const saveProfile = useCallback(
    async (newProfile: ExProfile) => {
      try {
        // Use functional update to avoid stale state issues when creating multiple profiles quickly
        let updatedProfiles: ExProfile[] = [];
        setProfiles((prevProfiles) => {
          updatedProfiles = [...prevProfiles, newProfile];
          return updatedProfiles;
        });
        
        // Save to storage after state update
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
        console.log('[JourneyProvider] Saved profile to storage:', newProfile.id, 'Total profiles:', updatedProfiles.length);
        
        // Also explicitly set state to ensure it's in sync
        setProfiles(updatedProfiles);
      } catch (error) {
        console.error('Error saving profile:', error);
        throw error;
      }
    },
    [setProfiles]
  );

  const updateProfilesInStorage = useCallback(
    async (updatedProfiles: ExProfile[]) => {
      try {
        console.log('[JourneyProvider] updateProfilesInStorage called with', updatedProfiles.length, 'profiles');
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
        console.log('[JourneyProvider] AsyncStorage updated');
        setProfiles(updatedProfiles);
        console.log('[JourneyProvider] setProfiles called, state should update');
      } catch (error) {
        console.error('[JourneyProvider] Error updating profiles:', error);
        throw error;
      }
    },
    [setProfiles]
  );

  const addProfile = useCallback(
    async (profileData: Omit<ExProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      const now = new Date().toISOString();
      const newProfile: ExProfile = {
        ...profileData,
        id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      // Calculate initial setup progress (0 memories for new profile)
      newProfile.setupProgress = calculateSetupProgress(newProfile, 0);
      newProfile.isCompleted = newProfile.setupProgress === 100;
      await saveProfile(newProfile);
      return newProfile.id;
    },
    [saveProfile]
  );

  const updateProfile = useCallback(
    async (id: string, updates: Partial<ExProfile>) => {
      const updatedProfiles = profiles.map((profile) => {
        if (profile.id === id) {
          const updatedProfile = {
            ...profile,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          // Recalculate setupProgress based on personal info and memories
          const memoryCount = idealizedMemories.filter(m => m.profileId === id).length;
          updatedProfile.setupProgress = calculateSetupProgress(updatedProfile, memoryCount);
          // Update isCompleted if profile is 100% complete
          updatedProfile.isCompleted = updatedProfile.setupProgress === 100;
          return updatedProfile;
        }
        return profile;
      });
      await updateProfilesInStorage(updatedProfiles);
    },
    [profiles, updateProfilesInStorage, idealizedMemories]
  );

  const saveIdealizedMemoriesToStorage = useCallback(
    async (memories: IdealizedMemory[]) => {
      try {
        await AsyncStorage.setItem(IDEALIZED_MEMORIES_KEY, JSON.stringify(memories));
        // Don't call setIdealizedMemories here - it's already set by the caller
      } catch (error) {
        console.error('Error saving idealized memories:', error);
        throw error;
      }
    },
    []
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      console.log('[JourneyProvider] deleteProfile called with id:', id);
      console.log('[JourneyProvider] Current profiles count:', profiles.length);
      console.log('[JourneyProvider] Current profile IDs:', profiles.map(p => p.id));
      
      const updatedProfiles = profiles.filter((profile) => profile.id !== id);
      
      if (updatedProfiles.length === profiles.length) {
        console.warn(`[JourneyProvider] Profile with id ${id} not found for deletion`);
        return;
      }
      
      // Delete all memories associated with this profile
      const updatedMemories = idealizedMemories.filter((memory) => memory.profileId !== id);
      await saveIdealizedMemoriesToStorage(updatedMemories);
      console.log('[JourneyProvider] Deleted memories associated with profile:', id);
      
      console.log('[JourneyProvider] Updated profiles count:', updatedProfiles.length);
      console.log('[JourneyProvider] Updated profile IDs:', updatedProfiles.map(p => p.id));
      
      await updateProfilesInStorage(updatedProfiles);
      
      console.log('[JourneyProvider] Profiles updated in storage and state');
    },
    [profiles, updateProfilesInStorage, idealizedMemories, saveIdealizedMemoriesToStorage]
  );

  const getProfile = useCallback(
    (id: string) => {
      return profiles.find((profile) => profile.id === id);
    },
    [profiles]
  );

  const addIdealizedMemory = useCallback(
    async (
      profileId: string,
      memoryData: Omit<IdealizedMemory, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
    ) => {
      const now = new Date().toISOString();
      const newMemory: IdealizedMemory = {
        ...memoryData,
        profileId,
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      
      // Use functional update to avoid stale state issues when creating multiple memories quickly
      let updatedMemories: IdealizedMemory[] = [];
      setIdealizedMemories((prevMemories) => {
        updatedMemories = [...prevMemories, newMemory];
        return updatedMemories;
      });
      
      // Save to storage after state update
      await saveIdealizedMemoriesToStorage(updatedMemories);
      console.log('[JourneyProvider] Saved memory to storage:', newMemory.id, 'for profile:', profileId, 'Total memories:', updatedMemories.length);
      
      // Also update the state immediately to ensure it's in sync
      setIdealizedMemories(updatedMemories);

      // Update profile setup progress based on new memory count
      // Use updatedMemories instead of idealizedMemories state to avoid stale data
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        const memoryCount = updatedMemories.filter(m => m.profileId === profileId).length;
        const updatedProfile = {
          ...profile,
          updatedAt: new Date().toISOString(),
        };
        updatedProfile.setupProgress = calculateSetupProgress(updatedProfile, memoryCount);
        updatedProfile.isCompleted = updatedProfile.setupProgress === 100;
        
        // Update profile in storage
        const updatedProfiles = profiles.map((p) => {
          if (p.id === profileId) {
            return updatedProfile;
          }
          return p;
        });
        await updateProfilesInStorage(updatedProfiles);
        console.log('[JourneyProvider] Updated profile progress:', profileId, 'Progress:', updatedProfile.setupProgress, 'Memories:', memoryCount);
      }
    },
    [profiles, saveIdealizedMemoriesToStorage, updateProfilesInStorage]
  );

  const updateIdealizedMemory = useCallback(
    async (id: string, updates: Partial<IdealizedMemory>) => {
      const updatedMemories = idealizedMemories.map((memory) => {
        if (memory.id === id) {
          return {
            ...memory,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return memory;
      });
      await saveIdealizedMemoriesToStorage(updatedMemories);
    },
    [idealizedMemories, saveIdealizedMemoriesToStorage]
  );

  const deleteIdealizedMemory = useCallback(
    async (id: string) => {
      const memoryToDelete = idealizedMemories.find(m => m.id === id);
      const updatedMemories = idealizedMemories.filter((memory) => memory.id !== id);
      await saveIdealizedMemoriesToStorage(updatedMemories);
      
      // Update profile setup progress if memory was deleted
      if (memoryToDelete) {
        const profile = profiles.find((p) => p.id === memoryToDelete.profileId);
        if (profile) {
          const memoryCount = updatedMemories.filter(m => m.profileId === memoryToDelete.profileId).length;
          await updateProfile(memoryToDelete.profileId, {
            // setupProgress will be recalculated in updateProfile with new memory count
          });
        }
      }
    },
    [idealizedMemories, profiles, saveIdealizedMemoriesToStorage, updateProfile]
  );

  const getIdealizedMemoriesByProfileId = useCallback(
    (profileId: string) => {
      return idealizedMemories.filter((memory) => memory.profileId === profileId);
    },
    [idealizedMemories]
  );

  const value: JourneyContextType = {
    profiles,
    isLoading,
    error,
    addProfile,
    updateProfile,
    deleteProfile,
    getProfile,
    idealizedMemories,
    addIdealizedMemory,
    updateIdealizedMemory,
    deleteIdealizedMemory,
    getIdealizedMemoriesByProfileId,
  };

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (context === undefined) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
}

