import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@sferas:ex_profiles';
const IDEALIZED_MEMORIES_KEY = '@sferas:idealized_memories';
const JOBS_STORAGE_KEY = '@sferas:jobs';
const FAMILY_MEMBERS_STORAGE_KEY = '@sferas:family_members';
const FRIENDS_STORAGE_KEY = '@sferas:friends';
const HOBBIES_STORAGE_KEY = '@sferas:hobbies';

// Life sphere types
export type LifeSphere = 'relationships' | 'career' | 'family' | 'friends' | 'hobbies';

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

// Base entity interface - shared properties across all sphere types
export interface BaseEntity {
  id: string;
  name: string;
  description?: string;
  imageUri?: string;
  sphere: LifeSphere;
  setupProgress: number; // 0-100
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Relationship Profile (ExProfile) - maintains backward compatibility
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
  sphere?: LifeSphere; // Optional for backward compatibility, defaults to 'relationships'
  sections?: {
    realityCheck?: SectionCompletion;
    processingAccountability?: ProcessingAccountability;
    identityFutureFocus?: IdentityFutureFocus;
  };
  createdAt: string;
  updatedAt: string;
};

// Job entity for career sphere
export type Job = {
  id: string;
  name: string; // Job title/company name
  description?: string;
  startDate?: string; // ISO date string
  endDate?: string | null; // ISO date string or null for current job
  imageUri?: string; // Company logo or job image
  setupProgress: number; // 0-100
  isCompleted: boolean;
  sphere: LifeSphere; // Always 'career'
  createdAt: string;
  updatedAt: string;
};

// Family member entity for family sphere
export type FamilyMember = {
  id: string;
  name: string;
  description?: string;
  relationship?: string; // e.g., "Mother", "Brother", "Cousin"
  imageUri?: string;
  setupProgress: number; // 0-100
  isCompleted: boolean;
  sphere: LifeSphere; // Always 'family'
  createdAt: string;
  updatedAt: string;
};

// Friend entity for friends sphere
export type Friend = {
  id: string;
  name: string;
  description?: string;
  imageUri?: string;
  setupProgress: number; // 0-100
  isCompleted: boolean;
  sphere: LifeSphere; // Always 'friends'
  createdAt: string;
  updatedAt: string;
};

// Hobby entity for hobbies sphere
export type Hobby = {
  id: string;
  name: string;
  description?: string;
  imageUri?: string;
  setupProgress: number; // 0-100
  isCompleted: boolean;
  sphere: LifeSphere; // Always 'hobbies'
  createdAt: string;
  updatedAt: string;
};

