const DATABASE = "mafatih.audio";
const STORE = "ayat";

interface StoredAyah {
  readonly url: string;
  readonly blob: Blob;
  readonly bytes: number;
  readonly at: number;
}

export interface AudioCacheUsage {
  readonly files: number;
  readonly bytes: number;
}

export interface AudioCache {
  readonly get: (url: string) => Promise<Blob | null>;
  readonly put: (url: string, blob: Blob) => Promise<void>;
  readonly usage: () => Promise<AudioCacheUsage>;
  readonly clear: () => Promise<void>;
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE, 1);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "url" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export function createAudioCache(): AudioCache | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }
  let opened: Promise<IDBDatabase | null> | undefined;

  const run = async <Result>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => IDBRequest<Result>,
  ): Promise<Result | null> => {
    opened ??= openDatabase();
    const database = await opened;
    if (database === null) {
      return null;
    }
    return new Promise<Result | null>((resolve) => {
      try {
        const request = work(database.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  };

  return {
    get: async (url) => {
      const record = await run<StoredAyah | undefined>("readonly", (store) => store.get(url));
      return record !== undefined && record !== null && record.blob instanceof Blob && record.blob.size > 0
        ? record.blob
        : null;
    },
    put: async (url, blob) => {
      const record: StoredAyah = { url, blob, bytes: blob.size, at: Date.now() };
      await run("readwrite", (store) => store.put(record));
    },
    usage: async () => {
      const records = await run<StoredAyah[]>("readonly", (store) => store.getAll());
      return {
        files: records?.length ?? 0,
        bytes: (records ?? []).reduce((sum, record) => sum + (record.bytes || 0), 0),
      };
    },
    clear: async () => {
      await run("readwrite", (store) => store.clear());
    },
  };
}

let shared: AudioCache | null | undefined;

export function sharedAudioCache(): AudioCache | null {
  if (shared === undefined) {
    shared = createAudioCache();
  }
  return shared;
}

export async function loadAyahBlob(url: string, cache: AudioCache | null): Promise<Blob> {
  const stored = await (cache?.get(url) ?? Promise.resolve(null)).catch(() => null);
  if (stored !== null && stored.size > 0) {
    return stored;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`recitation ${response.status}`);
  }
  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("recitation empty");
  }
  await (cache?.put(url, blob) ?? Promise.resolve()).catch(() => undefined);
  return blob;
}
