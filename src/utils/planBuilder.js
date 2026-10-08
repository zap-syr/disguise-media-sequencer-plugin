/**
 * Builds the payload for disguiseService.createLayerPlan().
 * Simple mode = a plan with one sequential group (docs/PLAN-ui-redesign.md §4.3).
 */

import { effectiveGroup, effectiveLayer } from './planSchema';

export const MODE_VALUES = { Locked: 0, Normal: 1 };
export const END_VALUES = { Loop: 0, 'Ping-Pong': 1, Pause: 2 };

/** Insert location + global tag settings shared by Simple and Advanced. */
export function buildPlanEnvelope(options) {
  const specific = options.insertMode === 'Specific location' && options.targetTrack && options.startTime;
  const timecode = specific ? options.startTime.split(':').map(n => Number(n) || 0) : [0, 0, 0, 0];
  return {
    insert: {
      mode: specific ? 'specific' : 'playhead',
      trackPath: specific ? options.targetTrack : null,
      timecode
    },
    splitEnabled: !!options.splitSection,
    tags: {
      tc: { on: !!options.addTimecodeTag, start: options.timecodeStart, increment: options.timecodeIncrement },
      cue: { on: !!options.addCueTag, value: options.cueValue },
      midi: { on: !!options.addMidiNote, value: options.midiNoteValue }
    }
  };
}

/** Layer settings in the payload's units from the settings-panel option names. */
export function layerSettingsFromOptions(options) {
  return {
    mode: MODE_VALUES[options.mode] ?? 1,
    end: END_VALUES[options.atEndPoint] ?? 0,
    bright: !!options.animateBrightness,
    brightT: Number(options.brightnessDuration) || 0,
    fit: !!options.fitToContent,
    movieDur: Number(options.movieDuration) || 0,
    stillDur: Number(options.stillDuration) || 0
  };
}

/** Layer settings in the payload's units from effective plan values (utils/planSchema.js). */
export function layerSettingsFromValues(v) {
  return {
    mode: MODE_VALUES[v.mode] ?? 1,
    end: END_VALUES[v.end] ?? 0,
    bright: !!v.bright,
    brightT: Number(v.brightT) || 0,
    fit: !!v.fit,
    movieDur: Number(v.movieDur) || 0,
    stillDur: Number(v.stillDur) || 0
  };
}

/**
 * Advanced mode: one plan group per UI group with its effective timing / overlap / tag and
 * split placement, each layer with its effective settings and its own mapping (null = none:
 * plan_layers.py clears Designer's pre-filled mapping). The insert location and the global
 * tag / split switches come from the settings panel.
 */
export function buildAdvancedPlan(options, planState) {
  return {
    ...buildPlanEnvelope(options),
    groups: planState.groups
      .filter(g => g.items.length)
      .map(g => {
        const gv = effectiveGroup(planState.plan, g);
        return {
          timing: gv.timing,
          overlap: Number(gv.overlap) || 0,
          tagAt: gv.tag,
          splitAt: gv.split,
          layers: g.items.map(id => {
            const entry = planState.entries[id];
            return {
              clipPath: entry.mediaId,
              mappingPath: entry.mappingPath || null,
              ...layerSettingsFromValues(effectiveLayer(gv, entry))
            };
          })
        };
      })
  };
}

/**
 * Simple mode: every selected clip, in selection order, one after another, one mapping.
 * Tags and splits at every file, identical to createLayers 1.1.x.
 */
export function buildSimplePlan(options, clipPaths) {
  const layer = layerSettingsFromOptions(options);
  return {
    ...buildPlanEnvelope(options),
    groups: [{
      timing: 'seq',
      overlap: Number(options.overlap) || 0,
      tagAt: 'file',
      splitAt: 'file',
      layers: clipPaths.map(clipPath => ({ clipPath, mappingPath: options.mappingPath, ...layer }))
    }]
  };
}
