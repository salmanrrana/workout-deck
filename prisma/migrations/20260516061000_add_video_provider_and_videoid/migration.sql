-- Persist the source provider so bare external IDs remain unambiguous.
ALTER TABLE "Video" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'youtube';
