# WorkoutDeck - Project Specification

## Project Overview

WorkoutDeck is a personal workout companion web app that combines YouTube video playback with customizable interval timers and exercise cue overlays. It's designed for someone who curates their own collection of workout videos and wants a streamlined way to follow along with timed intervals and visual exercise prompts.

## Problem Statement

Following workout videos on YouTube while managing custom interval timing is clunky:
- Switching between a timer app and YouTube is disruptive
- No way to see upcoming exercises at a glance while the video plays
- No simple way to save and organize favorite workout videos
- No tracking of which workouts you've completed

WorkoutDeck solves this by combining video playback, interval timing, exercise cues, and workout logging into a single, purpose-built interface.

## Target Users

- Primary: The app creator (personal use)
- Usage context: iPad in a browser, during home workouts
- User is curating their own collection of YouTube workout videos and wants flexible timing tools

## Core Features (MVP)

### 1. YouTube Video Library

**Functionality:**
- Save YouTube video URLs to personal library
- Play videos embedded in the app
- Add/edit/delete videos from library
- Assign tags to videos for organization (e.g., "upper body", "cardio", "yoga", "HIIT")
- Filter video library by tags
- Search videos by title

**Data per video:**
- YouTube URL / video ID
- Title (auto-fetched from YouTube or manually entered)
- Tags (array)
- Notes (optional)
- Date added
- Exercise cues (array of timestamp + exercise name)

### 2. Interval Timer

**Functionality:**
- Create fully customizable interval sequences
- Timer types supported:
  - Work/rest intervals with rounds (e.g., 40s work / 20s rest / 10 rounds)
  - Single countdown with periodic beeps (e.g., 10-minute countdown, beep every 30 seconds)
  - Complex sequences (e.g., warm-up 60s → work 30s → rest 10s × 5 → cool-down 60s)
- Audio beeps/sounds to signal interval transitions
- Visual countdown display (large, readable numbers)
- Play/pause/reset controls
- Timer works independently of video (can use timer without a video playing)

**Timer Presets:**
- Save custom timer configurations as named presets
- Quick-load presets (e.g., "Tabata", "EMOM", "30-30")
- Edit/delete presets

**Audio:**
- Distinct sounds for: interval start, interval end, workout complete
- Volume control
- Must work on iPad Safari (handle audio context restrictions)

### 3. Exercise Cue Overlay

**Functionality:**
- Display large text overlay showing current/upcoming exercise while video plays
- Cues are timestamped to sync with video playback
- Auto-scroll to show next exercise as video progresses

**Cue Generation:**
- Attempt to auto-extract exercise names from YouTube video captions/transcript
- Use Claude API to parse transcript and identify exercise names + timestamps
- Allow manual add/edit/delete of cues for any video
- Cache extracted cues so processing only happens once per video

**Display:**
- Large, high-contrast text readable from a distance
- Show current exercise prominently
- Show next 1-2 exercises in smaller text
- Toggleable (can hide overlay if not needed)

### 4. Workout Tracking

**Functionality:**
- Log a completed workout with one tap/click
- Record: date/time, which video was used, timer preset used (if any)
- View workout history (simple list, most recent first)
- Basic stats: workouts this week/month, streak

**Data per workout log:**
- Timestamp
- Video ID (reference)
- Timer preset ID (reference, optional)
- Duration (optional)
- Notes (optional)

## Future Features (Nice-to-Have)

- Workout playlists (queue multiple videos)
- Calendar view of workout history
- Export workout data
- Multiple sound themes for timer
- Keyboard shortcuts for timer control
- Dark/light mode toggle
- Share timer presets
- Integration with fitness tracking APIs

## Technical Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14 (App Router) | React-based, API routes for backend logic, good deployment options |
| Styling | Tailwind CSS | Rapid styling, easy to create large touch-friendly UI |
| Database | SQLite + Prisma | Simple file-based DB, no external services, Prisma for type-safe queries |
| Video | YouTube IFrame API | Official API for embedding and controlling YouTube videos |
| Audio | Web Audio API | Precise timing for beeps, required for reliable interval sounds |
| AI | Claude API (Anthropic) | Extract exercises from video transcripts |
| Deployment | Vercel or self-hosted | Easy deployment for Next.js apps |

