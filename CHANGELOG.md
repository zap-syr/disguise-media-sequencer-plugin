# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2026-05-07

### Added
- **Create New Track** - a "New Track" action is now pinned to the bottom of the Track dropdown. Clicking it reveals an inline panel with a name input, validation (empty name and duplicate name are both blocked), and Cancel / Create buttons. The new track is immediately selected, and added to the sorted track list without requiring a refresh.
- **Add Timecode Tag** - new toggle in the TAGS group (positioned before Add Cue Tag). When enabled, two side-by-side inputs appear for **Start Time** and **Increment**, both in `HH:MM:SS:FF` format with live validation. For each created layer the timecode advances by the configured increment.

### Fixed
- **Settings panel UI overhaul** - visual hierarchy, spacing, and control consistency across the entire settings sidebar:
  - Mode and At End Point replaced with custom dropdowns matching the Mapping dropdown style (dark panel, hover highlight, selected state, click-outside to close).
  - Three-tier label hierarchy introduced: primary, secondary , and tertiary used for inline sub-labels such as "Time" and "Increment".
  - Movie Duration, Still Image Duration, Overlap, and Animate Brightness duration inputs converted to a right-aligned inline-row layout (label left, compact number input + unit right).
  - Add Cue Tag and Add MIDI Note extracted into a dedicated **TAGS** group-box.
  - Track and Time fields stacked vertically at full width inside Insert Settings.
  - Consistent 14 px gap between all controls in the settings panel, including when the Create Track panel is visible.

## [1.0.2] - 2026-05-02

### Fixed
- Replaced hardcoded 30fps frame-to-seconds conversion with a dynamic lookup. The Python script now reads `state.globalRefreshRate.asDouble` at execution time and halves the value when it exceeds 30 (e.g. 50 Hz → 25 fps, 60 Hz → 30 fps), ensuring the `HH:MM:SS:FF` start time is converted correctly for both 25 and 30 fps timelines.

## [1.0.1] - 2026-04-28

### Added
- Add MIDI Note option in INSERT SETTINGS alongside Add Cue Tag. Accepts a single number or `channel.note` format with a maximum of 6 total digits. Value is validated and sanitized on input, and the last segment increments per created layer.
- Refresh button in the top nav bar (right of search bar). Re-fetches media, mappings, and tracks in parallel without resetting current selections or settings. Button spins while the request is in progress and is disabled to prevent double-triggering.

### Fixed
- `brightnessDuration` field now clamps to 0 on negative input, consistent with `overlap`, `stillDuration`, and `movieDuration`.

### Changed
- Cue Tag input field now starts empty instead of pre-filled with `1`, consistent with the MIDI Note field.

## [1.0.0] - 2026-04-28

### Added
- 

### Fixed
- 

### Changed
- 
