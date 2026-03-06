// Global event emitter for home tab press detection (fires even when Home tab is already focused)
type HomeTabPressCallback = () => void;

let homeTabPressCallbacks: HomeTabPressCallback[] = [];

export function onHomeTabPress(callback: HomeTabPressCallback) {
  homeTabPressCallbacks.push(callback);
  return () => {
    homeTabPressCallbacks = homeTabPressCallbacks.filter((cb) => cb !== callback);
  };
}

export function emitHomeTabPress() {
  homeTabPressCallbacks.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      // Error in callback
    }
  });
}
