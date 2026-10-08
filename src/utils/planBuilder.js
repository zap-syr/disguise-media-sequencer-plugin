/**
 * Builds the payload for disguiseService.createLayerPlan().
 * Simple mode = a plan with one sequential group (docs/PLAN-ui-redesign.md §4.3).
 */

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

/**
 * Advanced mode: one plan group per UI group, each layer with its own mapping (null = none:
 * plan_layers.py clears Designer's pre-filled mapping). Layer settings still come from the
 * settings panel until Phase 7. Splits at the group start, tags at every file (docs §4.2).
 */
export function buildAdvancedPlan(options, planState) {
  const layer = layerSettingsFromOptions(options);
  return {
    ...buildPlanEnvelope(options),
    groups: planState.groups
      .filter(g => g.items.length)
      .map(g => ({
        timing: g.timing,
        overlap: Number(options.overlap) || 0,
        tagAt: 'file',
        splitAt: 'group',
        layers: g.items.map(id => ({
          clipPath: planState.entries[id].mediaId,
          mappingPath: planState.entries[id].mappingPath || null,
          ...layer
        }))
      }))
  };
}

/**
 * Simple mode: every selected clip, in selection order, one after another, one mapping.
 * Tags and splits at every file — identical to createLayers 1.1.x.
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
