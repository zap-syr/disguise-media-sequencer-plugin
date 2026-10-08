/**
 * Pure helpers over the folder tree produced by disguiseService.buildFileHierarchy().
 * Nodes: { id, name, type: 'folder', children } and { id, name, type: 'file', path, uid }.
 */

export function byNameAsc(a, b) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

// Flattens a folder subtree into its files. Files below the starting point are
// tagged with `subfolderPath` (the folder names crossed to reach them, relative
// to wherever the walk started) so the UI can disambiguate same-named files
// from different subfolders — files sitting directly in the starting level are
// left as the original object, untagged. Pass { tag: false } to skip the
// subfolderPath allocation entirely when the caller only needs the flat file
// list (e.g. resolving paths) and doesn't care about origin folders.
export function flattenFiles(nodes, { tag = true } = {}) {
  const list = [];
  const walk = (items, folderChain) => {
    items.forEach(item => {
      if (item.type === 'file') {
        list.push(tag && folderChain.length ? { ...item, subfolderPath: folderChain.join(' / ') } : item);
      } else if (item.children) {
        walk(item.children, [...folderChain, item.name]);
      }
    });
  };
  walk(nodes, []);
  return list;
}

export function findFolder(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFolder(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Number of files in a folder node including all its subfolders. */
export function countFiles(node) {
  return node.children ? flattenFiles(node.children, { tag: false }).length : 0;
}

/**
 * Folder rows shown in the sidebar: "All Files" + every folder whose ancestors are expanded.
 * `count` = files in the folder including subfolders.
 */
export function visibleFolders(hierarchy, expandedFolders) {
  const result = [{ id: 'all', name: 'ALL FILES', depth: 0, hasChildren: false, count: flattenFiles(hierarchy, { tag: false }).length }];
  const traverse = (nodes, depth) => {
    for (const node of nodes) {
      if (node.type === 'folder') {
        const hasChildren = node.children && node.children.some(c => c.type === 'folder');
        result.push({ id: node.id, name: node.name, depth, hasChildren, count: countFiles(node) });
        if (expandedFolders.has(node.id) && node.children) {
          traverse(node.children, depth + 1);
        }
      }
    }
  };
  traverse(hierarchy, 0);
  return result;
}

/** Files shown for a folder ('all' = every file), optionally including subfolders, filtered by search. */
export function folderFiles(hierarchy, folderId, { includeSubfolders = false, search = '' } = {}) {
  let list = [];
  if (folderId === 'all') {
    list = flattenFiles(hierarchy);
    list.sort(byNameAsc);
  } else {
    const found = findFolder(hierarchy, folderId);
    if (found && found.children) {
      if (includeSubfolders) {
        list = flattenFiles(found.children);
        list.sort(byNameAsc);
      } else {
        list = found.children.filter(item => item.type === 'file');
      }
    }
  }

  if (search) {
    const query = search.toLowerCase();
    return list.filter(item => item.name.toLowerCase().includes(query));
  }
  return list;
}

export function breadcrumbPath(hierarchy, folderId) {
  if (folderId === 'all') return [{ id: 'all', name: 'ALL FILES' }];
  const path = [];
  const findPath = (nodes, currentPath) => {
    for (const node of nodes) {
      if (node.type === 'folder') {
        const newPath = [...currentPath, { id: node.id, name: node.name }];
        if (node.id === folderId) { path.push(...newPath); return true; }
        if (node.children && findPath(node.children, newPath)) return true;
      }
    }
    return false;
  };
  findPath(hierarchy, []);
  return path;
}
