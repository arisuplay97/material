import { useMemo, useSyncExternalStore } from 'react';
import { pdamService } from '@/services/pdamDataService';

/**
 * Single subscription point to the data service. Replaces the duplicated
 * subscribe/useEffect blocks in every page and avoids tearing.
 */
export function usePdamVersion(): number {
  return useSyncExternalStore(pdamService.subscribe, pdamService.getVersion);
}

export function usePdamData() {
  const version = usePdamVersion();
  return useMemo(
    () => ({
      version,
      pelanggan: pdamService.getPelangganList(),
      wilayah: pdamService.getWilayahList(),
      snapshots: pdamService.getSnapshots(),
      activeSnapshot: pdamService.getActiveSnapshot(),
      previousSnapshot: pdamService.getPreviousSnapshot(),
    }),
    [version],
  );
}
