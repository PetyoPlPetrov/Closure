// Global event emitter for spheres tab press detection
type SpheresTabPressCallback = () => void;

let spheresTabPressCallbacks: SpheresTabPressCallback[] = [];

export function onSpheresTabPress(callback: SpheresTabPressCallback) {
  spheresTabPressCallbacks.push(callback);
  return () => {
    spheresTabPressCallbacks = spheresTabPressCallbacks.filter(cb => cb !== callback);
  };
}

export function emitSpheresTabPress() {
  spheresTabPressCallbacks.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      // Error in callback
    }
  });
}

