# Disguise Media Sequencer Plugin

This plugin offers an advanced interface for media browsing and automated layer generation within Disguise Designer. Browse and select project media, configure layer parameters, choose where the layers go on the timeline, and the plugin creates the video layers for you.

There are two ways to work:

- **Simple** - the selected files become layers one after another, with one mapping and one set of settings.
- **Advanced** - build a **Layer Plan** out of groups. Each group has its own timing and settings, each layer can have its own mapping, and the whole plan is created in one go.

**Simple mode:**

![Simple mode](https://github.com/zap-syr/disguise-media-sequencer-plugin/blob/main/.github/aux-images/plugin-ui-1.png)

**Advanced mode:**

![Advanced mode, two groups](https://github.com/zap-syr/disguise-media-sequencer-plugin/blob/main/.github/aux-images/plugin-ui-2.png)



![Advanced mode, files list and plan](https://github.com/zap-syr/disguise-media-sequencer-plugin/blob/main/.github/aux-images/plugin-ui-3.png)

## Download

Download the latest release - [Media Sequencer](https://github.com/zap-syr/disguise-media-sequencer-plugin/releases/latest/download/Media.Sequencer.zip)

## Installation

To install the plugin, follow the official Disguise documentation steps - [Installing Plugins](https://help.disguise.one/designer/plugins/designer-plugin-overview#installing-plugins)

### Use it in a web browser

For the best experience, open the plugin in a web browser (Chrome or Edge) instead of the plugin window inside Disguise Designer. The plugin window in Designer doesn't support drag and drop, so dragging files, folders, mappings, layer rows and groups onto the plan only works in a browser.

To open it, enter the IP address of the director machine in the browser, for example `192.168.1.10:80`.

Inside the Designer window the plugin still works without drag and drop:

- add files to the plan with **Add to group…** in the files pane
- create groups from checked folders in the tree with **Create groups**
- assign mappings by clicking a mapping to arm it and then clicking layer slots, or with **Assign to selected**, **Assign to all** and **Auto-assign**

## Workspace

<!-- Screenshot: the workspace in Split layout (Advanced mode) -->
<!-- ![workspace](https://github.com/zap-syr/disguise-media-sequencer-plugin/blob/main/.github/aux-images/workspace.png) -->

The window has three parts: the **folder tree** on the left, the **files** in the middle and the **settings panel** on the right. In Advanced mode the **Layer Plan** opens next to the files. The layout switch picks what the centre shows:

| Layout | Shows |
|---|---|
| **Files** | Files only |
| **Split** | Files and the Layer Plan side by side |
| **Plan** | The Layer Plan only |

### Folder tree

The tree mirrors the media folders of your project, with a file count on every folder. It can be collapsed and resized. **ALL FILES** shows every media file of the project at once.

### Files

- **Breadcrumb** - the current folder path; click a part to go back up
- **Search** - filters the current folder (or all files) by name
- **Refresh** - reloads media, mappings and tracks from Designer
- **Subfolders** - shows the files of the subfolders too
- **Grid or list view**, with small, medium or large thumbnails
- **Selection** - click, Ctrl+Click (add), Shift+Click (range), or drag a selection box across the cards. The checkbox in the toolbar selects all files; when something is already selected, it clears the selection

Each card shows a live thumbnail from Designer, the duration, the type (**VIDEO**, **IMAGE** or **LIVE**) and icons for **alpha** and **audio**. In Advanced mode a card also shows which plan groups use it.

A clip whose media file was deleted in Designer is marked **MISSING**. It can't be selected or added to the plan.

## Simple mode

Select one or more files, configure the settings panel and click **Create**. A video layer is created for each selected file, one after another, in the order of the selection.

### Mappings

Pick the projection mapping applied to all created layers. The section header shows the picked mapping with its type and resolution, or **None selected**.

| Control | Description |
|---|---|
| **Filter mappings...** | Search the mappings by name |
| **Type chips** | Show only one mapping type (**All**, or a type present in the project) with the count of each. The filter is shared with Advanced mode and kept after a reload |
| **Mapping list** | One click picks a mapping. Each row shows the name, the type and the resolution. The list keeps its height while you filter, so the sections below don't move |

If the picked mapping is hidden by the filter, it stays pinned at the top of the list with a **Not in filter** badge. When nothing matches, **Clear filter** resets the search and the type. After a **Refresh**, a picked mapping that no longer exists in Designer is cleared.

### Where

Controls where the layers are placed on the timeline.

| Setting | Description |
|---|---|
| **At Playhead** | Layers start at the current playhead position |
| **Specific Time** | Layers start at a chosen track and time |
| **Track** | Pick an existing track or create a new one from the dropdown (**+ Create New Track**) |
| **Time** | Start time in `HH:MM:SS:FF` format |

### Layers

| Setting | Options | Description |
|---|---|---|
| **Mode** | Normal, Locked | Playback mode of the video layer |
| **At end** | Loop, Ping-Pong, Pause | What happens when the clip reaches its end |
| **Fade in** | Duration | Animates the brightness from 0 to full at the layer start |
| **Fit to contents** | Movie | On: every video gets its own length. Off: every video gets the fixed **Movie** duration |
| **Still images** | | Duration (seconds) of still images and single-frame clips |
| **Overlap** | | Each layer starts this long before the previous one ends |

### Timeline markers

| Marker | Description |
|---|---|
| **Split section** | Splits the timeline section at every layer start, and once after the last layer |
| **Timecode tag** | A timecode tag (`HH:MM:SS:FF`) at every layer start. Set the starting timecode and the increment per layer |
| **Cue tag** | A cue tag (e.g. `1.0.1`). The last part goes up by one per tag |
| **MIDI tag** | A MIDI note tag (e.g. `9.1`). The last part goes up by one per tag |

## Advanced mode: the Layer Plan

<!-- Screenshot: a Layer Plan with several groups, chips and mappings -->
<!-- ![layer plan](https://github.com/zap-syr/disguise-media-sequencer-plugin/blob/main/.github/aux-images/layer-plan.png) -->

Switch the settings panel to **Advanced**. The plan is a list of **groups** (G1, G2, ...). Each group holds layers, and each layer is one file with its own mapping slot. Click **Create** and the plugin places every group on the timeline, one after another, with the timing, settings and markers of each group.

The plan is saved automatically (one per Designer director) and comes back when you reopen the plugin. It also stays after Create, so you can adjust it and create again.

### Building groups

- **Drag files** from the files pane onto the plan: onto a group to add them, or between groups and at the end to create a new group there
- **Add to group…** in the files toolbar adds the selected files to an existing group or a new one
- **+ Group** in the plan header adds an empty group
- **Groups from folders** - see below

Inside the plan you can:

- **Rename** a group by clicking its name
- **Reorder layers** by dragging rows, within a group or into another one. Select several rows (click, Ctrl+Click, Shift+Click) to move them together
- **Reorder groups** by dragging a group by its header. A blue line shows where it will land; the groups renumber after the drop
- **Remove** layers with the row button, the **Remove** button of the selection bar or the Delete key, and delete a group from its header. Removals can be undone from the notification
- **Collapse or expand** groups, and jump to a group from the chips above the list

### Groups from folders

<!-- Screenshot: checked folders in the tree and the "Create groups" strip -->
<!-- ![groups from folders](https://github.com/zap-syr/disguise-media-sequencer-plugin/blob/main/.github/aux-images/groups-from-folders.png) -->

In Advanced mode, hover a folder in the tree and its icon turns into a checkbox. Check one or more folders and a strip appears under the tree:

| Folder content | Result |
|---|---|
| **Folder only** | One group per folder with the folder's own files |
| **With subfolders** | One group per folder with all its subfolders |
| **Split subfolders** | One group per folder and per subfolder that has files |

Choose where the new groups go (**At the end** or after a group) and click **Create groups**. Each group is named after its folder. You can also drag checked folders straight onto the plan.

### Mappings per layer

<!-- Screenshot: the mappings list and coloured mapping slots on the layers -->
<!-- ![mappings](https://github.com/zap-syr/disguise-media-sequencer-plugin/blob/main/.github/aux-images/mappings.png) -->

In Advanced mode the **Mappings** section of the settings panel lists every mapping of the project, with a filter and type chips. Each mapping gets its own colour, which is used on the layer slots. To assign a mapping:

- **Drag** it onto a layer slot, onto a selected row (assigns it to all selected rows) or onto a group header (assigns it to every layer of that group)
- **Click** it to arm it, then click the layer slots. **Assign to selected** in the bar assigns it to the selected rows, **Assign to all** assigns it to every layer of the plan. **Done** or Esc stops assigning
- **Auto-assign** in the plan header matches mappings to layers automatically:
  - **Match name**: the file name contains the mapping name; the longest name wins
  - **Match resolution**: the file resolution equals the mapping resolution (skipped when several mappings share it)
  - **Apply to**: layers without a mapping, the selected layers, or all layers

Mappings can be cleared per layer, per selection, per group or for the whole plan. Layers without a mapping are created without one, after a confirmation.

### Settings: Plan defaults, groups and layers

Settings are inherited in three levels: **Plan defaults → group → layer**. **Plan defaults** in the plan header holds the values every group starts with. A group or a layer can override any of them with the **chips** in its header; an overridden value is marked with ◆, and it can be reset back to the inherited value.

| Chip | Level | Options |
|---|---|---|
| **Start** | Group | **In order** (with an optional overlap) or **All at once** |
| **Tags** | Group | Tags at **Each file** or at the **Group start** |
| **Split** | Group | Section splits at **Each file** or at the **Group start** |
| **Mode** | Group, layer | Normal, Locked |
| **End** | Group, layer | Loop, Ping-Pong, Pause |
| **Fade** | Group, layer | Animate brightness and its duration |
| **Length** | Group, layer | Fit to contents, movie duration, still image duration |

With layers selected, the selection bar chooses whether the group chips edit the **Selected** layers or the whole **Group**.

The settings panel keeps the parts that apply to the whole plan: **Where** (the start of the plan on the timeline) and **Timeline markers** (which markers are on: Split section, Timecode, Cue and MIDI tags). Timecode, cue and MIDI numbering continues across the whole plan. Each group header has a mini timeline that shows where its layers and markers will go.

### Missing clips

If a clip of the plan is no longer in the project (deleted, or its media file removed in Designer), its row is marked **Missing, will be skipped**. Create skips it after a confirmation, and the rest of the plan is placed as if it wasn't there. Mappings that no longer exist are cleared from the plan with a notification.

## Issues

Found a bug or have a feature request? [Open an issue](https://github.com/zap-syr/disguise-media-sequencer-plugin/issues/new)

## License

This project is licensed under the terms of the MIT License.
