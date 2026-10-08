---
name: disguise-css
description: >
  CSS color palette and component styling guide for the Disguise media sequencer plugin.
  Use this skill whenever the user asks about styling, colors, UI appearance, adding new
  Vue components, writing CSS for this plugin, creating buttons/inputs/cards/dropdowns/
  toggles/panels, or any question about "how should this look" or "what color should I
  use". Also use when the user wants to match existing plugin styles, fix visual
  inconsistencies, or review CSS for correctness against the project's design system.
  This plugin uses a strict dark theme with hardcoded hex values — never CSS variables,
  never Tailwind — so always consult this skill before writing any CSS.
---

# Disguise CSS Style Guide

This plugin runs inside Disguise Designer as a dark, professional media-server UI. The
entire codebase uses hardcoded hex values — **no CSS custom properties, no Tailwind**.
Every new component must match the existing palette exactly.

---

## Core rules

1. **Use exact hex values** from the tables below — never invent new colors.
2. **No CSS variables or `var(--...)`** — inline hex everywhere.
3. **Scoped styles** — always `<style scoped>` in Vue SFCs.
4. **Border-radius is always `6px`** for all UI controls (inputs, buttons, cards, dropdowns).
5. **Error/validation** always uses `#ef4444`.
6. **Settings group headers** are always `11px / 700 weight / uppercase / #0a84ff`.
7. **Every interactive element needs all four states:** default, hover, focus/active, disabled.
8. **Transitions** — use `transition: all 0.2s ease` on interactive elements (some border/shadow transitions can use `0.3s`).

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
| Focus shadow | `rgba(59, 130, 246, 0.30)` | Input focus `box-shadow` |

### Border / divider grays

| Hex | Where |
|-----|-------|
| `#222222` | Sidebar header borders, section dividers |
| `#2a2a2a` | Tree sidebar right border, panel borders |
| `#2e2e2e` | Dropdown separators |
| `#333333` | Input borders, card borders, scrollbar thumb |
| `#36373a` | Settings sidebar border-left |
| `#3a3a3a` | Input focus borders, toggle OFF track, dropdown item hover bg |

### Text / icon grayscale

| Hex | Where |
|-----|-------|
| `#ffffff` | Active/selected text, primary text on interactive surfaces |
| `#dddddd` | Settings sidebar body text, secondary headings |
| `#cccccc` | Primary body text throughout the app |
| `#aaaaaa` | Icon colors, secondary labels, selected folder icons |
| `#888888` | Breadcrumbs, status text, placeholder text, secondary button text |
| `#777777` | Disabled text, unit labels |
| `#666666` | Folder icons (default), secondary text, search icon |
| `#555555` | Subtle icons, empty-state text |
| `#333333` | Darkest icon / card preview area fallback |

### Semantic

| Hex | Purpose |
|-----|---------|
| `#ef4444` | All error and validation states — invalid input border, error messages |

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
  color: #aaaaaa;
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
/* Trigger element — same as .input */
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
  color: #cccccc;
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
  color: #888888;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.segmented-item:hover {
  color: #cccccc;
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
  color: #888888;
  font-size: 11px;
}
.media-card.selected .media-card-name {
  color: #ffffff;
}
```

### Tree / sidebar item

```css
.tree-item {
  color: #cccccc;
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

.tree-item-icon {
  color: #666666;
}
.tree-item.selected .tree-item-icon {
  color: #aaaaaa;
}

.tree-item-chevron {
  color: #555555;
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
  color: #cccccc;
  font-size: 12px;
  font-weight: 600;
}

/* Unit / secondary label */
.settings-label-secondary {
  color: #777777;
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

Some elements (like a toolbar button that's never `<button disabled>`) use opacity 0.3 instead — stay consistent with surrounding context.

---

## Quick reference — what goes where

| You're building… | Background | Border | Text |
|------------------|-----------|--------|------|
| Right settings sidebar | `#1e1e1e` | `1px solid #36373a` (left) | `#dddddd` |
| Left tree sidebar | transparent | `1px solid #2a2a2a` (right) | `#cccccc` |
| Any input/control | `#181818` | `1px solid #3a3a3a` | `#eeeeee` |
| Card / group box | `#242424` | `1px solid #333333` | `#cccccc` |
| Floating dropdown | `#1e1e1e` | `1px solid #3a3a3a` | `#cccccc` |
| Top toolbar / footer | `#1a1a1a` | `1px solid #2a2a2a` (top/bottom) | `#888888` |
