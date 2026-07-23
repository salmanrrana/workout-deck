# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People following workout videos and interval routines, often using an iPad at arm's length while actively exercising.

## Product Purpose

WorkoutDeck turns workout videos into a personal deck, keeps exercise cues synchronized during playback, provides a dedicated interval timer, and records completed workout activity.

## Positioning

WorkoutDeck combines a curated video deck, glanceable workout instrumentation, synchronized cues, and activity history in one focused workout companion.

## Operating Context

The product is used mid-workout, commonly on an iPad in landscape orientation. Users may need to read state from across a room and operate controls quickly with limited precision.

## Capabilities and Constraints

- Supports YouTube and Vimeo workout videos.
- Preserves the existing video, timer, history, and workout-session routes.
- Uses a dark-only interface and shared typed UI primitives.
- Timer presets may remain client-side; persistence is not required.
- Audio and screen wake lock are progressive enhancements and must degrade safely when unavailable.

## Brand Commitments

The product name is WorkoutDeck. Its established metaphor is a deck of workout cards paired with an instrument-like timer and cockpit-like session screen. Product copy is direct and functional.

## Evidence on Hand

The repository contains working video library, workout-session, logging, audio, and design-system implementations. No testimonials, customer claims, or commercial performance evidence are present and none should be fabricated.

## Product Principles

- Make the current state and next action understandable at a glance.
- Assign color by meaning rather than decoration.
- Keep controls operable during physical activity.
- Preserve product truth and existing workout behavior.
- Treat accessibility and reduced motion as core behavior.

## Accessibility & Inclusion

Essential information must not rely on color alone. Interactive controls need visible keyboard focus, generous touch targets, semantic labels, and reduced-motion alternatives.
