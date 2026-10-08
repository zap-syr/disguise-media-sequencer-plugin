import { reactive, watch } from 'vue';

/**
 * Settings-panel options shared by the panel (editing, validation) and the shell
 * (plan preview, creation). Field names are the ones planBuilder expects.
 */
export function useLayerOptions() {
  const options = reactive({
    insertMode: 'At Playhead',
    startTime: '00:00:00:00',
    mode: 'Normal',
    atEndPoint: 'Loop',
    stillDuration: 5,
    fitToContent: true,
    movieDuration: 30,
    overlap: 0,
    splitSection: false,
    addTimecodeTag: false,
    timecodeStart: '00:00:00:00',
    timecodeIncrement: '00:00:00:00',
    addCueTag: false,
    cueValue: '',
    addMidiNote: false,
    midiNoteValue: '',
    animateBrightness: false,
    brightnessDuration: 1
  });

  // Input validations
  watch(() => options.overlap, (newVal) => { if (newVal < 0) options.overlap = 0; });
  watch(() => options.stillDuration, (newVal) => { if (newVal < 0) options.stillDuration = 0; });
  watch(() => options.movieDuration, (newVal) => { if (newVal < 0) options.movieDuration = 0; });
  watch(() => options.brightnessDuration, (newVal) => { if (newVal < 0) options.brightnessDuration = 0; });

  return options;
}
