# Plan: UI redesign - Layer Plan (groups, per-layer mappings, settings inheritance)

**Source:** mockup "Media Sequencer - Mapping Assignment Redesign"
(https://claude.ai/artifact/CuCcaCxYYUwYeEqoEuVUhv, artboard `Main.dc.html`, 1440×900, interactive).
**Baseline:** current plugin version 1.1.2 (`MediaSequencer.vue` ~1900 lines, `MediaCard.vue`, `disguiseService.js`).
**Date:** 2026-10-08

---

## 0. Guiding principle

The mockup is a prototype. It **simplifies** some of what the plugin already does. If
something is missing from the mockup, that does not mean it should be removed. New
features are added on top of what exists. The current workflow is kept in full as the
**Simple** mode.

### 0.1. In the plugin but not in the mockup - must be kept

| Feature | Where today | Action |
|---|---|---|
| Left sidebar resize (150–300px) + collapse to 50px | `startResize`, `toggleSidebar` | Keep. In Split layout the sidebar starts collapsed (as in the mockup), but it can still be expanded and resized |
| Breadcrumbs with clickable segments | `breadcrumbPath` | Keep in every mode. The mockup shows breadcrumbs only in Simple and the layout switcher in Advanced; place both |
| Refresh button (media + mappings + tracks) | `handleRefresh` | Keep in the top bar |
| Grid/List toggle, S/M/L grid size | `viewMode`, `gridSize` | Keep. The mockup always uses grid in Browse and list in Split; make these the **layout defaults**, while the user's choice in Browse is still respected |
| "Include subfolders" | `includeSubfolders` | Keep |
| Marquee selection with "sweep order", Ctrl inversion | `startSelection/updateSelection` | Keep. Must also work in the list view of the Files pane in Split |
| Selection-order number on cards | `selectionOrderMap` | Keep (the mockup has the badge too) |
| Real thumbnails `/api/v1/thumbnail/{uid}` | `MediaCard.vue` | Keep. The mockup uses coloured placeholders |
| viewMode/gridSize/includeSubfolders persisted in localStorage | `readStored` | Keep and extend (see §6.4) |
| Searchable mapping dropdown | Layer Properties | Keep for Simple (the mockup uses a plain `<select>`) |
| Track picker with search + **create new track** | `createTrack`, `isCreatingTrack` | Keep. The mockup has a plain select without "+ Create New Track" |
| Insert: At Playhead / Specific Time + HH:MM:SS:FF validation | `isStartTimeValid` | Keep |
| Timecode tag: **Start Time + Increment** | `timecodeStart/Increment` | Keep. The mockup only has a toggle |
| Cue tag: `X.Y.Z` value with input mask and auto-increment | `handleCueTagInput`, `isCueValid` | Keep |
| MIDI tag: `ch.note` value with mask and auto-increment | `handleMidiNoteInput` | Keep. The mockup has a toggle without a value |
| Brightness fade time | `brightnessDuration` | Keep (also in the mockup as `brightT`) |
| File selection reset when folder/search changes | `watch([selectedFolderId, ...])` | Keep for **file selection**. It does not affect the plan: the plan is independent of the current folder |
| Click on empty space clears selection | `handleContainerClick` | Keep for the files pane. For the plan: Esc / click on empty plan area |

### 0.2. From the mockup - do NOT carry into the product

- Fake data `FOLDERS/MEDIA/MAPS`, coloured placeholders instead of thumbnails, "(prototype)" toast.
- Dead code in the mockup: `ap*` (old "apply panel"), `armed` mapping (click a mapping,
  then click a slot), `tTiming/tLayer/tDur` tabs, `allbar`, `selbar`, `ticks`/ruler,
  per-row `bar` strips. State exists for them, but the markup does not use it.
  **Exception - the "armed" mode.** It should be implemented as the keyboard alternative
  to drag & drop (see §4.6, accessibility).
- IBM Plex font and the mockup palette (`#4C9AFF`, `#121315`…). Visuals must be translated to
  the project palette (skill `disguise-css`), see §7.

---

## 1. What the mockup introduces - overview

1. **Two creation modes** (switch in the right panel header): **Simple | Advanced**.
   - *Simple* - current behaviour: select files, pick one mapping for all layers, create them
     one after another.
   - *Advanced* - **Layer plan**: files are collected into **groups** (G1, G2…). Each group
     has its own timing, tags and splits. Each **layer** has its own mapping. Settings are
     inherited: *Plan defaults → Group → Layer*.
2. **Workspace layout** (Advanced only): **Files | Split | Plan**.
3. **Mappings panel** on the right (Advanced): search, filter by mapping type with counts,
   colour tag, resolution, "used by N layers". A mapping can be dragged onto a layer slot,
   onto the selected rows, or onto a group header.
4. **Auto-assign**: assigns mappings automatically by file name and/or resolution, with a
   scope.
5. **Plan defaults**: default values for the plan. A group and a layer can override them;
   overrides are marked with ◆.
6. **Group mini-timeline** in the header: where the group sits on the plan's overall scale,
   with split and tag markers.
7. Footer summary "N groups, M layers, K mappings, X without mapping, duration" and a
   **Create M layers** button.
8. **Toasts** instead of `alert()`.

---

## 2. Detailed mockup UI breakdown

### 2.1. Left panel - Hierarchy

- **All Files** row with a count of all files. Folders show a file count **including
  subfolders** (`folderCount = descOf(id)`). **New:** the current tree has no counts.
- The folder chevron is separate from the row click (row click selects the folder, chevron
  expands it). Same as today.
- In Plan layout the panel is hidden entirely. In Split it starts collapsed (48px). In Browse
  it is expanded.

### 2.2. Centre top bar

- Simple: breadcrumbs.
- Advanced: **Files / Split / Plan** segmented control with icons.
- Keep search and Refresh (§0.1). The mockup moves search into the Files pane toolbar.

### 2.3. Files pane

- Toolbar:
  - master checkbox (all / partial / none) and "N of M selected" - same as today;
  - search, placeholder "Search all files…" or "Search current folder…";
  - Advanced only: **"Add to group…"** `select` with options "G1, Name (count)" and a
    **"+ New group"** button. Both are disabled when nothing is selected. *(Phase 8c: the
    button is removed; "New group" becomes the select's first option, see §2.3.0.)*
- **Browse** - card grid:
  - selection-order badge;
  - **"G1, G3"** badge: which plan groups already contain this file. **New**, useful;
  - duration (`12s`, `1m 30s`, "still");
  - file type.
- **Split** - compact list:
  - 34×24 thumbnail with order badge;
  - name;
  - `res, duration` subtitle;
  - group tag on the right.
- File rows are **draggable** (Advanced only). If the dragged row is selected, the whole
  selection is dragged; otherwise only that row. Drop targets:
  - a group - files are appended;
  - a layer row - inserted before or after, depending on which half of the row.
- Title hint: "Click, Ctrl/Cmd+click, Shift+click range, drag into a group".
- In the mockup a Shift-range keeps its direction (`range.reverse()`), and Ctrl+Shift adds the
  range to the existing selection. Today Shift replaces the selection without Ctrl additivity
  - **align with the mockup**.

#### 2.3.0. One-row toolbar, drop-to-create groups, folder tree fixes (owner request, 2026-10-10)

**Why.** In Split the files pane is narrow (420px, down to 220px), and the Advanced toolbar takes
two rows: master checkbox + "N of M selected", "Add to group…", "+ New group" on the first, the
view toggles wrapped onto the second. Dragging files into the plan is the main way to build it,
so the separate "+ New group" button is not needed.

- **"+ New group" button removed** (Advanced, every layout). Its job moves to:
  - the **"Add to group…" select**: a first option **"New group"** above "G1, Name (count)"
    (a separator between them). It keeps a way to create a group without dragging: keyboard
    users and the Files layout, where the plan is not visible. Same result as the old button:
    the new group gets the selected files in selection order, the selection is cleared, the
    workspace switches Files → Split, the group flashes;
  - **dropping files onto empty plan space** (below).
- **One toolbar row**: master checkbox, "N of M selected", "Add to group…", then the view
  toggles (grid/list, size) pushed right. Nothing wraps at the Split width. When the pane is
  narrower (down to 220px): "N of M selected" shortens to "N/M", the select shrinks (min
  ~110px, its label ends with an ellipsis), and the size toggle hides before anything wraps.
  Simple mode is unchanged (it has no group controls).
- **Drop files onto empty plan space → a new group**:
  - targets: the empty plan (no groups yet) and the free space under the last group, including
    the list's bottom padding;
  - while files are dragged, the target shows a dashed zone "Drop to create a new group"
    (the style of the folder gap zones); it highlights blue on hover;
  - result: a new group "Group N" at the end of the plan with the dragged files in drag order
    (the selection order when the selection is dragged), no overrides; toast "G3 created,
    5 files"; the group flashes and scrolls into view; the file selection is cleared;
  - the zones **between** groups that folders already show (§2.3.2) also accept files and
    create the group at that position, so files and folders behave alike;
  - a drop onto a group or a row keeps today's behaviour (add to that group);
  - folders dropped on the same empty space already create groups (§2.3.2), no change.
- The empty-plan hint becomes: "Drag files here to create a group, or select folders in the
  tree. Repeat to build Group 2, Group 3 and so on."

**Folder tree fixes** (owner request, 2026-10-10, same phase):
- **Folder names never move.** Today the folder checkbox (Advanced) is added with
  `display: none → flex` on hover and while folders are checked, so it pushes the folder icon and
  the name to the right. Instead the checkbox takes the **folder icon's place** in the same
  16px cell (the pattern of the plan rows, where the checkbox replaces the row number): the icon
  shows by default, the checkbox shows on hover, on keyboard focus and on every row while
  folders are checked. The cell never changes width, so names, counts and the selected-row
  border stay put. "ALL FILES" has no checkbox and keeps its icon.
- **Expand arrow like the group header.** The tree chevron is a thin grey stroke "›" (`#555555`,
  rotated without animation). It becomes the same control as the group header's (`.chev` in
  `PlanGroup.vue`): a filled triangle 10px, `#aaaaaa`, white on hover, a 22×22 button with
  4px radius, rotated 90° when expanded with a 0.18s transition, `aria-expanded` and an
  "Expand / Collapse <folder>" label. Rows without children keep an empty cell of the same
  width, so names stay aligned.
- **Folder checkbox stands out from the icon** (owner follow-up, 2026-10-10): planned in
  Phase 9, item E.

#### 2.3.1. Alpha and audio indicators (owner request, not in the mockup)

Every file shows whether its video asset has an **alpha channel** and whether it contains
**audio**:
- **Grid card:** small icon badges in the footer next to the type and duration:
  - alpha: checkerboard icon;
  - audio: speaker icon.
  Show a badge only when the flag is true; no "no alpha" noise. Tooltip: "Alpha channel" /
  "Audio" (no channel count: not available via the API).
- **List row (Browse list + Split):** the same icons after the `res, duration` subtitle.
- **Plan row:** the same icons after `start, length, res`. Alpha matters when stacking
  layers (`timing='same'`).
- **Filter (nice to have):** toggle chips "Alpha" / "Audio" next to the search in the Files toolbar.
- Unknown values (`null`, e.g. stills, see §12) show no badge.
- Data source: `getMediaDetails` (§5.2), loaded once with the rest of the clip metadata.

#### 2.3.2. Folder multi-select → groups from folders (owner request, not in the mockup)

**Goal:** in **Split** and **Files** layouts (Advanced mode), the user selects several folders
in the hierarchy at once and gets **one plan group per folder**, filled with that folder's
files, in one action.

**Selecting folders (Hierarchy panel):**
- **Navigation is unchanged.** A plain click on a folder still opens it (single
  `selectedFolderId`, breadcrumbs, file pane). Folder multi-selection is a **separate set**,
  `checkedFolders`, so browsing never destroys a folder selection.
- Ways to multi-select:
  - **Ctrl/Cmd+click** toggles a folder in `checkedFolders`;
  - **Shift+click** selects the range of *visible* tree rows from the anchor;
  - a **checkbox** appears on each folder row on hover, and stays visible on every row while
    `checkedFolders` is not empty (same pattern as plan rows, §6.5).
- Checked folders get the selection style used for selected rows. "All Files" can't be checked.
- **Esc** inside the tree, or the strip's "Clear" button, empties `checkedFolders`.
- A count badge appears on collapsed parents that contain checked descendants, so selections
  inside collapsed branches are not lost from view.
- **Split layout:** the tree starts collapsed (48px), so a "Folders" toggle in the Files pane
  toolbar expands it. Ctrl/Shift-clicking a folder while the tree is collapsed is not
  possible, so the expand path must be obvious.

**Action strip** (appears at the bottom of the Hierarchy panel when ≥1 folder is checked):
- "**3 folders, 47 files**" (the file count follows the content option below).
- **Content** segmented control (persisted, default = the "Include subfolders" toggle state):
  - **Folder only** - direct files of each checked folder;
  - **With subfolders** - each checked folder's files plus all descendants, flattened, one group;
  - **Split subfolders** - one group per checked folder **and** one per descendant subfolder
    that has direct files.
- Group name: the folder name. With **Split subfolders** the descendant groups use the path
  relative to the checked folder, e.g. `Act_2 / Loops`.
- File order inside a group: **by name, numeric-aware** (`byNameAsc`, same as the grid).
- Group order: **tree order** (top to bottom), not click order, so it is predictable.
- **Overlapping selections:** a folder and one of its descendants are both checked, and the
  content mode includes subfolders. The descendant is **skipped** (its files are already in
  the parent's group), and the strip says "1 nested folder skipped". With **Folder only** both
  are kept, because the file sets don't overlap.
- **Empty results:** folders with no files in the chosen mode are skipped, with a note
  "2 empty folders skipped".
- Buttons:
  - **Create N groups** (primary) - appends the groups to the end of the plan;
  - target dropdown "**Insert after…**" (end of plan / after G1 / after G2…);
  - **Clear**.
- After creation:
  - `checkedFolders` is cleared;
  - the workspace switches to Split if it was Files (same as `jump()`);
  - the first new group flashes and scrolls into view;
  - toast: "3 groups created, 47 files".
- New groups start with **no overrides**: they inherit Plan defaults, like any new group.

**Drag & drop:** dragging a checked folder, or an unchecked one which then becomes the
selection, into the Layer plan uses the same content mode:
- dropping between groups inserts the new groups there (a drop indicator between group
  headers);
- dropping onto a group's body **adds the files to that group** instead (one folder's files,
  or all checked folders' files concatenated in tree order);
- `dragPayload` gets a fourth kind: `{ kind: 'folders', ids }` (§4.5).

**Keyboard:** with the tree focused, Space toggles the focused folder and Enter runs
"Create N groups".

**Files layout specifics:** the plan pane is hidden there, so "Create N groups" switches to
Split after creating (see above). The grid keeps showing the navigated folder only. The union
of checked folders is not displayed; the strip's count is the preview.

### 2.4. Layer plan pane

**Header (`.ph`)**:
- "LAYER PLAN" and a summary "4 groups, 12 layers, 6m 10s";
- **Auto-assign** button (toggle) and **Plan defaults** button (toggle, gear icon) - both use
  the "apply" style when active;
- **"+ Group"** - creates an empty group.

**Group navigation (`.gnav`)**, when there is at least one group:
- chips "G1 Opening 3". A click scrolls to the group and highlights it for 1.4s (`flash`);
- icon button **Clear mappings in all groups** (disabled when no mappings are assigned);
- **Collapse all / Expand all**.

**Plan defaults panel (`.pdbox`)**:
- seven items, each a segmented control plus, where relevant, a numeric field in seconds:
  - Layers start: One after another / All at once + Overlap (disabled for All at once);
  - Tags: Each file / Group start;
  - Split section: Each file / Group start;
  - Mode: Normal / Locked;
  - At end point: Loop / Ping-Pong / Pause;
  - Animate brightness: Off / Fade in + Fade time (disabled when Off);
  - Layer duration: Fit to contents / Fixed length + Movie (disabled for Fit) + Still image;
- footer:
  - summary "X group values and Y layers currently override these defaults";
  - **↺ Reset all overrides** (disabled when there are no overrides);
  - **Done**.

**Auto-assign panel (`.autobox`)**:
- checkboxes:
  - **Match name**: the file name *contains* the mapping name; with several matches the
    longest name wins (`Cyc_Wash_sunrise.mov → Cyc_Wash`);
  - **Match resolution**: file resolution equals the mapping resolution; if several mappings
    share it, the file is skipped and counted as ambiguous;
- "Apply to": **Layers without mapping | Selected layers | All layers**;
- buttons **Clear all mappings** and **Run auto-assign** (disabled when both checkboxes are off);
- result: "9 of 12 layers assigned - 4 by name, 5 by resolution, 2 skipped (several
  mappings share the resolution), 1 no match". If the scope is empty: "Nothing to process
  in this scope.";
- automatically assigned layers get a **`name`** or **`res`** badge next to the mapping slot.
  A manual assignment removes the badge.

**Group (`.group`)**:
- **Header (sticky)**:
  - chevron;
  - **G1** label;
  - inline-editable **group name**;
  - **mini-timeline**: a bar positioned by `left/width` as a percentage of plan length, with
    split markers (white line) and tag markers (yellow diamond);
  - meta "3 files, 1m 05s";
  - buttons: clear mappings in the group, delete the group.
  - The header is a drop zone for mappings: on hover it shows "Assign to all N", and a drop
    assigns the mapping to every layer in the group.
- **Group settings block (`.g-set`)**, visible when the group is expanded:
  - **Scope line** - appears when rows in the group are selected:
    - "Editing 2 selected layers" with a link "Edit group instead";
    - or "Editing the whole group" with a link "Edit 2 selected";
    - **↺ Reset N layers to group settings** - if the selected layers have overrides.
  - **Setting chips** `KEY value`:
    - Start, Tags, Split - group scope only;
    - Mode, End, Fade, Length - both scopes.
  - Chip states:
    - `ov` - the value is set at this level: ◆ and yellow highlight;
    - `mixed` - the selection has different values: "Mixed" in italics;
    - `open` - the popover is open;
    - `off` - Tags or Split are switched off globally;
    - counter badge - how many layers in the group override this value.
  - The chip tooltip explains where the value comes from: "set on this group" / "inherited
    from plan defaults" / "N layers override it".
  - **↺ Reset to defaults** on the group - shown when the group or its layers have overrides.
  - **Chip popover (`.pop`)**:
    - title "Mode, G2" and a scope caption;
    - segmented control plus numeric fields where relevant. For mixed values the field is
      empty with a "Mixed" placeholder;
    - a note when Tags or Split are switched off globally;
    - footer:
      - "↺ Use plan default" in group scope, or "↺ Use group value" in selection scope;
      - link "N layers override this, Reset";
      - **Apply to all groups** - promotes the group's value to Plan defaults and removes
        this key's override from every group;
      - **Done**.
- **Row table (`.g-cols` + `.plan-row`)**:
  - columns: grip, number or checkbox (the checkbox shows on hover or when the plan has a
    selection), thumbnail, "Media, start, length", Mapping, ×;
  - the row name starts with a ◆ marker if the layer has overrides. Clicking it selects that
    layer and switches the group into selection scope. Subtitle: `startTC, duration, res`;
  - mapping slot:
    - coloured dot;
    - mapping name and via badge;
    - × to clear;
    - empty slot shows "Drop mapping here" with a dashed border;
    - while a mapping is being dragged, slots highlight (`ready`); the one under the cursor
      shows `over`;
  - row selection:
    - click - a single row;
    - Ctrl/Cmd - toggle a row;
    - Shift - range from the anchor **across group boundaries** (uses the overall `allUids`
      order);
    - Esc inside the plan - clear the selection;
  - dragging a row, or all selected rows if it is selected:
    - reorder with before/after insertion;
    - move to another group by dropping on a row or on the group (appends at the end);
    - insertion indicator - a yellow line at the top or bottom of the row;
  - dropping a mapping on a row that belongs to the selection assigns it to **all selected
    rows**;
  - **×** on a row - remove the layer from the group;
  - empty group - "Empty group - select files above and press “Add to G1”, or drag rows here."
- Empty plan - "Select files and press “New group”. Repeat to build Group 2, Group 3…".
  *(Phase 8c: "Drag files here to create a group…", and the empty plan accepts a file drop,
  see §2.3.0.)*

### 2.5. Right panel

- Header: "SETTINGS" and a **Simple | Advanced** segmented control. A mode hint sits below it.
- **Advanced:**
  - **Mappings** ("drag onto layers"): search, type chips `All 9, Perspective 3, Spherical 2
   , Cylindrical 1, Direct 2, Feed 1`, and a list of mapping cards:
    - grip;
    - colour tag;
    - name;
    - `type, res`;
    - "N layers" or "unused".
  - **Insert settings:**
    - Insert location;
    - Track;
    - Time;
    - global **Split section** toggle;
    - hint "Placement is set per group in the Layer plan";
    - Overlap is **hidden** here in Advanced - it is set per group.
  - **Tags:**
    - TC / Cue / MIDI toggles;
    - hint "Placement (each file / group start) is set per group".
  - Layer properties and Layer duration are **hidden** in Advanced: they move into Plan
    defaults and the chips.
- **Simple:**
  - Layer properties: one mapping for all layers, Mode, End, Animate brightness;
  - Layer duration;
  - Insert settings, including Overlap;
  - Tags.
- Sections are collapsible accordions (`acc-btn`). **New:** today the sections are always open.
- **Footer:**
  - summary: Advanced "4 groups, 12 layers, 6 mappings, 3 without mapping, 6m 10s";
    Simple "5 layers, one after another, 2m 10s" or "No media selected";
  - **CREATE N LAYERS** button: in Advanced N is the number of layers in the plan, in Simple
    the number of selected files.

### 2.5.1. Settings panel redesign (owner request, 2026-10-09)

**Why.** The panel is a long column of boxes that grew feature by feature. Related options sit
far apart, and a switched-off global option is easy to miss. During the Phase 8 review the
owner expected splits at group starts, but the global **Split section** switch (in Insert
settings) was off. The plan chips did say "Split Off", but nothing linked that to the switch.
Goal: group the settings by purpose, show at a glance what will happen, and connect the global
switches with the plan.

**Grouping by purpose** (same order in Simple and Advanced; boxes that don't apply are hidden):

| Section | Simple | Advanced |
|---|---|---|
| **Mappings** | the single mapping picker | the Mappings panel (search, type chips, cards) |
| **Where** (insert location) | At playhead / Specific time, Track, Time | same |
| **Layers** (what each layer gets) | Mode, At end point, Animate brightness, Layer duration, Overlap | hidden: a short note "Set in Plan defaults and group chips" with a button that opens Plan defaults |
| **Timeline markers** | Split section + TC / Cue / MIDI tags | same switches; placement comes from the group chips |

- **Split section moves out of Insert settings into "Timeline markers"**, next to the tags:
  both are markers placed at layer or group starts, and they share the same placement rules
  (Each file / Group start).
- Overlap moves from Insert settings to **Layers** (it changes layer timing, not the insert
  location).

**More informative:**
- Every section is an accordion (moves here from Phase 9). The header shows a **summary on its
  own line under the title** (it wraps, it is never cut with an ellipsis), readable even when
  the section is collapsed:
  - Where: "At playhead" / "track 1, 00:01:00:00";
  - Layers: "Normal, Loop, fade 1s, fit, still 5s";
  - Timeline markers: "Split on, Cue 1.0 + MIDI 9.1" / "Off".
  Open/closed state is persisted per section.
- **On/Off state is visible without opening**: a small status pill on the section header
  ("2 on" / "Off") and on each marker row.
- **Timeline markers preview** (Advanced, computed from the plan layout):
  "Will place 3 splits and 5 cue tags", with "Placement is set per group" and a link that
  opens Plan defaults.
- Validation stays inline at the field (invalid timecode, cue mask), and the section header
  gets a red dot when it contains an invalid field, so a collapsed section can't hide an error.

**Linking the switches with the plan** (fixes the confusion above):
- The plan's **Split chip popover** carries the global Split section switch in its header, so
  it can be turned on where the placement is chosen; the **Tags** popover shows an "Off" pill
  that opens and highlights the Timeline markers section (it has three switches).
- The chip tooltip says when a value is off for the whole plan.
- **One popover layout for every group chip**: simple but finished (owner feedback on the
  mockup). The segmented control stays a settings-panel pattern; no diagrams (the group
  header already has the mini-timeline). 268px, `#1e1e1e`, 1px `#3a3a3a` border, soft shadow,
  three zones separated by `#2e2e2e` lines:
  - **header**: setting name, the group as a small blue tag ("G1"), a close × button. Split
    adds "On/Off" + a small switch for the global Split section; Tags shows a "Tags off" button
    when all tags are off (opens Timeline markers). While the global switch is off the options
    are dimmed. No warning box;
  - **body**: the options as a bordered list (`#181818`, rows 36px, hairline dividers), radio
    dot + label, an optional one-word muted hint on the right ("+ end"); the selected row gets a
    faint blue fill, a filled `#0a84ff` dot and semibold white text. **A number belongs to its
    option** (progressive disclosure, as in PatternFly): it appears indented inside the selected
    option only (Overlap under In order, Duration under Fade in, Duration under Fixed length),
    on a 36px row aligned with the option text and set off by a thin divider; its label uses
    the option row style (12px, same colour). A value that always applies gets its own
    subsection titled like the popover title (12px, semibold, white): "Still images", Duration.
    Numbers use a compact stepper (− value s +, 26px, one border, the unit "s" inside the
    field). The value is typed by hand: focus selects the number, Enter or blur applies, Esc
    cancels, a comma is accepted, ↑/↓ step; the focused field gets a blue border;
  - **footer** (`#1a1a1a`): "Reset" as a quiet button (enabled only when this level sets its
    own value) and the "move up" action as a secondary button with an icon. Buttons have a
    border and a hover fill (`#2a2a2a`, border `#555555`), never a text underline. No Done
    button: the popover closes on × / outside click / Esc. Labels per level:

    | Opened from | Tag | Reset | Secondary button |
    |---|---|---|---|
    | Group chip | "G1" | back to the Plan default | "Apply to all groups": the value becomes the Plan default and is removed from every group |
    | Chip in selection scope | "2 layers" | back to the group value | "Apply to whole group": the value goes to the group and is removed from its layers |
    | Plan defaults chip | "All groups" | back to the built-in value | "Clear N overrides" (disabled "No overrides" when N = 0): removes the setting from every group and layer that sets its own value; the long explanation is the tooltip |

  - real `role="radio"` buttons in a `radiogroup` (arrow keys), labelled steppers.
- The Create footer summary lists markers: "..., 3 splits, 5 cue tags" or "no markers".

**Setting chips** (owner-approved on the mockup, 2026-10-10). The group chips row, the chips in
selection scope and the Plan defaults panel all use one chip component:
- **Equal width, one row.** The chips sit in a grid of seven equal columns that fills the row
  (`repeat(7, minmax(0, 1fr))`, 6px gap). A chip's width never depends on its value, so stepping
  or typing a number, or picking another option, never moves the neighbours or the popover.
  The row never wraps to a second line.
- **Two lines, 36px high**: the key on top (10px, 700, uppercase, letter-spacing 0.6px,
  `#aaaaaa`), the value under it (12px, 500, white, tabular numbers). A value that doesn't fit
  ends with an ellipsis; the full value is in the tooltip.
- **Short values** so they fit the column: Start "In order" / "Overlap 4s" / "All at once"
  (the option itself is renamed "In order"); Length "Fit" / "30s" (still images duration is in
  the tooltip and the popover); Fade "Off" / "1s"; Tags and Split "Each file" / "Group start" /
  "Off".
- The ◆ override marker and the red warning dot sit in the top right corner, absolutely
  positioned, so they don't change the width.
- States: override = yellow border and value (`rgba(255,214,10,.55)` border, `#ffd60a` value);
  off for the whole plan = muted struck-through value; open = blue border + 1px ring; selection
  scope = blue-tinted border and fill on every chip.
- **Narrow pane: "+N" overflow** (priority+ pattern, as in GitHub and Gmail toolbars). Below the
  width where seven columns fit (~80px each), the chips that don't fit fold into a "+N" chip of
  the same size. It opens a floating list of the hidden settings (key, value, ◆ or warning dot,
  chevron); a row opens that chip's popover at the same place. Chips with the plan default fold
  first, so overridden values stay visible; "+N" shows ◆ or the red dot when a hidden chip has
  one. Computed with a `ResizeObserver` on the chips row.

**Layer selection without layout shift** (owner request, 2026-10-10). Checking a layer must never
move anything, so rows can be checked one after another without moving the mouse:
- The selection actions move into one **floating selection bar** at the bottom centre of the
  plan pane (the pattern of Gmail, Google Drive, Linear, Notion, Airtable): absolute
  position over the list, `#242424`, 1px `#3a3a3a` border, soft shadow, 44px high:
  `[2] layers selected | Chips edit [Selected | Group] | Clear mappings | Remove | ×`. The count
  is a blue badge, Remove turns red on hover, × deselects (tooltip "Deselect (Esc)").
- It replaces the in-flow `sel-strip` in `LayerPlan.vue` (today it pushes every group down) and
  the inline "Group | N selected" switch in the group chips row (today it squeezes the chips).
  The "Assigning <mapping>" strip (`armed-strip`) moves into the same floating bar while a
  mapping is armed, for the same reason.
- The list keeps a constant bottom padding (~76px) so the last group can always be scrolled
  above the bar; the padding does not depend on the selection.
- Selection is shown only with colour: checked rows get `rgba(10,132,255,.10)`, the chips of the
  group get the selection-scope tint. No element changes size.
- **Scope on a new selection: "Selected"** (the chips edit the checked layers), switchable to
  "Group" in the bar. This changes the Phase 7 behaviour where a row click reset the scope to
  the group.
- In selection scope the Start / Tags / Split chips **stay visible** (owner review of 8b,
  2026-10-10; this replaces hiding them, §9.2). They are group-only settings, so they keep
  showing and editing the group: no selection tint, the popover is tagged "G1" with the group
  Reset and "Apply to all groups". The layer chips (Mode / End / Fade / Length) get the tint
  and edit the selected layers.
- The group checkbox left of the chips selects all layers of the group; it shows a dash when
  only some are checked.

**Plan defaults panel** (owner-approved on the mockup, 2026-10-10). Replaces the current
drop-down form (seven blocks of segmented controls and inputs, a long intro line, Done button):
- A **floating panel** under the Layer plan header, as wide as the group cards, over the groups
  (nothing moves). The "Plan defaults" button shows its open state (blue border, tinted fill).
  The settings panel's "Open Plan defaults" button opens the same panel.
- **Header** (40px): "Plan defaults", a blue "All groups" tag (like "G1" on a group), the short
  hint "Every group starts from these values" (ellipsis when narrow), ×.
- **Body**: the same seven chips as a group, the same equal-width grid. Instead of ◆ a chip shows
  a yellow counter "◆ 2" in its corner: how many groups and layers set their own value for that
  setting. Each chip opens the shared popover (labels in the table above).
- **Footer** (`#1a1a1a`): the summary "◆ 3 group values and 1 layer set their own values" (or
  "Every group uses these values") and a quiet "Reset all overrides" button (disabled when
  there is nothing to reset). No Done button: × / outside click / Esc close it.
- Overflow at a narrow width uses the same "+N" chip.

**Visual rules** (palette and components from the `disguise-css` skill):
- One label/value grid per section: label column on the left, control on the right, 8px row
  gap; secondary hints in `#888888`, 11px.
- A section header = row 1: icon + title + status pill + chevron; row 2: the summary.
- **Short helper texts** (owner feedback on the mockup): a hint under a control is two or three
  words ("Per group", "Each file", "At layer start"). The full explanation goes into a tooltip
  on a small info icon next to the label. Popovers keep to their compact layout (above).
- Works at the narrow window size (the settings panel shrinks to 260px): summaries wrap on
  their own line; nothing is clipped.
- Approval mockup (Claude artifact, owner-reviewed): https://claude.ai/artifact/RLtFT6fZZHQbc1SWZATcuD

### 2.6. Inheritance model (the core of the mockup)

```
PLAN defaults (state.plan)                         all 11 keys
  └─ Group overrides (group.ov)                    any of the 11 keys
       └─ Layer overrides (entry.ov)               layer keys only
```

- **Group keys** (`GKEYS`): `timing ('seq'|'same')`, `overlap`, `tag ('file'|'group')`,
  `split ('file'|'group')` plus all the layer keys.
- **Layer keys** (`PKEYS`): `mode`, `end`, `bright`, `brightT`, `fit`, `movieDur`, `stillDur`.
- Effective group values: `egOf(g, plan) = {...plan, ...g.ov}`.
- Effective layer values: `effOf(entry, eg) = {...pick(eg, PKEYS), ...entry.ov}`.
- **Normalisation:** if a new value equals the parent's value, the override is **deleted**,
  not stored. This is how `setGroupOv`, `setOv` and `setPlan` behave. It is the key
  invariant: ◆ appears only when the value really differs.
- Linked chip keys (`FKEYS`/`CHIPS.keys`):
  - `bright` ↔ `brightT`;
  - `fit` ↔ `movieDur`, `stillDur`;
  - `timing` ↔ `overlap`.
- A reset always clears linked keys together.

### 2.7. Time layout (UI preview)

```
cursor = 0
for each group g (in order):
  gStart = cursor; t = gStart; gEnd = gStart
  for each layer: d = duration(media, effOf(layer))
     if g.timing == 'seq':  start = t; t = max(gStart, t + d - g.overlap)
     else ('same'):         start = gStart
     gEnd = max(gEnd, start + d)
  cursor = gEnd                       # next group starts at the end of this group's LONGEST layer
                                      # (for 'same': the longest layer, not the last row);
                                      # groups are butted together, no overlap between groups
total = max(gEnd)
duration(media, o) = video ? (o.fit ? media.dur : o.movieDur) : o.stillDur
```

- Markers: tags and splits go at every unique `start` (`'file'`) or at `gStart` (`'group'`),
  and only if Tags (TC or Cue) or Split are switched on globally.
- Everything is in **seconds**. Designer converts seconds to beats via `track.timeToBeat`,
  so with BPM changes the UI preview will differ from the result. The preview is
  approximate and in seconds.

---

## 3. Gap analysis - data needed from Designer that we don't have yet

| Data | Needed for | Today | Source (to verify in Designer, §5) |
|---|---|---|---|
| Clip duration (s), video vs still | Timeline preview, group meta, footer, "Fit" | Not loaded. Type is guessed from the extension | `clip.file.nFrames / clip.fileFps` (already used in `createLayers`) |
| Clip resolution | `res` subtitle, auto-assign by resolution | None | Candidates: `clip.file.resolution`, `clip.resolution`, `clip.file.width/height` - **verify** |
| Live-input flag | Correct type (not "still") | None | `clip.isVideoIn` (present in d3.pyi) |
| **Alpha channel** (owner request) | Badge on every file (grid, list, plan row) | None | Videos: `clip.file.hasAlpha`. Stills: parse the source file header in Python (the Designer flag is wrong for stills). Verified rule: probe `09_alpha_resolved.py`, §12 |
| **Audio** (owner request) | Badge on every file | None | `clip.hasAudio` (verified). Channel count is not available via the API (§12) |
| Mapping type | Filter chips and subtitle | None | `type(m).__name__` / `type(m).__username__` - **verify** the real `Projection` subclasses |
| Mapping resolution | Subtitle and auto-assign | None | Depends on mapping type - **investigate** (§5) |
| Mapping name for matching | Auto-assign by name | Yes (`.apx` filename without extension) | Prefer `m.description` (resource guide) |
| Mapping colour | Tag, slot dot | Not in Designer | Generate deterministically on the client (§7) |

Today `getMediaList` and `getMappingList` return a whole-resource serialisation
(`return resourceManager.allResources(VideoClip)`). That format is implicit and heavy.
Switch to explicit dicts with only the needed fields (§5.2).

---

## 4. Frontend architecture

### 4.1. Splitting `MediaSequencer.vue`

The file is already ~1900 lines. The Layer plan must not be added to it. Proposed structure
(composables, no Pinia - the project doesn't have it, and a single-window plugin doesn't
need it):

```
src/
  components/
    MediaSequencer.vue          ← shell: data loading, layout, Simple/Advanced mode
    tree/FolderTree.vue         ← extract current sidebar (resize, collapse, + counts)
    files/FilesPane.vue         ← toolbar + grid/list + marquee (extract current logic)
    files/MediaCard.vue         ← existing (+ group badge, duration, res)
    plan/LayerPlan.vue          ← plan header, gnav, defaults/auto-assign panels, group list
    plan/PlanGroup.vue          ← header, mini-timeline, chips, popover, rows
    plan/PlanRow.vue            ← layer row, mapping slot
    plan/SettingChip.vue        ← chip + popover (reused by PlanDefaults)
    plan/PlanDefaults.vue
    plan/AutoAssignPanel.vue
    settings/SettingsPanel.vue  ← right panel: mode, accordions, footer
    settings/MappingsPanel.vue  ← mapping list (Advanced)
    common/SegmentedControl.vue, common/Toast.vue, common/Accordion.vue
  composables/
    useMediaLibrary.js          ← tree, flatten, search, include subfolders, clip metadata
    useFileSelection.js         ← file selection (click/ctrl/shift/marquee, order)
    useLayerPlan.js             ← groups, entries, inheritance, layout, operations
    usePlanSelection.js         ← plan row selection, anchor, Esc
    useDragPayload.js           ← single drag & drop payload (§4.5)
    useToast.js
    usePersistedRef.js          ← generalises existing readStored/watch (do not duplicate!)
  services/
    disguiseService.js          ← + getMediaDetails, new getMappingList, createLayerPlan
  utils/
    planSchema.js               ← keys, defaults, normalisation, serialisation for Python
    timecode.js                 ← TIMECODE_RE, HH:MM:SS:FF↔seconds (extracted from component)
```

> Project memory rule: don't add new helpers when an equivalent already exists.
> `readStored`, `flattenFiles`, `byNameAsc`, `TIMECODE_RE` and the cue/MIDI masks must be
> **moved** into utils and composables, not rewritten.

The refactor (component extraction) is a **separate phase before** any new features
(Phase 1, §8). Behaviour does not change in that phase; the user checks it manually.

### 4.2. Plan data model (`useLayerPlan`)

```js
// values are stored in "UI units"; mapping to Python happens in the service
const PLAN_DEFAULTS = {
  timing: 'seq',      // 'seq' | 'same'
  overlap: 0,         // seconds, only for 'seq'
  tag: 'file',        // 'file' | 'group'
  split: 'group',     // 'file' | 'group'   (mockup default: 'group')
  mode: 'Normal',     // 'Normal' | 'Locked'
  end: 'Loop',        // 'Loop' | 'Ping-Pong' | 'Pause'
  bright: false, brightT: 1,
  fit: true, movieDur: 30, stillDur: 5,
};
const GROUP_KEYS = Object.keys(PLAN_DEFAULTS);
const LAYER_KEYS = ['mode','end','bright','brightT','fit','movieDur','stillDur'];
const LINKED = { bright:['bright','brightT'], fit:['fit','movieDur','stillDur'], timing:['timing','overlap'] };

state = reactive({
  plan:    { ...PLAN_DEFAULTS },
  groups:  [ { id, name, open: true, scope: 'auto'|'group', ov: {}, items: [entryId…],
               sourceFolder: null | { id, content } } ],   // set when created from a folder (§2.3.2)
  entries: { [entryId]: { mediaId /* = file.path */, mappingPath|null, via: null|'name'|'res', ov: {} } },
  checked: Set<entryId>, anchor: entryId|null,
  ui: { pdOpen, autoOpen, pop: { gid, key }|null, flashGid, dragOver }
});
```

- `mediaId` is the file **path**, like `file.id` in the current `buildFileHierarchy`. A file
  can appear in several groups, or several times in one group: each occurrence is a new
  `entryId`.
- Mappings are stored by `path`, not uid, so they survive a Refresh. After a Refresh, entries
  whose file or mapping disappeared are flagged with a warning (§6.3), not deleted.
- Operations, one per mockup action:
  - `newGroup(fileIds)`, `addEmptyGroup()`, `addToGroup(gid, fileIds)`;
  - `insertFiles(fileIds, gid, targetEntry, 'before'|'after')`;
  - `moveEntries(entryIds, gid, targetEntry, pos)`;
  - `removeEntries(ids)`, `removeGroup(gid)`, `renameGroup`, `toggleGroup`, `setAllOpen`;
  - `assign(entryIds, mappingPath, via=null)`, `assignGroup(gid, mp)`;
  - `clearMappings(scope: 'all'|gid|entryIds)`;
  - `setPlan(patch, clearKeys)`, `setGroupOv(gid, patch, removeKeys)`,
    `setLayerOv(entryIds, keys, patch|undefined)`;
  - `resetGroup(gid)`, `resetAllOverrides()`, `applyGroupValueToAll(gid, chipKey)`;
  - `runAutoAssign({ byName, byRes, scope })` returns `{ byName, byRes, ambiguous, none, total }`;
  - `newGroupsFromFolders(folderIds, { content: 'direct'|'deep'|'split', afterGid|null })`
    returns `{ created: [gid…], files, skippedNested, skippedEmpty }` (§2.3.2). It is a
    thin loop over `newGroup` / `insertFiles`, so no new group logic is needed.
- Folder → files resolution reuses the existing helpers from `useMediaLibrary`:
  - `flattenFiles(folder.children, { tag: false })` for `'deep'`;
  - `children.filter(type === 'file')` for `'direct'`;
  - a walk over descendant folders for `'split'`;
  - sorted with `byNameAsc`.
  Do not add a parallel tree walker (project memory rule).
- `checkedFolders` (a `Set` of folder ids) and its anchor live in a small
  `useFolderSelection` composable next to `useFileSelection`. Folder ids are the
  `buildFileHierarchy` ids (relative path), so they survive a Refresh. Checked ids that no
  longer exist after a Refresh are dropped silently.
- Put the normalisation (drop an override equal to its parent) in one function in
  `planSchema.js`. Compare typed values: in the mockup `<input>` numbers arrive as strings
  (`String(a) === String(b)`). In Vue, use `v-model.number` and `Number()` to avoid a
  spurious "◆ 5 vs '5'".
- Group numbers `G1…Gn` are computed from position, not stored. This matches the mockup:
  numbers shift after a group is deleted.
- Deleting a non-empty group needs either a **confirmation** (the mockup deletes instantly) or
  an Undo toast "Group deleted, Undo". Recommendation: the Undo toast, since it doesn't
  interrupt the user.

### 4.3. Simple as a special case of the plan

To avoid two Python generation paths, **Simple** mode builds a **virtual plan** right before
creation:

```
plan = { ...PLAN_DEFAULTS from options, timing:'seq', overlap: options.overlap, tag:'file', split:'file' }
groups = [ { items: selected files in selection order, ov: {} } ]
entries: mappingPath = selectedMapping.path for all
```

Creation goes through the same `createLayerPlan` (§5.3). The result in Designer must match
the current `createLayers`. That is the acceptance criterion, verified by comparing on a test
track. After that the old `createLayers` is removed.

> **Current split nuance.** Today a split is placed at the start **and** after each layer
> (`current_start_beats` with overlap applied). In the mockup's model, "Each file" means a
> split at every unique `start`. These are not the same: the current behaviour also has a
> closing split at the end of the last layer. Resolution: in `'file'` mode place a split at
> every `start` **and** at the end of the group's last layer. This matches the current logic.
> `'group'` = one split at the group start; the last placed group also gets a closing split
> at its end (decision Q3, §11).

### 4.4. Global vs group settings

| Setting | Where it is set | How it is used |
|---|---|---|
| Insert location, Track, Time | Right panel (both modes) | Start point of the whole plan (`cursor = start`) |
| Split section on/off | Right panel (global) | Enables splits. The split position (`file`/`group`) comes from the group |
| TC / Cue / MIDI on/off + values (start, increment, cue, midi) | Right panel (global) | Enables tags. The tag position (`file`/`group`) comes from the group. **Numbering** - §5.3 |
| Overlap | Simple: right panel. Advanced: group/defaults | - |
| Mode / End / Brightness / Duration | Simple: right panel. Advanced: defaults→group→layer | - |
| Mapping | Simple: one for all. Advanced: per layer | Advanced layer without mapping → see Q1 |

Should Simple-panel values and Plan defaults be kept **separate** or **synchronised**? In the
mockup `def` (Simple) and `plan` (Advanced) are different objects, and the "Apply to all
groups" buttons in the Simple sections are already dead. Recommendation: keep them separate.
A new group takes its values from `plan` (the mockup passes `def` to `mkGroup`, but the
function ignores it).

### 4.5. Drag & drop

The mockup has four kinds of dragging at once. All of them use HTML5 DnD, and
`dataTransfer.setData('text/plain', 'map:<id>' | 'files:<ids>' | 'row:<id>')` is duplicated
into state. Inside a single Vue app it is more reliable to keep the payload in one reactive
`dragPayload = { kind: 'files'|'rows'|'mapping', ids }`, and use `dataTransfer` only for
`effectAllowed` and Firefox compatibility.

| Source | Targets | Effect |
|---|---|---|
| File(s) from Files | group body / row (before/after) | insert new entries |
| Plan row(s) | row (before/after) / group (append) | move, including between groups |
| Mapping | row slot / row in the selection / group header | assign to one row, the selected rows, or the whole group |
| Folder(s) from Hierarchy | gap between groups / group body | create one group per folder there / add the folders' files to that group (§2.3.2) |

Pitfalls:
- Conflict with **marquee selection**. `mousedown` on `.media-grid` starts the marquee, but a
  `draggable` row must get the events first. Don't start the marquee on `mousedown` over a
  `[draggable]` element that is already selected.
- Designer's embedded browser (CEF/WebView). Verify that HTML5 DnD works in the plugin
  window. If it doesn't, fall back to pointer events (Phase 0, §8).
- Auto-scroll of the plan container while dragging near its edge - missing from the mockup,
  needed for long plans.

### 4.6. Accessibility and keyboard

- **"Armed" mapping** (scaffolded in the mockup): click or Enter on a mapping card "arms" it.
  Then click or Enter on a slot, or "Apply to N selected", assigns it. Esc disarms. This
  gives a non-mouse alternative to DnD.
- Plan rows are `div`s with `onClick` in the mockup. In the implementation:
  - `role="row"` and `tabindex` on the row;
  - the checkbox is a real `<button aria-pressed>`;
  - ↑/↓ move focus;
  - Space selects;
  - Delete removes the row from its group.
- Chip popover: focus trap, Esc closes it, focus returns to the chip.

---

## 5. Backend (Python via `/api/session/python/execute`)

Rules from the `disguise-api` skill:
- Python 2.7, everything inside `def run(): … return run()`;
- call `markDirty` before every change;
- **never poll** the endpoint in a loop;
- scripts run on Designer's main thread, so large plans are created in chunks (see §5.3).

### 5.1. API discovery - queries to run in Designer (Phase 0)

Run the queries below in Designer (Python console or a POST to execute). They resolve the
unknown fields. Record the results in `src/api_scripts.py` and in the `disguise-api` skill.

```python
# Q-A. Which Projection subclasses exist in the project, and their names
def run():
    out = {}
    for m in resourceManager.allResources(Projection):
        t = type(m)
        key = t.__name__
        out.setdefault(key, {"username": getattr(t, "__username__", key), "count": 0, "sample": str(m.path)})
        out[key]["count"] += 1
    return out
return run()
```

```python
# Q-B. Where a mapping keeps its "resolution". Inspect public attributes of one mapping per type
def run():
    seen, out = set(), []
    for m in resourceManager.allResources(Projection):
        n = type(m).__name__
        if n in seen: continue
        seen.add(n)
        attrs = [a for a in dir(m) if not a.startswith('_')]
        cand = {}
        for a in attrs:
            if 'res' in a.lower() or 'size' in a.lower() or 'screen' in a.lower():
                try: cand[a] = str(getattr(m, a))[:200]
                except Exception as e: cand[a] = 'ERR ' + str(e)
        out.append({"type": n, "path": str(m.path), "candidates": cand})
    return out
return run()
```

```python
# Q-C. Clip metadata: duration, fps, resolution, live input
def run():
    out = []
    for c in resourceManager.allResources(VideoClip)[:10]:
        f = c.file
        info = {"path": str(c.path), "desc": c.description, "isVideoIn": bool(c.isVideoIn)}
        try: info["nFrames"] = f.nFrames
        except Exception as e: info["nFrames"] = 'ERR'
        try: info["fps"] = c.fileFps
        except Exception as e: info["fps"] = 'ERR'
        for a in ('resolution', 'width', 'height', 'size'):
            for obj, tag in ((c, 'clip'), (f, 'file')):
                if hasattr(obj, a):
                    try: info[tag + '.' + a] = str(getattr(obj, a))
                    except Exception: pass
        out.append(info)
    return out
return run()
```

Also check `references/d3.pyi`:
- `grep "^class .*Projection"`;
- members of `VideoClip` and `VideoFile`;
- `Projection.screens`. A mapping has `screens: List[Display]`. The mapping resolution may
  be the first screen's `resolution` or their combined canvas. A Feed mapping may have its
  own.

Q-D. Timing: read `d3Log` ("Python script took …ms") for a metadata query over all clips on a
real project with 1000+ clips. If it takes more than ~1–2 s, load metadata lazily, only for
the current folder (§5.2).

### 5.2. New and changed service functions

| Function | Returns | Notes |
|---|---|---|
| `getMediaList(ip)` | unchanged (tree) | Python returns an explicit list `{path, uid, description}` instead of a whole-resource serialisation |
| `getMediaDetails(ip, paths?)` **new** | `{ [path]: { kind: 'video'|'still'|'live', duration, fps, nFrames, res: 'WxH'|null, codec, hasAlpha: bool|null, hasAudio: bool } }`. **Port the Python verbatim from `src/services/python/media_details.py`** (verified against disk) | Batched. Cached in `useMediaLibrary`, cleared on Refresh. Extension-based type stays as a fallback |
| `getMappingList(ip)` | `{ uid, path, name /*description*/, type /*__name__*/, typeLabel /*__username__*/, res }` | Keep the `objects/` filter. Keep the sorting |
| `getTrackList`, `createTrack` | unchanged | - |
| `createLayerPlan(ip, payload, onProgress)` **new** | `{ status, created, errors: [...] }` | Replaces `createLayers`; used by both modes |

### 5.3. `createLayerPlan` - format and algorithm

**Payload.** All values are resolved in JS (effective values after inheritance), so Python
stays a "dumb" executor:

```json
{
  "insert": { "mode": "playhead" | "specific", "trackPath": "objects/track/x.apx", "startSeconds": 0.0 },
  "splitEnabled": true,
  "tags": {
    "tc":   { "on": true,  "start": "01:00:00:00", "increment": "00:00:10:00" },
    "cue":  { "on": false, "value": "1.2.3" },
    "midi": { "on": false, "value": "9.1" }
  },
  "groups": [
    {
      "timing": "seq", "overlap": 1.0, "tagAt": "file", "splitAt": "group",
      "layers": [
        { "clipPath": "objects/videoclip/...", "mappingPath": "objects/.../x.apx" | null,
          "mode": 1, "end": 0, "bright": false, "brightT": 1.0,
          "fit": true, "movieDur": 30.0, "stillDur": 5.0 }
      ]
    }
  ]
}
```

- Embed the payload in the script as `json.loads(r'''<JSON>''')` or as a JSON literal. Do
  **not** concatenate string values (paths, names, cue) into the script: today `createLayers`
  has `'${options.cueValue}'` and `r'${path}'`, which breaks on quotes in names.
  `import json` inside the function is fine.
- Compute timing in **track beats**, as today:
  `dur_beats = timeToBeat(beatToTime(start) + secs) - start`.
- **Group end = the end of its longest-reaching layer** (`max(layer start + layer length)`),
  not the end of its last row. This matters most for `timing='same'`: all layers start at
  `gStart`, and **the next group starts where the longest layer ends**. With `'seq'` and
  overlap, a long early layer can also outlast the last row. Compute it in beats, per layer,
  using each layer's own effective duration.
- Groups run back to back: the next group starts at the previous group's end (`max end`),
  with no overlap between groups. Overlap between groups is question Q4.
- `'same'`: every layer in the group starts at `gStart`. **Stacking order.** The first layer
  in the list is the top one (track & sequencing guide). It is still unknown where
  `addNewLayer` inserts a new layer in the stack - **verify** in Phase 0. Row order inside a
  group must give a predictable stack. If needed, use `track.moveLayerToIndex`.
- **Tags:**
  - `tagAt='file'` - a tag at every unique start;
  - `tagAt='group'` - one tag at `gStart`;
  - numbering (TC + increment, cue/MIDI +1) **runs across every tag placed in the plan**,
    continuing today's "i-th tag = start + i*inc" behaviour. Alternative - see Q5.
- **Splits:** see §4.3 and Q3.
- **No mapping:** behaviour per Q1 (default: create the layer without a mapping and warn in
  the UI before creating).

**Chunks, timeouts, errors.** The script runs on the main thread, and
`pythonApiExecutionTimeout` applies.
- Split the payload by group. Split a large group (>~50 layers; tune the threshold in Phase 0)
  into parts. Each call returns `endBeats` / `nextTagIndex`, and the next call continues from
  there. These are sequential calls for one user action, not polling, so they are allowed.
- UI progress: "Creating… 3/8".
- Per-layer errors (clip or mapping not found) are collected into `errors` without stopping.
- Designer supports undo (`markDirty` before changes). One user action produces several undo
  entries, one per chunk. Mention this in the docs.
- The frontend keeps `isCreating`, so a repeated click is blocked. An error shows a toast with
  details.

### 5.4. Auto-assign - client-side

The logic is simple and runs entirely on client data (names and resolutions), matching the
mockup's `runAuto`:
- name: `fileName.includes(mapName)`, the longest match wins;
  - the comparison is **case-insensitive**. The mockup's comparison is case-sensitive. Since
    Designer resource paths are lowercase but `description` can be in any case, compare in
    lower-case. Record this as a deliberate difference from the mockup;
- resolution: exact `WxH` equality and exactly one candidate;
- scopes: `unassigned` / `selected` / `all`;
- result: a summary string and `via` on each entry.

---

## 6. Behaviour and states

### 6.1. Create button validation

- **Simple:** as today (`isCreateLayersEnabled`): a selection, a mapping, valid cue/MIDI/TC
  and location.
- **Advanced:** at least one layer in the plan, valid global tags and location. Layers without
  a mapping - per Q1: either block with a hint "3 layers without mapping", or warn and ask for
  confirmation.
- Button text: "CREATE N LAYERS" / "CREATING… k/N".

### 6.2. Toasts

`useToast` with auto-hide after 2.6 s and `role="status"`. Replace **all** `alert()` calls in
`handleCreateLayers`. Messages:
- "N files added to G2";
- "Mode applied to all groups";
- "G1 reset to plan defaults";
- "Created 12 layers in 4 groups";
- errors - red variant, `#ef4444`.

### 6.3. Refresh with a non-empty plan

After `handleRefresh`:
- entries whose clip disappeared are flagged (row with a warning icon, "missing");
- a mapping that disappeared is cleared, with a toast "2 mappings no longer exist".

The plan is not lost.

### 6.4. Persistence

- In localStorage via `usePersistedRef`:
  - `creationMode` (simple/advanced);
  - `workspace` (files/split/plan);
  - open accordions;
  - mapping type filter.
- **The plan itself** (groups, entries, overrides, plan defaults) should also be saved to
  localStorage. Reloading the panel in Designer must not wipe a plan the user built.
  Key: `mediaSequencer.plan.<director>`. Store a schema version and reset on mismatch.
  Confirm with the owner (Q6).

### 6.5. Small mockup details that are easy to miss

- Row checkboxes show on hover **or** when the plan has a selection (`.plan.has-sel .cb`).
  Otherwise the row number shows (numbering runs across the whole plan, `layerIdx`).
- Selecting a row in the plan switches the group's scope to `'auto'` (`click → setGroup scope auto`).
- `jump(gid)` from Browse automatically switches the layout to Split.
- `newGroup` / `addToGroup` clear the file selection and scroll to the group with a flash.
- `setBrowse` expands the tree; `setSplit` / `setPlan` collapse it.
- Tags/Split popover hint when switched off globally: "…this placement is used once they
  are on".
- The "Add to group…" dropdown resets to its placeholder after a choice (`value=""`).
- "Apply to all groups" in the popover **promotes** the value to Plan defaults
  (`setPlan(p, keys)`) and removes the overrides for those keys from **all** groups. It does
  not copy the value into each group.

---

## 7. Visual style

Translate to the project palette (skill `disguise-css`): hex values, no CSS variables,
`<style scoped>`, 6px radius. Mapping:

| Mockup | Role | Project |
|---|---|---|
| `#4C9AFF` | accent | `#0a84ff` (hover `#0060d1`) |
| `#121315` / `#16171A` / `#17181B` | backgrounds | `#1a1a1a` / `#1e1e1e` / `#181818` |
| `#1A1C20` cards | - | `#242424` |
| `#26292E`, `#30343B` borders | - | `#2a2a2a`, `#333333`, `#3a3a3a` |
| `#E6E3DD` / `#9AA0A8` text | - | `#cccccc` / `#888888` |
| `#F5B83D` + `#2A2312` + `#6B5320` - **override/drop** | ◆, drop indicator, "apply" | **Not in the palette** → add an "override/attention" semantic to the `disguise-css` skill (proposal: `#f5b83d` text/icon, `#2a2312` background, `#6b5320` border) |
| `#1F3A24`/`#4E9A5A` success toast | - | **Not in the palette** → add "success" (or make the toast neutral: `#242424` + `#0a84ff` border) |
| Mapping colours (9 hues) | tags | Generated: a fixed set of 10–12 colours that differ in lightness; index = stable hash of `path`. Add the set to the skill |
| IBM Plex Sans/Mono | font | Project font (`Inter`/`Segoe UI`). For timecodes and numbers: `font-variant-numeric: tabular-nums` or a system monospace (`Consolas, ui-monospace`) |

The owner decides on the new colours (Q7). Update the `disguise-css` skill after approval,
and only then write CSS.

---

## 8. Implementation phases

Each phase is a separate PR, and the plugin works after each one. There is no test
framework, so acceptance is manual in Designer against checklists.

**Progress** (branch `feature/layer-plan`):

| Phase | Status |
|---|---|
| 0 - API discovery | ✅ done (§12) |
| 1 - Refactor, no behaviour change | ✅ done; browser-verified against Designer (§9.1) |
| 2 - Clip and mapping metadata | ✅ done. The Python lives in `src/services/python/*.py` and is imported with `?raw`, so the same files run as probes |
| 3 - Unified creation engine | ✅ done. `createLayerPlan` = prepare / layer chunks (≤100) / markers. **Verified identical** to 1.1.x `createLayers` on 6 mixed clips: layers, stack order, sequences, 18 tags and 8 sections all match. 250 layers in 3 chunks take 0.9 s; the track is extended past its old end with no truncated layers. Old `createLayers` removed |
| 2a - Grid tiles show resolution (owner feedback) | ✅ done (`2e01bcf`) |
| 4 - Advanced mode: plan skeleton | ✅ done (owner-reviewed, committed `69d3455`…`325625d`). Simple/Advanced switch (default Simple, persisted); Files / Split / Plan layouts (persisted; Split uses the list view and a compact 420px files pane; the tree collapses next to the plan); Add to group… / + New group / + Group; group rename, collapse / expand all, delete with an Undo toast; gnav chips with jump + flash; rows show #, thumbnail, name, start, length, res; mini-timeline with split/tag markers; header and footer summaries; G-badges on file cards; temporary per-group "Layers start" switch (becomes a chip in Phase 7); Advanced Create via `buildAdvancedPlan`. **Checked in Designer:** a `same` group puts all layers at 0 with row 1 on top, the next group starts at the end of the longest layer (18.43), and splits sit at group starts |
| 5 - Per-layer mappings | ✅ done (owner-reviewed, committed `6162d00`…`cab4cf8`). In Advanced, the Mappings panel replaces the global mapping picker: search, dynamic type chips with counts (11 types), stable colour tag (`utils/mappingColors.js`, 12 colours), `type, res`, "N layers / unused". Each row has a mapping slot. Assign by dragging onto a slot, by dragging onto a group header ("Assign to all N"), or with the armed mode: click a mapping, click slots, Esc / Done (keyboard alternative to DnD). Clear per slot, per group, or all. Footer shows "N mappings, M without mapping". Create asks for confirmation when layers have no mapping (Q1) and then **clears** Designer's pre-filled mapping - verified in Designer (`null`, not Fisheye). The DnD logic was verified with real `DragEvent`s. The browser automation's synthetic mouse drag doesn't fire HTML5 DnD; a manual check by the owner is needed |
| 6 - Row selection and moving | ✅ done (owner-reviewed, committed `770afbd`…`234dbb9`, plus `e817587`: roomier mapping items and distinct colours by list order). `usePlanSelection`: click, Ctrl/Cmd toggle, Shift range across groups, checkboxes (shown on hover or while anything is selected), select-all per group, Esc (after disarming a mapping), Delete/Backspace removes with an Undo toast; selection strip with Clear mappings / Remove / Deselect. Drag rows (one or the whole selection, order kept) before/after any row or onto a group body, also between groups; drag files (one or the selection) from the files pane onto a row position or a group. A mapping dropped or armed-clicked on a selected row goes to the whole selection. Auto-scroll near the plan edges. File cards no longer select text on Shift/Ctrl-click. Verified with real `DragEvent`s in the browser (manual mouse DnD still to be checked by the owner). Also in this change: the em dash and middle dot are removed from UI text, code, docs and skills (owner rule), with ", " / " - " / ":" instead |
| 6b - Groups from folders | ✅ done (owner-reviewed and committed). Advanced only. In the tree, Ctrl/Cmd+click toggles a folder, Shift+click selects a range of visible folders, and checkboxes show on hover or while folders are checked. A plain click still navigates and keeps the checks. Space toggles, Enter creates, Esc clears. Collapsed branches show a badge with the number of checked folders inside. The strip under the tree shows "N folders, M files" with skip notes, the content mode (Folder only / With subfolders / Split subfolders; persisted, defaults to the Include subfolders toggle), "Insert after", Create N groups and Clear. Folders can also be dragged: drop zones between groups create groups there, and a drop onto a group adds the files. Groups store `sourceFolder` (Q13). Verified in the browser on `footages`: direct skips the empty parent; deep skips the nested child (89 files); split gives "footages / 4k emanation" and its two siblings; insert-after, the collapsed badge, gap drop, group-body drop, Files switching to Split, and hidden in Simple. The tree must be expanded to select folders in Split (header toggle), so no separate "Folders" button was needed. Owner feedback in the same round: the per-group column header row is removed and the select-all checkbox now sits at the start of the "Layers start" row, above the row checkboxes; app-wide slim dark scrollbars without arrow buttons live in `src/style.css` (component-level scrollbar rules removed) |
| 7 - Settings inheritance | ✅ done (owner-reviewed, committed `f8ba6b3`…`750875c`). `utils/planSchema.js` (defaults, chips, effective values, normalisation helpers); `useLayerPlan` keeps `plan` defaults, `group.ov`/`scope`, `entry.ov` and prunes overrides equal to their parent. Plan defaults panel (gear button) with the override summary and Reset all overrides. Group chips Start/Tags/Split/Mode/End/Fade/Length with ◆ (set here), Mixed, Off, open and layer-counter states; a floating popover (teleported, fixed position, flips above the chip and stays on screen, closes on outside click / Esc; nothing below moves) with Use plan default / Use group value, "N layers override this, Reset", Apply to all groups, Done; Reset to defaults on the group. For selected rows an inline "Group | N selected" switch sits at the start of the chips row (no extra line) with a "Reset N layers" chip; a row click returns the group to selection scope. Plan defaults drop down over the groups (scrollable, outside click / Esc closes). Narrow windows (owner request, checked at 900x560): the Split files pane and the settings panel shrink first, the plan keeps 320px; the plan header wraps; narrow groups hide the mini-timeline and thumbnails; narrow list rows hide the type label, then res/G-badges. ◆ on rows with a tooltip of what they override. Mini-timeline markers follow the effective tag/split placement. Layout and Create use effective values per group and layer. Advanced right panel hides Layer properties, Duration and Overlap and shows the "set per group" hints. Checked in the browser: All at once / plan default reset, Mixed across 2 selected layers, layer overrides pruned when the group takes the same value, Apply to all groups moves the value into defaults; the Create payload carries per-group timing/tag/split and per-layer values |
| 8 - Auto-assign | ✅ done (owner-reviewed). `utils/autoAssign.js` (name: case-insensitive "file name contains mapping name", longest wins; resolution: exact `WxH` with exactly one candidate, otherwise skipped as ambiguous; name first, resolution as the fallback; unmatched layers keep their mapping) and `plan/AutoAssign.vue`: an "Auto-assign" header button opens a drop-down over the groups (like Plan defaults, one panel at a time, outside click / Esc closes) with Match name / Match resolution, Apply to Without mapping / Selected / All layers with counts (rules and scope persisted), the result summary, Clear all mappings, Run auto-assign. Rows show a `NAME` / `RES` badge; a manual assignment removes it. Header actions wrap as one right-aligned block and become icons in a narrow pane. Checked: the logic on the §8 test names (`Cyc_Wash_sunrise.mov` takes `Cyc_Wash` over `Cyc`, `led_side_l_waterfall.mov` takes `LED_Side_L`, a resolution shared by two mappings is skipped, empty scope gives "Nothing to process in this scope."); the panel and badges in the browser at 900x560 and 1500x760. The `api_test` project has no mappings whose names or resolutions match its files, so a real-data run there assigns 0 |
| 8b - Settings panel redesign (§2.5.1, owner request) | ✅ done (owner-reviewed). Settings panel: accordion sections Mappings / Where / Layers / Timeline markers (`settings/SettingsSection.vue`, open state persisted per section) with summaries on their own line, an "N on / Off" pill on Timeline markers, red dots for invalid fields; Split section moved next to the tags, Overlap into Layers; Advanced shows "Open Plan defaults" and the markers preview ("Will place 2 splits and 11 cue tags", `countMarkers` in `utils/planLayout.js`, same rules as `plan_prepare.py`); info-icon tooltips (`common/InfoTip.vue`). Chips: `plan/SettingChip.vue` + `plan/ChipRow.vue` (seven equal columns, Start / Tags / Split stay visible and edit the group in selection scope (owner review), "+N" overflow with a floating list, folding frozen while a popover is open) and one `plan/ChipPopover.vue` (radio list, nested `plan/NumStepper.vue`, Reset + move-up button per level, Split switch / "Tags off" in the header; it keeps its side while open). Floating selection bar (Selected / Group, Clear mappings, Remove, ×; armed mapping in the same bar), constant 76px bottom padding, colour-only row selection. Plan defaults is a floating chip panel with "◆ N" counters, "Clear N overrides" and Reset all. Group "Reset to defaults" moved to a header icon. Footer summary lists markers. The Mappings list sits in a framed scroll well (owner review). Checked in the browser at 1500x800 and in a 900x560 iframe; creation in Designer not re-run (payload code untouched) |
| 8c - One-row files toolbar, drop files to create groups, folder tree fixes (§2.3.0, owner request) | ✅ done (owner-reviewed). "+ New group" removed; "New group" is the first option of "Add to group…" (existing groups under an "Existing groups" optgroup; the select is enabled with any selection). Files toolbar is one row: `FilesPane` is a size container; at ≤500px the S/M/L toggle hides and the padding tightens, at ≤340px the counter becomes "N/M" and the view icons and select (min 92px) shrink. Checked: one row at 420px and at 270px (the files pane at the 900x560 minimum window); below ~300px it can no longer fit, so the §2.3.0 "down to 220px" is not reached (only windows under 900px get there). Files dragged onto the empty plan, the space under the last group (a 64px "Drop to create a new group" zone plus the list background) or a gap between groups create a group there (`drop-file-group`), toast "G2 created, 1 file", selection cleared; a drop onto a group still adds to it. Tree: the checkbox replaces the folder icon in a fixed 16px cell (names keep their x through hover / check / expand), the arrow is the group-header triangle. Groups-from-folders strip (owner bug report): a size container; under ~290px the content modes become icon radio buttons with tooltips and a caption naming the selected mode, Clear becomes an icon, "Create N groups" stays on one line ("Create N" at the 150px minimum), the insert select reads "At the end"; checked at 150 / 220 / 260 / 300px. Plan header at 900px wide (owner bug report): "+ Group" and the Files / Split / Plan switch become icons in a narrow pane like Auto-assign and Plan defaults, so the header actions stay on one row; the plugin's minimum window width (`disguise-plugin-window-min-size` in `index.html`) is now 900. Follow-up (owner report at 1245px): the plan header never wraps; by plan pane width the summary ellipsizes, the header buttons become icons at ≤760px, the workspace switch at ≤540px, paddings tighten at ≤360px; the files top bar's search shrinks (min 90px) instead of overflowing; the selection bar drops its labels at ≤620px. Files top bar (owner report): in a narrow files pane the title takes the first row (with the workspace switch in the Files layout) and search + refresh a second, full-width row: at ≤380px, or ≤480px when the switch is in the bar; in one row the search keeps 120px and the path ends with an ellipsis. The old Split-only overrides in `MediaSequencer.vue` are removed. Swept every 40px from 900 to 1900 in Files / Split / Plan (Advanced, with a checked layer) and Simple: no toolbar overflows or wraps. Checked in the browser with real `DragEvent`s (end zone, list background, gap, onto a group, empty plan with a reverse-order selection) |
| 9 - Polish | ⏳ in progress: A, B, D, E, F, G done (owner-reviewed); C (keyboard) deferred; H (docs and release) in progress |
| 10 - Reorder groups by drag and drop (owner request) | ⏳ implemented, waiting for the owner's check (§9.7) |

### Phase 0 - API discovery (no UI changes)
- Run queries Q-A…Q-D (§5.1). Record mapping type names, the source of mapping and clip
  resolution, and execution time.
- Verify HTML5 DnD in Designer's plugin window.
- Verify where `addNewLayer` inserts a layer in the stack (top or bottom).
- Find the chunk size for `createLayerPlan` that stays under the timeout.
- **Output:** the "Findings" section of this file, updated `api_scripts.py` and `disguise-api` skill.

### Phase 1 - Refactor with no behaviour change
- Extract from `MediaSequencer.vue`: `FolderTree`, `FilesPane` (+ marquee), `SettingsPanel`;
  composables `useMediaLibrary`, `useFileSelection`, `usePersistedRef`; utils `timecode.js`.
- Replace `alert()` with `useToast`.
- **Acceptance:** every feature in §0.1 behaves as in 1.1.2.

### Phase 2 - Data: clip and mapping metadata
- `getMediaDetails`, new `getMappingList` (type, res, description).
- MediaCard: duration, `res`, video/still/live type from Designer data.
- Alpha / audio badges on cards and list rows (§2.3.1). Plan rows get them in Phase 4.
- File counts in the tree.
- **Acceptance:** durations match Designer; live inputs are not shown as "still".

### Phase 3 - Unified creation engine
- `createLayerPlan` (payload §5.3, JSON embedding, chunks, progress, errors).
- Simple switched to the virtual plan (§4.3). Old `createLayers` removed.
- **Acceptance:** on the same input set (videos + stills, overlap, brightness, TC/cue/MIDI,
  split, specific time + new track) the result is identical to 1.1.2: positions, lengths,
  tags, splits, mapping, mode, end.

### Phase 4 - Advanced mode: plan skeleton
- Simple/Advanced switch, Files/Split/Plan layout, list view in Split.
- `useLayerPlan`: groups and entries (no inheritance yet, plan defaults only), New group,
  Add to group, + Group, rename, collapse/expand all, delete (with Undo toast), gnav with
  jump + flash.
- Rows: number, thumbnail, name, `start, length, res`, ×.
- Time layout (§2.7), mini-timeline, group meta, header and footer summaries.
- Group badges on file cards.
- Create in Advanced (temporarily, all layers use the single global mapping from the Simple
  panel).
- **Acceptance:** a plan with 3 groups using `seq`/`same` is created correctly; the preview
  durations match the result. In particular, after a `same` group with layers of 5 s, 30 s
  and 10 s, the next group starts exactly 30 s after that group's start.

### Phase 5 - Per-layer mappings
- `MappingsPanel`: search, type chips with counts, colour, res, usage.
- Mapping slot on rows. Mapping DnD onto a slot, onto the selection, onto a group header
  (with the "Assign to all N" hint). Clearing: slot, group, all.
- "Armed" mode (keyboard).
- "No mapping" validation (Q1).
- **Acceptance:** each layer is created with its own mapping.

### Phase 6 - Row selection and moving
- `usePlanSelection`: click, Ctrl, Shift across groups, Esc, select-all in group, checkboxes.
- Row DnD (single or selection) before/after, between groups. File DnD into a group or onto a row.
- Auto-scroll while dragging.
- **Acceptance:** plan order matches the order and stacking on the timeline.

### Phase 6b - Groups from folders (§2.3.2)
- `useFolderSelection`: Ctrl/Shift/checkbox selection in the tree, independent of navigation;
  badges on collapsed parents; Esc / Clear.
- Action strip: count preview, content mode (Folder only / With subfolders / Split
  subfolders), "Insert after…", Create N groups.
- `newGroupsFromFolders` on top of the Phase 4 group operations; nested/empty skipping; toast;
  flash + scroll; switch Files → Split.
- Folder DnD into the plan (between groups / into a group).
- "Folders" toggle in the Split toolbar to expand the collapsed tree.
- Depends on Phases 4 and 6 (groups and DnD); independent of 7 and 8.
- **Acceptance:** checklist §9.3.

### Phase 7 - Settings inheritance
- Plan defaults panel, group chips with popovers, group/selection scope, mixed values,
  ◆ markers, override counters, resets (popover, group, selection, all),
  "Apply to all groups".
- Override normalisation (§2.6) - cover with the manual scenarios in §9.
- Advanced right panel: hide Layer properties, Duration and Overlap; add the "set per group"
  hints.
- **Acceptance:** checklist §9.2.

### Phase 8 - Auto-assign
- Panel, rules, scopes, summary, `name`/`res` badges.
- **Acceptance:** with test names (`Cyc_Wash_sunrise.mov`, `LED_Side_L_waterfall.mov`) and
  shared resolutions, results match expectations and ambiguous cases are skipped.

### Phase 8b - Settings panel redesign (§2.5.1, owner request)
- Regroup SettingsPanel into Mappings / Where / Layers / Timeline markers; Split section joins
  the tags; Overlap joins Layers.
- Accordions with persisted state, header summaries, status pills, error dots.
- Advanced: markers preview from the plan layout, "Open Plan defaults" links.
- Chip popovers: one compact layout for all seven chips (§2.5.1), the global Split switch in
  the Split popover header, an "Off" pill in the Tags popover; footer summary lists markers.
- Setting chips (§2.5.1): one shared chip component, equal-width grid of seven, two-line
  key/value, short values, corner ◆, no wrapping; "+N" overflow with a floating list in a narrow
  pane.
- Floating selection bar (§2.5.1): replaces `sel-strip`, the inline scope switch and
  `armed-strip`; constant bottom padding; new selections default to the "Selected" scope.
- Plan defaults (§2.5.1): the drop-down form becomes a floating chip panel with override
  counters, the shared popover ("Clear N overrides") and "Reset all overrides".
- Check at the narrow window size (~900x560): chips fold into "+N", nothing wraps or moves when
  values change or layers are checked.
- No behaviour change in what gets created: the option names in `useLayerOptions` stay, so
  `planBuilder` and Simple stay identical (§9.1).
- **Acceptance:** checklist §9.4 and §9.1.

### Phase 8c - One-row files toolbar, drop files to create groups, folder tree fixes (§2.3.0, owner request)
- Remove the "+ New group" button; "New group" becomes the first option of "Add to group…"
  (same behaviour as the old button: selection order, clear selection, Files → Split, flash).
- Files toolbar in one row at the Split width; at narrower widths "N/M", a shrinking select and
  the hidden size toggle instead of wrapping.
- `LayerPlan`: while files are dragged, a "Drop to create a new group" zone on the empty plan
  and under the last group; the folder gap zones between groups also accept files. Drop →
  new group at that position (`useLayerPlan.insertGroups`), toast, flash, selection cleared.
- New empty-plan hint text.
- `FolderTree`: the checkbox replaces the folder icon in a fixed cell (names never move); the
  expand arrow becomes the group-header triangle with the same size, colours and animation.
- Depends on Phases 4 and 6 (groups, file DnD) and 6b (gap zones); independent of 8b.
- **Acceptance:** checklist §9.5 and §9.1.

### Phase 9 - Polish
Status of the earlier items at the start of Phase 9 (checked against the code, 2026-10-10):
plan persistence, Refresh handling of missing clips and keyboard navigation of plan rows are
not done yet; missing mappings already get a red slot border; Esc / focus return in chip
popovers, the armed mapping and Delete on selected rows are done.

**A. Plan persistence (§6.4, Q6)**
- Save the plan (groups, entries, overrides, Plan defaults) to localStorage under
  `mediaSequencer.plan.<director>` with a schema version; debounced on change; reset on a
  version mismatch or broken JSON (toast "Saved plan was reset").
- Restore when the panel starts, before the media library loads, so no save can overwrite
  the stored plan with an empty one; missing clips are flagged once the library is ready (B).
  Entry ids and group ids keep counting from the restored maximum. A broken or old saved
  plan is removed from localStorage, so the reset toast shows once.
  Done: `utils/planSchema.js` (`serializePlan` / `parsePlan`, `PLAN_SCHEMA_VERSION`),
  `composables/usePlanStorage.js`, `useLayerPlan.load()`.
- Persist the Mappings panel type filter (`MappingsPanel` `typeFilter`, today a plain `ref`).
- Selection, the armed mapping and open popovers are not persisted.

**B. Refresh with a non-empty plan (§6.3)**
- After Refresh (and after restoring a saved plan), rows whose clip is gone get a "missing"
  state: warning icon, red name, tooltip with the path. They count in the footer
  ("2 missing clips") and are skipped by Create with a confirm, like layers without mapping.
- A mapping that no longer exists is cleared from its rows with a toast
  "2 mappings no longer exist"; the red slot border stays only for the moment before Refresh.
- Plan layout and marker counts treat missing clips as zero length.
- Done: a clip is missing when the loaded hierarchy has no file with its path, or when
  `getMediaDetails` flags it `missing` (`isMissingClip` in `MediaSequencer`). Verified on a
  live session: a clip whose media was deleted in Designer stays in `allResources` with its old
  metadata, only `VideoClip.isInError` turns True (`probes/10_missing_media.py`).
- Files pane (owner request, 2026-10-10): such a card gets a red "MISSING" badge (a pill in
  list view) and is dimmed; it cannot be selected (click, Shift, select all, marquee) or
  dragged, so it reaches neither Simple Create nor the plan. Groups from folders leave
  missing files out ("1 missing file skipped"). Missing rows do not move the cursor and place no
  markers, like `plan_prepare.py` skipping a clip it cannot load; they are not counted as
  "without mapping" and are left out of the payload (`buildAdvancedPlan`). The mapping check
  runs on every load and Refresh (`useLayerPlan.clearUnknownMappings`), so it also covers a
  restored plan.

**C. Accessibility and keyboard (§4.6)** - **deferred** (owner decision, 2026-10-10: not
needed for this release; Esc, Delete and the armed mapping already work from the keyboard).
- Plan rows: `role="row"` and `tabindex`, ↑/↓ move focus between rows (across groups),
  Space toggles the row checkbox, Shift+↑/↓ extends the selection, Delete removes (exists).
- Group headers reachable by Tab; Enter toggles collapse.
- Visible `focus-visible` rings on every interactive element of the plan, the files pane and
  the settings panel; check the tab order of the whole window once.
- `aria-live` on toasts and the Create progress; meaningful `aria-label`s on icon-only
  buttons that appear at narrow widths (Phase 8c).

**D. Mappings**
- **Assign a mapping to the whole plan in one action** (owner request, 2026-10-10): one button
  assigns the chosen mapping to every layer in every group. Today this takes a drop on each
  group header (`assign-group`) or Auto-assign by name/resolution. Same rules as the group-header
  drop: replaces existing mappings; toast "Mapping assigned to N layers in M groups" with an
  Undo action that restores the previous mappings (like the remove / delete-group toasts).
  Placement: an **"Assign to all"** button in the floating armed bar at the bottom of the
  Layer Plan ("Assigning <mapping>: click layer slots | Done", `LayerPlan.vue`, the
  `armedMapping` state of `.sel-bar`), before Done. The bar only shows while a mapping is
  armed, so the action is in context and takes no room in the panel headers. The tooltip
  gives the count ("Assign to all 24 layers in 3 groups"); disabled on an empty plan; the
  mapping stays armed after the click. At narrow widths the bar text shortens
  ("Assigning <mapping>") before the buttons do, and the bar never wraps (§9.5).
  Done: `useLayerPlan.assignAll()` returns the restore for Undo; the button shows an icon only
  at the narrowest bar, like the other bar buttons. Rows with a missing clip get the mapping
  too (they are skipped by Create anyway).

**E. Settings panel and folder tree**
- **Timeline markers section: separate Split section from the tags** (owner request,
  2026-10-10): a visual divider in `SettingsPanel` between the Split section row and the
  TC / Cue / MIDI tag rows, so the two purposes read as separate blocks.
  Done: a 1px `#2e2e2e` line (the same as the preview's top border) under the Split row.
- **Folder checkbox stands out from the folder icon** (owner request, 2026-10-10, follow-up
  to §2.3.0). Today the checkbox that replaces the folder icon on hover (`.fcb` in
  `FolderTree.vue`) has a `#777777` border on `#181818`, almost the same grey and size as the
  `#666666` folder outline, so it is hard to see that the icon changed and that it is a
  checkbox. Fix, palette colours only:
  - the moment the pointer enters a folder row and the icon turns into the checkbox, the box
    is blue: border `#0a84ff`, fill `rgba(10, 132, 255, 0.10)`, so the swap and the click
    target are obvious (owner clarification: the problem is this swap, not hovering the box);
  - pointer on the box itself: the fill gets stronger, `rgba(10, 132, 255, 0.20)`;
  - unchecked boxes on the other rows while folders are checked: border `#aaaaaa`, fill
    `#242424`, lighter and solid against the hollow folder icon but not blue, so the hovered
    row still stands out;
  - keyboard focus: a `0 0 0 2px #0a84ff` ring, like the plan row checkboxes;
  - checked state unchanged (blue fill, white tick); size stays 14px in the 16px icon cell,
    so names still do not move.
  Done: `.fcb` styles in `FolderTree.vue`.

**F. Visual consistency (§7, Q7)**
- ~~Sweep all components against the `disguise-css` palette~~ - dropped (owner decision,
  2026-10-10: the current design and colours are accepted as they are).
- Record in the `disguise-css` skill the colours the redesign actually uses and the owner
  has seen: the override marker, the 12-colour mapping set (`utils/mappingColors.js`), the
  toast variants; close Q7.
  Done: the skill now also records the overall redesign style (radius rule, focus ring,
  shadows, ghost / icon buttons, setting chip states, chip popover, floating bar, group and
  row styles, drag and drop, badges, toasts, narrow-window rules). Q7 moved to "Decided".
- Timecodes and durations in tabular numbers everywhere (plan rows, chips, cards, footer).
  Done: added to the plan header summary, gnav counts, settings footer and Create button,
  the three timecode inputs and the mapping usage count; the rest already had it.
- **One checkbox style, select-all clears first** (owner request, 2026-10-10): the files
  toolbar master checkbox was a white filled square, the plan uses blue checkboxes. It now
  uses the plan checkbox (`.cb`: `#777777` border, blue when checked or partial). With any
  selection, the master checkbox and a group's select-all checkbox **clear** it on the first
  click instead of selecting everything; with none, they select all.
  Done: `FilesPane.vue`, `useFileSelection.toggleSelectAll`, `usePlanSelection.toggleGroup`.

**G. Robustness**
- Large plan check: 500 layers in 10 groups. Plan scrolling, chip folding and marquee stay
  smooth; Create runs in chunks with progress and the final report (§10 risks).
  - Measured (2026-10-10, live session, read-only): `plan_prepare.py` for 500 layers with
    TC + cue + MIDI tags and a split at every file: ~140 ms round trip (1500 tags,
    501 splits). Well inside the ~1 s limit, so prepare stays one call.
  - Markers were one call; ~2000 writes are too close to the limit (no rollback), so
    `createLayerPlan` now places splits, then tags, in chunks of ≤300
    (`MARKER_CHUNK_SIZE`). A failure says how many markers were placed.
  - UI check: a 500-layer saved plan is loaded through localStorage (snippet generated from
    the project's clips), then scrolled, edited and created on a test track by the owner.
- Any error from Create, Refresh or metadata loading ends in a toast, never in a silent
  console error; no `alert()` / `confirm()` left outside the agreed Create confirmation.
  Done: there were no `alert()` / `confirm()` left. Silent before: a failed Refresh, failed
  media details and a failed Create track (console only); all three now end in an error
  toast (`useMediaLibrary(…, onError)`, `SettingsPanel` `error` event). A track name with
  `"` or `\` is rejected, because `createTrack` puts it into a Python string literal.

**H. Docs and release**
- Close the open questions Q4, Q6, Q8, Q11-Q13 (Q7 closed in F) with the owner (keep or change the
  defaults) and move them to "Decided".
  Done (2026-10-10): all defaults kept, §11 has no open questions.
- `CLAUDE.md`: architecture (plan components, `useLayerPlan`, `planSchema`, `planLayout`,
  inheritance), data flow for Advanced Create, the new Python files.
  Done (2026-10-10): also the plan state shape, saved plan, missing clips and the deleted
  media gotcha.
- `README.md`: Simple / Advanced modes, groups, mappings per layer, groups from folders,
  drag and drop, screenshots.
- `CHANGELOG.md` entry and version → 1.2.0 in `package.json`.
- Full manual run of checklists §9.1-§9.6 at 900x560 and at a wide window before the release.
- **Acceptance:** checklist §9.6 and §9.1.

### Phase 10 - Reorder groups by drag and drop (owner request, 2026-10-10)

**Why.** Groups can only be added at a position (folder drop zones, "Insert after") or deleted;
their order cannot change afterwards. The order matters: groups are butted together on the
timeline in plan order (Q4), so G2 always starts where G1 ends. The owner wants to move a
group the same way rows are moved: grab it and drag it.

**Interaction** (mirrors row moving, Phase 6):
- **Grab:** the group header is draggable (`draggable="true"`, `grab` / `grabbing` cursor).
  The name input, the expand arrow and the header buttons keep their own clicks and do not
  start a drag (the input is `draggable="false"`, so its text can still be selected).
- **Payload:** `useDragPayload` gets a new kind `'group'` with the group id, so every other
  target ignores it: row and slot targets, the header's mapping drop ("Assign to all"), the
  files / folders gap zones.
- **Drop target:** another group. The pointer in its upper half inserts **before** it, in the
  lower half **after** it, shown with a 2px `#0a84ff` insert line in the 10px gap above or
  below the group box (the row insert line's colour; in the gap, so it does not fight the
  group's own border and flash states). The list background under the last group drops at
  the end, with the same line under the last group; the gaps between groups are not targets. Dropping a group on itself, or right before / after itself
  where nothing changes, is a no-op.
- **While dragging:** the dragged group is dimmed (`opacity: 0.4`, like dragged rows); the
  plan auto-scrolls near its top / bottom edge (existing `autoScroll`). Collapsing big groups
  first (Collapse all) makes long moves short, nothing collapses automatically.
- **Result:** `useLayerPlan.moveGroup(gid, targetGid | null, 'before' | 'after')` reorders
  `state.groups`. Everything that depends on the position follows by itself: the G1…Gn
  numbers and badges on file cards, the gnav chips, the time layout, the mini timelines,
  marker counts and the Create order. Row selection, overrides and mappings move with the
  group. The moved group flashes (`jump`). No toast and no Undo, like moving rows: dragging
  back restores the order. The new order is saved with the plan (Phase 9 A).

**Not in scope:** dragging gnav chips, moving several groups at once, keyboard move
(deferred with Phase 9 C).

**Files:** `useDragPayload.js` (kind), `useLayerPlan.js` (`moveGroup`), `PlanGroup.vue`
(draggable header, group drop halves, insert line, dimmed state), `LayerPlan.vue` (end-of-list
drop, forwarding `drop-group`), `MediaSequencer.vue` (wire `moveGroup`, reveal the group).

Done (2026-10-10, waiting for the owner's check): as above. `moveGroup` was checked on 8 cases
(before / after / to the end, the no-op positions next to itself, onto itself). A drag that
starts on the name field, the arrow or a header button is cancelled at `dragstart` (the
pointer-down target is remembered), so those controls keep working.

- **Acceptance:** checklist §9.7 and §9.1.

---

## 9. Acceptance checklists (manual)

### 9.1. Simple regression (every PR)
- [ ] Selection: click, Ctrl, Shift, marquee, Ctrl+marquee, order numbers, select all / none.
- [ ] Tree: expand, select, breadcrumbs, include subfolders, resize, collapse.
- [ ] Grid/List, S/M/L, persisted across reload.
- [ ] Mapping: search, select. Track: search, select, create new, name validation.
- [ ] Insert at playhead / specific time (HH:MM:SS:FF validation).
- [ ] Overlap, Fit / Movie / Still, Brightness + time.
- [ ] TC (start + increment), Cue (mask, auto-increment), MIDI (mask, auto-increment).
- [ ] Split section. Refresh.
- [ ] Create: result in Designer identical to 1.1.2.

### 9.2. Inheritance (Phase 7)
- [ ] A group value equal to the default shows no ◆. A layer value equal to the group shows no ◆.
- [ ] Changing a default removes group overrides that now equal the new default.
- [ ] Mixed selection: the field is empty with a "Mixed" placeholder; choosing a value applies
      it to all selected layers.
- [ ] Popover reset (group → default, selection → group). "N layers override this, Reset".
      Group "Reset to defaults". "Reset all overrides".
- [ ] Linked keys (`bright`/`brightT`, `fit`/`movieDur`/`stillDur`, `timing`/`overlap`) reset together.
- [ ] "Apply to all groups" promotes the value to defaults and removes it from groups.
- [ ] Start/Tags/Split chips stay visible in selection scope and edit the group (Phase 8b
      change; Phase 7 hid them).

### 9.3. Groups from folders (Phase 6b)
- [ ] A plain click still navigates, and Ctrl/Shift/checkbox only change `checkedFolders`;
      navigating doesn't clear the folder selection.
- [ ] 3 checked folders + "Folder only" → 3 groups named after the folders, in tree order,
      files sorted by name, only direct files.
- [ ] "With subfolders" → files of descendants included and flattened. A checked descendant of
      a checked folder is skipped and reported.
- [ ] "Split subfolders" → one group per folder with direct files, named with the relative
      path. Empty folders are skipped and reported.
- [ ] "Insert after G1" places the groups after G1; the default appends.
- [ ] Dropping folders between groups creates groups there; dropping onto a group adds files
      to it.
- [ ] Works in Split and Files layouts (Files switches to Split afterwards). Hidden in Simple
      mode.
- [ ] Refresh keeps checked folders that still exist.

### 9.4. Settings panel (Phase 8b)
- [ ] Sections appear in the order Mappings / Where / Layers / Timeline markers in both modes;
      Simple shows Layers in full, Advanced shows the note with "Open Plan defaults".
- [ ] Collapsed headers show correct summaries and On/Off pills, which update live; open/closed
      state survives a reload.
- [ ] An invalid timecode or cue mask puts a red dot on its collapsed section; Create stays
      disabled as before.
- [ ] Every chip popover uses the same compact layout (header, option rows, nested steppers,
      Reset / move-up button with the labels of its level); it closes on ×, an outside click
      or Esc. Numbers can be typed (Enter / blur apply, Esc cancels, comma accepted, ↑/↓ step).
- [ ] All seven chips have the same width and stay on one row; changing any value (stepper,
      typing, option) moves no other chip and no popover.
- [ ] In a narrow pane the extra chips fold into "+N"; its list opens each hidden chip's
      popover; overridden chips stay visible; "+N" shows ◆ / the warning dot of hidden chips.
- [ ] Checking and unchecking layers moves nothing: the floating bar appears at the bottom,
      rows and chips keep their place, the last group can still be scrolled above the bar.
- [ ] The bar's Selected / Group switch changes what the chips edit; Clear mappings, Remove and
      × (Esc) work; the armed-mapping message shows in the same bar.
- [ ] Plan defaults opens as a floating chip panel; counters "◆ N" match the groups and layers
      that set their own value; "Clear N overrides" and "Reset all overrides" update the
      counters and the group chips at once.
- [ ] "Apply to all groups" (group) and "Apply to whole group" (selection) move the value one
      level up and clear it below.
- [ ] The switch in the Split popover header turns Split section on/off; the options dim while
      it is off, and chips/markers update. The Tags "Off" pill opens Timeline markers.
- [ ] Advanced markers preview counts match what Designer creates (splits and tags).
- [ ] Simple creation is identical to before the redesign (§9.1).
- [ ] Narrow window (~900x560): nothing clipped, summaries wrap on their own line, helper
      texts stay short with the details in info-icon tooltips.

### 9.5. Files toolbar and drop-to-create (Phase 8c)
- [ ] Advanced: no "+ New group" button; the files toolbar is one row in Split (420px) and
      still one row at 220px ("N/M", shortened select, no size toggle). Simple unchanged.
- [ ] "Add to group… > New group" creates a group from the selection in selection order,
      clears the selection, switches Files → Split and flashes the group; G1… options still add.
- [ ] Dragging files onto the empty plan creates G1; onto the space under the last group
      creates a group at the end; onto a gap between groups creates it there.
- [ ] The drop zones appear only while files (or folders) are dragged and highlight on hover;
      dropping onto a group or a row still adds to that group.
- [ ] Dragging one unselected file creates a group with that file only; dragging the selection
      keeps the selection order.
- [ ] Toast "G3 created, 5 files"; the new group has no overrides.
- [ ] Folder tree: hovering, checking and unchecking folders moves no name, icon or count; the
      checkbox appears in place of the folder icon; Simple mode shows the icon only.
- [ ] Tree expand arrow looks and animates like the group header arrow (triangle, `#aaaaaa`,
      white on hover, 90° turn); leaf folders stay aligned with folders that have children.

### 9.6. Polish (Phase 9)
- [ ] Build a plan, reload the panel: groups, rows, overrides, mappings and Plan defaults come
      back; the mapping type filter too. A plan saved with an older schema resets with a toast.
- [ ] Delete a clip in Designer, Refresh: its rows show "missing", the footer counts them,
      Create asks before skipping them. Delete a mapping, Refresh: it is cleared from its rows
      with a toast.
- (deferred with item C) Keyboard only: Tab into the plan, ↑/↓ across rows and groups, Space
  checks, Shift+↑/↓ extends, Delete removes, Enter on a group header collapses it.
- [ ] Arm a mapping, "Assign to all": every layer in every group gets it, toast with the count,
      Undo restores the previous mappings; the mapping stays armed. Disabled on an empty plan.
      The armed bar stays one row at 900x560.
- [ ] Timeline markers: Split section is visually separated from the tag rows.
- [ ] The files toolbar checkbox looks like the plan checkboxes. With some files selected,
      one click clears the selection (the same for a group's select-all); with none, it
      selects all.
- [ ] Folder tree (Advanced): hovering a row swaps the icon for a blue-outlined checkbox that
      is clearly not the folder icon; hovering the box itself tints it stronger; while folders
      are checked the other rows show light grey boxes; Tab focus shows a blue ring; names
      do not move.
- [ ] 500 layers in 10 groups: scrolling, chips and marquee stay smooth; Create finishes with
      progress and a report.
- [ ] Version 1.2.0 in `package.json` and `CHANGELOG.md`; README describes Advanced mode.

### 9.7. Reorder groups (Phase 10)
- [ ] Drag G3 by its header above G1: it becomes G1, the others renumber, the gnav chips and
      the file card badges follow, the moved group flashes.
- [ ] The insert line shows above or below the hovered group by pointer half; dropping under
      the last group moves to the end; a drop on itself changes nothing.
- [ ] The time layout follows: the moved group starts at 0 and the next one where it ends;
      Create places the groups on the timeline in the new order.
- [ ] Typing in the group name, the arrow and the header buttons still work and never start
      a drag. A mapping dropped on a header still assigns it; a group dragged over a header
      does not.
- [ ] Rows, files and folders still drop as before while no group is dragged.
- [ ] Reload the panel: the new order is kept.
- [ ] Works at 900x560 and in a wide window.

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Mapping resolution can't be read uniformly for every type | Auto-assign by resolution doesn't work | Phase 0. If there's no source, show "-" and disable this criterion for those mappings |
| HTML5 DnD is unreliable in the Designer window | Core Advanced interaction broken | Owner decision: run the plugin in an external browser in that case. The "armed" mode remains as a keyboard alternative |
| Python timeout on large plans | Partially created plan | Chunks, `errors[]`, resume from last `endBeats`, final report |
| Metadata for 1000+ clips loads slowly | Slow startup | Lazy loading per visible folder, cache |
| Preview (seconds) vs Designer (beats, BPM) mismatch | User expectations | "≈" label; preview is indicative only |
| Single-component complexity grows | Maintainability | Phase 1 before features, composables |

---

## 11. Decisions and open questions

### Decided (2026-10-08)

- **Q1 - layers without a mapping (Advanced):** **warn and create.**
  - Create stays enabled; the footer shows "N without mapping";
  - pressing Create asks for confirmation;
  - for those layers the service explicitly clears the mapping
    (`setResource(beat, None)`), because Designer pre-fills one otherwise.
- **Q2 - Simple mapping as fallback:** no. This follows from Q1.
- **Q3 - Split "Group start":** **one split at the group start.** The next group's split
  closes the previous one; the last placed group gets a closing split at its end (the end of
  its longest layer), like the closing split of "Each file" (owner request after Phase 8c).
  - Split "Each file" keeps today's behaviour: a split at every layer start plus a closing
    split after the last layer. Simple mode must stay identical to 1.1.2.
  - With `timing='same'` all starts coincide, so a group gets one split at the start plus the
    closing split after the longest layer.
- **Q5 - tag numbering:** **continuous across the plan.** The i-th placed tag = start +
  i*increment (TC) or base + i (cue/MIDI), regardless of groups. Same as today.
- **Q9 - mapping type filter:** dynamic, built from the `__username__` of the types found in
  the project (Phase 0 found 11 types).
- **Q10 - live video inputs:** **use the Still duration**, as today. The card and row get a
  "LIVE" badge instead of "still".
- **Q7 - new colours** (decided 2026-10-10, Phase 9 F): the owner accepts the colours as
  shipped, recorded in the `disguise-css` skill:
  - override / attention: `#ffd60a` (◆ marker, overridden value) with a
    `rgba(255, 214, 10, 0.55)` chip border, instead of the proposed `#f5b83d` set;
  - success: neutral toast `#242424` with a `#0a84ff` border (no green);
  - the 12-colour mapping set in `utils/mappingColors.js`, differing in hue and lightness.

### Decided (2026-10-10, Phase 9 H: the owner kept the defaults as implemented)

- **Q4 - overlap/gap between groups:** **none.** Groups are butted together: the next group
  starts where the longest layer of the previous one ends. Overlap exists inside a group only.
- **Q6 - persist the plan across panel reloads:** **yes, in localStorage** per director, with
  a schema version (Phase 9 A). **No export/import** in this release.
- **Q8 - default mode for new users:** **Simple** (the familiar workflow). The last chosen
  mode is then remembered.
- **Q11 - groups from folders, order of groups:** **tree order**, not the order in which
  folders were checked.
- **Q12 - groups from folders, default content mode:** **follow the "Include subfolders"
  toggle** ("With subfolders" if on, "Folder only" if off). "Split subfolders" is an explicit
  choice, remembered once made.
- **Q13 - remember the source folder for a "↻ Sync with folder" action:** **no**; groups are
  plain groups once created. The source path is stored on the group anyway
  (`group.sourceFolder`), so the feature can be added later without migration.

No questions are open.

---

## 12. Findings (filled in during Phase 0)

Probes live in `tools/designer-probes/`:
- `probes/` - read-only, run all with `node tools/designer-probes/run.mjs`;
- `tests/` - write tests that only touch the scratch track `objects/track/zz_probe_test.apx`.
  Run each by path, e.g. `node tools/designer-probes/run.mjs tools/designer-probes/tests/t11_stack_order`.
  `t99_cleanup` deletes the scratch track;
- raw responses are in `results/`.

Run 1: 2026-10-08, project `api_test` (14 clips, 1 track, 6 internal projections, refresh rate 60).
Run 2: same day, after the owner added one mapping of each type (16 projections, 11 types).
Run 3: owner test media in `test 2` (alpha / audio).
Run 4: owner added `Footages` (89 clips); full re-check of all media data against disk,
`node tools/designer-probes/verify_media.mjs "<project folder>" [filter]`.

| Question | Result |
|---|---|
| `Projection` subclasses and `__username__` | 11 types seen (run 2): `PerspectiveProjection`→"Perspective", `Spherical`, `Cylindrical`, `Radial`, `Parallel`, `FisheyeProjection`→"Fisheye", `MeshProjection`→"Mesh", `SpatialMap`→"Spatial", `CameraPlate`→"CameraPlate", `FeedProjection`→"Feed", `DirectProjection`→"Direct". Path folder = lowercased class name (`objects/perspectiveprojection/…`). Designer also auto-creates `internal/` DirectProjections, which must stay filtered out. **Answers Q9: build the type chips dynamically from `__username__`** - the fixed mockup list misses 6 types |
| Mapping resolution source per type | `Projection.resolution` (`Vec2`) works for **every** type. Freshly created mappings all report the default `720×576`, and a Feed mapping reports 720×576 even though its surface is 1920×1080. Auto-assign by resolution will hit many ties on unconfigured projects; that is the "skipped (several mappings share the resolution)" path, as designed |
| Mapping names | The **file name keeps the user's case** (`5 (Perspective).apx`), but `description` is **lower-cased** (`5 (perspective)`). The current UI shows the file name. Keep that for display; match on lower-case for auto-assign |
| Clip fields: duration, fps, resolution, live | Use **`clip.fileFrameSize`** (`Vec2`) for resolution. `clip.file.resolution` is wrong for live inputs (64×48 placeholder vs 1920×1080). Duration: `clip.fileNFrames / clip.fileFps`. Also `clip.transportDuration` (`"00:00:06.20"`). Live: `clip.isVideoIn` (live inputs have `fileFps = 0`, `nFrames = 1`). Still: `nFrames == 1`, `file.codec` starts with `still_image:` (e.g. `still_image:PNG`). Also `clip.hasAudio`, `file.codec` |
| Metadata query time for N clips | 14 clips: ~3 ms total in Python (`d3Log`), ~100 ms round trip. Re-measure on a 1000+ clip project |
| Default resource serialisation | `return resource` gives `{"path", "_type", "uid"}`. `_type` is the class name, so the mapping type comes for free even without an explicit dict |
| Beats vs seconds on the default track | `timeToBeat(10.0) == 10`: 1 beat = 1 s (60 BPM default). Explains why the official snippet passes `trackTime()` straight into `addNewLayer` |
| Python access gotcha | Touching an attribute that holds an `Action` object (e.g. `onChangedAction`) raises `TypeError: Access to object of type 'Action' is not allowed`, and `try/except` does **not** catch it - the whole script fails. Never iterate `dir()` blindly; skip names containing `Action` |
| HTML5 DnD in the plugin window | Not tested yet. **Owner decision:** if DnD fails inside the Designer window, the plugin is run in an external browser (`?director=host:port`), where DnD works. The pointer-events fallback is dropped. The "armed" keyboard mode stays for accessibility |
| Position of a new layer in the stack after `addNewLayer` | **Index 0 (top of the stack), regardless of start time.** Creating A, B, C gives the order C, B, A. `track.moveLayerToIndex(layer, i)` works. To make the first row in a group the top layer (`timing='same'`), create rows in **reverse** order, or create in order and fix with `moveLayerToIndex` |
| Execute timeout | **≈1 s of Python time** (sleep 0.9 s passes, 1.0 s fails with `TimeOutError`). This is the default `pythonApiExecutionTimeout` |
| What happens on timeout | **No rollback.** Everything created before the interrupt stays (1000-layer run: the old layers were already removed and 50 new ones remained). Chunking must be resumable and must report partial results |
| Cost per layer | ~0.8 ms of Python per fully configured layer (video, mapping, mode, end, brightness fade, cue tag, split). Constant as the track grows |
| Undo close cost | After the script, Designer closes the undo operation on the main thread. Its cost grows with track size: a 100-layer chunk takes ~150 ms round trip on an empty track and ~560 ms when the track already has 900 layers. A 500-layer single call logged `!!! Main thread hung … UndoSystem::closeOperation`. Read-only calls are unaffected (~50 ms) |
| Safe chunk size (layers per call) | **≤100 layers per call** (~80 ms Python, far below 1 s, small UI freezes). Never build a whole plan in one call |
| Track length | **The track is NOT extended automatically.** A layer that crosses `lengthInBeats` is truncated. A layer that starts beyond the end gets a zero or negative length and becomes invisible, while its tags and splits are still placed. **Today's `createLayers` has this bug** (playhead near the track end). Fix: `markDirty(track); track.lengthInBeats = max(len, plannedEnd)` before creating. `layer.setExtents(start, end)` repairs a truncated layer |
| Tags | One tag **per type per beat**: TC, cue and MIDI can share a beat, but a second cue at the same beat **replaces** the first. Read tags with `track.tagsAtBeat(b)` / `tagAtBeat(b, type)` / `findBeatOfNextTag(b)` (returns `1.79e308` after the last). `Tag.text` holds the raw text (`"01:00:00:00"`, `"1.2"`, `"1.60"`) |
| Sections | Splitting twice at the same beat is a no-op. `nSections()` and `sectionToBeat(i)` work. **`sectionLengthBeats(i)` returns unreliable values**, so compute lengths from consecutive `sectionToBeat` |
| BPM | `track.bpm` is settable. At 120 BPM `timeToBeat(10 s) == 20`. Always convert through the track |
| Sequences of `VariableVideoModule` | **`layer.fields`, not `layer.sequences`** (the official guide is wrong). 54 fields, all lower-case (`brightness`, `mapping`, `video`, `mode`, `at end point`, `volume`, `speed`, `hue shift`…). `findSequence` is **case-insensitive**. There is no `opacity` |
| Fresh layer defaults | mode = 1 (Normal), at end point = 0 (Loop), brightness = 1, video = None. **mapping is pre-filled by Designer** (here `10 (fish eye)`). A "layer without mapping" therefore silently gets some mapping unless we clear it. `fs.sequence.setResource(beat, None)` clears it |
| **Alpha / audio - RESOLVED** (run 3, owner test media in `test 2`, ground truth read from the file headers on disk) | **Videos:** `VideoAsset.hasAlpha` is correct (HAP `Hap1` depth 24 → False; NotchLC depth 32 → True). **Audio:** `clip.hasAudio` is correct (HAP with 2 ch / 16-bit / 48 kHz → True, `audioSampleRate` 48000). **Stills:** `hasAlpha` is wrong. Both JPEGs and all four RGB PNG test patterns report True; only real RGBA PNGs are true. **Rule implemented in probe `09_alpha_resolved.py`** (the reference for `getMediaDetails`), matching ground truth for every clip in ~10 ms for 18 clips: videos use `hasAlpha`; stills read their own source file header from Python; live inputs → unknown. The source file is `clip.file.fragments[0].proxies[0].path` (a `VideoFile`, path relative to the project folder, e.g. `objects/videofile/test 2/x.png`). Header rules: JPEG → no alpha; PNG colour type 4/6 or a `tRNS` chunk → alpha; EXR channel list contains `A` → alpha. `.d` (Disguise still) and other formats → unknown (`null`, no badge) |
| **Full media-data re-check** (run 4, owner added `Footages`: 89 Photo-JPEG `.mov`, 1920×1080, 30 fps, in 3 subfolders) | New probe **`src/services/python/media_details.py`** is the reference implementation of `getMediaDetails` (kind, codec, nFrames, fps, duration, res, hasAlpha, hasAudio, bitDepth, source). **`verify_media.mjs`** cross-checks it against the files on disk (MOV atoms, PNG header). Result: **99 of 99 verifiable clips match** on resolution, frame count, duration (±0.05 s), alpha and audio. The rest are expected: 4 live inputs (the disk file is a 64×48 placeholder; Designer's 1920×1080 live format is right) and 4 stills the checker can't parse (JPEG/EXR/`.d`, verified separately in run 3). 107 clips take ~12 ms in Python. **Motion-JPEG MOVs report codec `jpeg`** (not `still_image:JPEG`), so the video/still split must use the `still_image:` prefix plus `nFrames`, never the codec name alone |
| `transportDuration` format | `"00:00:15.01"` is **SS.FF (frames)**, not decimal seconds: 451 frames @ 30 fps = 15 s + 1 frame. Use `fileNFrames / fileFps` for maths; show `transportDuration` only as text, if at all |
| Plugin's current `getMediaList` on the real project | Builds the tree correctly (`footages` → `4k emanation` 30, `technikal` 29, `vortex` 30; ~57 ms round trip). Folder and file names come from resource paths, which Designer **lower-cases** (`footages`, while the disk folder is `Footages`). Original casing isn't available from the clip path. Acceptable; mention in the docs |
| Test data for §2.3.2 (groups from folders) | `footages` has 0 direct files and 3 subfolders. That is exactly the "Folder only → skipped as empty" / "With subfolders → 1 group of 89" / "Split subfolders → 3 groups" case for checklist §9.3 |
| Python file access | `open()` and `os.path.exists()` work and resolve relative to the project folder. **An `IOError` from `open()` is not catchable** (same as the `Action` error), so always check `os.path.exists()` first |
| Audio channel count | Not available through the API: `clip.audioTracks` is empty even for the clip with embedded audio, and `VideoAsset` has no channel field. If the count is wanted, it can be parsed from the MOV `stsd` sound entry in Python, the same way as the PNG header. **Not planned:** the badge shows only "has audio" |
| Test media note | `test 2` also contains `Presentation_S05_C_CENTER_5376x1680- (Custom).jpg`, but Designer created **no clip** for it. Probably because a PNG with the same base name already took that asset path (`objects/videoasset/…/<name without extension>.apx`). It is a Designer import detail, not a plugin issue |
| Alpha flag (probe `08_alpha_audio`, superseded by the row above) | `clip.file.hasAlpha` (`VideoAsset`) and `VideoFile.info.hasAlpha` agree. **Stills are unreliable:** every PNG, the `.d` file **and JPEGs** report `True`, while EXR reports `False`. Designer seems to report the decoded texture format (RGBA), not real transparency. Videos: HAP → `False`, which looks correct. **Pending verification** with real media: a HAP Alpha / ProRes 4444 / NotchLC-with-alpha video, a transparent PNG and an opaque PNG. Until then: trust the flag for videos; for stills, force `false` for `still_image:JPEG` and show the PNG/TIFF/TGA/EXR flag as is, labelled "may have alpha" |
| Official reference for `VideoAsset` (owner screenshot) | Confirms `hasAlpha : bool` and `hasAudio : bool (Read-Only)` on `VideoAsset` (= `clip.file`). **`hasAlpha` is writable**, i.e. an asset setting Designer fills with a default, not a read-only fact probed from the file. That explains `True` on JPEGs. Other fields: `bitDepth` (enum index: 8 = "8 Bits", 9 = "10 Bits", 11 = "12 Bits", 13 = "16 Bits"…; every test clip reports 8, including the EXR), `codec`, `fps`, `nFrames`, `resolution`, `proxyInfo` (`"Full"`), `fragments`, `regionSet`. `audioSampleRate` is **not** an audio indicator: it is 44100 on silent HAP and live clips. No channel-count field on `VideoAsset` |
| Audio flag | `clip.hasAudio` == `clip.file.hasAudio` for all clips. None of the test clips has audio, so `true` and `audioTracks[].header.nChannels` are **pending verification** with a video that has embedded audio |
| Methods vs properties | In `d3.pyi`, members marked `@property` are attributes; everything else is a **method** (`track.nLayers()`, `track.nSections()`). Calling a method as an attribute returns a bound method and breaks JSON serialisation |

Impact on the plan:
- **Phase 3 (`createLayerPlan`) must:**
  - extend `track.lengthInBeats` to the planned end before creating anything;
  - send chunks of ≤100 layers;
  - make chunks resumable: each call returns `endBeats` and `nextTagIndex`;
  - report partial results on `TimeOutError`, because nothing rolls back.
- **Stack order:** `addNewLayer` puts each new layer on top. With `timing='same'` the stack
  would come out reversed relative to the plan rows. Create each group's layers in reverse
  row order, or reorder with `moveLayerToIndex`.
- **Q1 (layers without mapping):** Designer pre-fills a mapping on every new layer, so the
  service clears it explicitly with `setResource(beat, None)` (decision in §11).
- **Q9:** answered - dynamic type chips.
- The track-length bug in today's `createLayers` is **not** hotfixed separately (owner
  decision). It ships with the redesign release via `createLayerPlan` (Phase 3).
- Live inputs are treated as stills by today's `createLayers` (`fileFps > 1` check fails),
  so they get `stillDuration`. In the new model: `kind: 'live'`, using the still/movie
  duration according to Q10 (§11).
- `getMediaDetails` can be cheap. It may be fine to load metadata for all clips at once
  instead of lazily (re-check on a big project).
