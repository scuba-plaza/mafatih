const DATABASE = "mafatih.audio";
const VERSION = 2;
const RECORDS = "ayat";
const SIZES = "sizes";

interface StoredAyah {
  readonly url: string;
  readonly data: ArrayBuffer;
  readonly type: string;
}

interface StoredSize {
  readonly url: string;
  readonly bytes: number;
}

export interface AudioCacheUsage {
  readonly files: number;
  readonly bytes: number;
}

export interface AudioCache {
  readonly get: (url: string) => Promise<Blob | null>;
  readonly put: (url: string, blob: Blob) => Promise<void>;
  readonly usage: () => Promise<AudioCacheUsage>;
  readonly clear: () => Promise<boolean>;
}

function openDatabase(onLost: () => void): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE, VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = (event) => {
      const database = request.result;
      if (event.oldVersion < VERSION && database.objectStoreNames.contains(RECORDS)) {
        database.deleteObjectStore(RECORDS);
      }
      if (!database.objectStoreNames.contains(RECORDS)) {
        database.createObjectStore(RECORDS, { keyPath: "url" });
      }
      if (!database.objectStoreNames.contains(SIZES)) {
        database.createObjectStore(SIZES, { keyPath: "url" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        onLost();
      };
      resolve(request.result);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function createAudioCache(): AudioCache | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }
  let opened: Promise<IDBDatabase | null> | undefined;

  const run = async <Result>(
    mode: IDBTransactionMode,
    work: (transaction: IDBTransaction) => IDBRequest<Result>,
  ): Promise<Result | null> => {
    opened ??= openDatabase(() => {
      opened = undefined;
    });
    const database = await opened;
    if (database === null) {
      opened = undefined;
      return null;
    }
    return new Promise<Result | null>((resolve) => {
      try {
        const transaction = database.transaction([RECORDS, SIZES], mode);
        const request = work(transaction);
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => resolve(null);
        transaction.onabort = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  };

  return {
    get: async (url) => {
      const record = await run<StoredAyah | undefined>("readonly", (transaction) =>
        transaction.objectStore(RECORDS).get(url),
      );
      return record !== undefined && record !== null && record.data instanceof ArrayBuffer && record.data.byteLength > 0
        ? new Blob([record.data], { type: record.type })
        : null;
    },
    put: async (url, blob) => {
      const data = await blob.arrayBuffer();
      const record: StoredAyah = { url, data, type: blob.type };
      const size: StoredSize = { url, bytes: data.byteLength };
      await run("readwrite", (transaction) => {
        transaction.objectStore(SIZES).put(size);
        return transaction.objectStore(RECORDS).put(record);
      });
    },
    usage: async () => {
      const sizes = await run<StoredSize[]>("readonly", (transaction) => transaction.objectStore(SIZES).getAll());
      return {
        files: sizes?.length ?? 0,
        bytes: (sizes ?? []).reduce((sum, size) => sum + (size.bytes || 0), 0),
      };
    },
    clear: async () =>
      (await run("readwrite", (transaction) => {
        transaction.objectStore(SIZES).clear();
        return transaction.objectStore(RECORDS).clear();
      })) !== null,
  };
}

let shared: AudioCache | null | undefined;

export function sharedAudioCache(): AudioCache | null {
  if (shared === undefined) {
    shared = createAudioCache();
  }
  return shared;
}

const inFlight = new Map<string, Promise<Blob>>();

async function fetchAyahBlob(url: string, cache: AudioCache | null): Promise<Blob> {
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

export function loadAyahBlob(url: string, cache: AudioCache | null): Promise<Blob> {
  const running = inFlight.get(url);
  if (running !== undefined) {
    return running;
  }
  const started = fetchAyahBlob(url, cache).finally(() => inFlight.delete(url));
  inFlight.set(url, started);
  return started;
}
