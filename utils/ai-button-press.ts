// Global event emitter for the central AI button press

type AIButtonPressCallback = () => void;

let aiButtonPressCallbacks: AIButtonPressCallback[] = [];

export function onAIButtonPress(callback: AIButtonPressCallback) {
  aiButtonPressCallbacks.push(callback);
  return () => {
    aiButtonPressCallbacks = aiButtonPressCallbacks.filter((cb) => cb !== callback);
  };
}

export function emitAIButtonPress() {
  aiButtonPressCallbacks.forEach((callback) => {
    try {
      callback();
    } catch {
      // Ignore callback errors
    }
  });
}
