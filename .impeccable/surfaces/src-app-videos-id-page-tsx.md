---
version: 1
slug: "src-app-videos-id-page-tsx"
primary_target: "src/app/videos/[id]/page.tsx"
related_targets: ["src/components/ExerciseCueOverlay.tsx","src/components/CueEditor.tsx","src/components/AutoExtractButton.tsx","src/components/VimeoPlayer.tsx"]
---

## Scope and mode

- Surface: workout video session (`/videos/[id]`)
- Mode: Operate

## Audience and job

People actively following a workout, commonly reading an iPad from arm's length. Their primary job is to see the current exercise and elapsed time, control playback with imprecise taps, and log the completed effort.

## Content and constraints

- Preserve YouTube and Vimeo playback, cue synchronization, seek-on-cue, and workout logging.
- Player and active cue lead; elapsed time is the instrument rail's dominant reading.
- Playback state always uses text plus semantic color.
- Cue extraction and editing stay available but collapsed outside the live-control hierarchy.
- Two columns at iPad landscape widths; one column on narrow screens.

## Direction and memorable moment

A graphite workout cockpit with a single green GO signal, semantic paused/ended states, oversized mono elapsed time, and a high-contrast current-exercise callout that remains legible across the room.

## Unresolved decisions

None for this iteration.