export type IdealizedMemory = {
  id: string;
  entityId: string; // Changed from profileId to entityId to support all sphere types
  profileId?: string; // Deprecated but kept for backward compatibility
  sphere: LifeSphere; // Which sphere this memory belongs to
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
  entity: { name?: string; description?: string; imageUri?: string },
  memoryCount: number
): number {
  let progress = 0;
  
  // Personal Info: 50% total
  const personalInfoProgress = 50;
  let personalInfoCompleted = 0;
  
  // Name is required (33.33% of personal info = 16.67% of total)
  if (entity.name && entity.name.trim().length > 0) {
    personalInfoCompleted += 33.33;
  }
  
  // Description is optional (33.33% of personal info = 16.67% of total)
  if (entity.description && entity.description.trim().length > 0) {
    personalInfoCompleted += 33.33;
  }
  
  // Image is optional (33.34% of personal info = 16.67% of total)
  if (entity.imageUri) {
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
          
          // Recalculate setupProgress for all profiles on load and ensure sphere is set
          const profilesWithUpdatedProgress = parsedProfiles.map((profile) => {
            const memoryCount = parsedMemories.filter(m => 
              (m.profileId === profile.id) || (m.entityId === profile.id && m.sphere === 'relationships')
            ).length;
            const progress = calculateSetupProgress(profile, memoryCount);
            return {
              ...profile,
              sphere: profile.sphere || 'relationships', // Set default sphere for backward compatibility
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
  // Relationships (backward compatible)
  profiles: ExProfile[];
  isLoading: boolean;
  error: Error | null;
  addProfile: (profile: Omit<ExProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProfile: (id: string, updates: Partial<ExProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  getProfile: (id: string) => ExProfile | undefined;
  
  // Career sphere
  jobs: Job[];
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'sphere'>) => Promise<string>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  getJob: (id: string) => Job | undefined;
  
  // Family sphere
  familyMembers: FamilyMember[];
  addFamilyMember: (member: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt' | 'sphere'>) => Promise<string>;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => Promise<void>;
  deleteFamilyMember: (id: string) => Promise<void>;
  getFamilyMember: (id: string) => FamilyMember | undefined;
  
  // Friends sphere
  friends: Friend[];
  addFriend: (friend: Omit<Friend, 'id' | 'createdAt' | 'updatedAt' | 'sphere'>) => Promise<string>;
  updateFriend: (id: string, updates: Partial<Friend>) => Promise<void>;
  deleteFriend: (id: string) => Promise<void>;
  getFriend: (id: string) => Friend | undefined;
  
  // Hobbies sphere
  hobbies: Hobby[];
  addHobby: (hobby: Omit<Hobby, 'id' | 'createdAt' | 'updatedAt' | 'sphere'>) => Promise<string>;
  updateHobby: (id: string, updates: Partial<Hobby>) => Promise<void>;
  deleteHobby: (id: string) => Promise<void>;
  getHobby: (id: string) => Hobby | undefined;
  
  // Idealized Memories (supports all spheres)
  idealizedMemories: IdealizedMemory[];
  addIdealizedMemory: (
    entityIdOrProfileId: string,
    sphereOrMemoryData: LifeSphere | Omit<IdealizedMemory, 'id' | 'entityId' | 'profileId' | 'sphere' | 'createdAt' | 'updatedAt'>,
    memoryData?: Omit<IdealizedMemory, 'id' | 'entityId' | 'profileId' | 'sphere' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateIdealizedMemory: (id: string, updates: Partial<IdealizedMemory>) => Promise<void>;
  deleteIdealizedMemory: (id: string) => Promise<void>;
  getIdealizedMemoriesByEntityId: (entityId: string, sphere: LifeSphere) => IdealizedMemory[];
  getIdealizedMemoriesByProfileId: (profileId: string) => IdealizedMemory[]; // Deprecated but kept for backward compatibility
  
  // Helper functions
  getEntitiesBySphere: (sphere: LifeSphere) => (ExProfile | Job | FamilyMember | Friend | Hobby)[];
  getOverallSunnyPercentage: () => number; // Overall percentage across all spheres
  reloadIdealizedMemories: () => Promise<void>; // Reload memories from AsyncStorage
  reloadProfiles: () => Promise<void>; // Reload profiles from AsyncStorage
  reloadJobs: () => Promise<void>; // Reload jobs from AsyncStorage
  reloadFamilyMembers: () => Promise<void>; // Reload family members from AsyncStorage
  reloadFriends: () => Promise<void>; // Reload friends from AsyncStorage
  reloadHobbies: () => Promise<void>; // Reload hobbies from AsyncStorage
};

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

interface JourneyProviderProps {
  children: ReactNode;
}

export function JourneyProvider({ children }: JourneyProviderProps) {
  const [profiles, isLoading, error, setProfiles] = useProfiles();
  const [idealizedMemories, setIdealizedMemories] = useState<IdealizedMemory[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingFamily, setIsLoadingFamily] = useState(true);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingHobbies, setIsLoadingHobbies] = useState(true);

  // Load idealized memories function (can be called to reload)
  const loadIdealizedMemories = useCallback(async () => {
      try {
        const stored = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
        if (stored) {
          const parsedMemories = JSON.parse(stored) as IdealizedMemory[];
        
        // Migrate old memories to new structure (profileId -> entityId)
        const migratedMemories = parsedMemories.map((memory) => ({
          ...memory,
          entityId: memory.entityId || memory.profileId || '',
          sphere: memory.sphere || 'relationships', // Only default if sphere is missing
          profileId: memory.profileId || memory.entityId || '', // Keep for backward compat
        }));
        
        // Clean up orphaned memories (memories whose associated entities no longer exist)
        // Read current entities from storage to validate memories
        let validEntityIds = new Set<string>();
        let profilesCount = 0;
        let jobsCount = 0;
        let familyCount = 0;
        let friendsCount = 0;
        let hobbiesCount = 0;
        try {
          // Load profiles
          const storedProfiles = await AsyncStorage.getItem(STORAGE_KEY);
          if (storedProfiles) {
            const parsedProfiles = JSON.parse(storedProfiles) as ExProfile[];
            profilesCount = parsedProfiles.length;
            parsedProfiles.forEach(p => validEntityIds.add(p.id));
          }
          
          // Load jobs
          const storedJobs = await AsyncStorage.getItem(JOBS_STORAGE_KEY);
          if (storedJobs) {
            const parsedJobs = JSON.parse(storedJobs) as Job[];
            jobsCount = parsedJobs.length;
            parsedJobs.forEach(j => validEntityIds.add(j.id));
          }
          
          // Load family members
          const storedFamily = await AsyncStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY);
          if (storedFamily) {
            const parsedFamily = JSON.parse(storedFamily) as FamilyMember[];
            familyCount = parsedFamily.length;
            parsedFamily.forEach(f => validEntityIds.add(f.id));
          }
          
          // Load friends
          const storedFriends = await AsyncStorage.getItem(FRIENDS_STORAGE_KEY);
          if (storedFriends) {
            const parsedFriends = JSON.parse(storedFriends) as Friend[];
            friendsCount = parsedFriends.length;
            parsedFriends.forEach(f => validEntityIds.add(f.id));
          }
          
          // Load hobbies
          const storedHobbies = await AsyncStorage.getItem(HOBBIES_STORAGE_KEY);
          if (storedHobbies) {
            const parsedHobbies = JSON.parse(storedHobbies) as Hobby[];
            hobbiesCount = parsedHobbies.length;
            parsedHobbies.forEach(h => validEntityIds.add(h.id));
          }
        } catch (error) {
          console.error('[JourneyProvider] Error reading entities for orphan cleanup:', error);
          // If we can't read entities, don't clean up - safer to keep all memories
          console.warn('[JourneyProvider] Skipping orphan cleanup due to error');
        }
        
        // Filter out orphaned memories (only if we successfully loaded entities)
        const beforeCleanupCount = migratedMemories.length;
        let cleanedMemories: IdealizedMemory[];
        
        if (validEntityIds.size === 0 && (profilesCount > 0 || jobsCount > 0 || familyCount > 0 || friendsCount > 0 || hobbiesCount > 0)) {
          // We tried to load entities but got 0 IDs, even though counts > 0
          // This is suspicious - don't clean up, just log a warning
          console.warn(`[JourneyProvider] ⚠️ Warning: Found ${profilesCount} profiles, ${jobsCount} jobs, ${familyCount} family, ${friendsCount} friends, ${hobbiesCount} hobbies but 0 valid IDs. Skipping cleanup to avoid data loss.`);
          cleanedMemories = migratedMemories;
        } else if (validEntityIds.size === 0) {
          // No entities at all - keep all memories for now (might be fresh install)
          cleanedMemories = migratedMemories;
        } else {
          // We have valid entities - filter orphaned memories
          const orphanedMemories: IdealizedMemory[] = [];
          cleanedMemories = migratedMemories.filter((memory) => {
            const entityId = memory.entityId || memory.profileId || '';
            
            if (!entityId) {
              console.warn(`[JourneyProvider] Memory ${memory.id} has no entityId or profileId, keeping it`);
              return true;
            }
            
            // Check if the entity exists based on sphere
            const isValid = validEntityIds.has(entityId);
            
            if (!isValid) {
              orphanedMemories.push(memory);
            }
            
            if (memory.sphere === 'relationships' || memory.sphere === 'career' || memory.sphere === 'family' || memory.sphere === 'friends' || memory.sphere === 'hobbies') {
              return isValid;
            }
            
            // If sphere is unknown, keep the memory for now (might be data migration issue)
            console.warn(`[JourneyProvider] Memory ${memory.id} has unknown sphere: ${memory.sphere}, keeping it`);
            return true;
          });
          
          const orphanedCount = beforeCleanupCount - cleanedMemories.length;
          if (orphanedCount > 0) {
            // Save cleaned memories back to storage
            await saveIdealizedMemoriesToStorage(cleanedMemories);
          }
        }
        
        setIdealizedMemories(cleanedMemories);
        
        return cleanedMemories.length;
      } else {
        setIdealizedMemories([]);
        return 0;
        }
      } catch (err) {
      console.error('[JourneyProvider] Error loading idealized memories:', err);
      return 0;
      }
  }, []);

  // Load idealized memories on mount
  useEffect(() => {
    loadIdealizedMemories();
  }, [loadIdealizedMemories]);

  // Load jobs on mount
  useEffect(() => {
    const loadJobs = async () => {
      try {
        setIsLoadingJobs(true);
        const stored = await AsyncStorage.getItem(JOBS_STORAGE_KEY);
        if (stored) {
          const parsedJobs = JSON.parse(stored) as Job[];
          setJobs(parsedJobs);
        }
      } catch (err) {
        console.error('Error loading jobs:', err);
      } finally {
        setIsLoadingJobs(false);
      }
    };
    loadJobs();
  }, []);

  // Load family members on mount
  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        setIsLoadingFamily(true);
        const stored = await AsyncStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY);
        if (stored) {
          const parsedMembers = JSON.parse(stored) as FamilyMember[];
          setFamilyMembers(parsedMembers);
        }
      } catch (err) {
        console.error('Error loading family members:', err);
      } finally {
        setIsLoadingFamily(false);
      }
    };
    loadFamilyMembers();
  }, []);

  // Load friends on mount
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setIsLoadingFriends(true);
        const stored = await AsyncStorage.getItem(FRIENDS_STORAGE_KEY);
        if (stored) {
          const parsedFriends = JSON.parse(stored) as Friend[];
          setFriends(parsedFriends);
        }
      } catch (err) {
        console.error('Error loading friends:', err);
      } finally {
        setIsLoadingFriends(false);
      }
    };
    loadFriends();
  }, []);

  // Load hobbies on mount
  useEffect(() => {
    const loadHobbies = async () => {
      try {
        setIsLoadingHobbies(true);
        const stored = await AsyncStorage.getItem(HOBBIES_STORAGE_KEY);
        if (stored) {
          const parsedHobbies = JSON.parse(stored) as Hobby[];
          setHobbies(parsedHobbies);
        }
      } catch (err) {
        console.error('Error loading hobbies:', err);
      } finally {
        setIsLoadingHobbies(false);
      }
    };
    loadHobbies();
  }, []);

  const saveProfile = useCallback(
    async (newProfile: ExProfile) => {
      try {
        // CRITICAL: Read existing profiles from storage FIRST to avoid overwriting
        // This ensures we never lose existing profiles when creating multiple profiles quickly
        let existingProfiles: ExProfile[] = [];
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            existingProfiles = JSON.parse(stored) as ExProfile[];
          }
        } catch (error) {
          console.error('[JourneyProvider] Error reading existing profiles from storage:', error);
          // If read fails, fall back to current state
          existingProfiles = profiles;
        }
        
        // Check if profile already exists
        const profileExists = existingProfiles.some(p => p.id === newProfile.id);
        if (profileExists) {
          console.warn(`[JourneyProvider] Profile with ID ${newProfile.id} already exists, updating instead of creating`);
          // Update existing profile
          const updatedProfiles = existingProfiles.map(p => p.id === newProfile.id ? newProfile : p);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
        setProfiles(updatedProfiles);
        } else {
          // Add new profile
          const updatedProfiles = [...existingProfiles, newProfile];
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
          setProfiles(updatedProfiles);
        }
      } catch (error) {
        console.error('[JourneyProvider] Error saving profile:', error);
        throw error;
      }
    },
    [setProfiles, profiles]
  );

  const updateProfilesInStorage = useCallback(
    async (updatedProfiles: ExProfile[]) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
        setProfiles(updatedProfiles);
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
        sphere: profileData.sphere || 'relationships', // Ensure sphere is set
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
      // Read existing profiles from storage first to avoid stale state issues
      let existingProfiles: ExProfile[] = [];
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          existingProfiles = JSON.parse(stored) as ExProfile[];
        }
      } catch (error) {
        console.error('[JourneyProvider] Error reading existing profiles from storage:', error);
        existingProfiles = profiles; // Fallback to current state
      }
      
      const updatedProfiles = existingProfiles.map((profile) => {
        if (profile.id === id) {
          const updatedProfile = {
            ...profile,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          // Explicitly handle undefined values - delete the property if it's being cleared
          Object.keys(updates).forEach((key) => {
            if (updates[key as keyof ExProfile] === undefined && key !== 'description') {
              // For imageUri, if explicitly set to undefined, delete it to clear the image
              if (key === 'imageUri') {
                delete (updatedProfile as any).imageUri;
              }
            }
          });
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
        const jsonString = JSON.stringify(memories);
        await AsyncStorage.setItem(IDEALIZED_MEMORIES_KEY, jsonString);
        // Don't call setIdealizedMemories here - it's already set by the caller
      } catch (error) {
        console.error('[JourneyProvider] ✗ Error saving idealized memories to storage:', error);
        if (error instanceof Error) {
          console.error('[JourneyProvider] Error details:', error.message, error.stack);
        }
        throw error; // Re-throw to let caller know it failed
      }
    },
    []
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      
      const updatedProfiles = profiles.filter((profile) => profile.id !== id);
      
      if (updatedProfiles.length === profiles.length) {
        console.warn(`[JourneyProvider] Profile with id ${id} not found for deletion`);
        return;
      }
      
      // CRITICAL: Read memories from storage FIRST to avoid stale state
      // This ensures we delete ALL memories associated with this profile, even if state is stale
      let existingMemories: IdealizedMemory[] = [];
      try {
        const stored = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as IdealizedMemory[];
          existingMemories = parsed.map((memory) => ({
            ...memory,
            entityId: memory.entityId || memory.profileId || '',
            sphere: memory.sphere || 'relationships',
            profileId: memory.profileId || memory.entityId || '',
          }));
        }
      } catch (error) {
        console.error('[JourneyProvider] Error reading memories from storage during profile deletion:', error);
        existingMemories = idealizedMemories; // Fallback to state if read fails
      }
      
      // Delete all memories associated with this profile (check both profileId and entityId for relationships sphere)
      const beforeCount = existingMemories.length;
      const updatedMemories = existingMemories.filter((memory) => 
        !(memory.profileId === id || (memory.entityId === id && memory.sphere === 'relationships'))
      );
      const deletedCount = beforeCount - updatedMemories.length;
      
      await saveIdealizedMemoriesToStorage(updatedMemories);
      setIdealizedMemories(updatedMemories); // Update state
      
      await updateProfilesInStorage(updatedProfiles);
    },
    [profiles, updateProfilesInStorage, idealizedMemories, saveIdealizedMemoriesToStorage]
  );

  const getProfile = useCallback(
    (id: string) => {
      return profiles.find((profile) => profile.id === id);
    },
    [profiles]
  );

  // Internal function with new signature
  const addIdealizedMemoryInternal = useCallback(
    async (
      entityId: string,
      sphere: LifeSphere,
      memoryData: Omit<IdealizedMemory, 'id' | 'entityId' | 'profileId' | 'sphere' | 'createdAt' | 'updatedAt'>
    ) => {
      const now = new Date().toISOString();
      const newMemory: IdealizedMemory = {
        ...memoryData,
        entityId,
        sphere,
        profileId: sphere === 'relationships' ? entityId : undefined, // Backward compatibility
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      
      // CRITICAL: Read existing memories from storage FIRST to avoid overwriting
      // This ensures we never lose existing memories when creating multiple memories quickly
      let existingMemories: IdealizedMemory[] = [];
      try {
        const stored = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as IdealizedMemory[];
          // Migrate old memories to new structure
          existingMemories = parsed.map((memory) => ({
            ...memory,
            entityId: memory.entityId || memory.profileId || '',
            sphere: memory.sphere || 'relationships',
            profileId: memory.profileId || memory.entityId || '',
          }));
        }
      } catch (error) {
        console.error('[JourneyProvider] Error reading existing memories from storage:', error);
        // If read fails, fall back to current state
        existingMemories = idealizedMemories;
      }
      
      // Check if this memory already exists (shouldn't happen, but safety check)
      const memoryExists = existingMemories.some(m => m.id === newMemory.id);
      if (memoryExists) {
        console.warn(`[JourneyProvider] Memory with ID ${newMemory.id} already exists, skipping creation`);
        return;
      }
      
      // Merge new memory with existing ones from storage
      const updatedMemories = [...existingMemories, newMemory];
      
      // Update state
      setIdealizedMemories(updatedMemories);

      // Save to storage
      await saveIdealizedMemoriesToStorage(updatedMemories);

      // Update entity setup progress based on new memory count
      const memoryCount = updatedMemories.filter(m => m.entityId === entityId && m.sphere === sphere).length;
      
      if (sphere === 'relationships') {
        const profile = profiles.find((p) => p.id === entityId);
      if (profile) {
          await updateProfile(entityId, {});
        }
      } else if (sphere === 'career') {
        const job = jobs.find((j) => j.id === entityId);
        if (job) {
          await updateJob(entityId, {});
        }
      } else if (sphere === 'family') {
        const member = familyMembers.find((m) => m.id === entityId);
        if (member) {
          await updateFamilyMember(entityId, {});
        }
      }
    },
    [profiles, jobs, familyMembers, saveIdealizedMemoriesToStorage, updateProfile, updateJob, updateFamilyMember, idealizedMemories]
  );

  // Public function with new signature - supports multiple spheres
  const addIdealizedMemory = useCallback(
    async (
      entityIdOrProfileId: string,
      sphereOrMemoryData: LifeSphere | Omit<IdealizedMemory, 'id' | 'entityId' | 'profileId' | 'sphere' | 'createdAt' | 'updatedAt'>,
      memoryData?: Omit<IdealizedMemory, 'id' | 'entityId' | 'profileId' | 'sphere' | 'createdAt' | 'updatedAt'>
    ) => {
      // Check if this is the new signature (3 params) or old signature (2 params)
      if (memoryData !== undefined && typeof sphereOrMemoryData === 'string') {
        // New signature: (entityId, sphere, memoryData)
        return addIdealizedMemoryInternal(entityIdOrProfileId, sphereOrMemoryData as LifeSphere, memoryData);
      } else {
        // Old signature: (profileId, memoryData) - backward compatibility
        return addIdealizedMemoryInternal(
          entityIdOrProfileId,
          'relationships',
          sphereOrMemoryData as Omit<IdealizedMemory, 'id' | 'entityId' | 'profileId' | 'sphere' | 'createdAt' | 'updatedAt'>
        );
      }
    },
    [addIdealizedMemoryInternal]
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
      // Backward compatibility - check both profileId and entityId
      // Also filter by sphere to only return relationships memories (since this is for profiles)
      const filtered = idealizedMemories.filter((memory) => 
        (memory.profileId === profileId || memory.entityId === profileId) && 
        memory.sphere === 'relationships'
      );
      
      return filtered;
    },
    [idealizedMemories]
  );

  const getIdealizedMemoriesByEntityId = useCallback(
    (entityId: string, sphere: LifeSphere) => {
      return idealizedMemories.filter((memory) => 
        memory.entityId === entityId && memory.sphere === sphere
      );
    },
    [idealizedMemories]
  );

  // Job management functions
  const saveJob = useCallback(
    async (newJob: Job) => {
      try {
        // CRITICAL: Read existing jobs from storage FIRST to avoid overwriting
        // This ensures we never lose existing jobs when creating multiple jobs quickly
        let existingJobs: Job[] = [];
        try {
          const stored = await AsyncStorage.getItem(JOBS_STORAGE_KEY);
          if (stored) {
            existingJobs = JSON.parse(stored) as Job[];
          }
        } catch (error) {
          console.error('[JourneyProvider] Error reading existing jobs from storage:', error);
          // If read fails, fall back to current state
          existingJobs = jobs;
        }
        
        // Check if job already exists
        const jobExists = existingJobs.some(j => j.id === newJob.id);
        if (jobExists) {
          console.warn(`[JourneyProvider] Job with ID ${newJob.id} already exists, updating instead of creating`);
          // Update existing job
          const updatedJobs = existingJobs.map(j => j.id === newJob.id ? newJob : j);
          await AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
          setJobs(updatedJobs);
        } else {
          // Add new job
          const updatedJobs = [...existingJobs, newJob];
          await AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
          setJobs(updatedJobs);
        }
      } catch (error) {
        console.error('[JourneyProvider] Error saving job:', error);
        throw error;
      }
    },
    [jobs]
  );

  const updateJobsInStorage = useCallback(
    async (updatedJobs: Job[]) => {
      try {
        await AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
        setJobs(updatedJobs);
      } catch (error) {
        console.error('Error updating jobs:', error);
        throw error;
      }
    },
    []
  );

  const addJob = useCallback(
    async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'sphere'>): Promise<string> => {
      const now = new Date().toISOString();
      const newJob: Job = {
        ...jobData,
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sphere: 'career',
        createdAt: now,
        updatedAt: now,
      };
      newJob.setupProgress = calculateSetupProgress(newJob, 0);
      newJob.isCompleted = newJob.setupProgress === 100;
      await saveJob(newJob);
      return newJob.id;
    },
    [saveJob]
  );

  const updateJob = useCallback(
    async (id: string, updates: Partial<Job>) => {
      const updatedJobs = jobs.map((job) => {
        if (job.id === id) {
          const updatedJob = {
            ...job,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          const memoryCount = idealizedMemories.filter(m => m.entityId === id && m.sphere === 'career').length;
          updatedJob.setupProgress = calculateSetupProgress(updatedJob, memoryCount);
          updatedJob.isCompleted = updatedJob.setupProgress === 100;
          return updatedJob;
        }
        return job;
      });
      await updateJobsInStorage(updatedJobs);
    },
    [jobs, updateJobsInStorage, idealizedMemories]
  );

  const deleteJob = useCallback(
    async (id: string) => {
      
      const updatedJobs = jobs.filter((job) => job.id !== id);
      
      if (updatedJobs.length === jobs.length) {
        console.warn(`[JourneyProvider] Job with id ${id} not found for deletion`);
        return;
      }
      
      // CRITICAL: Read memories from storage FIRST to avoid stale state
      // This ensures we delete ALL memories associated with this job, even if state is stale
      let existingMemories: IdealizedMemory[] = [];
      try {
        const stored = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as IdealizedMemory[];
          existingMemories = parsed.map((memory) => ({
            ...memory,
            entityId: memory.entityId || memory.profileId || '',
            sphere: memory.sphere || 'relationships',
            profileId: memory.profileId || memory.entityId || '',
          }));
        }
      } catch (error) {
        console.error('[JourneyProvider] Error reading memories from storage during job deletion:', error);
        existingMemories = idealizedMemories; // Fallback to state if read fails
      }
      
      // Delete all memories associated with this job (career sphere)
      const beforeCount = existingMemories.length;
      const updatedMemories = existingMemories.filter((memory) => 
        !(memory.entityId === id && memory.sphere === 'career')
      );
      const deletedCount = beforeCount - updatedMemories.length;
      
      await saveIdealizedMemoriesToStorage(updatedMemories);
      setIdealizedMemories(updatedMemories); // Update state
      
      await updateJobsInStorage(updatedJobs);
    },
    [jobs, updateJobsInStorage, idealizedMemories, saveIdealizedMemoriesToStorage]
  );

  const getJob = useCallback(
    (id: string) => {
      return jobs.find((job) => job.id === id);
    },
    [jobs]
  );

  // Family member management functions
  const saveFamilyMember = useCallback(
    async (newMember: FamilyMember) => {
      try {
        // CRITICAL: Read existing family members from storage FIRST to avoid overwriting
        // This ensures we never lose existing family members when creating multiple members quickly
        let existingMembers: FamilyMember[] = [];
        try {
          const stored = await AsyncStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY);
          if (stored) {
            existingMembers = JSON.parse(stored) as FamilyMember[];
          }
        } catch (error) {
          console.error('[JourneyProvider] Error reading existing family members from storage:', error);
          // If read fails, fall back to current state
          existingMembers = familyMembers;
        }
        
        // Check if family member already exists
        const memberExists = existingMembers.some(m => m.id === newMember.id);
        if (memberExists) {
          console.warn(`[JourneyProvider] Family member with ID ${newMember.id} already exists, updating instead of creating`);
          // Update existing member
          const updatedMembers = existingMembers.map(m => m.id === newMember.id ? newMember : m);
          await AsyncStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, JSON.stringify(updatedMembers));
          setFamilyMembers(updatedMembers);
        } else {
          // Add new member
          const updatedMembers = [...existingMembers, newMember];
          await AsyncStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, JSON.stringify(updatedMembers));
          setFamilyMembers(updatedMembers);
        }
      } catch (error) {
        console.error('Error saving family member:', error);
        throw error;
      }
    },
    [familyMembers]
  );

  const updateFamilyMembersInStorage = useCallback(
    async (updatedMembers: FamilyMember[]) => {
      try {
        await AsyncStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, JSON.stringify(updatedMembers));
        setFamilyMembers(updatedMembers);
      } catch (error) {
        console.error('Error updating family members:', error);
        throw error;
      }
    },
    []
  );

  const addFamilyMember = useCallback(
    async (memberData: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt' | 'sphere'>): Promise<string> => {
      const now = new Date().toISOString();
      const newMember: FamilyMember = {
        ...memberData,
        id: `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sphere: 'family',
        createdAt: now,
        updatedAt: now,
      };
      newMember.setupProgress = calculateSetupProgress(newMember, 0);
      newMember.isCompleted = newMember.setupProgress === 100;
      await saveFamilyMember(newMember);
      return newMember.id;
    },
    [saveFamilyMember]
  );

  const updateFamilyMember = useCallback(
    async (id: string, updates: Partial<FamilyMember>) => {
      const updatedMembers = familyMembers.map((member) => {
        if (member.id === id) {
          const updatedMember = {
            ...member,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          const memoryCount = idealizedMemories.filter(m => m.entityId === id && m.sphere === 'family').length;
          updatedMember.setupProgress = calculateSetupProgress(updatedMember, memoryCount);
          updatedMember.isCompleted = updatedMember.setupProgress === 100;
          return updatedMember;
        }
        return member;
      });
      await updateFamilyMembersInStorage(updatedMembers);
    },
    [familyMembers, updateFamilyMembersInStorage, idealizedMemories]
  );

  const deleteFamilyMember = useCallback(
    async (id: string) => {
      
      const updatedMembers = familyMembers.filter((member) => member.id !== id);
      
      if (updatedMembers.length === familyMembers.length) {
        console.warn(`[JourneyProvider] Family member with id ${id} not found for deletion`);
        return;
      }
      
      // CRITICAL: Read memories from storage FIRST to avoid stale state
      // This ensures we delete ALL memories associated with this family member, even if state is stale
      let existingMemories: IdealizedMemory[] = [];
      try {
        const stored = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as IdealizedMemory[];
          existingMemories = parsed.map((memory) => ({
            ...memory,
            entityId: memory.entityId || memory.profileId || '',
            sphere: memory.sphere || 'relationships',
            profileId: memory.profileId || memory.entityId || '',
          }));
        }
      } catch (error) {
        console.error('[JourneyProvider] Error reading memories from storage during family member deletion:', error);
        existingMemories = idealizedMemories; // Fallback to state if read fails
      }
      
      // Delete all memories associated with this family member (family sphere)
      const beforeCount = existingMemories.length;
      const updatedMemories = existingMemories.filter((memory) => 
        !(memory.entityId === id && memory.sphere === 'family')
      );
      const deletedCount = beforeCount - updatedMemories.length;
      
      await saveIdealizedMemoriesToStorage(updatedMemories);
      setIdealizedMemories(updatedMemories); // Update state
      
      await updateFamilyMembersInStorage(updatedMembers);
    },
    [familyMembers, updateFamilyMembersInStorage, idealizedMemories, saveIdealizedMemoriesToStorage]
  );

  const getFamilyMember = useCallback(
    (id: string) => {
      return familyMembers.find((member) => member.id === id);
    },
    [familyMembers]
  );

  // Friends management functions
  const saveFriend = useCallback(
    async (newFriend: Friend) => {
      try {
        let existingFriends: Friend[] = [];
        try {
          const stored = await AsyncStorage.getItem(FRIENDS_STORAGE_KEY);
          if (stored) {
            existingFriends = JSON.parse(stored) as Friend[];
          }
        } catch (error) {
          console.error('[JourneyProvider] Error reading existing friends from storage:', error);
          existingFriends = friends;
        }
        
        const friendExists = existingFriends.some(f => f.id === newFriend.id);
        if (friendExists) {
          const updatedFriends = existingFriends.map(f => f.id === newFriend.id ? newFriend : f);
          await AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(updatedFriends));
          setFriends(updatedFriends);
        } else {
          const updatedFriends = [...existingFriends, newFriend];
          await AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(updatedFriends));
          setFriends(updatedFriends);
        }
      } catch (error) {
        console.error('Error saving friend:', error);
        throw error;
      }
    },
    [friends]
  );

  const updateFriendsInStorage = useCallback(
    async (updatedFriends: Friend[]) => {
      try {
        await AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(updatedFriends));
        setFriends(updatedFriends);
      } catch (error) {
        console.error('Error updating friends:', error);
        throw error;
      }
    },
    []
  );

  const addFriend = useCallback(
    async (friendData: Omit<Friend, 'id' | 'createdAt' | 'updatedAt' | 'sphere'>): Promise<string> => {
      const now = new Date().toISOString();
      const newFriend: Friend = {
        ...friendData,
        id: `friend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sphere: 'friends',
        createdAt: now,
        updatedAt: now,
      };
      newFriend.setupProgress = calculateSetupProgress(newFriend, 0);
      newFriend.isCompleted = newFriend.setupProgress === 100;
      await saveFriend(newFriend);
      return newFriend.id;
    },
    [saveFriend]
  );

  const updateFriend = useCallback(
    async (id: string, updates: Partial<Friend>) => {
      const updatedFriends = friends.map((friend) => {
        if (friend.id === id) {
          const updatedFriend = {
            ...friend,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          const memoryCount = idealizedMemories.filter(m => m.entityId === id && m.sphere === 'friends').length;
          updatedFriend.setupProgress = calculateSetupProgress(updatedFriend, memoryCount);
          updatedFriend.isCompleted = updatedFriend.setupProgress === 100;
          return updatedFriend;
        }
        return friend;
      });
      await updateFriendsInStorage(updatedFriends);
    },
    [friends, updateFriendsInStorage, idealizedMemories]
  );

  const deleteFriend = useCallback(
    async (id: string) => {
      const updatedFriends = friends.filter((friend) => friend.id !== id);
      
      if (updatedFriends.length === friends.length) {
        console.warn(`[JourneyProvider] Friend with id ${id} not found for deletion`);
        return;
      }
      
      let existingMemories: IdealizedMemory[] = [];
      try {
        const stored = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as IdealizedMemory[];
          existingMemories = parsed.map((memory) => ({
            ...memory,
            entityId: memory.entityId || memory.profileId || '',
            sphere: memory.sphere || 'relationships',
            profileId: memory.profileId || memory.entityId || '',
          }));
        }
      } catch (error) {
        console.error('[JourneyProvider] Error reading memories from storage during friend deletion:', error);
        existingMemories = idealizedMemories;
      }
      
      const updatedMemories = existingMemories.filter((memory) => 
        !(memory.entityId === id && memory.sphere === 'friends')
      );
      
      await saveIdealizedMemoriesToStorage(updatedMemories);
      setIdealizedMemories(updatedMemories);
      
      await updateFriendsInStorage(updatedFriends);
    },
    [friends, updateFriendsInStorage, idealizedMemories, saveIdealizedMemoriesToStorage]
  );

  const getFriend = useCallback(
    (id: string) => {
      return friends.find((friend) => friend.id === id);
    },
    [friends]
  );

  // Hobbies management functions
  const saveHobby = useCallback(
    async (newHobby: Hobby) => {
      try {
        let existingHobbies: Hobby[] = [];
        try {
          const stored = await AsyncStorage.getItem(HOBBIES_STORAGE_KEY);
          if (stored) {
            existingHobbies = JSON.parse(stored) as Hobby[];
          }
        } catch (error) {
          console.error('[JourneyProvider] Error reading existing hobbies from storage:', error);
          existingHobbies = hobbies;
        }
        
        const hobbyExists = existingHobbies.some(h => h.id === newHobby.id);
        if (hobbyExists) {
          const updatedHobbies = existingHobbies.map(h => h.id === newHobby.id ? newHobby : h);
          await AsyncStorage.setItem(HOBBIES_STORAGE_KEY, JSON.stringify(updatedHobbies));
          setHobbies(updatedHobbies);
        } else {
          const updatedHobbies = [...existingHobbies, newHobby];
          await AsyncStorage.setItem(HOBBIES_STORAGE_KEY, JSON.stringify(updatedHobbies));
          setHobbies(updatedHobbies);
        }
      } catch (error) {
        console.error('Error saving hobby:', error);
        throw error;
      }
    },
    [hobbies]
  );

  const updateHobbiesInStorage = useCallback(
    async (updatedHobbies: Hobby[]) => {
      try {
        await AsyncStorage.setItem(HOBBIES_STORAGE_KEY, JSON.stringify(updatedHobbies));
        setHobbies(updatedHobbies);
      } catch (error) {
        console.error('Error updating hobbies:', error);
        throw error;
      }
    },
    []
  );

  const addHobby = useCallback(
    async (hobbyData: Omit<Hobby, 'id' | 'createdAt' | 'updatedAt' | 'sphere'>): Promise<string> => {
      const now = new Date().toISOString();
      const newHobby: Hobby = {
        ...hobbyData,
        id: `hobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sphere: 'hobbies',
        createdAt: now,
        updatedAt: now,
      };
      newHobby.setupProgress = calculateSetupProgress(newHobby, 0);
      newHobby.isCompleted = newHobby.setupProgress === 100;
      await saveHobby(newHobby);
      return newHobby.id;
    },
    [saveHobby]
  );

  const updateHobby = useCallback(
    async (id: string, updates: Partial<Hobby>) => {
      const updatedHobbies = hobbies.map((hobby) => {
        if (hobby.id === id) {
          const updatedHobby = {
            ...hobby,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          const memoryCount = idealizedMemories.filter(m => m.entityId === id && m.sphere === 'hobbies').length;
          updatedHobby.setupProgress = calculateSetupProgress(updatedHobby, memoryCount);
          updatedHobby.isCompleted = updatedHobby.setupProgress === 100;
          return updatedHobby;
        }
        return hobby;
      });
      await updateHobbiesInStorage(updatedHobbies);
    },
    [hobbies, updateHobbiesInStorage, idealizedMemories]
  );

  const deleteHobby = useCallback(
    async (id: string) => {
      const updatedHobbies = hobbies.filter((hobby) => hobby.id !== id);
      
      if (updatedHobbies.length === hobbies.length) {
        console.warn(`[JourneyProvider] Hobby with id ${id} not found for deletion`);
        return;
      }
      
      let existingMemories: IdealizedMemory[] = [];
      try {
        const stored = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as IdealizedMemory[];
          existingMemories = parsed.map((memory) => ({
            ...memory,
            entityId: memory.entityId || memory.profileId || '',
            sphere: memory.sphere || 'relationships',
            profileId: memory.profileId || memory.entityId || '',
          }));
        }
      } catch (error) {
        console.error('[JourneyProvider] Error reading memories from storage during hobby deletion:', error);
        existingMemories = idealizedMemories;
      }
      
      const updatedMemories = existingMemories.filter((memory) => 
        !(memory.entityId === id && memory.sphere === 'hobbies')
      );
      
      await saveIdealizedMemoriesToStorage(updatedMemories);
      setIdealizedMemories(updatedMemories);
      
      await updateHobbiesInStorage(updatedHobbies);
    },
    [hobbies, updateHobbiesInStorage, idealizedMemories, saveIdealizedMemoriesToStorage]
  );

  const getHobby = useCallback(
    (id: string) => {
      return hobbies.find((hobby) => hobby.id === id);
    },
    [hobbies]
  );

  // Helper functions
  const getEntitiesBySphere = useCallback(
    (sphere: LifeSphere) => {
      switch (sphere) {
        case 'relationships':
          return profiles as (ExProfile | Job | FamilyMember | Friend | Hobby)[];
        case 'career':
          return jobs as (ExProfile | Job | FamilyMember | Friend | Hobby)[];
        case 'family':
          return familyMembers as (ExProfile | Job | FamilyMember | Friend | Hobby)[];
        case 'friends':
          return friends as (ExProfile | Job | FamilyMember | Friend | Hobby)[];
        case 'hobbies':
          return hobbies as (ExProfile | Job | FamilyMember | Friend | Hobby)[];
        default:
          return [];
      }
    },
    [profiles, jobs, familyMembers, friends, hobbies]
  );

  const getOverallSunnyPercentage = useCallback(() => {
    // If no memories exist, return 0
    if (!idealizedMemories || idealizedMemories.length === 0) {
      return 0;
    }
    
    // Filter out orphaned memories - only count memories that belong to existing entities
    const validMemories = idealizedMemories.filter((memory) => {
      if (!memory) return false;
      
      // Check if the memory's entity exists
      switch (memory.sphere) {
        case 'relationships':
          // For relationships, check if profile exists
          return profiles.some(p => p.id === memory.entityId || p.id === memory.profileId);
        case 'career':
          // For career, check if job exists
          return jobs.some(j => j.id === memory.entityId);
        case 'family':
          // For family, check if family member exists
          return familyMembers.some(f => f.id === memory.entityId);
        case 'friends':
          // For friends, check if friend exists
          return friends.some(f => f.id === memory.entityId);
        case 'hobbies':
          // For hobbies, check if hobby exists
          return hobbies.some(h => h.id === memory.entityId);
        default:
          return false;
      }
    });
    
    // If no valid memories exist, return 0
    if (validMemories.length === 0) {
      return 0;
    }
    
    let totalClouds = 0;
    let totalSuns = 0;
    
    validMemories.forEach((memory) => {
      if (!memory) return; // Skip invalid memories
      totalClouds += (memory.hardTruths || []).length;
      totalSuns += (memory.goodFacts || []).length;
    });
    
    const total = totalClouds + totalSuns;
    // If no clouds or suns exist, return 0
    if (total === 0) {
      return 0;
    }
    
    const percentage = (totalSuns / total) * 100;
    // Ensure percentage is a valid number between 0 and 100
    const result = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
    
    if (validMemories.length < idealizedMemories.length) {
    }
    
    return result;
  }, [idealizedMemories, profiles, jobs, familyMembers, friends, hobbies]);

  // Reload profiles from AsyncStorage
  const reloadProfiles = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedProfiles = JSON.parse(stored) as ExProfile[];
        // Load memories to calculate progress
        const storedMemories = await AsyncStorage.getItem(IDEALIZED_MEMORIES_KEY);
        const parsedMemories = storedMemories ? JSON.parse(storedMemories) as IdealizedMemory[] : [];
        
        // Recalculate setupProgress for all profiles and ensure sphere is set
        const profilesWithUpdatedProgress = parsedProfiles.map((profile) => {
          const memoryCount = parsedMemories.filter(m => 
            (m.profileId === profile.id) || (m.entityId === profile.id && m.sphere === 'relationships')
          ).length;
          const progress = calculateSetupProgress(profile, memoryCount);
          return {
            ...profile,
            sphere: profile.sphere || 'relationships',
            setupProgress: progress,
            isCompleted: progress === 100,
          };
        });
        setProfiles(profilesWithUpdatedProgress);
      } else {
        setProfiles([]);
      }
    } catch (err) {
      console.error('[JourneyProvider] Error reloading profiles:', err);
    }
  }, [setProfiles]);

  // Reload jobs from AsyncStorage
  const reloadJobs = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(JOBS_STORAGE_KEY);
      if (stored) {
        const parsedJobs = JSON.parse(stored) as Job[];
        setJobs(parsedJobs);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('[JourneyProvider] Error reloading jobs:', err);
    }
  }, []);

  // Reload family members from AsyncStorage
  const reloadFamilyMembers = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY);
      if (stored) {
        const parsedMembers = JSON.parse(stored) as FamilyMember[];
        setFamilyMembers(parsedMembers);
      } else {
        setFamilyMembers([]);
      }
    } catch (err) {
      console.error('[JourneyProvider] Error reloading family members:', err);
    }
  }, []);

  // Reload friends from AsyncStorage
  const reloadFriends = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FRIENDS_STORAGE_KEY);
      if (stored) {
        const parsedFriends = JSON.parse(stored) as Friend[];
        setFriends(parsedFriends);
      } else {
        setFriends([]);
      }
    } catch (err) {
      console.error('[JourneyProvider] Error reloading friends:', err);
    }
  }, []);

  // Reload hobbies from AsyncStorage
  const reloadHobbies = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(HOBBIES_STORAGE_KEY);
      if (stored) {
        const parsedHobbies = JSON.parse(stored) as Hobby[];
        setHobbies(parsedHobbies);
      } else {
        setHobbies([]);
      }
    } catch (err) {
      console.error('[JourneyProvider] Error reloading hobbies:', err);
    }
  }, []);

  const value: JourneyContextType = {
    profiles,
    isLoading: isLoading || isLoadingJobs || isLoadingFamily || isLoadingFriends || isLoadingHobbies,
    error,
    addProfile,
    updateProfile,
    deleteProfile,
    getProfile,
    jobs,
    addJob,
    updateJob,
    deleteJob,
    getJob,
    familyMembers,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    getFamilyMember,
    friends,
    addFriend,
    updateFriend,
    deleteFriend,
    getFriend,
    hobbies,
    addHobby,
    updateHobby,
    deleteHobby,
    getHobby,
    idealizedMemories,
    addIdealizedMemory,
    updateIdealizedMemory,
    deleteIdealizedMemory,
    getIdealizedMemoriesByEntityId,
    getIdealizedMemoriesByProfileId, // Backward compatibility
    getEntitiesBySphere,
    getOverallSunnyPercentage,
    reloadIdealizedMemories: loadIdealizedMemories,
    reloadProfiles,
    reloadJobs,
    reloadFamilyMembers,
    reloadFriends,
    reloadHobbies,
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

