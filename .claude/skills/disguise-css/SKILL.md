---
name: disguise-css
description: >
  CSS color palette and component styling guide for the Disguise media sequencer plugin.
  Use this skill whenever the user asks about styling, colors, UI appearance, adding new
  Vue components, writing CSS for this plugin, creating buttons/inputs/cards/dropdowns/
  toggles/panels, or any question about "how should this look" or "what color should I
  use". Also use when the user wants to match existing plugin styles, fix visual
  inconsistencies, or review CSS for correctness against the project's design system.
  This plugin uses a strict dark theme with hardcoded hex values - never CSS variables,
  never Tailwind - so always consult this skill before writing any CSS.
---

# Disguise CSS Style Guide

This plugin runs inside Disguise Designer as a dark, professional media-server UI. The
entire codebase uses hardcoded hex values - **no CSS custom properties, no Tailwind**.
Every new component must match the existing palette exactly.

---

## Core rules

1. **Use exact hex values** from the tables below - never invent new colors.
2. **No CSS variables or `var(--...)`** - inline hex everywhere.
3. **Scoped styles** - always `<style scoped>` in Vue SFCs.
4. **Border-radius is `6px`** for all UI controls (inputs, buttons, cards, dropdowns, chips,
   bars, popovers). Small inner items use `4px`: badges on thumbnails, icon buttons of 24px and
   less, segment buttons inside a segmented control, the row checkbox. Round counters
   (`.sel-count`, order badges) use half their height.
5. **Error/validation** always uses `#ef4444`.
6. **Settings group headers** are always `11px / 700 weight / uppercase / #0a84ff`.
7. **Every interactive element needs all four states:** default, hover, focus/active, disabled.
8. **Transitions** - use `transition: all 0.2s ease` on interactive elements (some border/shadow transitions can use `0.3s`).
9. **Numbers** - timecodes, durations, counts and progress use
   `font-variant-numeric: tabular-nums` (same font, equal-width digits), so columns line up
   and changing values don't jitter.
10. **Narrow windows** - the plugin must work at its minimum size (iframe ~900x560). Panes use
    container queries (`container-type: inline-size` + `@container (max-width: …)`): toolbars
    and bars stay one row and shed text labels to icons (keep an `aria-label`) instead of
    wrapping. Dropdowns, popovers and menus float (`position: fixed` / absolute overlay) and
    never push content or get clipped by a scroll container.

---

## Color palette

### Background levels

Six distinct background levels create the depth hierarchy:

| Role | Hex | Where |
|------|-----|-------|
| `bg-app` | `#1a1a1a` | Main app shell, action toolbar |
| `bg-sidebar` | `#1e1e1e` | Settings sidebar, dropdown lists |
| `bg-control` | `#181818` | Input fields, segmented controls |
| `bg-content` | `#151515` | Search bar, card preview areas |
| `bg-card` | `#242424` | Media cards, settings group boxes |
| `bg-hover` | `#1f1f1f` | Tree item hover |

### Accent / interactive blue

One primary accent color with opacity variants for overlays:

| Role | Value | Where |
|------|-------|-------|
| Primary | `#0a84ff` | Buttons, selected borders, group headers, toggle ON, focus borders |
| Hover | `#0060d1` | Button hover |
| 10% overlay | `rgba(10, 132, 255, 0.10)` | Selected tree item background |
| 15% overlay | `rgba(10, 132, 255, 0.15)` | Card selected overlay, create-track-panel border |
| 20% overlay | `rgba(10, 132, 255, 0.20)` | Dropdown selected item background |
| 50% overlay | `rgba(10, 132, 255, 0.50)` | Card selected box-shadow |
| 8% overlay | `rgba(10, 132, 255, 0.08)` | Chosen option row inside a chip popover |
| 45% border | `rgba(10, 132, 255, 0.45)` | Setting chip border in selection scope (edits the selected layers) |
| Focus shadow | `rgba(59, 130, 246, 0.30)` | Input focus `box-shadow` |
| Focus ring | `0 0 0 2px #0a84ff` | `:focus-visible` on buttons, chips, checkboxes, bar buttons (no outline) |

### Border / divider grays

| Hex | Where |
|-----|-------|
| `#222222` | Sidebar header borders, section dividers |
| `#2a2a2a` | Tree sidebar right border, panel borders |
| `#262626` | Separators between options inside a chip popover |
| `#2e2e2e` | Dropdown separators, in-panel dividers (markers preview, Split / tags divider) |
| `#333333` | Input borders, card borders, scrollbar thumb |
| `#36373a` | Settings sidebar border-left |
| `#3a3a3a` | Input focus borders, toggle OFF track, dropdown item hover bg |

