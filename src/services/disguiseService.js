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
