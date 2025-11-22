import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@closure:ex_profiles';

export type SectionCompletion = {
  idealizedMemories: boolean;
  emotionalDebtLedger: boolean;
};

export type ExProfile = {
  id: string;
  name: string;
  relationshipDuration?: string; // e.g., "2 years", "6 months"
  setupProgress: number; // 0-100
  isCompleted: boolean;
  sections?: {
    realityCheck?: SectionCompletion;
    // Add other phase sections here
  };
  createdAt: string;
  updatedAt: string;
};

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
          setProfiles(parsedProfiles);
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
};

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

interface JourneyProviderProps {
  children: ReactNode;
}

export function JourneyProvider({ children }: JourneyProviderProps) {
  const [profiles, isLoading, error, setProfiles] = useProfiles();

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
          return {
            ...profile,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return profile;
      });
      await updateProfilesInStorage(updatedProfiles);
    },
    [profiles, updateProfilesInStorage]
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
      
      console.log('[JourneyProvider] Updated profiles count:', updatedProfiles.length);
      console.log('[JourneyProvider] Updated profile IDs:', updatedProfiles.map(p => p.id));
      
      await updateProfilesInStorage(updatedProfiles);
      
      console.log('[JourneyProvider] Profiles updated in storage and state');
    },
    [profiles, updateProfilesInStorage]
  );

  const getProfile = useCallback(
    (id: string) => {
      return profiles.find((profile) => profile.id === id);
    },
    [profiles]
  );

  const value: JourneyContextType = {
    profiles,
    isLoading,
    error,
    addProfile,
    updateProfile,
    deleteProfile,
    getProfile,
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

