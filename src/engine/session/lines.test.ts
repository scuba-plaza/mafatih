import assert from "node:assert/strict";
import { test } from "node:test";
import { skeleton } from "~/engine/corpus/normalize.ts";
import { chunkIntoLines, lineIndexFor } from "~/engine/session/lines.ts";

test("short text stays on one line", () => {
  const chars = [..."الحمد لله"];
  const lines = chunkIntoLines(chars, 52);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.text, "الحمد لله");
  assert.equal(lines[0]?.start, 0);
  assert.equal(lines[0]?.end, chars.length);
});

test("lines cover every character exactly once and in order", () => {
  const text = "الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين إياك نعبد وإياك نستعين";
  const chars = [...text];
  const lines = chunkIntoLines(chars, 20);
  assert.ok(lines.length > 1);
  assert.equal(lines[0]?.start, 0);
  assert.equal(lines[lines.length - 1]?.end, chars.length);
  for (let i = 1; i < lines.length; i += 1) {
    assert.equal(lines[i]?.start, lines[i - 1]?.end, "lines must be contiguous");
  }
  assert.equal(lines.map((l) => l.text).join(""), text);
});

test("breaks never fall inside a word", () => {
  const text = "الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين";
  const chars = [...text];
  for (const width of [12, 18, 25, 40]) {
    for (const line of chunkIntoLines(chars, width)) {
      const first = chars[line.start];
      const beforeFirst = chars[line.start - 1];
      assert.ok(first !== " " || line.start === 0, "a line must not begin with a space");
      if (line.start > 0) {
        assert.equal(beforeFirst, " ", "a line must begin just after a space");
      }
    }
  }
});

test("vocalising a passage does not move its line breaks", () => {
  const bare = "الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين إياك نعبد وإياك نستعين";
  const vocalised = [...bare].map((char) => (char === " " ? char : `${char}\u064E`)).join("");
  const plain = chunkIntoLines([...bare], 20);
  const marked = chunkIntoLines([...vocalised], 20);

  assert.ok(plain.length > 1);
  assert.deepEqual(
    marked.map((line) => skeleton(line.text)),
    plain.map((line) => line.text),
    "a haraka adds no width, so it must not shorten the line it sits on",
  );
  assert.equal(marked.map((line) => line.text).join(""), vocalised);
});

test("a measured advance breaks on width rather than on character count", () => {
  const chars = [..."مممم ىىىى مممم ىىىى"];
  const wide = (from: number, to: number) =>
    chars.slice(from, to).reduce((total, char) => total + (char === "م" ? 30 : char === " " ? 10 : 5), 0);
  const lines = chunkIntoLines(chars, 130, [], wide);

  assert.equal(lines.map((line) => line.text).join(""), chars.join(""));
  assert.ok(lines.length > 1, "the wide words cannot share one line");
  for (const line of lines) {
    assert.ok(wide(line.start, line.end) <= 130, `"${line.text}" must fit the measured limit`);
  }
  assert.equal(chunkIntoLines(chars, 130).length, 1, "the same text fits one line when characters are counted");
});

test("a word longer than the limit still gets its own line", () => {
  const chars = [..."بسم ابجدهوزحطيكلمنسعفصقرشتثخذضظغ نعم"];
  const lines = chunkIntoLines(chars, 10);
  assert.equal(lines.map((l) => l.text).join(""), chars.join(""));
  assert.ok(lines.some((l) => l.text.trim().length > 10));
});

test("empty input yields no lines", () => {
  assert.deepEqual(chunkIntoLines([], 20), []);
});

test("lineIndexFor locates the cursor", () => {
  const chars = [..."الحمد لله رب العالمين الرحمن الرحيم"];
  const lines = chunkIntoLines(chars, 12);
  assert.equal(lineIndexFor(lines, 0), 0);
  const second = lines[1];
  assert.ok(second);
  assert.equal(lineIndexFor(lines, second.start), 1);
  assert.equal(lineIndexFor(lines, chars.length), lines.length - 1);
});
