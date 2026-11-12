import { afterEach, expect, test, vi } from "vitest";
import { type AudioCache, loadAyahBlob } from "./cache.ts";

const URL_A = "https://everyayah.com/data/x/001001.mp3";

function memoryCache(initial: Record<string, Blob> = {}): AudioCache & { readonly puts: string[] } {
  const store = new Map(Object.entries(initial));
  const puts: string[] = [];
  return {
    puts,
    get: async (url) => store.get(url) ?? null,
    put: async (url, blob) => {
      puts.push(url);
      store.set(url, blob);
    },
    usage: async () => ({ files: store.size, bytes: [...store.values()].reduce((sum, blob) => sum + blob.size, 0) }),
    clear: async () => store.clear(),
  };
}

function respond(body: BlobPart, init: ResponseInit = {}): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async () => new Response(body, init));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("an ayah that is not stored is fetched once, stored, and then read from the store", async () => {
  const fetcher = respond("audio");
  const cache = memoryCache();
  const first = await loadAyahBlob(URL_A, cache);
  expect(await first.text()).toBe("audio");
  expect(cache.puts).toEqual([URL_A]);
  const second = await loadAyahBlob(URL_A, cache);
  expect(await second.text()).toBe("audio");
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test("an ayah that is stored is not fetched at all", async () => {
  const fetcher = respond("other");
  const cache = memoryCache({ [URL_A]: new Blob(["kept"]) });
  expect(await (await loadAyahBlob(URL_A, cache)).text()).toBe("kept");
  expect(fetcher).not.toHaveBeenCalled();
});

test("a response that is not ok, or is empty, is an error and is never stored", async () => {
  const cache = memoryCache();
  respond("missing", { status: 404 });
  await expect(loadAyahBlob(URL_A, cache)).rejects.toThrow();
  respond("");
  await expect(loadAyahBlob(URL_A, cache)).rejects.toThrow();
  expect(cache.puts).toEqual([]);
});

test("a network failure is an error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("offline");
    }),
  );
  await expect(loadAyahBlob(URL_A, memoryCache())).rejects.toThrow();
});

test("with no store at all, or a store that fails, the ayah is still played", async () => {
  respond("audio");
  expect(await (await loadAyahBlob(URL_A, null)).text()).toBe("audio");
  const broken: AudioCache = {
    get: async () => {
      throw new Error("denied");
    },
    put: async () => {
      throw new Error("full");
    },
    usage: async () => ({ files: 0, bytes: 0 }),
    clear: async () => undefined,
  };
  expect(await (await loadAyahBlob(URL_A, broken)).text()).toBe("audio");
});

test("an empty record in the store is ignored and fetched again", async () => {
  respond("fresh");
  const cache = memoryCache({ [URL_A]: new Blob([]) });
  expect(await (await loadAyahBlob(URL_A, cache)).text()).toBe("fresh");
});
