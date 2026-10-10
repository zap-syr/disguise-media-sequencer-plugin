import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';

/**
 * Selection of media files: click / Ctrl / Shift, select-all, and the marquee (rubber-band)
 * selection over the grid. `itemsRef` is the computed list of currently visible files.
 * isLocked(item): true for files that cannot be selected (missing media, docs §6.3).
 */
export function useFileSelection(itemsRef, isLocked = () => false) {
  const selectedItems = reactive(new Set());
  let lastSelectedIndex = -1;

  const isSelecting = ref(false);
  const wasDragging = ref(false);
  const selectionStart = reactive({ x: 0, y: 0 });
  const selectionEnd = reactive({ x: 0, y: 0 });
  const initialSelection = new Set();
  let dragOrder = new Set();
  let gridEl = null;

  const selectable = computed(() => itemsRef.value.filter(item => !isLocked(item)));
  const isAllSelected = computed(() => selectable.value.length > 0 && selectable.value.every(item => selectedItems.has(item.id)));
  const isIndeterminate = computed(() => selectedItems.size > 0 && selectedItems.size < selectable.value.length);

  /** Drops files that became locked (e.g. their media went missing after a Refresh). */
  function dropLocked() {
    itemsRef.value.forEach(item => { if (isLocked(item)) selectedItems.delete(item.id); });
  }

  const selectionOrderMap = computed(() => {
    const map = new Map();
    Array.from(selectedItems).forEach((id, i) => map.set(id, i + 1));
    return map;
  });

  function clear() {
    selectedItems.clear();
    lastSelectedIndex = -1;
  }

  function handleSelection(item, index, event) {
    if (isLocked(item)) return;
    const id = item.id;
    if (event.ctrlKey || event.metaKey) {
      if (selectedItems.has(id)) selectedItems.delete(id);
      else selectedItems.add(id);
      lastSelectedIndex = index;
    } else if (event.shiftKey && lastSelectedIndex !== -1) {
      selectedItems.clear();
      const step = index >= lastSelectedIndex ? 1 : -1;
      for (let i = lastSelectedIndex; i !== index + step; i += step) {
        const currentItem = itemsRef.value[i];
        if (!isLocked(currentItem)) selectedItems.add(currentItem.id);
      }
    } else {
      selectedItems.clear();
      selectedItems.add(id);
      lastSelectedIndex = index;
    }
  }

  function handleContainerClick(event) {
    // Ignore clicks on any scrollbar
    if (event.target && event.target.clientWidth && event.offsetX > event.target.clientWidth) return;
    if (event.target && event.target.clientHeight && event.offsetY > event.target.clientHeight) return;

    if (!wasDragging.value) clear();
    wasDragging.value = false;
  }

  function toggleSelectAll() {
    if (isAllSelected.value) {
      clear();
    } else {
      itemsRef.value.forEach((item, index) => {
        if (isLocked(item)) return;
        selectedItems.add(item.id);
        lastSelectedIndex = index;
      });
    }
  }

  function startSelection(event, el) {
    // Prevent drag selection if clicking on a card, toolbar, OR if clicking on the scrollbar
    if (
      event.target.closest('.media-card') ||
      event.target.closest('.top-nav-bar') ||
      event.target.closest('.action-toolbar') ||
      event.target.closest('.global-top-bar') ||
      event.offsetX > event.target.clientWidth || // Clicking vertical scrollbar
      event.offsetY > event.target.clientHeight   // Clicking horizontal scrollbar
    ) return;

    gridEl = el;
    isSelecting.value = true;
    wasDragging.value = false;
    const rect = gridEl.getBoundingClientRect();
    selectionStart.x = event.clientX - rect.left + gridEl.scrollLeft;
    selectionStart.y = event.clientY - rect.top + gridEl.scrollTop;
    selectionEnd.x = selectionStart.x;
    selectionEnd.y = selectionStart.y;
    if (!event.ctrlKey && !event.metaKey) selectedItems.clear();
    initialSelection.clear();
    selectedItems.forEach(id => initialSelection.add(id));
    dragOrder = new Set();
  }

  function updateSelection(event) {
    if (!isSelecting.value || !gridEl) return;
    if (Math.abs(event.movementX) > 0 || Math.abs(event.movementY) > 0) wasDragging.value = true;
    const rect = gridEl.getBoundingClientRect();
    selectionEnd.x = event.clientX - rect.left + gridEl.scrollLeft;
    selectionEnd.y = event.clientY - rect.top + gridEl.scrollTop;
    const boxLeft = Math.min(selectionStart.x, selectionEnd.x);
    const boxTop = Math.min(selectionStart.y, selectionEnd.y);
    const boxRight = Math.max(selectionStart.x, selectionEnd.x);
    const boxBottom = Math.max(selectionStart.y, selectionEnd.y);
    const cards = gridEl.querySelectorAll('.media-card-item:not(.is-missing)');
    const currentlyIntersecting = new Set();
    cards.forEach(card => {
      const id = card.dataset.id;
      const cardLeft = card.offsetLeft;
      const cardTop = card.offsetTop;
      const cardRight = cardLeft + card.offsetWidth;
      const cardBottom = cardTop + card.offsetHeight;
      const isIntersecting = !(cardLeft > boxRight || cardRight < boxLeft || cardTop > boxBottom || cardBottom < boxTop);
      if (isIntersecting) currentlyIntersecting.add(id);
    });
    // Cards selected before this drag started are toggled by the box (Explorer/
    // Finder-style Ctrl/Cmd-drag): covering them deselects them, stepping back
    // off restores them. Recomputed fresh every tick, not cumulative.
    const toggledPreExisting = Array.from(initialSelection).filter(id => !currentlyIntersecting.has(id));

    // Cards not part of the pre-drag selection accumulate in sweep order -
    // added the first time the box covers them, dropped once it moves off -
    // preserving the direction the box was dragged in. A Set preserves insertion
    // order and re-adding an existing member is a no-op (doesn't move it), so
    // this reproduces the old filter+includes-guarded-push behavior in O(1)
    // per membership check instead of O(n).
    const nextDragOrder = new Set();
    dragOrder.forEach(id => {
      if (!initialSelection.has(id) && currentlyIntersecting.has(id)) nextDragOrder.add(id);
    });
    currentlyIntersecting.forEach(id => {
      if (!initialSelection.has(id)) nextDragOrder.add(id);
    });
    dragOrder = nextDragOrder;

    selectedItems.clear();
    toggledPreExisting.forEach(id => selectedItems.add(id));
    dragOrder.forEach(id => selectedItems.add(id));
  }

  function endSelection() {
    isSelecting.value = false;
  }

  const selectionFrameStyle = computed(() => {
    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    return { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` };
  });

  onMounted(() => {
    window.addEventListener('mouseup', endSelection);
    window.addEventListener('mousemove', updateSelection);
  });
  onUnmounted(() => {
    window.removeEventListener('mouseup', endSelection);
    window.removeEventListener('mousemove', updateSelection);
  });

  return {
    selectedItems,
    isSelecting,
    isAllSelected,
    isIndeterminate,
    selectionOrderMap,
    selectionFrameStyle,
    clear,
    dropLocked,
    handleSelection,
    handleContainerClick,
    toggleSelectAll,
    startSelection
  };
}
