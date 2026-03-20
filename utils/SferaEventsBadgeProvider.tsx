/**
 * Sfera Events Badge Provider
 * Fetches events on app open and when app comes to foreground.
 * Badge stays until all social/Plus events are seen (user opened expanded modal).
 * When new events arrive, shows in-app notification with community name (Social or Plus Events).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { AppState, type AppStateStatus, InteractionManager } from "react-native";

import { useEventInAppNotificationPreference } from "@/utils/EventInAppNotificationPreferenceProvider";
import { useInAppNotification } from "@/utils/InAppNotificationProvider";
import { getOnboardingCompleted } from "@/utils/onboarding-storage";
import {
  fetchAndCheckForNewEvents,
  getSeenEventIds,
  markEventAsSeen as markSeenInStorage,
  type SferaEvent,
} from "@/utils/sfera-events";
import { useTranslate } from "@/utils/languages/use-translate";

interface SferaEventsBadgeContextType {
  hasNewEvents: boolean;
  /** Count of public+VIP events the user has not yet seen (opened full details). */
  unseenCount: number;
  markEventAsSeen: (eventId: string) => Promise<void>;
  refreshEvents: (silent?: boolean) => Promise<SferaEvent[]>;
  /** Get cached events without refetching from network */
  getCachedEvents: () => SferaEvent[];
  /** Clear in-memory events state and badge (e.g. after Clear all app data). Call before refreshEvents() to avoid stale UI/badges. */
  resetEventsState: () => void;
  /** True while initial events fetch is in progress (on app open). */
  isLoadingEvents: boolean;
}

const SferaEventsBadgeContext = createContext<
  SferaEventsBadgeContextType | undefined
>(undefined);

interface BadgeState {
  hasNewEvents: boolean;
  unseenCount: number;
  events: SferaEvent[];
  seenIds: Set<string>;
  isLoadingEvents: boolean;
}

type BadgeAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_DONE"; events: SferaEvent[]; seenIds: Set<string>; unseenCount: number; hasNewEvents: boolean }
  | { type: "MARK_SEEN"; eventId: string; seenIds: Set<string>; unseenCount: number; hasNewEvents: boolean }
  | { type: "RESET" };

const initialBadgeState: BadgeState = {
  hasNewEvents: false,
  unseenCount: 0,
  events: [],
  seenIds: new Set(),
  isLoadingEvents: true,
};

function badgeReducer(state: BadgeState, action: BadgeAction): BadgeState {
  switch (action.type) {
    case "FETCH_START":
      return state.isLoadingEvents ? state : { ...state, isLoadingEvents: true };
    case "FETCH_DONE":
      return {
        events: action.events,
        seenIds: action.seenIds,
        unseenCount: action.unseenCount,
        hasNewEvents: action.hasNewEvents,
        isLoadingEvents: false,
      };
    case "MARK_SEEN":
      return {
        ...state,
        seenIds: action.seenIds,
        unseenCount: action.unseenCount,
        hasNewEvents: action.hasNewEvents,
      };
    case "RESET":
      return { ...initialBadgeState };
    default:
      return state;
  }
}

