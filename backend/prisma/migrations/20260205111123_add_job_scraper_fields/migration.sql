-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "salary" TEXT,
    "url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'new',
    "postedDate" TEXT,
    "workType" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "keywords" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Job" ("company", "createdAt", "description", "id", "location", "salary", "title", "updatedAt", "url") SELECT "company", "createdAt", "description", "id", "location", "salary", "title", "updatedAt", "url" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE UNIQUE INDEX "Job_url_key" ON "Job"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
