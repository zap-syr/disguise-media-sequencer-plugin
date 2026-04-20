# Disguise Media Sequencer Plugin

This plugin provides an advanced media management and automated layer creation interface for Disguise Designer. It allows users to browse project media, configure playback settings, and automatically sequence layers onto the current track.

## Core Features

-   **Hierarchical Media Browser**: Automatically organizes `VideoClip` resources into a structured folder hierarchy based on their internal project paths.
-   **Advanced Selection Logic**:
    *   Single, Ctrl+Click (Multi), and Shift+Click (Range) selection.
    *   Visual drag-selection frame for batch selecting media cards.
    *   Top-bar "Select All" and "Deselect All" functionality.
-   **Real-time Search**: Instant filtering of media items by name within any folder view.
-   **Smart Navigation**: Persistent "ALL" and "ROOT" views alongside dynamic sub-folder tabs that support recursive navigation levels.
-   **Automated Layer Creation**: Sequences selected media as `VariableVideoModule` layers directly onto the Disguise timeline with highly configurable parameters.

## Configurable Settings

The settings panel allows full control over how layers are created:

-   **Mapping**: Select the target projection mapping for all created layers.
-   **Mode**: Choose between `Normal` and `Locked` playback modes.
-   **At end point**: Define behavior when reaching the end of a clip (`Loop`, `Ping-Pong`, or `Pause`).
-   **Duration Controls**:
    *   Custom duration for still images.
    *   Option to "Fit to Contents" for videos or set a manual override duration.
-   **Overlap**: Configure cross-fade or overlap duration (in seconds) between sequenced layers.
-   **Split Section**: Automatically split the timeline section at each new layer start.
-   **Add Cue Tag**: Automatically add and increment numeric cue tags (e.g., `1.0.1`) at the start of each layer.

## Technical Architecture

-   **Frontend**: Built with **Vue 3 (Composition API)** and **Vite**.
-   **Backend Integration**: Communicates with Disguise Designer via the **Python Execute API** (`/api/session/python/execute`).
-   **Communication**:
    *   Retrieves media and mapping data by executing Python scripts that query the `resourceManager`.
    *   Automates layer creation by injecting user settings into a robust Python script executed directly within the Designer session.
-   **Responsive Design**: Optimized for small and large window sizes with scrollable tab bars and a fixed settings sidebar.