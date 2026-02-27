/**
 * Service to interact with the Disguise REST API.
 */

/**
 * Generic function to execute a Python script via the d3 API.
 * @param {string} directorIp - The IP address and port.
 * @param {string} script - The Python script string to execute.
 * @returns {Promise<any>} The parsed returnValue from the response.
 */
async function executePython(directorIp, script) {
  const endpoint = `http://${directorIp}/api/session/python/execute`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ script: script })
    });

    if (!response.ok) {
      throw new Error(`Python execution failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    let result = data.returnValue;
    
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch (e) {
        // Not a JSON string, return as is
      }
    }
    return result;
  } catch (error) {
    console.error('Error executing Python:', error);
    throw error;
  }
}

/**
 * Fetches the media list using the Python Execute API.
 * @param {string} directorIp - The IP address and port.
 * @returns {Promise<Array>} List of media items (hierarchical structure).
 */
export async function getMediaList(directorIp) {
  const script = "return resourceManager.allResources(VideoClip)";
  const files = await executePython(directorIp, script);
  
  if (!Array.isArray(files)) return [];
  return buildFileHierarchy(files);
}

/**
 * Fetches the mappings list using the Python Execute API.
 * @param {string} directorIp - The IP address and port.
 * @returns {Promise<Array>} Filtered list of mappings.
 */
export async function getMappingList(directorIp) {
  const script = "return resourceManager.allResources(Projection)";
  const items = await executePython(directorIp, script);
  
  if (!Array.isArray(items)) return [];

  // Filter: only paths starting with "objects/"
  // Format: name without .apx
  return items
    .filter(item => item.path && item.path.toLowerCase().startsWith('objects/'))
    .map(item => {
      const pathParts = item.path.split('/');
      let name = pathParts[pathParts.length - 1];
      if (name.toLowerCase().endsWith('.apx')) {
        name = name.slice(0, -4);
      }
      return {
        uid: item.uid,
        path: item.path,
        name: name
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/**
 * Fetches the tracks list using the Python Execute API.
 * @param {string} directorIp - The IP address and port.
 * @returns {Promise<Array>} Filtered list of tracks.
 */
export async function getTrackList(directorIp) {
  const script = "return resourceManager.allResources(Track)";
  const items = await executePython(directorIp, script);
  
  if (!Array.isArray(items)) return [];

  return items
    .filter(item => item.path)
    .map(item => {
      const pathParts = item.path.split('/');
      let name = pathParts[pathParts.length - 1];
      if (name.toLowerCase().endsWith('.apx')) {
        name = name.slice(0, -4);
      }
      return {
        uid: item.uid,
        path: item.path,
        name: name
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/**
 * Helper to build a file hierarchy from a flat list of paths.
 */
function buildFileHierarchy(files) {
  const rootFolder = { id: 'Root', name: 'Root', type: 'folder', children: [] };
  const root = [rootFolder];
  
  files.forEach(file => {
    if (!file.path) return;
    const normalizedPath = file.path.replace(/\\/g, '/');
    const keyword = 'objects/videoclip/';
    const index = normalizedPath.toLowerCase().indexOf(keyword);
    if (index === -1) return;

    const relativePath = normalizedPath.substring(index + keyword.length);
    const parts = relativePath.split('/');

    let currentLevel = root;
    let pathSoFar = '';
    if (parts.length === 1) currentLevel = rootFolder.children;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      
      if (isFile) {
        let displayName = part;
        if (displayName.toLowerCase().endsWith('.apx')) displayName = displayName.slice(0, -4);
        currentLevel.push({
          id: file.path, 
          name: displayName,
          type: 'file',
          path: file.path,
          uid: file.uid
        });
      } else {
        pathSoFar += (pathSoFar ? '/' : '') + part;
        let folder = currentLevel.find(item => item.type === 'folder' && item.name === part);
        if (!folder) {
          folder = { id: pathSoFar, name: part, type: 'folder', children: [] };
          currentLevel.push(folder);
        }
        currentLevel = folder.children;
      }
    }
  });

  const sortItems = (items, isRootLevel = false) => {
    items.sort((a, b) => {
      if (isRootLevel) {
        if (a.name === 'Root') return -1;
        if (b.name === 'Root') return 1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    items.forEach(item => {
      if (item.type === 'folder' && item.children) sortItems(item.children, false);
    });
  };

  sortItems(root, true);
  return root;
}

/**
 * Creates layers in Disguise by executing a Python script.
 * @param {string} directorIp - The IP address and port.
 * @param {Object} options - User settings from the sidebar.
 * @param {Array<string>} selectedPaths - Array of full paths to selected media.
 */
export async function createLayers(directorIp, options, selectedPaths) {
  // Map UI labels to Python values
  const modeMap = { 'Locked': 0, 'Normal': 1 };
  const endPointMap = { 'Loop': 0, 'Ping-Pong': 1, 'Pause': 2 };

  const modeVal = modeMap[options.mode] ?? 1;
  const endPointVal = endPointMap[options.atEndPoint] ?? 0;
  const pathsList = JSON.stringify(selectedPaths);
  
  // Track logic
  let trackInitCode = `
    current_track = guisystem.track
    current_playhead_beats = guisystem.player.tCurrent
`;

  if (options.insertMode === 'Specific location' && options.targetTrack && options.startTime) {
    // Parse HH:MM:SS:FF into seconds
    // Note: Assuming standard 30fps or similar if strictly needed, but basic sum of seconds is:
    // HH * 3600 + MM * 60 + SS + FF / frame_rate
    // Disguise time is usually in seconds. Let's assume standard 30fps for the fraction, 
    // or provide the string directly to a time parser if d3 supports it.
    // For safety, parsing it here to a float of seconds:
    const timeParts = options.startTime.split(':').map(Number);
    const hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;
    const seconds = timeParts[2] || 0;
    const frames = timeParts[3] || 0;
    
    // Assuming 30fps default if not specified otherwise, or just use seconds if frames are 0.
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds + (frames / 30);

    trackInitCode = `
    target_track_path = r'${options.targetTrack}'
    current_track = resourceManager.load(target_track_path, Track)
    if not current_track:
        return {"status": "error", "message": "Could not load target track"}
    
    start_time_seconds = ${totalSeconds}
    current_playhead_beats = current_track.timeToBeat(start_time_seconds)
`;
  }

  const script = `
def run():
${trackInitCode}

    MODE = ${modeVal}
    AT_END_POINT = ${endPointVal}
    FIT_TO_CONTENTS = ${options.fitToContent ? 'True' : 'False'}
    SPLIT_SECTION = ${options.splitSection ? 'True' : 'False'}
    ADD_CUE_TAG = ${options.addCueTag ? 'True' : 'False'}

    mapping_path = r'${options.mappingPath}'
    cue_tag = '${options.cueValue}'

    still_duration_seconds = ${options.stillDuration}
    movie_duration_seconds = ${options.movieDuration}
    overlap_seconds = ${options.overlap}

    overlap_beats = current_track.timeToBeat(current_track.beatToTime(current_playhead_beats) + overlap_seconds) - current_playhead_beats

    created_layers_info = []
    current_start_beats = current_playhead_beats

    # Initial split section if enabled
    if SPLIT_SECTION:
      current_track.splitSectionAtBeat(current_start_beats)
    
    media_paths = ${pathsList}

    for i, clip_path in enumerate(media_paths):
        clip = resourceManager.load(clip_path, VideoClip)
        if not clip:
            continue

        if clip.file and clip.file.nFrames > 1 and clip.fileFps > 1:
            if FIT_TO_CONTENTS:
                clip_duration_seconds = float(clip.file.nFrames) / clip.fileFps
            else:
                clip_duration_seconds = movie_duration_seconds
        else:
            clip_duration_seconds = still_duration_seconds

        clip_end_time_in_seconds = current_track.beatToTime(current_start_beats) + clip_duration_seconds
        clip_length_beats = current_track.timeToBeat(clip_end_time_in_seconds) - current_start_beats

        layer_name = "Video Layer - {}".format(clip.description)
        new_layer = current_track.addNewLayer(VariableVideoModule, current_start_beats, clip_length_beats, layer_name)

        if new_layer:
            # Mapping
            mapping_fseq = new_layer.findSequence("mapping")
            if mapping_fseq:
                markDirty(mapping_fseq)
                mapping_fseq.disableSequencing = True
                mapping_resource = resourceManager.load(mapping_path, Projection)
                mapping_fseq.sequence.setResource(current_start_beats, mapping_resource)
                mapping_fseq.saveOnDelete()

            # Video Clip
            video_fseq = new_layer.findSequence("video")
            if video_fseq:
                markDirty(video_fseq)
                video_fseq.disableSequencing = True
                video_fseq.sequence.setResource(current_start_beats, clip)
                video_fseq.saveOnDelete()

            # Mode
            mode_fseq = new_layer.findSequence("mode")
            if mode_fseq:
                markDirty(mode_fseq)
                mode_fseq.disableSequencing = True
                mode_fseq.sequence.setFloat(current_start_beats, MODE)
                mode_fseq.saveOnDelete()

            # End Behavior
            end_fseq = new_layer.findSequence("At end point")
            if end_fseq:
                markDirty(end_fseq)
                end_fseq.disableSequencing = True
                end_fseq.sequence.setFloat(current_start_beats, AT_END_POINT)
                end_fseq.saveOnDelete()

            created_layers_info.append({
                "name": new_layer.name,
                "uid": new_layer.uid
            })

            if ADD_CUE_TAG:
                # Handle incrementing cue tag if it's numeric
                tag_text = cue_tag
                try:
                    # Attempt to handle simple numeric increment for . format
                    parts = cue_tag.split('.')
                    last_num = int(parts[-1])
                    parts[-1] = str(last_num + i)
                    tag_text = '.'.join(parts)
                except:
                    pass
                
                tag = Tag(1, tag_text)
                current_track.setTagAtBeat(current_start_beats, tag)
            
            # Next iteration calculations
            current_start_beats = current_start_beats + clip_length_beats - overlap_beats

            if SPLIT_SECTION:
                current_track.splitSectionAtBeat(current_start_beats)

    return {"status": "success", "count": len(created_layers_info)}

return run()
`;

  return await executePython(directorIp, script);
}
