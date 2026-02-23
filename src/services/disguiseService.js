
/**
 * Service to interact with the Disguise REST API (d3service).
 */

/**
 * Fetches the list of projects and identifies the last opened project.
 * @param {string} directorIp - The IP address and port of the Disguise machine (e.g., 'localhost:80').
 * @returns {Promise<{ path: string, name: string }>} Object containing the full path and extracted project name.
 */
export async function getLastProject(directorIp) {
  try {
    const response = await fetch(`http://${directorIp}/api/service/system/projects`);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    
    // The API returns the data in a 'result' array.
    // We access the first item to get 'lastProject' e.g., "plugin test\\plugin test.d3"
    const resultItem = data.result && data.result[0];
    if (!resultItem || !resultItem.lastProject) {
      throw new Error('No lastProject found in response');
    }

    const lastProjectPath = resultItem.lastProject;

    // Extract the project name from the path.
    // 1. Normalize separators to forward slashes for consistent splitting.
    // 2. Get the last segment (filename).
    // 3. Remove the .d3 extension.
    const normalizedPath = lastProjectPath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    let projectName = parts[parts.length - 1];
    
    if (projectName.endsWith('.d3')) {
      projectName = projectName.slice(0, -3);
    }

    return {
      path: lastProjectPath,
      name: projectName
    };
  } catch (error) {
    console.error('Error in getLastProject:', error);
    throw error;
  }
}

/**
 * Fetches the media list for a given project.
 * @param {string} directorIp - The IP address and port.
 * @param {string} projectName - The name of the project to fetch media for.
 * @returns {Promise<Array>} List of media items (hierarchical structure).
 */
export async function getMediaList(directorIp, projectName) {
  // Construct the directory path using the special {project:NAME} syntax
  // The path points to internal thumbnails which represent the media files
  const directoryPath = `{project:${projectName}}/internal/thumbnails/videofile`;
  const endpoint = `http://${directorIp}/api/service/media/list?directory=${encodeURIComponent(directoryPath)}`;
  
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
       console.warn(`Media list fetch failed on ${endpoint}: ${response.statusText}`);
       return []; 
    }
    const data = await response.json();
    
    if (!data.files || !Array.isArray(data.files)) {
      return [];
    }

    return buildFileHierarchy(data.files);
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
  const root = [];
  const map = { '': root }; // Map to store directory references

  files.forEach(file => {
    // 1. Normalize path separators to '/'
    const normalizedPath = file.path.replace(/\\/g, '/');
    
    // 2. Find the relative path starting after 'internal/thumbnails/videofile/'
    // We look for the index of that string.
    const keyword = 'internal/thumbnails/videofile/';
    const index = normalizedPath.toLowerCase().indexOf(keyword);
    
    if (index === -1) return; // specific path not found, skip

    const relativePath = normalizedPath.substring(index + keyword.length);
    const parts = relativePath.split('/');
    
    // 3. Traverse/Build the tree
    let currentLevel = root;
    let pathSoFar = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      
      if (isFile) {
        // It's a file (thumbnail)
        // Remove .PNG extension for the display name if present
        let displayName = part;
        if (displayName.toLowerCase().endsWith('.png')) {
          displayName = displayName.slice(0, -4);
        }
        
        currentLevel.push({
          id: file.path, // Use full path as ID
          name: displayName,
          type: 'file',
          path: file.path,
          size: file.size,
          lastWriteDate: file.lastWriteDate,
          thumbnail: file.path // The file itself is the thumbnail
        });
      } else {
        // It's a folder
        pathSoFar += (pathSoFar ? '/' : '') + part;
        
        // Check if we've already created this folder at this level
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
        
        // Move deeper
        currentLevel = folder.children;
      }
    }
  });

  return root;
}
