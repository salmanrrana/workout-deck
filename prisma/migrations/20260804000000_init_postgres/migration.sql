-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'youtube',
    "title" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseCue" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ExerciseCue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimerPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intervals" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimerPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL,
    "videoId" TEXT,
    "timerPresetId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "notes" TEXT,

    CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "ExerciseCue" ADD CONSTRAINT "ExerciseCue_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_timerPresetId_fkey" FOREIGN KEY ("timerPresetId") REFERENCES "TimerPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

