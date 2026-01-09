-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExerciseCue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "ExerciseCue_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimerPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "intervals" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT,
    "timerPresetId" TEXT,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "notes" TEXT,
    CONSTRAINT "WorkoutLog_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkoutLog_timerPresetId_fkey" FOREIGN KEY ("timerPresetId") REFERENCES "TimerPreset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_youtubeId_key" ON "Video"("youtubeId");

-- CreateIndex
CREATE INDEX "ExerciseCue_videoId_idx" ON "ExerciseCue"("videoId");

-- CreateIndex
CREATE INDEX "WorkoutLog_videoId_idx" ON "WorkoutLog"("videoId");

-- CreateIndex
CREATE INDEX "WorkoutLog_timerPresetId_idx" ON "WorkoutLog"("timerPresetId");

-- CreateIndex
CREATE INDEX "WorkoutLog_completedAt_idx" ON "WorkoutLog"("completedAt");
