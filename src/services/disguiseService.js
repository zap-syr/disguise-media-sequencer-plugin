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
import sessionMachinesScript from './python/session_machines.py?raw';
import trackCreateScript from './python/track_create.py?raw';

/** d3net MachineRole of a Designer workstation joined to the session (MobileEditor). */
export const EDITOR_ROLE = 5;
/** How long checkMachine() waits for an answer before calling the machine unreachable. */
const MACHINE_CHECK_TIMEOUT_MS = 2000;

/** Layers per execute call. Designer's ~1 s timeout and per-call undo cost make bigger calls unsafe (docs §12). */
export const LAYER_CHUNK_SIZE = 100;
/** Tags + splits per execute call: a 500-layer plan with TC, cue and MIDI tags places ~2000 markers. */
export const MARKER_CHUNK_SIZE = 300;

/**
 * Turns `args` into a Python unicode string literal holding JSON, for `json.loads(__ARGS__)`.
 * JSON string escapes are valid in a Python u"" literal; non-ASCII is escaped so the
 * Python 2.7 source stays ASCII. Spaces are escaped too: Designer turns every 4 spaces of an
 * executed script into a tab, which would change a path with 4 spaces in a row.
 */
function pythonJsonLiteral(args) {
  const literal = JSON.stringify(JSON.stringify(args))
    .replace(/[ \u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  return 'u' + literal;
}

/** Runs a .py template that reads its input via `json.loads(__ARGS__)` (comments may mention the token too). */
async function runScript(host, template, args) {
  const marker = 'json.loads(__ARGS__)';
  if (!template.includes(marker)) throw new Error('Script template has no json.loads(__ARGS__)');
  return executePython(host, template.replace(marker, () => `json.loads(${pythonJsonLiteral(args)})`));
}

/**
 * Generic function to execute a Python script via the d3 API.
 * The script runs on the machine it is sent to: the director, or an editor of the session.
 * @param {string} host - The machine's address and port.
 * @param {string} script - The Python script string to execute.
 * @returns {Promise<any>} The parsed returnValue from the response.
 */
async function executePython(host, script) {
  const endpoint = `http://${host}/api/session/python/execute`;
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
        // not JSON, keep statusText
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
  // missing: the track's file is not found (Designer lists it as missing), same flag as clips
  const script = 'return [{"track": t, "missing": bool(t.isInError)} for t in resourceManager.allResources(Track)]';
  const rows = await executePython(directorIp, script);

  if (!Array.isArray(rows)) return [];

  return rows
    // Only user tracks: Designer keeps its own tracks under internal/ (e.g. internal/track/look/<uid>.apx)
    .filter(row => row.track?.path && row.track.path.toLowerCase().startsWith('objects/'))
    .map(({ track: item, missing }) => {
      const pathParts = item.path.split('/');
      let name = pathParts[pathParts.length - 1];
      if (name.toLowerCase().endsWith('.apx')) {
        name = name.slice(0, -4);
      }
      return {
        uid: item.uid,
        path: item.path,
        name: name,
        missing: !!missing
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
 * Designer rolls back only the failed call; earlier chunks stay, so on failure the error says
 * how many layers were created.
 *
 * Every step runs on `host`: "At Playhead" uses that machine's open track and playhead.
 *
 * @param {string} host - The director or an editor of the session.
 * @param {Object} plan - see src/services/python/plan_prepare.py for the shape
 * @param {(created: number, total: number) => void} [onProgress]
 * @returns {Promise<{status: 'success', created: number, total: number, errors: Array}>}
 */
export async function createLayerPlan(host, plan, onProgress) {
  const prep = await runScript(host, planPrepareScript, plan);
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
      res = await runScript(host, planLayersScript, {
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

  // Splits first, then tags, in chunks (order between calls does not matter)
  const markers = [...prep.splits.map(beat => ({ split: beat })), ...prep.tags.map(tag => ({ tag }))];
  for (let i = 0; i < markers.length; i += MARKER_CHUNK_SIZE) {
    const chunk = markers.slice(i, i + MARKER_CHUNK_SIZE);
    let res;
    try {
      res = await runScript(host, planMarkersScript, {
        trackPath: prep.trackPath,
        splits: chunk.filter(m => 'split' in m).map(m => m.split),
        tags: chunk.filter(m => m.tag).map(m => m.tag)
      });
    } catch (err) {
      throw new Error(`${err.message} (all ${created} layers were created, ${i} of ${markers.length} tags/splits placed)`);
    }
    if (!res || res.status !== 'success') {
      throw new Error(`${res?.message || 'Placing tags/splits failed'} (all ${created} layers were created, ${i} of ${markers.length} tags/splits placed)`);
    }
  }

  return { status: 'success', created, total, errors };
}

/**
 * Why a track name cannot be used, or null. The name becomes the file objects/track/<name>.apx,
 * so it must stay inside objects/track and be a valid Windows file name.
 * @param {string} name - The trimmed track name.
 * @returns {string|null}
 */
export function trackNameError(name) {
  if (!name) return 'Name is required';
  if (name.includes('..')) return 'Name cannot contain ..';
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(name)) return 'Name cannot contain \\ / : * ? " < > |';
  return null;
}

/**
 * Creates a new Track resource in Disguise.
 * @param {string} host - The director or an editor of the session (the track syncs to all).
 * @param {string} trackName - The desired track name (must be unique).
 * @returns {Promise<{uid: string, path: string, name: string}>}
 */
export async function createTrack(host, trackName) {
  const error = trackNameError(trackName);
  if (error) throw new Error(error);
  // The name goes to Python as JSON, never into the script source
  const result = await runScript(host, trackCreateScript, { name: trackName });
  if (!result || !result.path) throw new Error('Failed to create track');
  const pathParts = result.path.split('/');
  let name = pathParts[pathParts.length - 1];
  if (name.toLowerCase().endsWith('.apx')) name = name.slice(0, -4);
  return { uid: result.uid, path: result.path, name };
}

/**
 * Every machine of the d3net session, asked from the director (editors are not listed by
 * /api/session/status/session). A machine reports its own IP as 127.0.0.1, so the director
 * keeps the host already in use and the others get their IP (hostname as a fallback).
 * @param {string} directorHost - The director's address and port (`?director=`).
 * @returns {Promise<Array<{name, hostname, role, isDirector, isEditor, host}>>}
 */
export async function getSessionMachines(directorHost) {
  const rows = await executePython(directorHost, sessionMachinesScript);
  if (!Array.isArray(rows)) return [];
  return rows.map(m => ({
    name: m.name,
    hostname: m.hostname,
    role: m.role,
    isDirector: m.isDirector,
    isEditor: m.role === EDITOR_ROLE,
    host: m.isDirector ? directorHost : (m.ip && m.ip !== '127.0.0.1' ? m.ip : m.hostname)
  }));
}

/**
 * Whether a machine answers with a Designer session API (GET /api/session/status/project).
 * 'not-designer': something else answers on the port (e.g. IIS holding port 80 on a Windows PC)
 * or Designer runs no project; 'unreachable': no answer within the timeout.
 * @param {string} host
 * @returns {Promise<'ok' | 'not-designer' | 'unreachable'>}
 */
export async function checkMachine(host) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MACHINE_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(`http://${host}/api/session/status/project`, { signal: controller.signal });
    if (!response.ok) return 'not-designer';
    const body = await response.json().catch(() => null);
    return body?.result?.projectPath ? 'ok' : 'not-designer';
  } catch (e) {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether an editor follows the director's timeline (Locked) or has its own (Independent).
 * Ask the editor itself.
 * @param {string} host
 * @returns {Promise<boolean>}
 */
export async function isLockedToDirector(host) {
  return !!(await executePython(host, 'return state.lockedToDirector'));
}
