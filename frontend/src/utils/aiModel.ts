export type AIModel = 'google-gemini-cli/gemini-3-flash-preview' | 'google-gemini-cli/gemini-3-pro-preview';

export function getSelectedAIModel(): AIModel {
  const saved = localStorage.getItem('ai-model');
  const model = (saved as AIModel) || 'google-gemini-cli/gemini-3-flash-preview';
  
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