### Text / icon grayscale

Phase 12 (1.3) raised the text contrast on the unchanged backgrounds: every text role reads at
4.5:1 or better. Pick the colour by **role**, never by copying an old value.

| Hex | Role | Where |
|-----|------|-------|
| `#ffffff` | Selected / active | Selected card name, active segment, chip values, titles in panels |
| `#f2f2f2` | Strong text | File names in plan rows, group names, mapping names, current breadcrumb, hover text of segments and links |
| `#e6e6e6` | Card file name | File name on media cards (12.4:1 on `#242424`) |
| `#d4d4d4` | Body text | App body text, settings labels, bar buttons, gnav chips, link buttons |
| `#aeaeae` | Labels and icons | Chip keys, expand arrows, ghost / quiet button text, flags, section chevrons |
| `#9c9c9c` | Meta | Duration, resolution, type, counts, summaries, hints, breadcrumbs, folder icons and counts, inactive segments, icon buttons, search icon (5.7:1 on `#242424`) |
| `#888888` | Muted | Placeholders, units, empty states, empty mapping slot, off / mixed chip values, drag grip (4.7:1 on `#1e1e1e`) |
| `#777777` | Disabled | Text on disabled primary buttons; checkbox border |
| `#666666` | Decoration | Breadcrumb divider |
| `#555555` / `#444444` | Placeholder art | Video / image placeholder icons on card previews; unassigned mapping dot `#555555` |

Never use `#666666` or darker for readable text.
### Semantic

| Hex | Purpose |
|-----|---------|
| `#ef4444` | All error and validation states - invalid input border, error messages, error toast border, red warning dot on a chip, missing clip (red row name, MISSING badge, missing-mapping slot border), danger hover on Delete / Remove |
| `#ffd60a` | **Override / attention**: the ◆ override marker and its count, an overridden chip's value, "warm" hints in Plan defaults |
| `rgba(255, 214, 10, 0.55)` | Border of an overridden setting chip |

There is no green "success": success toasts are neutral (see Toasts).

### Overlays and shadows

| Value | Where |
|-------|-------|
| `rgba(0, 0, 0, 0.6)` | Badges over thumbnails (duration chip, group badge) |
| `0 4px 12px rgba(0, 0, 0, 0.5)` | Dropdown lists, toast |
| `0 10px 28px rgba(0, 0, 0, 0.5)` / `0.55` | Drop shadow of floating layers |
| `0 0 0 1px rgba(10, 132, 255, 0.12), 0 0 14px rgba(10, 132, 255, 0.22), 0 10px 28px rgba(0, 0, 0, 0.55)` + border `rgba(10, 132, 255, 0.55)` | **Glowing frame** of the plan's floating windows: the selection / armed bar, Plan defaults, Auto-assign, chip popovers, the "+N" list, Copy mappings. Not for settings-panel dropdowns (`MenuSelect`) or toasts |

### Mapping colours

