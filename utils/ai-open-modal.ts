// Global event emitter for triggering the AI modal from outside the Spheres screen
type AIModalOpenCallback = () => void;

let aiModalOpenCallbacks: AIModalOpenCallback[] = [];

export function onAIModalOpen(callback: AIModalOpenCallback) {
  aiModalOpenCallbacks.push(callback);
  return () => {
    aiModalOpenCallbacks = aiModalOpenCallbacks.filter(cb => cb !== callback);
  };
}

export function emitAIModalOpen() {
  aiModalOpenCallbacks.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      // Error in callback
    }
  });
}
