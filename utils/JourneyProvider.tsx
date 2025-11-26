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
  relationshipDuration?: string; // e.g., "2 years", "6 months"
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
 * Calculate setup progress based on completed steps
 * Step 1 (Reality Check): 33% total
 *   - Idealized Memories only: 16.5%
 *   - Emotional Debt Ledger only: 16.5%
 *   - Both completed: 33%
 * Step 2 (Processing & Accountability): 33% - processingAccountability.isCompleted must be true
 * Step 3 (Identity & Future Focus): 34% - identityFutureFocus.isCompleted must be true
 * Total: 100%
 */
export function calculateSetupProgress(profile: ExProfile): number {
  let progress = 0;
  
  // Step 1: Reality Check (33% total, split between two sections)
  const hasIdealizedMemories = profile.sections?.realityCheck?.idealizedMemories === true;
  const hasEmotionalDebtLedger = profile.sections?.realityCheck?.emotionalDebtLedger === true;
  
  if (hasIdealizedMemories && hasEmotionalDebtLedger) {
    // Both sections completed: full 33%
    progress += 33;
  } else if (hasIdealizedMemories || hasEmotionalDebtLedger) {
    // Only one section completed: half of 33% = 16.5%
    progress += 16.5;
  }
  
  // Step 2: Processing & Accountability (33%)
  if (profile.sections?.processingAccountability?.isCompleted === true) {
    progress += 33;
  }
  
  // Step 3: Identity & Future Focus (34% to make it 100%)
  if (profile.sections?.identityFutureFocus?.isCompleted === true) {
    progress += 34;
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
          // Recalculate setupProgress for all profiles on load
          const profilesWithUpdatedProgress = parsedProfiles.map((profile) => ({
            ...profile,
            setupProgress: calculateSetupProgress(profile),
            isCompleted: calculateSetupProgress(profile) === 100,
          }));
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
  addProfile: (profile: Omit<ExProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
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
        const updatedProfiles = [...profiles, newProfile];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
        setProfiles(updatedProfiles);
      } catch (error) {
        console.error('Error saving profile:', error);
        throw error;
      }
    },
    [profiles, setProfiles]
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
    async (profileData: Omit<ExProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newProfile: ExProfile = {
        ...profileData,
        id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      await saveProfile(newProfile);
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
          // Recalculate setupProgress based on completed steps
          updatedProfile.setupProgress = calculateSetupProgress(updatedProfile);
          // Update isCompleted if all steps are done
          updatedProfile.isCompleted = updatedProfile.setupProgress === 100;
          return updatedProfile;
        }
        return profile;
      });
      await updateProfilesInStorage(updatedProfiles);
    },
    [profiles, updateProfilesInStorage]
  );

  const saveIdealizedMemoriesToStorage = useCallback(
    async (memories: IdealizedMemory[]) => {
      try {
        await AsyncStorage.setItem(IDEALIZED_MEMORIES_KEY, JSON.stringify(memories));
        setIdealizedMemories(memories);
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
      const updatedMemories = [...idealizedMemories, newMemory];
      await saveIdealizedMemoriesToStorage(updatedMemories);

      // Update profile section completion
      const profile = profiles.find((p) => p.id === profileId);
      if (profile && (!profile.sections?.realityCheck?.idealizedMemories || updatedMemories.length === 1)) {
        await updateProfile(profileId, {
          sections: {
            ...profile.sections,
            realityCheck: {
              idealizedMemories: true,
              emotionalDebtLedger: profile.sections?.realityCheck?.emotionalDebtLedger || false,
            },
          },
        });
        // setupProgress will be recalculated in updateProfile
      }
    },
    [idealizedMemories, profiles, saveIdealizedMemoriesToStorage, updateProfile]
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
      const updatedMemories = idealizedMemories.filter((memory) => memory.id !== id);
      await saveIdealizedMemoriesToStorage(updatedMemories);
    },
    [idealizedMemories, saveIdealizedMemoriesToStorage]
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

