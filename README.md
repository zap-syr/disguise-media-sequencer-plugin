# Disguise Media Sequencer Plugin

This plugin offers an advanced interface for media browsing and automated layer generation within Disguise Designer. It enables users to navigate and select project media assets, configure layer parameters, and define timeline placement to facilitate the automated sequencing of video layers.

![plugin ui](https://github.com/zap-syr/disguise-media-sequencer-plugin/blob/.github/aux-images/plugin-ui.png)

## Download

Download the latest release - [Media Sequencer](https://github.com/zap-syr/disguise-media-sequencer-plugin/releases/latest/download/Media.Sequencer.zip)

## Installation

To install the plugin, follow the official Disguise documentation steps - [Installing Plugins](https://help.disguise.one/designer/plugins/designer-plugin-overview#installing-plugins)

## PLugin Chore

### Media Browser

The center workspace gives you a full view of your project Media Assets, organized into the same folder hierarchy as they appear in your project.

- **ALL view** - shows every media file in the project at once
- **ROOT view** - shows top-level files and folders only
- **Folder tabs** - navigate into subfolders with persistent breadcrumb-style tabs
- **Search** - instantly filter visible media by name
- **Selection** - single click, Ctrl+Click (multi-select), Shift+Click (range), or drag a selection box across cards
- **Select All / Deselect All** - quick controls in the top bar

Thumbnails are fetched live from Designer for each media item.

### Creating Layers

Select one or more Media Assets, configure your settings in the right panel, and click **Create Layers**. The plugin will sequence a Video layer for each selected item onto the timeline in order.

## Settings Panel

### Layer Properties

| Setting | Options | Description |
|---|---|---|
| **Mapping** | | Select the projection mapping applied to all created layers. The dropdown is searchable |
| **Mode** | Normal, Locked | Playback mode for the video layer |
| **At End Point** | Loop, Ping-Pong, Pause | Behaviour when the clip reaches its end |
| **Animate Brightness** | | Adds a brightness fade-in at the start of each layer, with configurable duration |

### Layer Duration

| Setting | Description |
|---|---|
| **Fit to Content** | When enabled, video layers are sized to match the clip's actual length |
| **Movie Duration** | Manual duration override for video clips (used when Fit to Content is off) |
| **Still Image Duration** | Duration (in seconds) used for still images and single-frame clips |


### Insert Settings

Controls where the layers are placed on the timeline.

| Setting | Description |
|---|---|
| **At Playhead** | Layers are inserted starting at the current playhead position |
| **Specific Location** | Layers are inserted at a chosen track and timecode position |
| **Track** | Select an existing track or create a new one directly from the dropdown |
| **Time** | Start timecode in `HH:MM:SS:FF` format (only active in Specific Location mode) |
| **Overlap Layers** | Overlap duration (in seconds) between consecutive layers |
| **Split Section** | When enabled, the timeline section is automatically split at the start of each new layer. |

### Tags

Optional tags written to the timeline at the start of each layer.

| Tag | Description |
|---|---|
| **Add Timecode Tag** | Writes a timecode string (`HH:MM:SS:FF`) at each layer. Configure the starting timecode and the per-layer increment |
| **Add Cue Tag** | Writes a numeric cue tag (e.g. `1.0.1`). The last segment auto-increments across layers |
| **Add MIDI Note** | Writes a MIDI note tag (e.g. `9.1`). The last segment auto-increments across layers |

## Issues

Found a bug or have a feature request? [Open an issue](https://github.com/zap-syr/disguise-media-sequencer-plugin/issues/new)

## License

This project is licensed under the terms of the MIT License.