import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import { enableMapSet } from 'immer';
// Why import prismjs here?
// @lexical/code does `import "prismjs"` (side-effect only) then references the bare
// `Prism` global at module scope. Our Vite alias resolves prismjs to mocks/prismjs.ts,
// which sets `globalThis.Prism`. However, Rolldown (Vite 8 bundler) tree-shakes
// side-effect-only imports when it considers the module side-effect-free. This causes
// the mock to never execute and `Prism` to be undefined at runtime.
// Importing with a binding here forces the mock into the bundle, and we explicitly
// assign the global to guarantee it exists before any @lexical/code chunk evaluates.
// @ts-expect-error - prismjs is aliased to mocks/prismjs.ts in Vite config
import Prism from 'prismjs';

import { isChunkLoadError, notifyChunkError } from '@/utils/chunkError';

(globalThis as any).Prism = Prism;

enableMapSet();

// Dayjs plugins - extend once at app init to avoid duplicate extensions in components
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

// Global fallback: catch async chunk-load failures that escape Error Boundaries
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    if (isChunkLoadError((event as any).payload)) {
      event.preventDefault();
      notifyChunkError();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      notifyChunkError();
    }
  });
}
