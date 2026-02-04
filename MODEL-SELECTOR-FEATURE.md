# AI Model Selector Feature

## Overview
Added ability for users to toggle between Claude Sonnet 4.5 and Claude Haiku 4.5 models for all AI features.

## Changes Made

### Backend (`/backend`)

#### 1. **`src/services/ai.ts`**
- Added `MODELS` constant with Sonnet and Haiku options
- Added `AIModel` type export
- Updated all AI functions to accept optional `model` parameter:
  - `parseResume(resumeText, model?)`
  - `generateStory(userNotes, model?)`
  - `optimizeStory(story, model?)`
  - `storyToScript(story, model?)`
- All functions default to Sonnet if no model specified

#### 2. **`src/routes/profile.ts`**
- Updated `/parse-resume` endpoint to accept `model` parameter
- Passes model to `parseResume()` service

#### 3. **`src/routes/stories.ts`**
- Updated `/generate` endpoint to accept `model` parameter
- Updated `/optimize` endpoint to accept `model` parameter
- Updated `/to-script` endpoint to accept `model` parameter
- All endpoints pass model to respective AI service functions

---

### Frontend (`/frontend`)

#### 1. **New File: `src/utils/aiModel.ts`**
- Helper functions for model management:
  - `getSelectedAIModel()` - Gets current model from localStorage
  - `subscribeToModelChanges()` - Listen for model toggle events
- Centralizes model type and logic

#### 2. **`src/components/Navigation.tsx`**
- Added model toggle button next to the logo
- Shows current model (Sonnet or Haiku)
- Stores selection in localStorage
- Dispatches custom event when model changes
- Tooltip shows full model description on hover

#### 3. **`src/components/Navigation.css`**
- Styled `.model-toggle` button with blue theme
- Responsive sizing for mobile
- Hover and active states

#### 4. **`src/components/ResumeParserModal.tsx`**
- Imports `getSelectedAIModel()`
- Passes selected model to `/parse-resume` API

#### 5. **`src/components/StoryGeneratorModal.tsx`**
- Imports `getSelectedAIModel()`
- Passes selected model to `/generate` API

#### 6. **`src/components/InterviewScriptModal.tsx`**
- Imports `getSelectedAIModel()`
- Passes selected model to `/to-script` API

#### 7. **`src/pages/StoryBankPage.tsx`**
- Imports `getSelectedAIModel()`
- Passes selected model to `/optimize` API

---

## How It Works

### User Flow:
1. User clicks **🤖 Sonnet** or **🤖 Haiku** button in top navigation
2. Selection is saved to `localStorage.getItem('ai-model')`
3. Custom event `ai-model-changed` is dispatched
4. All AI feature buttons now use the selected model
5. Selection persists across page refreshes

### Model Differences:
- **Claude Sonnet 4.5** (default)
  - More powerful, better quality
  - Slower, higher cost
  - Best for complex resumes and detailed stories

- **Claude Haiku 4.5**
  - Faster, lower cost
  - Good quality for most tasks
  - Best for quick iterations and simple content

---

## API Changes

All AI endpoints now accept optional `model` parameter:

```typescript
POST /api/profile/parse-resume
{
  "resumeText": "...",
  "model": "claude-haiku-4-5"  // optional, defaults to sonnet
}

POST /api/stories/generate
{
  "notes": "...",
  "model": "claude-sonnet-4-5"  // optional
}

POST /api/stories/optimize
{
  "title": "...",
  "situation": "...",
  // ... other STAR fields
  "model": "claude-haiku-4-5"  // optional
}

POST /api/stories/to-script
{
  "title": "...",
  "situation": "...",
  // ... other STAR fields
  "model": "claude-sonnet-4-5"  // optional
}
```

---

## Testing

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Toggle between Sonnet/Haiku in nav bar
4. Test any AI feature (resume parser, story generator, etc.)
5. Check browser dev console for model selection logs
6. Verify localStorage stores choice: `localStorage.getItem('ai-model')`

---

## Future Enhancements

- Show model cost/speed comparison tooltip
- Add usage statistics per model
- Allow model selection per-feature (not global)
- Add more models (e.g., Opus, GPT-4, etc.)
- Display token usage/cost estimates

---

**Status:** ✅ Fully Implemented
**Date:** 2026-02-04
