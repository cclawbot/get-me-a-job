export type AIModel = 'claude-sonnet-4-5-20250929' | 'claude-haiku-4-5-20251001' | 'google-gemini-cli/gemini-3-flash-preview' | 'google-gemini-cli/gemini-3-pro-preview';

export const ENABLE_CLAUDE = import.meta.env.VITE_ENABLE_CLAUDE === 'true';

export function getSelectedAIModel(): AIModel {
  const saved = localStorage.getItem('ai-model');
  const model = (saved as AIModel) || 'google-gemini-cli/gemini-3-flash-preview';
  
  // If Claude is disabled and saved model is Claude, return Gemini
  if (!ENABLE_CLAUDE && model.startsWith('claude-')) {
    return 'google-gemini-cli/gemini-3-flash-preview';
  }
  
  return model;
}

export function subscribeToModelChanges(callback: (model: AIModel) => void) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<AIModel>;
    callback(customEvent.detail);
  };
  
  window.addEventListener('ai-model-changed', handler);
  
  return () => {
    window.removeEventListener('ai-model-changed', handler);
  };
}