export function SferaEventsBadgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(badgeReducer, initialBadgeState);
  const { hasNewEvents, unseenCount, events, seenIds, isLoadingEvents } = state;
  const { showNotification } = useInAppNotification();
  const { enabled: eventInAppNotificationsEnabled, isLoaded: eventInAppPrefLoaded } =
    useEventInAppNotificationPreference();
  const t = useTranslate();

  // Use refs for notification prefs so checkAndNotify doesn't need to depend on them
  // (avoids recreating checkAndNotify and re-triggering the fetch effect on every pref load)
  const notifPrefsRef = useRef({ enabled: eventInAppNotificationsEnabled, isLoaded: eventInAppPrefLoaded });
  notifPrefsRef.current = { enabled: eventInAppNotificationsEnabled, isLoaded: eventInAppPrefLoaded };

  const showNotificationRef = useRef(showNotification);
  showNotificationRef.current = showNotification;

  const tRef = useRef(t);
  tRef.current = t;

  const computeUnseenCount = useCallback(
    (evts: SferaEvent[], seen: Set<string>) =>
      evts
        .filter((e) => e.type === "social" || e.type === "plus")
        .filter((e) => !seen.has(e.id)).length,
    [],
  );

  const checkAndNotify = useCallback(
    async (fromForeground = false, silent = false) => {
      if (!silent) dispatch({ type: "FETCH_START" });
      try {
        const completed = await getOnboardingCompleted();
        if (!completed) {
          dispatch({ type: "FETCH_DONE", events: [], seenIds: new Set(), unseenCount: 0, hasNewEvents: false });
          return [];
        }
        const { events: fetched, newCount, newCommunities } =
          await fetchAndCheckForNewEvents();
        const seen = await getSeenEventIds();
        const count = computeUnseenCount(fetched, seen);
        dispatch({ type: "FETCH_DONE", events: fetched, seenIds: seen, unseenCount: count, hasNewEvents: count > 0 });
        // Badge on Events tab always reflects unseen count; only the in-app popup is gated by preference
        const { enabled, isLoaded } = notifPrefsRef.current;
        if (isLoaded && enabled && newCount > 0 && newCommunities.length > 0) {
          const tFn = tRef.current;
          const communityName = newCommunities
            .map((c) => (c === "social" ? tFn("events.section.social") : tFn("events.section.plus")))
            .join(", ");
          const show = () =>
            showNotificationRef.current({
              title: tFn("events.newEventsTitle"),
              message: tFn("events.newEventInCommunity").replace("{community}", communityName),
              emoji: "✨",
              duration: 4000,
            });
          if (fromForeground) {
            InteractionManager.runAfterInteractions(() => {
              setTimeout(show, 600);
            });
          } else {
            show();
          }
        }
        return fetched;
      } catch (e) {
        if (!silent) dispatch({ type: "FETCH_DONE", events: [], seenIds: new Set(), unseenCount: 0, hasNewEvents: false });
        throw e;
      }
    },
    [computeUnseenCount],
  );

  const markEventAsSeen = useCallback(
    async (eventId: string) => {
      await markSeenInStorage(eventId);
      const next = new Set(seenIds);
      next.add(eventId);
      const count = computeUnseenCount(events, next);
      dispatch({ type: "MARK_SEEN", eventId, seenIds: next, unseenCount: count, hasNewEvents: count > 0 });
    },
    [events, seenIds, computeUnseenCount],
  );

  const refreshEvents = useCallback(
    async (silent = false) => checkAndNotify(false, silent),
    [checkAndNotify],
  );

  const getCachedEvents = useCallback(() => events, [events]);

  const resetEventsState = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  useEffect(() => {
    void checkAndNotify(false);
  }, [checkAndNotify]);

  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          // Defer until after any pending interactions (e.g. user tapping the menu
          // button right as the app resumes) so the network fetch + dispatch don't
          // cause re-renders while the user is actively interacting.
          InteractionManager.runAfterInteractions(() => {
            void checkAndNotify(true);
          });
        }
      },
    );
    return () => sub.remove();
  }, [checkAndNotify]);

  const contextValue = useMemo(() => ({
    hasNewEvents,
    unseenCount,
    markEventAsSeen,
    refreshEvents,
    getCachedEvents,
    resetEventsState,
    isLoadingEvents,
  }), [hasNewEvents, unseenCount, markEventAsSeen, refreshEvents, getCachedEvents, resetEventsState, isLoadingEvents]);

  return (
    <SferaEventsBadgeContext.Provider value={contextValue}>
      {children}
    </SferaEventsBadgeContext.Provider>
  );
}

export function useSferaEventsBadge() {
  const ctx = useContext(SferaEventsBadgeContext);
  if (!ctx) {
    throw new Error(
      "useSferaEventsBadge must be used within SferaEventsBadgeProvider"
    );
  }
  return ctx;
}
