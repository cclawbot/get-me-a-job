# 🎯 Get Me a Job

A modern TypeScript full-stack job search application powered by Gemini.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: SQLite + Prisma ORM
- **AI Integration**: Gemini CLI (Primary) / Anthropic SDK (Bypassable)
- **Architecture**: Monorepo with npm workspaces

## Prerequisites

- Node.js 18+ and npm
- [Gemini CLI](https://github.com/google-gemini-cli/gemini) installed globally (`npm install -g @google-gemini-cli/gemini`)

## Setup

1. **Install all dependencies**
   ```bash
   npm install
   ```

2. **Initialize the database**
   ```bash
   cd backend && npx prisma migrate dev && cd ..
   ```

3. **Configure Environment Variables**

   Create `.env` files in both the `frontend` and `backend` directories.

   **Backend (`backend/.env`)**:
   ```env
   PORT=3001
   DATABASE_URL="file:./dev.db"
   ENABLE_AI_FEATURES=true
   ENABLE_CLAUDE=false
   # For local use:
   GEMINI_API_KEY=your_gemini_api_key
   # For Agent/GCA use:
   GOOGLE_GENAI_USE_GCA=true
   ```

   **Frontend (`frontend/.env`)**:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_ENABLE_CLAUDE=false
   ```

## Development

```bash
# Run both frontend and backend concurrently
npm run dev

# Backend will run on http://localhost:3001
# Frontend will run on http://localhost:5173
```

## AI Configuration (Gemini)

This project is configured to use the **Gemini CLI** for all AI features (Resume parsing, Job search scraping, STAR story optimization, and Job description fetching).

- **Default Model**: `gemini-3-flash-preview`
- **Authentication**:
  - **Local Development**: Set `GEMINI_API_KEY` in your environment.
  - **OpenClaw/Agent Environment**: The project uses `GOOGLE_GENAI_USE_GCA=true` to leverage built-in cloud authentication.

To switch back to Claude, set `ENABLE_CLAUDE=true` and `VITE_ENABLE_CLAUDE=true` and provide an `ANTHROPIC_API_KEY`.

## Project Structure

```
get-me-a-job/
├── backend/          # Express.js API
│   ├── src/
│   │   ├── services/ # AI and Scraping logic
│   │   └── routes/   # API Endpoints
│   ├── prisma/       # Database schema & migrations
│   └── package.json
├── frontend/         # React + Vite app
│   ├── src/
│   └── package.json
└── package.json      # Root workspace config
```

## Database Management

```bash
# Open Prisma Studio (database GUI)
npm run prisma:studio -w backend

# Create a new migration
cd backend && npx prisma migrate dev --name <migration_name>
```