### Data Models

```
Video
├── id (uuid)
├── youtubeId (string)
├── title (string)
├── tags (string[])
├── notes (string, optional)
├── cues (ExerciseCue[])
├── createdAt (datetime)
└── updatedAt (datetime)

ExerciseCue
├── id (uuid)
├── videoId (foreign key)
├── timestamp (number, seconds)
├── exerciseName (string)
└── order (number)

TimerPreset
├── id (uuid)
├── name (string)
├── intervals (IntervalConfig[])
├── createdAt (datetime)
└── updatedAt (datetime)

IntervalConfig
├── type (enum: work, rest, countdown, transition)
├── duration (number, seconds)
├── rounds (number, optional)
├── beepInterval (number, seconds, optional)

WorkoutLog
├── id (uuid)
├── videoId (foreign key, optional)
├── timerPresetId (foreign key, optional)
├── completedAt (datetime)
├── duration (number, seconds, optional)
└── notes (string, optional)
```

### API Routes

- `GET/POST /api/videos` - List/create videos
- `GET/PUT/DELETE /api/videos/[id]` - Single video operations
- `POST /api/videos/[id]/extract-cues` - Trigger AI cue extraction
- `GET/POST /api/timer-presets` - List/create presets
- `GET/PUT/DELETE /api/timer-presets/[id]` - Single preset operations
- `GET/POST /api/workout-logs` - List/create workout logs
- `GET /api/workout-logs/stats` - Get workout statistics

### Key Pages

- `/` - Dashboard (recent workouts, quick actions)
- `/videos` - Video library with filtering
- `/videos/[id]` - Video player with timer and cue overlay
- `/videos/new` - Add new video
- `/timer` - Standalone timer (no video)
- `/presets` - Manage timer presets
- `/history` - Workout log history

## UI/UX Guidelines

### Visual Style
- Clean, minimal, functional
- High contrast for readability during workouts
- Large touch targets (minimum 44x44px for iPad)
- Large typography for timer and exercise cues (readable from 6+ feet)

### Layout Priorities
- Video player takes most of the screen when playing
- Timer display always visible during workout
- Exercise cues overlay on video (semi-transparent background)
- Controls easily accessible but not cluttering the view

### Color Palette
- Dark background during workouts (reduces eye strain, makes video pop)
- Bright accent colors for timer states:
  - Green = work/active
  - Blue = rest
  - Yellow = warning (last few seconds)
  - Red = stop/complete

### Responsive Behavior
- Optimized for iPad landscape (primary use case)
- Should work on desktop browsers
- Mobile phone is low priority but should be usable

## Non-Functional Requirements

### Performance
- Timer must be accurate (no drift over long workouts)
- Video should start playing within 2 seconds
- UI should remain responsive during video playback

### Audio
- Must handle iOS Safari audio restrictions (require user interaction to enable audio context)
- Audio beeps must be reliable and not skipped

### Offline Capability
- Timer should work offline (no network needed for beeps)
- Video library and cues cached locally
- YouTube videos require network (can't cache those)

### Browser Support
- Primary: Safari on iPad
- Secondary: Chrome, Firefox on desktop
- No need to support ancient browsers

### Data Persistence
- All data persists in SQLite database
- No data loss on app restart/reload
- Consider backup/export feature for future

## Open Questions / Risks

1. **YouTube transcript availability** - Not all videos have captions. Need graceful fallback to manual cue entry.

2. **iOS Safari audio restrictions** - Need to test that Web Audio API beeps work reliably on iPad. May need a "tap to enable audio" prompt on first use.

3. **YouTube API quotas** - If fetching video metadata frequently, may hit API limits. Consider caching aggressively.

4. **AI cue extraction accuracy** - Claude may not perfectly parse all transcripts. User editing is essential fallback.

5. **Timer accuracy on background tabs** - If browser tab goes to background, timers may throttle. Test on iPad with screen dimming.

## Success Criteria

The app is successful when:
1. User can save a YouTube video, add tags, and play it in the app
2. User can create a custom interval timer and hear beeps at the right times
3. User can see exercise cues overlaid on the video (manually added at minimum)
4. User can log a completed workout and see their history
5. All of the above works smoothly on iPad Safari
