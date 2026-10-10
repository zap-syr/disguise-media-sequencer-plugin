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
// from different subfolders - files sitting directly in the starting level are
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

/** Folder ids in tree order (depth-first, as shown in the sidebar when fully expanded). */
export function folderOrder(hierarchy) {
  const order = [];
  const walk = nodes => nodes.forEach(n => {
    if (n.type !== 'folder') return;
    order.push(n.id);
    if (n.children) walk(n.children);
  });
  walk(hierarchy);
  return order;
}

const directFiles = folder => (folder.children || []).filter(c => c.type === 'file').sort(byNameAsc);

/**
 * Plan groups for checked folders (docs §2.3.2).
 *   content 'direct': one group per folder, its own files only
 *   content 'deep'  : one group per folder, files of all subfolders flattened in
 *   content 'split' : one group per folder that has own files, plus one per descendant folder
 *                     with own files, named by the path relative to the checked folder
 * Groups follow tree order; files are sorted by name (numeric-aware). With 'deep' / 'split'
 * a checked folder inside another checked folder is skipped (its files are already covered).
 * isSkipped(path): files left out (missing media), counted in skippedMissing.
 * Returns { groups: [{ folderId, name, paths }], files, skippedNested, skippedEmpty, skippedMissing }.
 */
export function folderGroups(hierarchy, folderIds, content, isSkipped = () => false) {
  const order = folderOrder(hierarchy);
  const ids = [...folderIds].filter(id => id !== 'all').sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const covers = content !== 'direct';
  const isNested = id => covers && ids.some(other => other !== id && id.startsWith(other + '/'));

  const groups = [];
  let skippedNested = 0;
  let skippedEmpty = 0;
  let skippedMissing = 0;
  const keep = paths => paths.filter(p => {
    if (!isSkipped(p)) return true;
    skippedMissing++;
    return false;
  });

  ids.forEach(id => {
    if (isNested(id)) { skippedNested++; return; }
    const folder = findFolder(hierarchy, id);
    if (!folder) return;
    let made = [];
    if (content === 'deep') {
      const paths = flattenFiles(folder.children || [], { tag: false }).sort(byNameAsc).map(f => f.path);
      made = [{ folderId: id, name: folder.name, paths }];
    } else if (content === 'split') {
      const walk = (node, chain) => {
        const own = directFiles(node);
        if (own.length) made.push({ folderId: node.id, name: chain.join(' / '), paths: own.map(f => f.path) });
        (node.children || []).filter(c => c.type === 'folder').sort(byNameAsc)
          .forEach(child => walk(child, [...chain, child.name]));
      };
      walk(folder, [folder.name]);
    } else {
      made = [{ folderId: id, name: folder.name, paths: directFiles(folder).map(f => f.path) }];
    }
    made = made.map(g => ({ ...g, paths: keep(g.paths) })).filter(g => g.paths.length);
    if (!made.length) skippedEmpty++;
    groups.push(...made);
  });

  return { groups, files: groups.reduce((n, g) => n + g.paths.length, 0), skippedNested, skippedEmpty, skippedMissing };
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