Designer has no mapping colour, so the plugin assigns one. The set lives in
`src/utils/mappingColors.js` (`MAPPING_COLORS`, 12 hues differing in hue **and** lightness,
handed out in the project's mapping-list order; `NO_MAPPING_COLOR = #555555`):

`#0a84ff #ffd60a #34c759 #ff375f #30b0c7 #ff9f0a #bf5af2 #a3d65c #ff6b5a #64d2ff #7d7aff #c9a27e`

Never hardcode these in CSS: bind `mappingColor(path)` as an inline `background` of the
mapping dot / tag (9px square, 3px radius). They are data colours, not UI colours: don't
reuse them for buttons or states.

---

## Component recipes

### Input / form control

```css
.input {
  background: #181818;
  border: 1px solid #3a3a3a;
  color: #eeeeee;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input:focus {
  outline: none;
  border-color: #0a84ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
.input.invalid {
  border-color: #ef4444;
}
.input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Primary button (e.g. "Create Layers")

```css
.btn-primary {
  background: #0a84ff;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.btn-primary:hover {
  background: #0060d1;
}
.btn-primary:disabled {
  background: #3a3a3a;
  color: #777777;
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Secondary button (e.g. "Cancel")

```css
.btn-secondary {
  background: #2a2a2a;
  color: #aeaeae;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.btn-secondary:hover {
  background: #333333;
}
.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Dropdown

```css
/* Trigger element - same as .input */
.dropdown-trigger {
  background: #181818;
  border: 1px solid #3a3a3a;
  color: #eeeeee;
  border-radius: 6px;
  padding: 8px 10px;
}

/* Floating list */
.dropdown-list {
  background: #1e1e1e;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

/* Individual item */
.dropdown-item {
  padding: 8px 12px;
  font-size: 12px;
  color: #eeeeee;
  cursor: pointer;
  transition: background 0.15s ease;
}
.dropdown-item:hover {
  background: #3a3a3a;
}
.dropdown-item.selected {
  background: rgba(10, 132, 255, 0.20);
  color: #0a84ff;
  font-weight: 600;
}

/* Separator */
.dropdown-separator {
  border-top: 1px solid #2e2e2e;
  margin: 4px 0;
}
```

**Never use a native `<select>`**: its open list is drawn by the browser and ignores the
palette. For a short list of choices use `src/components/common/MenuSelect.vue` (this look,
28px trigger, teleported list that flips above when there is no room, section headings
`{ heading }`, a `create` action pinned under the scrolling list like "+ Create New Track",
keyboard: arrows, Enter, Esc). With `v-model` it is a select; without it, an
action menu that emits `select` and keeps its placeholder (e.g. "Add to group…").

### Segmented control (mode selector)

```css
.segmented {
  display: flex;
  background: #181818;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  padding: 2px;
}
.segmented-item {
  flex: 1;
  background: transparent;
  color: #9c9c9c;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.segmented-item:hover {
  color: #f2f2f2;
}
.segmented-item.active {
  background: #3a3a3a;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
```

### Toggle / switch

```css
.toggle-track {
  width: 34px;
  height: 18px;
  border-radius: 9px;
  background: #3a3a3a;       /* OFF */
  transition: background 0.2s ease;
}
.toggle-track.on {
  background: #0a84ff;       /* ON */
}
.toggle-knob {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #888888;       /* OFF */
  transition: transform 0.2s ease, background 0.2s ease;
}
.toggle-track.on .toggle-knob {
  background: #ffffff;       /* ON */
  transform: translateX(16px);
}
```

### Media card

```css
.media-card {
  background: #242424;
  border: 1px solid #333333;
  border-radius: 6px;
  transition: border-color 0.2s ease;
  cursor: pointer;
}
.media-card:hover {
  border-color: #555555;
}
.media-card.selected {
  border-color: #0a84ff;
  box-shadow: 0 0 0 1px #0a84ff, 0 0 15px rgba(10, 132, 255, 0.5);
}

/* Overlay shown on selected cards */
.media-card-overlay {
  background: rgba(10, 132, 255, 0.15);
}

/* Thumbnail / preview area */
.media-card-preview {
  background: #151515;
  color: #333333;            /* placeholder icon / text */
  border-bottom: 1px solid #333333;
}

/* Footer label */
.media-card-name {
  color: #e6e6e6;
  font-size: 12px;
  font-weight: 500;
}
/* Type, resolution */
.media-card-meta {
  color: #9c9c9c;
  font-size: 10px;
}
.media-card.selected .media-card-name {
  color: #ffffff;
}
```

### Tree / sidebar item

```css
.tree-item {
  color: #d4d4d4;
  cursor: pointer;
  transition: background 0.15s ease;
  border-left: 3px solid transparent;
}
.tree-item:hover {
  background: #1f1f1f;
}
.tree-item.selected {
  border-left-color: #0a84ff;
  background: rgba(10, 132, 255, 0.10);
}

.tree-item-icon,
.tree-item-count {
  color: #9c9c9c;
}
.tree-item.selected .tree-item-icon,
.tree-item.selected .tree-item-count {
  color: #d4d4d4;
}

.tree-item-chevron {
  color: #aeaeae;
}
```

### Settings panel group

```css
/* Group container */
.settings-group {
  background: #242424;
  border: 1px solid #333333;
  border-radius: 6px;
  padding: 16px;
}

/* Section header inside a group */
.settings-group-header {
  color: #0a84ff;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

/* Field label */
.settings-label {
  color: #d4d4d4;
  font-size: 12px;
  font-weight: 600;
}

/* Unit / secondary label */
.settings-label-secondary {
  color: #9c9c9c;
  font-size: 11px;
}
```

### Selection marquee (drag-select)

```css
.selection-marquee {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.4);
  pointer-events: none;
}
```

### Scrollbar

Apply to any scrollable container:

```css
.scrollable::-webkit-scrollbar {
  width: 6px;
}
.scrollable::-webkit-scrollbar-track {
  background: transparent;
}
.scrollable::-webkit-scrollbar-thumb {
  background: #333333;
  border-radius: 3px;
}
.scrollable::-webkit-scrollbar-thumb:hover {
  background: #555555;
}
```

---

## Layer plan redesign patterns (1.2.0)

These are the styles the Layer Plan redesign actually ships with; reuse them instead of
inventing variants. File references point at the reference implementation.

### Ghost and icon buttons (`LayerPlan.vue` `.ghost`, `PlanGroup.vue` `.icon-btn`)

```css
.ghost {
  background: transparent; border: 1px solid #333333; color: #aeaeae;
  border-radius: 6px; padding: 6px 10px; font-size: 12px; white-space: nowrap;
  transition: all 0.2s ease;
}
.ghost:hover:not(:disabled) { border-color: #555555; color: #ffffff; background: #1f1f1f; }
.ghost.active { border-color: #0a84ff; color: #ffffff; background: rgba(10, 132, 255, 0.15); }
.ghost:disabled { opacity: 0.35; cursor: not-allowed; }

.icon-btn {          /* 24px, no border, inside group headers and rows */
  width: 24px; height: 24px; border: none; border-radius: 4px;
  background: transparent; color: #9c9c9c;
}
.icon-btn:hover { background: #333333; color: #ffffff; }
```

Header buttons are icon + label (`.icon-text`); the label hides in a narrow pane.

### Setting chip (`SettingChip.vue`)

Two lines: key (`10px / 700 / uppercase / #aeaeae`) over value (`12px / 500 / #ffffff`,
tabular-nums). **Raised** above the group box: box `#2c2c2c`, border `#444444`, hover
`#6a6a6a`, open `#0a84ff` + `0 0 0 1px #0a84ff`. States:
- **override**: border `rgba(255, 214, 10, 0.55)`, value `#ffd60a`, ◆ (+ count) in the corner;
- **selection scope**: border `rgba(10, 132, 255, 0.45)`, background `rgba(10, 132, 255, 0.10)`;
- **mixed**: italic `#888888` value; **off** (switched off globally): `#888888`, line-through;
- **warning**: a 6px red dot `#ef4444` in the corner.

### Chip popover (`ChipPopover.vue`)

Floating (`position: fixed`, z-index 1000), 268px, `#1e1e1e`, radius 6px, with a small notch
pointing at the chip. Frame: the blue edge and glow of the floating bar (border
`rgba(10, 132, 255, 0.55)`, shadow `0 0 0 1px rgba(10, 132, 255, 0.12), 0 0 14px rgba(10, 132,
255, 0.22), 0 10px 28px rgba(0, 0, 0, 0.55)`); the notch edge uses the same blue. Every group
settings window has this frame: chip popovers, the "+N" list (`ChipRow.vue`), Copy mappings
(`CopyMappings.vue`). Placement and closing come from `composables/useAnchoredPopover.js`. Scope tag:
`rgba(10, 132, 255, 0.2)` background, `#0a84ff` 10px bold text. Option rows separated by
`#262626`; the chosen row gets `rgba(10, 132, 255, 0.08)`. Esc closes and returns focus to
the chip.

### Header drop-down panels (`PlanDefaults.vue`, `AutoAssign.vue`, frame from `LayerPlan.vue` `.pd-drop`)

One shell for both: the frame of the floating bar (border `rgba(10, 132, 255, 0.55)`, shadow
`0 0 0 1px rgba(10, 132, 255, 0.12), 0 0 14px rgba(10, 132, 255, 0.22), 0 10px 28px rgba(0, 0,
0, 0.55)`; the panel itself has no border). Header 40px on `#242424` (white 12px bold title, a
solid `#0a84ff` tag, a `#9c9c9c` one-line hint, × closing with Esc), body on `#1e1e1e` with 12px
padding, footer on `#1a1a1a` (status text on the left, quiet / primary buttons on the right).
Choices inside are option lists in the chip popover style (`#181818` box, `#262626` dividers,
chosen row `rgba(10, 132, 255, 0.08)`, hover `#2c2c2c`) with the plan checkbox or the popover
radio; no native checkboxes or wrapping segmented controls.

### Floating bar (`LayerPlan.vue` `.sel-bar`)

Bottom centre of the pane, over the list (nothing moves when it appears): 44px high,
`#242424`, border `#3a3a3a`, radius 6px, `0 10px 28px rgba(0, 0, 0, 0.55)`, one row
(`white-space: nowrap`). Inside: a blue count pill (`#0a84ff`, white 11px bold), 1px
`#3a3a3a` separators, `.bar-btn` (28px, border `#3a3a3a`, hover `#2a2a2a` / `#555555`,
`.danger` hover red), and a segmented control. In a narrow pane text goes first, then button
labels (icons stay).

### Group header and plan rows (`PlanGroup.vue`)

- Group box `#1e1e1e`, border `#333333`; header `#242424`; group label "G1" is a solid
  `#0a84ff` tag with white 11px bold text. Flash / drop highlight: border `#0a84ff` +
  `0 0 0 1px #0a84ff`.
- Rows: file name `#f2f2f2` 12px 500, meta line (start, length, resolution) `#9c9c9c` 11px.
- Expand arrow: filled 10px triangle `#aeaeae`, white on hover, rotates 90° in 0.18s (the
  folder tree uses the same control).
- Rows 44px, divider `#222222`, hover `#242424`, checked `rgba(10, 132, 255, 0.10)`
  (selection is colour only, sizes never change).
- **Checkbox** (one style everywhere: plan rows, group select-all, the files toolbar master
  checkbox): 16px, `1.5px solid #777777`, radius 4px, `#181818`; hover border `#cccccc`;
  checked / partial: `#0a84ff` fill, white 10px tick / dash; focus ring `0 0 0 2px #0a84ff`.
  A select-all checkbox with any selection clears it on the first click; with none it
  selects all. The row checkbox replaces the row number
  on hover / while anything is selected, in the same cell. The folder tree does the same with
  the folder icon: on a hovered row the box is blue-outlined with a `0.10` blue fill so the
  swap is obvious.
- Mapping slot: dashed `#3a3a3a` when empty, solid on `#242424` when assigned, blue while a
  mapping is dragged or armed, `#ef4444` border when the mapping is gone.

### Drag and drop

- Drop zones (between groups, empty plan): `1px dashed #3a3a3a`, 11px `#777777` text; on hover
  solid `#0a84ff`, blue text, `rgba(10, 132, 255, 0.15)` fill.
- Insert position on a row: `inset 0 2px 0 #0a84ff` (before) / `inset 0 -2px 0 #0a84ff` (after).
- Dragged rows: `opacity: 0.4`.

### Badges on cards and rows

| Badge | Style |
|-------|-------|
| Duration / still / LIVE (thumbnail bottom right) | `rgba(0, 0, 0, 0.6)`, `#dddddd` 10px 600, radius 4px; LIVE in `#0a84ff` |
| Plan groups "G1, G3" (thumbnail top right) | same as the duration chip; list view: pill `#333333` / `#d4d4d4` |
| MISSING (thumbnail top left) | solid `#ef4444`, white 10px 700; the card is dimmed (`opacity: 0.4` on thumbnail and text) with `cursor: not-allowed` |
| Selection order | white circle with `#0a84ff` number |
| Auto-assign `via` | `rgba(10, 132, 255, 0.15)`, `#0a84ff` 10px 700 uppercase |

### Toasts (`Toast.vue`)

Bottom centre, `#242424`, `#dddddd` 12px text, radius 6px, `0 4px 12px rgba(0, 0, 0, 0.5)`.
- **info / success**: border `#0a84ff` (no green);
- **error**: border `#ef4444`;
- optional action (Undo): borderless `#0a84ff` bold text, white on hover.

---

## Disabled state pattern

For any element that can be disabled, apply:

```css
.element:disabled,
.element.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
```

Some elements (like a toolbar button that's never `<button disabled>`) use opacity 0.3 instead - stay consistent with surrounding context.

---

## Quick reference - what goes where

| You're building… | Background | Border | Text |
|------------------|-----------|--------|------|
| Right settings sidebar | `#1e1e1e` | `1px solid #36373a` (left) | `#dddddd` |
| Left tree sidebar | transparent | `1px solid #2a2a2a` (right) | `#d4d4d4` |
| Any input/control | `#181818` | `1px solid #3a3a3a` | `#eeeeee` |
| Card / group box | `#242424` | `1px solid #333333` | `#d4d4d4` |
| Floating dropdown | `#1e1e1e` | `1px solid #3a3a3a` | `#eeeeee` |
| Top toolbar / footer | `#1a1a1a` | `1px solid #2a2a2a` (top/bottom) | `#9c9c9c` |
