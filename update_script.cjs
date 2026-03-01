const fs = require('fs');
let code = fs.readFileSync('src/components/MediaManager.vue', 'utf8');

// Re-apply primary color replacement since we checked out
code = code.replace(/#3b82f6/g, '#0a84ff').replace(/#2563eb/g, '#0060d1');

// Layout structure replacement
const layoutReplacement = `<div v-else class="app-wrapper">
      <!-- Global Top Bar -->
      <header class="global-top-bar" @click.stop>
        <div class="top-bar-left">
          <div class="brand-title">MEDIA SERVER</div>
        </div>
        
        <div class="search-bar">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" v-model="searchQuery" :placeholder="selectedFolderId === 'all' ? 'Search all files...' : 'Search current folder...'" />
        </div>

        <div class="top-bar-right">
          <svg class="system-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <svg class="system-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <div class="user-avatar"></div>
        </div>
      </header>

      <div class="main-layout">`;

code = code.replace('<div v-else class="main-layout">', layoutReplacement);

// remove the old search bar
code = code.replace(/<div class="search-bar">[\s\S]*?<\/div>/, '');

// script update for startSelection
code = code.replace("event.target.closest('.action-toolbar') ||", "event.target.closest('.action-toolbar') ||\n    event.target.closest('.global-top-bar') ||");

// update CSS
code = code.replace('.tree-item.is-selected { background: #2a2a2a; color: #ffffff; }', '.tree-item.is-selected { background: rgba(10, 132, 255, 0.1); border-left: 3px solid #0a84ff; color: #ffffff; padding-left: calc(var(--padding-left) - 3px); }');

code = code.replace('.tree-item {', '.tree-item { border-left: 3px solid transparent;');

// Use regex to catch the inline style paddingLeft to add CSS variable
code = code.replace(/:style="\{ paddingLeft: `\$\{node\.depth \* 16 \+ 12\}px` \}"/g, ':style="{ paddingLeft: `${node.depth * 16 + 12}px`, \'--padding-left\': `${node.depth * 16 + 12}px` }"');

// Global Top Bar CSS insertion
const newCss = `.app-wrapper { display: flex; flex-direction: column; height: 100%; width: 100%; }
.global-top-bar { display: flex; justify-content: space-between; align-items: center; height: 56px; padding: 0 24px; background-color: #242424; border-bottom: 1px solid #333333; flex-shrink: 0; }
.top-bar-left { width: 240px; }
.brand-title { font-weight: 700; font-size: 14px; letter-spacing: 1px; color: #ffffff; }
.top-bar-right { display: flex; align-items: center; gap: 16px; width: 240px; justify-content: flex-end; }
.system-icon { color: #888888; cursor: pointer; transition: color 0.2s; }
.system-icon:hover { color: #ffffff; }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; background-color: #0a84ff; border: 2px solid #ffffff; cursor: pointer; }
.media-app {`;

code = code.replace('.media-app {', newCss);

// Remove specific backgrounds and use transparent to rely on global body bg #1a1a1a
code = code.replace(/background-color: #111111;/g, 'background-color: transparent;');
code = code.replace(/background-color: #151515;/g, 'background-color: transparent;');

// Update font family to use Inter
code = code.replace("font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;", "font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;");

// Search bar background
code = code.replace('background: #0a0a0a;', 'background: #151515;');
code = code.replace('width: 260px;', 'width: 400px; max-width: 50vw;');

fs.writeFileSync('src/components/MediaManager.vue', code);
console.log('Successfully updated MediaManager.vue');
