# Resume Tailoring MVP - Setup Guide

## Overview
This MVP allows you to build a profile, create achievement stories using the STAR method, and use AI to tailor your resume for specific job descriptions.

## Prerequisites
- Node.js v25+
- Google Gemini CLI installed: `npm install -g @google-gemini-cli/gemini`
- Google Cloud Authentication (GCA) configured

## Installation
Already completed! The project is set up with:
- Backend: Express + Prisma + Google Gemini + Puppeteer (port 3001)
- Frontend: React + TypeScript + React Router (port 5173)

## Configuration

### Google Cloud Authentication
✅ **Already configured!** Using the Google Cloud Authentication (GCA) pattern for AI features.
   ```
   GOOGLE_GENAI_USE_GCA=true
   ```

The app uses **Google Gemini 3 (Flash/Pro)** for AI-powered resume tailoring.

## Running the App

The app is currently running on:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

To start the app in the future:
```bash
npm run dev
```

To stop the servers:
- Press Ctrl+C in the terminal

## Features

### 1. Profile Builder (`/profile`)
- Add your basic information (name, email, phone)
- Write a professional summary
- List your skills
- Add work experiences with dates and descriptions
- Include education history
- Add certifications

**Usage:** Fill out all sections and click "Save Profile"

### 2. Story Bank (`/stories`)
- Create achievement stories using STAR method:
  - **S**ituation: Context and background
  - **T**ask: Your responsibility or goal
  - **A**ction: Specific actions you took
  - **R**esult: Measurable outcomes
- Add tags/keywords for matching
- Include metrics (e.g., "40% increase", "$2M revenue")

**Usage:** Click "+ Add Story" and fill in each section

### 3. Tailor Resume (`/tailor`)
- Paste a job description
- AI analyzes the JD and extracts key requirements
- Generates a tailored resume with:
  - Optimized professional summary
  - Relevant experience bullets
  - ATS optimization score
  - Keyword matching
- Preview the tailored resume
- Download as professional PDF

**Usage:**
1. Enter job title and company (optional)
2. Paste the full job description
3. Click "Tailor My Resume"
4. Review the result and download PDF

### 4. My Resumes (`/resumes`)
- View all previously tailored resumes
- Download any resume as PDF
- Organized by date created

## Database
- Uses SQLite (file: `backend/prisma/dev.db`)
- Migrations already applied
- Data persists between sessions

## Architecture

### Backend Routes
- `GET /api/health` - Health check
- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create/update profile
- `GET /api/stories` - Get all stories
- `POST /api/stories` - Create story
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story
- `POST /api/resumes/tailor` - AI tailor resume
- `GET /api/resumes` - List all resumes
- `GET /api/resumes/:id` - Get specific resume
- `GET /api/resumes/:id/pdf` - Export resume as PDF

### AI Logic
The resume tailoring process:
1. Parses job description to extract skills, keywords, requirements
2. Matches user's stories to job requirements based on tags and content
3. Generates tailored resume bullets emphasizing relevant experience
4. Optimizes for ATS (Applicant Tracking Systems)
5. Calculates match score
6. Returns formatted resume with professional layout

### PDF Export
- Uses Puppeteer to generate clean PDFs
- Professional formatting with proper typography
- Includes all sections: summary, skills, experience, education, certifications
- ATS-friendly layout

## Next Steps

1. ✅ **AI configured** - Google Gemini is ready to use!
2. **Build your profile** - Complete all sections
3. **Create stories** - Add 5-10 achievement stories with different tags
4. **Tailor your first resume** - Find a job posting and paste the description
5. **Download and review** - Check the generated PDF

## Tips for Best Results

- **Profile:** Be thorough - the AI uses this as source material
- **Stories:** Focus on quantifiable achievements and specific actions
- **Tags:** Use relevant keywords that might appear in job descriptions
- **Job Descriptions:** Paste the complete JD for better analysis
- **Review:** Always review AI-generated content before sending

## Security Note
- Single-user MVP (userId: "default")
- Authentication via Google Cloud Authentication (GCA)
- For production, add authentication and per-user data isolation

## Tech Stack
- **Backend:** Express, Prisma, Google Gemini 3, Puppeteer
- **Frontend:** React 19, TypeScript, React Router, Vite
- **Database:** SQLite (Prisma ORM)
- **AI:** Google Gemini 3 (Flash & Pro)
- **PDF:** Puppeteer

Enjoy building tailored resumes! 🎯
