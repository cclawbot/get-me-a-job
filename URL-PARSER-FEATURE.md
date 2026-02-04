# Job URL Parser Feature

## Overview
Added ability to automatically fetch and parse job descriptions from URLs (Seek, LinkedIn, Indeed, etc.) instead of manual copy-paste.

## Problem Solved
- **Before:** User had to manually copy job title, company, and full description from job sites
- **After:** User pastes URL → AI extracts everything automatically

---

## Changes Made

### Backend (`/backend`)

#### 1. **`src/services/ai.ts`**

**New Function: `parseJobFromURL()`**
```typescript
export async function parseJobFromURL(
  pageContent: string, 
  url: string, 
  model?: AIModel
): Promise<ParsedJobDescription>
```

**What it does:**
- Takes raw HTML/text from a webpage
- Uses Claude AI to extract:
  - Job title
  - Company name
  - Complete job description
- Returns structured JSON

**New Interface:**
```typescript
export interface ParsedJobDescription {
  jobTitle: string;
  company: string;
  jobDescription: string;
}
```

**AI Prompt Strategy:**
- Receives first 15,000 characters of page content
- Instructs AI to find job title, company, full description
- Returns clean JSON (handles markdown code blocks)

---

#### 2. **`src/routes/resumes.ts`**

**New Endpoint: `POST /api/resumes/parse-url`**

**Request:**
```json
{
  "url": "https://www.seek.com.au/job/...",
  "model": "claude-haiku-4-5"  // optional
}
```

**Response (Success):**
```json
{
  "jobTitle": "Senior Business Analyst",
  "company": "National Australia Bank",
  "jobDescription": "Full description text here..."
}
```

**Response (Error):**
```json
{
  "error": "Failed to fetch URL",
  "details": "HTTP error! status: 404"
}
```

**Process:**
1. Validates URL input
2. Fetches webpage using `fetch()` API
3. Extracts HTML/text content
4. Calls AI parsing service
5. Returns structured data

**Console Logs:**
- `🔗 Fetching job description from URL: ...`
- `✅ Fetched X characters`
- `🤖 Parsing job description with AI (model)...`
- `✅ Successfully parsed job: [title] at [company]`

**Error Handling:**
- Invalid URL → 400 Bad Request
- Fetch fails → 400 with details
- Parse fails → 500 with error message

---

### Frontend (`/frontend`)

#### 1. **`src/pages/TailorResumePage.tsx`**

**New State:**
```typescript
const [jobUrl, setJobUrl] = useState('');
const [parsingUrl, setParsingUrl] = useState(false);
```

**New Function: `handleParseUrl()`**
- Validates URL input
- Calls `/api/resumes/parse-url`
- Auto-fills job title, company, description fields
- Shows loading state during fetch
- Displays errors if fetch/parse fails

**UI Changes:**
- Added "🔗 Quick Import from URL" section at top
- URL input field with validation
- "🔍 Fetch & Parse" button
- Visual divider with "OR" text
- "✍️ Manual Entry" section below

**User Flow:**
1. User pastes job URL (e.g., Seek, LinkedIn, Indeed)
2. Clicks "🔍 Fetch & Parse"
3. Button shows "🤖 Fetching..."
4. Fields auto-populate with extracted data
5. User reviews/edits if needed
6. Proceeds with "✨ Tailor My Resume"

**Alternative Flow:**
- User skips URL and manually fills fields (still works!)

---

#### 2. **`src/pages/TailorResumePage.css`**

**New Styles:**
- `.url-section` - Container for URL import
- `.url-input-group` - Flex layout for input + button
- `.url-input` - Styled URL input with blue border
- `.divider` - OR separator line
- `.helper-text` - Gray instruction text

**Responsive:**
- Mobile: URL input and button stack vertically
- Desktop: Side-by-side layout

---

## Supported Job Sites

Works with any job posting site that includes the job details in the HTML:
- ✅ Seek.com.au
- ✅ LinkedIn
- ✅ Indeed
- ✅ Glassdoor
- ✅ Company career pages
- ✅ Most job boards

