
/**
 * Service to interact with the Disguise REST API.
 */

/**
 * Fetches the media list using the Python Execute API.
 * @param {string} directorIp - The IP address and port of the Disguise machine.
 * @returns {Promise<Array>} List of media items (hierarchical structure).
 */
export async function getMediaList(directorIp) {
  const endpoint = `http://${directorIp}/api/session/python/execute`;
  
  // Python script to execute. We directly call the resource manager.
  const script = "return resourceManager.allResources(VideoClip)";
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ script: script })
    });

    if (!response.ok) {
       console.warn(`Media list fetch failed: ${response.statusText}`);
       return []; 
    }
    
    const data = await response.json();
    
    // The relevant data is in 'returnValue' property of the response
    if (!data.returnValue) {
      return [];
    }

    // The returnValue might be a JSON string or an object depending on the API version/response type.
    // Based on the example provided: "returnValue": "[{...}, {...}]" (It looks like a stringified JSON list)
    // Or it might be an array directly. Let's handle both.
    let files = data.returnValue;
    if (typeof files === 'string') {
        try {
            files = JSON.parse(files);
        } catch (e) {
            console.error("Failed to parse returnValue", e);
            return [];
        }
    }

    if (!Array.isArray(files)) {
      return [];
    }

    return buildFileHierarchy(files);
  } catch (error) {
    console.error('Error in getMediaList:', error);
    throw error;
  }
}

/**
 * Helper to build a file hierarchy from a flat list of paths.
 * @param {Array} files - Array of file objects from the API.
 * @returns {Array} Nested structure of folders and files.
 */
function buildFileHierarchy(files) {
  // Initialize with a "Root" folder for top-level files
  const rootFolder = {
    id: 'Root',
    name: 'Root',
    type: 'folder',
    children: []
  };
  
  const root = [rootFolder];
  
  files.forEach(file => {
    if (!file.path) return;

    // 1. Normalize path separators to '/'
    const normalizedPath = file.path.replace(/\\/g, '/');
    
    // 2. Find the relative path starting after 'objects/videoclip/'
    const keyword = 'objects/videoclip/';
    const index = normalizedPath.toLowerCase().indexOf(keyword);
    
    if (index === -1) return;

    const relativePath = normalizedPath.substring(index + keyword.length);
    const parts = relativePath.split('/');
    
    // 3. Traverse/Build the tree
    let currentLevel = root;
    let pathSoFar = '';

    if (parts.length === 1) {
      currentLevel = rootFolder.children;
    } 

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      
      if (isFile) {
        let displayName = part;
        if (displayName.toLowerCase().endsWith('.apx')) {
          displayName = displayName.slice(0, -4);
        }
        
        const fileObj = {
          id: file.path, 
          name: displayName,
          type: 'file',
          path: file.path,
          uid: file.uid
        };
        
        currentLevel.push(fileObj);
      } else {
        pathSoFar += (pathSoFar ? '/' : '') + part;
        let folder = currentLevel.find(item => item.type === 'folder' && item.name === part);
        
        if (!folder) {
          folder = {
            id: pathSoFar,
            name: part,
            type: 'folder',
            children: []
          };
          currentLevel.push(folder);
        }
        currentLevel = folder.children;
      }
    }
  });

  // 4. Sort recursively
  const sortItems = (items, isRootLevel = false) => {
    items.sort((a, b) => {
      // "Root" folder should always be first at the top level
      if (isRootLevel) {
        if (a.name === 'Root') return -1;
        if (b.name === 'Root') return 1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    items.forEach(item => {
      if (item.type === 'folder' && item.children) {
        // Nested items don't need the special "Root" check
        sortItems(item.children, false);
      }
    });
  };

  sortItems(root, true);

  return root;
}
