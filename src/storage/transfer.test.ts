import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultProfile, parseProfileOrNull } from "~/storage/profile.ts";
import { decodeProfile, encodeProfile, exportFilename, profileBlob } from "~/storage/transfer.ts";

test("a profile round-trips through the transfer link encoding", () => {
  const profile = {
    ...defaultProfile(),
    settings: { ...defaultProfile().settings, customText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
  };
  const encoded = encodeProfile(profile);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeProfile(encoded), profile);
});

test("garbage data decodes to null instead of a silent default", () => {
  assert.equal(decodeProfile("not-valid-base64!!"), null);
  assert.equal(decodeProfile(""), null);
});

test("parseProfileOrNull rejects anything that is not a JSON object", () => {
  assert.equal(parseProfileOrNull("not json"), null);
  assert.equal(parseProfileOrNull("[1,2,3]"), null);
  assert.deepEqual(parseProfileOrNull("{}"), defaultProfile());
});

test("the exported filename is stable for a given date", () => {
  assert.equal(exportFilename(new Date("2026-03-05T12:00:00Z")), "mafatih-progress-2026-03-05.json");
});

test("the exported file is valid, readable JSON for the whole profile", () => {
  const profile = defaultProfile();
  assert.deepEqual(parseProfileOrNull(JSON.stringify(profile)), profile);
  assert.equal(profileBlob(profile).type, "application/json");
});
