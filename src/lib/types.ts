// Types for JSON fields stored in the database

export type IntervalType = "work" | "rest" | "countdown" | "transition";

export interface IntervalConfig {
  type: IntervalType;
  duration: number; // seconds
  rounds?: number;
  beepInterval?: number; // seconds
}

// Helper to parse tags from JSON string
export function parseTags(tagsJson: string): string[] {
  try {
    return JSON.parse(tagsJson);
  } catch {
    return [];
  }
}

// Helper to stringify tags for storage
export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}

// Helper to parse intervals from JSON string
export function parseIntervals(intervalsJson: string): IntervalConfig[] {
  try {
    return JSON.parse(intervalsJson);
  } catch {
    return [];
  }
}

// Helper to stringify intervals for storage
export function stringifyIntervals(intervals: IntervalConfig[]): string {
  return JSON.stringify(intervals);
}
