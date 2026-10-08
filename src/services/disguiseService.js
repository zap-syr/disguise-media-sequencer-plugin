/**
 * Service to interact with the Disguise REST API.
 */

// Python scripts kept as real .py files so they can also be run as probes
// (tools/designer-probes/run.mjs src/services/python/<name>).
import mediaDetailsScript from './python/media_details.py?raw';
import mappingListScript from './python/mapping_list.py?raw';
import planPrepareScript from './python/plan_prepare.py?raw';
import planLayersScript from './python/plan_layers.py?raw';
import planMarkersScript from './python/plan_markers.py?raw';

/** Layers per execute call. Designer's ~1 s timeout and per-call undo cost make bigger calls unsafe (docs §12). */
export const LAYER_CHUNK_SIZE = 100;

/**
 * Turns `args` into a Python unicode string literal holding JSON, for `json.loads(__ARGS__)`.
 * JSON string escapes are valid in a Python u"" literal; non-ASCII is escaped so the
 * Python 2.7 source stays ASCII.
 */
function pythonJsonLiteral(args) {
  const literal = JSON.stringify(JSON.stringify(args))
    .replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  return 'u' + literal;
}

/** Runs a .py template that reads its input via `json.loads(__ARGS__)` (comments may mention the token too). */
async function runScript(directorIp, template, args) {
  const marker = 'json.loads(__ARGS__)';
  if (!template.includes(marker)) throw new Error('Script template has no json.loads(__ARGS__)');
  return executePython(directorIp, template.replace(marker, () => `json.loads(${pythonJsonLiteral(args)})`));
}

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
      // Designer reports Python exceptions and TimeOutError in status.message
      let detail = response.statusText;
      try {
        const body = await response.json();
        const message = body?.status?.message || '';
        const lastLine = message.trim().split('\n').filter(Boolean).pop();
        if (lastLine) detail = lastLine.replace(/\.$/, '');
      } catch (e) {
        // not JSON — keep statusText
      }
      throw new Error(`Python execution failed: ${detail}`);
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
 * Fetches per-clip metadata (kind, duration, resolution, alpha, audio...) keyed by VideoClip path.
 * @param {string} directorIp - The IP address and port.
 * @returns {Promise<Object<string, {kind: 'video'|'still'|'live', codec: string, nFrames: number,
 *   fps: number, duration: number|null, res: string, hasAlpha: boolean|null, hasAudio: boolean}>>}
 */
export async function getMediaDetails(directorIp) {
  const details = await executePython(directorIp, mediaDetailsScript);
  return details && typeof details === 'object' && !Array.isArray(details) ? details : {};
}

/**
 * Fetches the mappings list using the Python Execute API.
 * Only user mappings (paths under "objects/"); name = file name without .apx (keeps the user's case,
 * unlike `description`, which Designer lower-cases).
 * @param {string} directorIp - The IP address and port.
 * @returns {Promise<Array<{uid, path, name, description, type, typeLabel, res}>>}
 */
export async function getMappingList(directorIp) {
  const items = await executePython(directorIp, mappingListScript);

  if (!Array.isArray(items)) return [];

  return items
    .filter(item => item.path && item.path.toLowerCase().startsWith('objects/'))
    .map(item => {
      const pathParts = item.path.split('/');
      let name = pathParts[pathParts.length - 1];
      if (name.toLowerCase().endsWith('.apx')) {
        name = name.slice(0, -4);
      }
      return { ...item, name };
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
 * Creates the layers of a plan in Designer: prepare (read-only timing), layer chunks, markers.
 * Nothing rolls back in Designer, so on failure the error says how many layers were created.
 *
 * @param {string} directorIp
 * @param {Object} plan - see src/services/python/plan_prepare.py for the shape
 * @param {(created: number, total: number) => void} [onProgress]
 * @returns {Promise<{status: 'success', created: number, total: number, errors: Array}>}
 */
export async function createLayerPlan(directorIp, plan, onProgress) {
  const prep = await runScript(directorIp, planPrepareScript, plan);
  if (!prep || prep.status !== 'success') {
    throw new Error(prep?.message || 'Failed to prepare the layer plan.');
  }

  const total = prep.layers.length;
  const errors = [...prep.errors];
  let created = 0;
  onProgress?.(0, total);

  for (let i = 0; i < total; i += LAYER_CHUNK_SIZE) {
    const chunk = prep.layers.slice(i, i + LAYER_CHUNK_SIZE);
    let res;
    try {
      res = await runScript(directorIp, planLayersScript, {
        trackPath: prep.trackPath,
        ensureLength: i === 0 ? prep.requiredLength : null,
        layers: chunk
      });
    } catch (err) {
      throw new Error(`${err.message} (created ${created} of ${total} layers before the failure)`);
    }
    if (!res || res.status !== 'success') {
      throw new Error(`${res?.message || 'Layer creation failed'} (created ${created} of ${total} layers)`);
    }
    created += res.created;
    errors.push(...res.errors);
    onProgress?.(created, total);
  }

  if (prep.tags.length || prep.splits.length) {
    const res = await runScript(directorIp, planMarkersScript, {
      trackPath: prep.trackPath,
      tags: prep.tags,
      splits: prep.splits
    });
    if (!res || res.status !== 'success') {
      throw new Error(`${res?.message || 'Placing tags/splits failed'} (all ${created} layers were created)`);
    }
  }

  return { status: 'success', created, total, errors };
}

/**
 * Creates a new Track resource in Disguise.
 * @param {string} directorIp - The IP address and port.
 * @param {string} trackName - The desired track name (must be unique).
 * @returns {Promise<{uid: string, path: string, name: string}>}
 */
export async function createTrack(directorIp, trackName) {
  const script = `
def run():
    track = resourceManager.loadOrCreate("objects/track/${trackName}.apx", Track)
    return track
return run()
`;
  const result = await executePython(directorIp, script);
  if (!result || !result.path) throw new Error('Failed to create track');
  const pathParts = result.path.split('/');
  let name = pathParts[pathParts.length - 1];
  if (name.toLowerCase().endsWith('.apx')) name = name.slice(0, -4);
  return { uid: result.uid, path: result.path, name };
}
