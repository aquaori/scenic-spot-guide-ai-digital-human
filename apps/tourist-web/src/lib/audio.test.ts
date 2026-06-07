/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import { decodeBase64AudioChunks, normalizeBase64AudioChunk } from "./audio.ts";

const concatAudioParts = (parts: ArrayBuffer[]) => {
  const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }

  return output;
};

test("decodeBase64AudioChunks decodes independently encoded chunks in order", () => {
  const firstChunk = Buffer.from([0x49, 0x44, 0x33, 0x04]).toString("base64");
  const secondChunk = Buffer.from([0xff, 0xfb, 0x90, 0x64]).toString("base64");

  const decoded = concatAudioParts(decodeBase64AudioChunks([firstChunk, secondChunk]));

  assert.deepEqual(Array.from(decoded), [0x49, 0x44, 0x33, 0x04, 0xff, 0xfb, 0x90, 0x64]);
});

test("normalizeBase64AudioChunk removes data URL prefix and whitespace", () => {
  assert.equal(normalizeBase64AudioChunk("data:audio/mpeg;base64, SUQz \n"), "SUQz");
});
