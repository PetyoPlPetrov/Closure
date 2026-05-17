import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

const DEMO_MODE_KEY = '@sferas:demo_mode';
export const DEMO_CREATING_KEY = '@sferas:demo_creating';

/** Names used for fake/demo entities — shared between generate and cleanup. */
export const FAKE_ENTITY_NAMES = new Set([
  // Profiles
  "Mark Johnson", "Emma Williams", "Olivia Brown", "Sophia Martinez", "James Wilson",
  // Jobs
  "Software Developer at TechCorp", "Senior Developer at StartupXYZ",
  "Lead Engineer at CurrentCompany", "Junior Developer at WebSolutions",
  "Full Stack Developer at DigitalAgency",
  // Family
  "Sarah Johnson", "Michael Johnson", "Maria Johnson", "Robert Johnson", "Emily Johnson",
  // Friends
  "Alex Thompson", "Jessica Martinez", "David Chen", "Sophie Anderson", "Ryan Taylor", "Maya Patel",
  // Hobbies
  "Photography", "Reading", "Cooking", "Hiking", "Yoga", "Painting",
]);

/** Delete all fake entities and their memories from AsyncStorage. */
export async function cleanupFakeData() {
  const [storedProfiles, storedJobs, storedFamily, storedFriends, storedHobbies, storedMemories] =
    await Promise.all([
      AsyncStorage.getItem("@sferas:ex_profiles"),
      AsyncStorage.getItem("@sferas:jobs"),
      AsyncStorage.getItem("@sferas:family_members"),
      AsyncStorage.getItem("@sferas:friends"),
      AsyncStorage.getItem("@sferas:hobbies"),
      AsyncStorage.getItem("@sferas:idealized_memories"),
    ]);

  const allProfiles = storedProfiles ? JSON.parse(storedProfiles) : [];
  const allJobs = storedJobs ? JSON.parse(storedJobs) : [];
  const allFamily = storedFamily ? JSON.parse(storedFamily) : [];
  const allFriends = storedFriends ? JSON.parse(storedFriends) : [];
  const allHobbies = storedHobbies ? JSON.parse(storedHobbies) : [];
  const allMemories = storedMemories ? JSON.parse(storedMemories) : [];

  const fakeEntityIds = new Set([
    ...allProfiles.filter((p: any) => FAKE_ENTITY_NAMES.has(p.name)).map((p: any) => p.id),
    ...allJobs.filter((j: any) => FAKE_ENTITY_NAMES.has(j.name)).map((j: any) => j.id),
    ...allFamily.filter((f: any) => FAKE_ENTITY_NAMES.has(f.name)).map((f: any) => f.id),
    ...allFriends.filter((f: any) => FAKE_ENTITY_NAMES.has(f.name)).map((f: any) => f.id),
    ...allHobbies.filter((h: any) => FAKE_ENTITY_NAMES.has(h.name)).map((h: any) => h.id),
  ]);

  await Promise.all([
    AsyncStorage.setItem("@sferas:ex_profiles", JSON.stringify(allProfiles.filter((p: any) => !fakeEntityIds.has(p.id)))),
    AsyncStorage.setItem("@sferas:jobs", JSON.stringify(allJobs.filter((j: any) => !fakeEntityIds.has(j.id)))),
    AsyncStorage.setItem("@sferas:family_members", JSON.stringify(allFamily.filter((f: any) => !fakeEntityIds.has(f.id)))),
    AsyncStorage.setItem("@sferas:friends", JSON.stringify(allFriends.filter((f: any) => !fakeEntityIds.has(f.id)))),
    AsyncStorage.setItem("@sferas:hobbies", JSON.stringify(allHobbies.filter((h: any) => !fakeEntityIds.has(h.id)))),
    AsyncStorage.setItem("@sferas:idealized_memories", JSON.stringify(allMemories.filter((m: any) => !fakeEntityIds.has(m.entityId) && !fakeEntityIds.has(m.profileId)))),
  ]);

  await AsyncStorage.removeItem(DEMO_CREATING_KEY);
}

type DemoModeContextType = {
  isDemoMode: boolean;
  isCreatingDemo: boolean;
  isCleaningUpIncompleteDemo: boolean;
  setDemoModeActive: (active: boolean) => Promise<void>;
  /** Signal that demo data generation is about to start. */
  markDemoCreating: () => Promise<void>;
  /** Clear the creating flag (called after generation completes or is stopped). */
  clearDemoCreating: () => Promise<void>;
  /** Set the creating-in-progress UI state (used by settings to show overlay). */
  setIsCreatingDemo: (val: boolean) => void;
  /** Ref that signals demo creation should be stopped. */
  demoStopRequestedRef: React.MutableRefObject<boolean>;
};

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
  isCreatingDemo: false,
  isCleaningUpIncompleteDemo: false,
  setDemoModeActive: async () => {},
  markDemoCreating: async () => {},
  clearDemoCreating: async () => {},
  setIsCreatingDemo: () => {},
  demoStopRequestedRef: { current: false },
});

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [isCleaningUpIncompleteDemo, setIsCleaningUpIncompleteDemo] = useState(false);
  const cleanupDone = useRef(false);
  const demoStopRequestedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const [modeVal, creatingVal] = await Promise.all([
        AsyncStorage.getItem(DEMO_MODE_KEY),
        AsyncStorage.getItem(DEMO_CREATING_KEY),
      ]);

      if (modeVal === 'true') {
        setIsDemoMode(true);
      }

      // App was killed while demo was being created — clean up partial data
      if (creatingVal === 'true' && !cleanupDone.current) {
        cleanupDone.current = true;
        setIsCleaningUpIncompleteDemo(true);
        try {
          await cleanupFakeData();
          // Also make sure demo mode flag is off since creation never finished
          await AsyncStorage.removeItem(DEMO_MODE_KEY);
          setIsDemoMode(false);
        } catch (_e) {
          // Best effort
        } finally {
          setIsCleaningUpIncompleteDemo(false);
        }
      }
    })();
  }, []);

  const setDemoModeActive = useCallback(async (active: boolean) => {
    if (active) {
      await AsyncStorage.setItem(DEMO_MODE_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(DEMO_MODE_KEY);
    }
    setIsDemoMode(active);
  }, []);

  const markDemoCreating = useCallback(async () => {
    await AsyncStorage.setItem(DEMO_CREATING_KEY, 'true');
  }, []);

  const clearDemoCreating = useCallback(async () => {
    await AsyncStorage.removeItem(DEMO_CREATING_KEY);
  }, []);

  return (
    <DemoModeContext.Provider value={{
      isDemoMode, isCreatingDemo, isCleaningUpIncompleteDemo,
      setDemoModeActive, markDemoCreating, clearDemoCreating,
      setIsCreatingDemo, demoStopRequestedRef,
    }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}

/**
 * Returns a function that checks if demo mode is active.
 * If active, shows an alert and returns true (blocked).
 * Use to guard creation, editing, AI, and paid features.
 */
export function useDemoModeGuard() {
  const { isDemoMode } = useDemoMode();

  const guardDemoMode = useCallback((customMessage?: string): boolean => {
    if (!isDemoMode) return false;
    Alert.alert(
      'Demo Mode',
      customMessage ?? 'This action is not available in demo mode. Exit demo mode from Settings to use the full app.',
      [{ text: 'OK' }],
    );
    return true;
  }, [isDemoMode]);

  return { isDemoMode, guardDemoMode };
}
