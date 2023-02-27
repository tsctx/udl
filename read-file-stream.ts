export async function readFileStream(
  path: string
): Promise<ReadableStream<Uint8Array> | null> {
  let statInfo: Deno.FileInfo;
  try {
    statInfo = await Deno.stat(path);
  } catch (_error) {
    return null;
  }
  if (!statInfo.isFile) {
    return null;
  }
  const file = await Deno.open(path, { read: true });
  const reader = file.readable.getReader();
  return new ReadableStream<Uint8Array>({
    async start(c) {
      async function read(): Promise<void> {
        const result = await reader.read();
        if (result.done) {
          return c.close();
        }
        c.enqueue(result.value);
        return read();
      }
      await read();
      file.close();
    },
    cancel() {
      reader.cancel();
      file.close();
    },
  });
}

export function readFileStreamSync(
  path: string
): ReadableStream<Uint8Array> | null {
  let statInfo: Deno.FileInfo;
  try {
    statInfo = Deno.statSync(path);
  } catch (_error) {
    return null;
  }
  if (!statInfo.isFile) {
    return null;
  }
  const file = Deno.openSync(path, { read: true });
  const reader = file.readable.getReader();
  return new ReadableStream<Uint8Array>({
    async start(c) {
      async function read(): Promise<void> {
        const result = await reader.read();
        if (result.done) {
          return c.close();
        }
        c.enqueue(result.value);
        return read();
      }
      await read();
      file.close();
    },
    cancel() {
      reader.cancel();
      file.close();
    },
  });
}
