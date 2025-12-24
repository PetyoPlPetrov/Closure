// Global event emitter for spheres tab pulse animation
type SpheresTabPulseCallback = (config: { shouldPulse: boolean; pulseOnce?: boolean }) => void;

let spheresTabPulseCallbacks: SpheresTabPulseCallback[] = [];

export function onSpheresTabPulseRequest(callback: SpheresTabPulseCallback) {
  spheresTabPulseCallbacks.push(callback);
  return () => {
    spheresTabPulseCallbacks = spheresTabPulseCallbacks.filter(cb => cb !== callback);
  };
}

export function requestSpheresTabPulse(pulseOnce: boolean = false) {
  spheresTabPulseCallbacks.forEach((callback) => {
    try {
      callback({ shouldPulse: true, pulseOnce }); // Start pulsing
    } catch (error) {
      console.error('[Spheres Tab Pulse] Error in callback:', error);
    }
  });
}

export function stopSpheresTabPulse() {
  spheresTabPulseCallbacks.forEach((callback) => {
    try {
      callback({ shouldPulse: false }); // Stop pulsing
    } catch (error) {
      console.error('[Spheres Tab Pulse] Error in callback:', error);
    }
  });
}
