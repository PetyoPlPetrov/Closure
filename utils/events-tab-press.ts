// Global event emitter for events tab press detection

type EventsTabPressCallback = () => void;

let eventsTabPressCallbacks: EventsTabPressCallback[] = [];

export function onEventsTabPress(callback: EventsTabPressCallback) {
  eventsTabPressCallbacks.push(callback);
  return () => {
    eventsTabPressCallbacks = eventsTabPressCallbacks.filter((cb) => cb !== callback);
  };
}

export function emitEventsTabPress() {
  eventsTabPressCallbacks.forEach((callback) => {
    try {
      callback();
    } catch {
      // Ignore callback errors
    }
  });
}
