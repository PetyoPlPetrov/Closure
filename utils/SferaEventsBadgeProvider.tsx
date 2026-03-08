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
  useState,
} from "react";
import { AppState, type AppStateStatus, InteractionManager } from "react-native";

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
  refreshEvents: () => Promise<SferaEvent[]>;
  /** Clear in-memory events state and badge (e.g. after Clear all app data). Call before refreshEvents() to avoid stale UI/badges. */
  resetEventsState: () => void;
}

const SferaEventsBadgeContext = createContext<
  SferaEventsBadgeContextType | undefined
>(undefined);

export function SferaEventsBadgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasNewEvents, setHasNewEvents] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [events, setEvents] = useState<SferaEvent[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const { showNotification } = useInAppNotification();
  const t = useTranslate();

  const computeUnseenCount = useCallback(
    (evts: SferaEvent[], seen: Set<string>) =>
      evts
        .filter((e) => e.type === "social" || e.type === "plus")
        .filter((e) => !seen.has(e.id)).length,
    [],
  );

  const refreshBadge = useCallback(async () => {
    const seen = await getSeenEventIds();
    setSeenIds(seen);
    const count = computeUnseenCount(events, seen);
    setUnseenCount(count);
    setHasNewEvents(count > 0);
  }, [events, computeUnseenCount]);

  const checkAndNotify = useCallback(
    async (fromForeground = false) => {
      const completed = await getOnboardingCompleted();
      if (!completed) {
        setEvents([]);
        setUnseenCount(0);
        setHasNewEvents(false);
        return [];
      }
      const { events: fetched, newCount, newCommunities } =
        await fetchAndCheckForNewEvents();
      setEvents(fetched);
      const seen = await getSeenEventIds();
      setSeenIds(seen);
      const count = computeUnseenCount(fetched, seen);
      setUnseenCount(count);
      setHasNewEvents(count > 0);

      if (newCount > 0 && newCommunities.length > 0) {
        const communityName = newCommunities
          .map((c) => (c === "social" ? t("events.section.social") : t("events.section.plus")))
          .join(", ");
        const show = () =>
          showNotification({
            title: t("events.newEventsTitle"),
            message: t("events.newEventInCommunity").replace("{community}", communityName),
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
    },
    [showNotification, t, computeUnseenCount],
  );

  const markEventAsSeen = useCallback(
    async (eventId: string) => {
      await markSeenInStorage(eventId);
      setSeenIds((prev) => {
        const next = new Set(prev);
        next.add(eventId);
        const count = computeUnseenCount(events, next);
        setUnseenCount(count);
        setHasNewEvents(count > 0);
        return next;
      });
    },
    [events, computeUnseenCount],
  );

  const refreshEvents = useCallback(
    async () => checkAndNotify(false),
    [checkAndNotify],
  );

  const resetEventsState = useCallback(() => {
    setEvents([]);
    setSeenIds(new Set());
    setUnseenCount(0);
    setHasNewEvents(false);
  }, []);

  useEffect(() => {
    void checkAndNotify(false);
  }, [checkAndNotify]);

  // Recompute badge when events change
  useEffect(() => {
    if (events.length > 0) refreshBadge();
  }, [events.length, refreshBadge]);

  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") void checkAndNotify(true);
      },
    );
    return () => sub.remove();
  }, [checkAndNotify]);

  return (
    <SferaEventsBadgeContext.Provider
      value={{
        hasNewEvents,
        unseenCount,
        markEventAsSeen,
        refreshEvents,
        resetEventsState,
      }}
    >
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
