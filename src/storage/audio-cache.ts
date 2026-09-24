export const AUDIO_DB = "mafatih.audio";

const AUDIO_STORE = "ayat";

interface CachedAyah {
  url: string;
  blob: Blob;
  bytes: number;
  at: number;
}

export interface AudioCacheUsage {
  files: number;
  bytes: number;
}

export const EMPTY_USAGE: AudioCacheUsage = { files: 0, bytes: 0 };

export function audioCacheSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function open(): Promise<IDBDatabase | null> {
  if (!audioCacheSupported()) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(AUDIO_DB, 1);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(AUDIO_STORE)) {
        request.result.createObjectStore(AUDIO_STORE, { keyPath: "url" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then((db) => {
    if (db === null) {
      return null;
    }
    return new Promise<T | null>((resolve) => {
      let request: IDBRequest<T>;
      try {
        request = work(db.transaction(AUDIO_STORE, mode).objectStore(AUDIO_STORE));
      } catch {
        db.close();
        resolve(null);
        return;
      }
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  });
}

async function readAyah(url: string): Promise<Blob | null> {
  const record = await run<CachedAyah | undefined>("readonly", (store) => store.get(url));
  const blob = record?.blob;
  return blob instanceof Blob && blob.size > 0 ? blob : null;
}

async function writeAyah(url: string, blob: Blob): Promise<void> {
  const record: CachedAyah = { url, blob, bytes: blob.size, at: Date.now() };
  await run("readwrite", (store) => store.put(record));
}

export async function audioCacheUsage(): Promise<AudioCacheUsage> {
  const records = await run<CachedAyah[]>("readonly", (store) => store.getAll());
  if (records === null) {
    return EMPTY_USAGE;
  }
  let bytes = 0;
  for (const record of records) {
    bytes += record.bytes || 0;
  }
  return { files: records.length, bytes };
}

export async function clearAudioCache(): Promise<void> {
  await run("readwrite", (store) => store.clear());
}

export async function cacheAyah(url: string): Promise<Blob> {
  const cached = await readAyah(url);
  if (cached !== null) {
    return cached;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`recitation ${response.status}`);
  }
  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("recitation empty");
  }
  await writeAyah(url, blob);
  return blob;
}

export async function warmAyah(url: string): Promise<void> {
  try {
    await cacheAyah(url);
  } catch {
    return;
  }
}
