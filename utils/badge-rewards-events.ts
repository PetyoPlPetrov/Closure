/**
 * Tiny in-process event bus for streak-badge reward changes.
 *
 * Reward unlocks/downgrades happen when the streak changes (memory created,
 * day rollover via recalculateStreak). Anything that displays or gates a
 * reward (moment colors, AI daily limit, exam daily limit, entity caps...)
 * can subscribe here to refresh immediately, without waiting for AppState
 * changes or screen remounts.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Notify all subscribers that badge-derived rewards may have changed. */
export function notifyBadgeRewardsChanged(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Swallow listener errors so one bad subscriber can't break the others.
    }
  });
}

/** Subscribe to badge-rewards changes. Returns an unsubscribe function. */
export function subscribeBadgeRewardsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
