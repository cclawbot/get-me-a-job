export type AIModel = 'claude-sonnet-4-5' | 'claude-haiku-4-5';

export function getSelectedAIModel(): AIModel {
  const saved = localStorage.getItem('ai-model');
  return (saved as AIModel) || 'claude-sonnet-4-5';
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
