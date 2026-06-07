export function normalizeBase64AudioChunk(chunk: string) {
  const commaIndex = chunk.indexOf(",");
  const rawChunk = chunk.startsWith("data:") && commaIndex >= 0
    ? chunk.slice(commaIndex + 1)
    : chunk;
  return rawChunk.replace(/\s/g, "");
}

export function decodeBase64AudioBytes(payload: string) {
  const binary = globalThis.atob(payload);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return buffer;
}

export function decodeBase64AudioChunks(chunks: string[]) {
  const normalizedChunks = chunks.map(normalizeBase64AudioChunk).filter(Boolean);
  if (normalizedChunks.length === 0) {
    return [];
  }

  try {
    return normalizedChunks.map(decodeBase64AudioBytes);
  } catch {
    return [
      decodeBase64AudioBytes(normalizedChunks.join("").replace(/=+(?=.)/g, ""))
    ];
  }
}
