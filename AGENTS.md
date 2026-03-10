# Agents Guide (Slide Inspo Studio)

## Product Goal
Build a production-grade, in-browser slide editor that runs on GitHub Pages:
- Inspiration board for slide designs
- Full editor with master slides (Slide Masters), layouts, per-slide content
- PPTX import/export
- AI-ready export format for re-usable masters/layouts and replaceable content

## Non-negotiables
- Must run as a static site (GitHub Pages).
- No server requirement.
- Internal document format (JSON) is the single source of truth.
- Any conversion (PPTX) must roundtrip to the internal format as accurately as possible.

## Architecture (initial)
- /src/core: data model + operations (immutable-ish updates)
- /src/editor: canvas + selection + transforms + text editing
- /src/pptx: import/export adapters
- /src/ai: AI export schema + validators

## Coding standards
- Keep modules small and testable.
- Prefer pure functions for transforms and layout calculations.
- Any feature must include:
  - basic validation steps
  - at least one demo scenario in the UI

## Commit/PR expectations
- Each issue should ship an end-to-end slice (UI + model + persistence).
