// Copy-on-write against disk: a file is "synced" until edited, then forks an
// in-memory working copy; flush writes the copy back and returns to synced.
export interface FileState {
  waiters: Array<(output: string) => void>;
  // null when synced; the in-memory working copy when edited but not yet flushed.
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

/** Document store that mirrors disk until an edit forks an in-memory working copy. */
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
      if (f.text !== null) return f.text; // forked: serve the working copy
      // synced: re-read disk so external edits stay visible — never store it into
      // f.text, or a later flush would clobber the disk. A setText racing the read wins.
      const content = await io.readMd(absPath);
      return f.text ?? content;
    },

    setText(absPath, text) {
      getFile(absPath).text = text;
    },

    async flush(absPath) {
      const f = getFile(absPath);
      if (f.text === null) return;
      await io.writeMd(absPath, f.text);
      f.text = null; // back to synced; next load re-reads disk
    },
  };
}
