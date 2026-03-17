import { useWatchBroadcast } from '@lobechat/electron-client-ipc';
import { useSWRConfig } from 'swr';

export const useSyncDataBroadcast = () => {
  const { mutate } = useSWRConfig();

  useWatchBroadcast('syncData', (data) => {
    if (data?.keys) {
      for (const key of data.keys) {
        mutate(key);
      }
    }
  });
};
