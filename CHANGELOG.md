# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.2] - 2026-08-12

### Added
- **Grid / List view toggle** - switch the media card panel between a Grid layout (with Small / Medium / Large thumbnail size options) and a compact List layout, via a segmented control in the action toolbar. Selection is preserved across view and size changes, and the choice persists between sessions.
- **Media card selection order** - cards now remember the order they were selected in (click, shift-click, and marquee drag all contribute to the order), shown as a numbered badge on each selected card once more than one is selected. Layers are created in this chosen order instead of their position in the folder.
- **Include subfolders** - a toggle next to the Grid/List switcher recursively shows files from all subfolders of the currently selected folder, not just its direct children. Files pulled in from a subfolder display their relative folder path alongside the filename to disambiguate files that share a name across different subfolders.

### Fixed
- **Stale selection after toggling "Include subfolders"** - the current selection and Shift+Click anchor weren't reset when toggling subfolder inclusion changed which files were visible, which could throw an error on a subsequent Shift+Click and left hidden files still counted toward "selected". The toggle now resets selection the same way changing folders or searching already did.
- **List view card corner radius** - list-view media cards used a 4px corner radius instead of the 6px used by every other card and control in the app; corrected for visual consistency.

### Changed
- **Marquee-drag selection performance** - drag-selecting over a large folder no longer does a linear scan per intersecting card on every mouse move; selection-order bookkeeping is now constant-time per card.

## [1.1.1] - 2026-05-08

### Fixed
- **Add Cue Tag validation** - replaced the previous 0-255 per-segment restriction with the correct Disguise Designer rules: max 11 total digits (dots excluded), formats `{num}`, `{num.num}`, and `{num.num.num}` only. Input is sanitised in real time (non-digit/dot characters stripped, dots capped at 2, digit count capped at 11) and a trailing dot is stripped on blur.
- **New Track name casing** - the New Track name input now converts any uppercase character to lowercase as the user types, matching the behaviour of Disguise Designer where all track names are lowercase.

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