**Note:** Some sites with heavy JavaScript rendering may require additional handling in the future.

---

## Usage Examples

### Example 1: Seek Job Posting
```
URL: https://www.seek.com.au/job/90028974
```
**Extracted:**
- Job Title: "Senior Business Analyst"
- Company: "National Australia Bank"
- Description: Full JD with responsibilities, requirements, etc.

### Example 2: LinkedIn Job
```
URL: https://www.linkedin.com/jobs/view/...
```
**Extracted:**
- Job Title: "Product Manager"
- Company: "Google"
- Description: Complete posting text

### Example 3: Manual Entry
User can still manually paste text if:
- They prefer not to use URL
- URL is behind authentication
- Content is from PDF/email

---

## Technical Details

### Fetch Strategy
Using Node.js built-in `fetch()` API:
- No external dependencies
- Works with most public URLs
- Follows redirects automatically
- Timeout: default (no custom timeout set)

### AI Parsing
- Model: Uses selected model (Sonnet/Haiku toggle)
- Token limit: 4096 max tokens for response
- Context: First 15,000 chars of page (enough for most JDs)
- Fallback: Returns error if parsing fails

### Error Cases Handled
1. **Invalid URL format** → "URL is required"
2. **Network error** → "Failed to fetch URL. Please check the link..."
3. **404/403 errors** → "HTTP error! status: [code]"
4. **Parse failure** → "Failed to parse job description"
5. **Malformed response** → JSON parse error

---

## Testing

### Manual Test Steps

1. **Start the app:**
   ```bash
   cd get-me-a-job && npm run dev
   ```

2. **Open browser:**
   http://localhost:5173/tailor

3. **Test URL parsing:**
   - Paste a Seek job URL
   - Click "🔍 Fetch & Parse"
   - Verify fields auto-populate
   - Check browser console for logs

4. **Test error handling:**
   - Try invalid URL → should show error
   - Try broken link → should show error

5. **Test manual entry:**
   - Skip URL section
   - Fill fields manually
   - Should still work

### Backend Logs to Watch
```
🔗 Fetching job description from URL: https://...
✅ Fetched 45832 characters
🤖 Parsing job description with AI (claude-haiku-4-5)...
✅ Successfully parsed job: Senior BA at NAB
```

### Frontend Console Logs
```
📤 Fetching job from URL...
✅ Successfully parsed job from URL: {jobTitle: "...", company: "...", ...}
```

---

## Benefits

✅ **Saves Time** - No manual copy-paste needed  
✅ **Reduces Errors** - AI extracts complete text accurately  
✅ **Better UX** - One-click import from URL  
✅ **Flexible** - Still allows manual entry if needed  
✅ **Cross-Platform** - Works with most job sites  

---

## Future Enhancements

Potential improvements:
- **Browser Extension:** Right-click → "Send to Resume Builder"
- **Batch Import:** Process multiple URLs at once
- **Screenshot OCR:** Extract from images/PDFs
- **Auto-refresh:** Monitor URL for changes
- **Site-Specific Parsers:** Optimized scrapers for major sites
- **Authentication Support:** Handle logged-in-only postings

---

## Limitations

Current constraints:
1. **Public URLs only** - Cannot fetch authenticated pages
2. **No JavaScript rendering** - Won't work for heavily JS-dependent sites (could add Puppeteer later)
3. **Text-based only** - Cannot extract from images/PDFs
4. **Rate limits** - Subject to site's rate limiting

**Workaround:** If URL doesn't work, user can still copy-paste manually.

---

## API Reference

### POST /api/resumes/parse-url

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Job posting URL |
| `model` | string | No | AI model (default: sonnet) |

**Response (200):**
```json
{
  "jobTitle": "string",
  "company": "string",
  "jobDescription": "string"
}
```

**Errors:**
- `400` - Invalid/missing URL
- `400` - Failed to fetch URL
- `500` - AI parsing failed

---

**Status:** ✅ Fully Implemented  
**Date:** 2026-02-04  
**Integrated With:** Model toggle (Sonnet/Haiku)
