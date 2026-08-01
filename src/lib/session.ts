const BOOT_SEQUENCE_SEEN_KEY = 'backend-odyssey:boot-seen';

export function hasSeenBootSequence(): boolean {
  try {
    return sessionStorage.getItem(BOOT_SEQUENCE_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markBootSequenceSeen(): void {
  try {
    sessionStorage.setItem(BOOT_SEQUENCE_SEEN_KEY, 'true');
  } catch {
    // Ignore write failures (e.g. Safari private browsing) — worst case the
    // boot sequence replays on the next reload, which is harmless.
  }
}
