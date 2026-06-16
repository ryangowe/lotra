// In-memory working copy; disk is written only on flush (submit/save), never on edit.
export interface FileState {
  waiters: Array<(output: string) => void>;
  text: string | null;
}

export interface DocStore {
  getFile(absPath: string): FileState;
  peekFile(absPath: string): FileState | undefined;
  allFiles(): IterableIterator<[string, FileState]>;
  load(absPath: string): Promise<string>;
  setText(absPath: string, text: string): void;
  flush(absPath: string): Promise<void>;
}

export interface DocStoreIo {
  readMd(absPath: string): Promise<string>;
  writeMd(absPath: string, content: string): Promise<void>;
}

/** In-memory document store: edits accumulate in memory, flush writes to disk. */
export function createStore(io: DocStoreIo): DocStore {
  const files = new Map<string, FileState>();

  function getFile(absPath: string): FileState {
    let f = files.get(absPath);
    if (!f) {
      f = { waiters: [], text: null };
      files.set(absPath, f);
    }
    return f;
  }

  return {
    getFile,
    peekFile: (absPath) => files.get(absPath),
    allFiles: () => files.entries(),

    async load(absPath) {
      const f = getFile(absPath);
      if (f.text !== null) return f.text;
      const content = await io.readMd(absPath);
      // a concurrent load/edit may have filled text during the await
      f.text ??= content;
      return f.text;
    },

    setText(absPath, text) {
      getFile(absPath).text = text;
    },

    async flush(absPath) {
      const f = getFile(absPath);
      if (f.text === null) return;
      await io.writeMd(absPath, f.text);
    },
  };
}
