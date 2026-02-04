# 🎯 Get Me a Job

A modern TypeScript full-stack job search application.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: SQLite + Prisma ORM
- **Architecture**: Monorepo with npm workspaces

## Prerequisites

- Node.js 18+ and npm

## Setup

```bash
# Install all dependencies
npm install

# Initialize the database
cd backend && npx prisma migrate dev && cd ..
```

## Development

```bash
# Run both frontend and backend concurrently
npm run dev

# Backend will run on http://localhost:3001
# Frontend will run on http://localhost:5173
```

## Individual Services

```bash
# Backend only
npm run dev -w backend

# Frontend only
npm run dev -w frontend
```

## Build

```bash
npm run build
```

## Database

```bash
# Open Prisma Studio (database GUI)
npm run prisma:studio -w backend

# Create a new migration
cd backend && npx prisma migrate dev --name <migration_name>
```

## Project Structure

```
get-me-a-job/
├── backend/          # Express.js API
│   ├── src/
│   ├── prisma/       # Database schema & migrations
│   └── package.json
├── frontend/         # React + Vite app
│   ├── src/
│   └── package.json
└── package.json      # Root workspace config
```

## Security

✅ React 18 (no critical vulnerabilities)  
✅ Latest stable dependencies  
✅ SQLite for lightweight, portable database  
✅ TypeScript for type safety
