# Interview Script Caching Feature

## Problem
The Interview Script modal was regenerating the script every time it was opened, causing:
- Unnecessary API calls to Claude
- Increased costs
- Slower user experience
- Wasted tokens on identical requests

## Solution
Added caching to store generated interview scripts in the database and only regenerate when explicitly requested.

---

## Changes Made

### Database (`/backend`)

#### 1. **`prisma/schema.prisma`**
- Added `interviewScript` field to `Story` model
- Type: `String?` (nullable JSON)
- Stores the cached interview script object

```prisma
model Story {
  // ... existing fields
  interviewScript String?  // Cached interview script (JSON)
}
```

#### 2. **Migration**
- Created migration: `20260204112121_add_interview_script_cache`
- Adds the new column to existing database

---

### Backend API (`/backend/src/routes/stories.ts`)

#### Updated: `POST /api/stories/to-script`

**New Request Parameters:**
```typescript
{
  storyId?: number,       // Story ID for caching
  title: string,
  situation: string,
  task: string,
  action: string,
  result: string,
  metrics?: string,
  model?: string,
  regenerate?: boolean    // Force regeneration
}
```

**Behavior:**
1. **If `storyId` provided and `regenerate=false`:**
   - Check database for cached script
   - Return cached version if exists (fast!)
   - Skip AI call entirely

2. **If `regenerate=true` or no cache:**
   - Generate new script via Claude API
   - Save to database if `storyId` provided
   - Return fresh script

3. **If no `storyId`:**
   - Generate script but don't cache
   - Useful for preview/testing

**Console Logs:**
- `Returning cached interview script for story ${storyId}`
- `Generating interview script (model)...`
- `Regenerating interview script (model)...`
- `Cached script for story ${storyId}`

---

### Frontend (`/frontend`)

#### 1. **`src/components/InterviewScriptModal.tsx`**

**Props Update:**
```typescript
story: {
  id?: number;  // Added for caching
  title: string;
  situation: string;
  // ... rest
}
```

**State Changes:**
- Added `isRegenerating` state to differentiate UI states
- Loading message changes based on context:
  - Initial: "✨ Loading your interview script..."
  - Regenerating: "🔄 Regenerating interview script..."

**API Call:**
```typescript
generateScript(regenerate: boolean = false)
```
- Passes `storyId` to backend
- Passes `regenerate` flag
- Backend handles cache logic

**New UI Elements:**
- **🔄 Regenerate Button**
  - Appears next to "Copy Script" button
  - Disabled while loading
  - Shows "🔄 Regenerating..." when in progress
  - Tooltip: "Generate a new version with AI"

---

## User Flow

### First Time Opening Script:
1. User clicks "🎯 View Interview Script"
2. Modal opens with loading spinner
3. Message: "✨ Loading your interview script..."
4. **Backend checks cache → not found**
5. **Generates new script via Claude**
6. **Saves to database**
7. Displays script with buttons: [Close] [🔄 Regenerate] [📋 Copy Script]

### Opening Script Again:
1. User clicks "🎯 View Interview Script"
2. Modal opens with loading spinner
3. Message: "✨ Loading your interview script..."
4. **Backend finds cached script**
5. **Returns instantly (no API call!)**
6. Displays script immediately

### Regenerating Script:
1. User clicks "🔄 Regenerate" button
2. Loading spinner appears
3. Message: "🔄 Regenerating interview script..."
4. **Backend generates new script via Claude**
5. **Overwrites cached version in database**
6. Displays updated script

---

## Benefits

✅ **Saves Money** - No repeated API calls for the same script  
✅ **Faster UX** - Cached scripts load instantly  
✅ **Reduces Token Usage** - Only generates when needed  
✅ **User Control** - Explicit regenerate button when desired  
✅ **Smart Defaults** - Uses cache by default, regenerates on demand  

---

## Technical Notes

### Caching Strategy
- **Key:** Story ID
- **Storage:** Database (SQLite via Prisma)
- **Format:** JSON string
- **Invalidation:** Manual via Regenerate button

### Cache Invalidation Rules
Script cache is **NOT** automatically invalidated when:
- Story content is edited
- Different model is selected

**Why?** 
- User may want to keep existing script even after edits
- Explicit regeneration gives user full control
- Prevents unexpected API calls

**User can manually regenerate** whenever they want a fresh version.

### Edge Cases Handled
1. **No storyId:** Script generated but not cached (preview mode)
2. **Cache miss:** Generates and caches automatically
3. **Regenerate flag:** Always generates fresh, overwrites cache
4. **Parse error:** Falls back to generation

---

## Testing

### Test Cache Hit:
1. Open a story's interview script
2. Close the modal
3. Open the same story's script again
4. **Expected:** Loads instantly, no spinner delay

### Test Regeneration:
1. Open a cached script
2. Click "🔄 Regenerate"
3. **Expected:** New loading spinner, generates fresh script

### Test Different Stories:
1. Open Script for Story A
2. Open Script for Story B
3. **Expected:** Each has its own cached script

### Backend Logs:
```
Returning cached interview script for story 5
Generating interview script (claude-haiku-4-5)...
Cached script for story 5
Regenerating interview script (claude-sonnet-4-5)...
```

---

## Database Schema

```sql
CREATE TABLE "Story" (
    -- ... existing columns
    "interviewScript" TEXT,  -- JSON: {naturalOpening, keyPoints[], closingStatement, practiceQuestions[]}
);
```

---

## Future Enhancements

Potential improvements:
- **Smart invalidation:** Auto-regenerate if story content changes significantly
- **Version history:** Keep multiple script versions
- **Export scripts:** Batch download all scripts as PDF
- **Script analytics:** Track which scripts are most used
- **Sharing:** Share script link with others

---

**Status:** ✅ Fully Implemented  
**Date:** 2026-02-04  
**Migration:** `20260204112121_add_interview_script_cache`
