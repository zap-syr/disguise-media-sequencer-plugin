# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
