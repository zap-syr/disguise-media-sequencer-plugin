import { ref, computed } from 'vue';
import { getSessionMachines, checkMachine, isLockedToDirector } from '../services/disguiseService';
import { usePersistedRef } from './usePersistedRef';

/**
 * The machine that runs layer and track creation ("Run on", docs/PLAN-execution-target.md):
 * the director, or an editor (Designer workstation) of the session. Reads (media, mappings,
 * tracks, thumbnails) always stay on the director.
 *
 * The choice is remembered per director by the editor's hostname (IPs can change); '' is the
 * director, also the default. Nothing here polls: the list is read on refresh() (plugin load,
 * Refresh, opening the menu) and the target is checked on select() and before Create.
 *
 * onNotice(message): a toast for changes the operator must know about (the saved editor left
 * the session, the machine list could not be read).
 */
export function useSessionMachines(directorEndpoint, onNotice = () => {}) {
  const machines = ref([]);
  const editors = computed(() => machines.value.filter(m => m.isEditor));
  const director = computed(() => machines.value.find(m => m.isDirector) || null);
  const isLoading = ref(false);

  const targetHostname = usePersistedRef(`mediaSequencer.runOn.${directorEndpoint}`, '', v => v);
  /** The chosen editor, or null for the director. */
  const target = computed(() => editors.value.find(m => m.hostname === targetHostname.value) || null);
  const targetHost = computed(() => target.value ? target.value.host : directorEndpoint);
  const targetName = computed(() => target.value?.name || director.value?.name || 'Director');

  // { [hostname]: { status: 'unknown' | 'ok' | 'not-designer' | 'unreachable', locked: bool | null,
  //                 checking: bool } }
  // A re-check keeps the last known status and tag until the answer arrives, so a fast check
  // that changes nothing changes nothing on screen.
  const info = ref({});
  /** Reachability of the target; the director is the plugin's own host, so it counts as ok. */
  const targetStatus = computed(() => target.value ? (info.value[target.value.hostname]?.status || 'unknown') : 'ok');
  /** A check of the target is running (the UI shows it only when it is slow). */
  const targetChecking = computed(() => !!(target.value && info.value[target.value.hostname]?.checking));

  function setInfo(hostname, patch) {
    const prev = info.value[hostname] || { status: 'unknown', locked: null, checking: false };
    info.value = { ...info.value, [hostname]: { ...prev, ...patch } };
  }

  /** Reachability and Locked / Independent of one editor, asked from the editor itself. */
  async function probe(machine) {
    setInfo(machine.hostname, { checking: true });
    const status = await checkMachine(machine.host);
    let locked = null;
    if (status === 'ok') {
      try {
        locked = await isLockedToDirector(machine.host);
      } catch (e) {
        // the tag stays unknown, the machine itself answered
      }
    }
    setInfo(machine.hostname, { status, locked, checking: false });
    return status;
  }

  async function refresh() {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      machines.value = await getSessionMachines(directorEndpoint);
    } catch (err) {
      console.error('Session machines unavailable:', err);
      // Keep the last list. On the first load that means no editors: the control stays hidden
      // and writes go to the director, so say it when an editor was chosen.
      if (targetHostname.value && !machines.value.length) {
        onNotice(`Could not read the session machines (${err.message}), layers are created on the director`);
      }
      return;
    } finally {
      isLoading.value = false;
    }

    const saved = targetHostname.value;
    if (saved && !target.value) {
      targetHostname.value = '';
      onNotice(`Editor ${saved} is not in the session, layers are created on the director`);
    }
    await Promise.all(editors.value.map(probe));
  }

  /** Chooses the machine: an editor's hostname, or '' for the director. */
  function select(hostname) {
    targetHostname.value = hostname || '';
    if (target.value) probe(target.value);
  }

  /** Re-checks the target right before a write; true when it can run the scripts. */
  async function check() {
    if (!target.value) return true;
    return (await probe(target.value)) === 'ok';
  }

  return {
    machines, editors, director, isLoading, info,
    target, targetHost, targetName, targetStatus, targetChecking,
    refresh, select, check
  };
}
