import * as Y from 'yjs';

export type MarkdownTextChange = {
  from: number;
  to: number;
  insert: string;
};

export const LOCAL_ORIGIN = Symbol('markdown-yjs-local');
export const REMOTE_ORIGIN = Symbol('markdown-yjs-remote');

export class MarkdownYjsSession {
  readonly doc = new Y.Doc();  // main Yjs object
  readonly text = this.doc.getText('markdown');  // main yjs object for content of text type (which is the only one relevant for us)

  private readonly localUpdateListeners = new Set<(update: Uint8Array) => void>();
  private readonly deltaListeners = new Set<(delta: readonly any[], origin: unknown) => void>();

  constructor(initialText = '') {
    // initialize Yjs document with the initial content
    if (initialText) {
      this.text.insert(0, initialText);
    }

    // register listener function lists to handle 'update' events

    // local update listeners expect raw Yjs update bytes
    // Y.Doc handles the emission of 'update' events
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === LOCAL_ORIGIN) {
        for (const listener of this.localUpdateListeners) {
          listener(update);
        }
      }
    });

    // delta listeners expect updates as deltas (arrays of changes)
    // the delta event is emitted by Y.Text object whenever its content changes
    this.text.observe((event: any, transaction: Y.Transaction) => {
      for (const listener of this.deltaListeners) {
        listener(event.delta, transaction.origin);
      }
    });
  }

  // add listener for local updates
  onLocalUpdate(cb: (update: Uint8Array) => void): () => void {
    this.localUpdateListeners.add(cb);
    return () => this.localUpdateListeners.delete(cb);
  }

  // add listener for text changes (deltas)
  onDelta(cb: (delta: readonly any[], origin: unknown) => void): () => void {
    this.deltaListeners.add(cb);
    return () => this.deltaListeners.delete(cb);
  }

  // plain text representation of the current content derived from the Yjs
  getPlainText(): string {
    return this.text.toString();
  }

  // state-vector of complete Yjs document
  getStateVector(): Uint8Array {
    return Y.encodeStateVector(this.doc);
  }

  // state-vector of diff to given state vector
  getSnapshot(stateVector?: Uint8Array): Uint8Array {
    return stateVector
      ? Y.encodeStateAsUpdate(this.doc, stateVector)
      : Y.encodeStateAsUpdate(this.doc);
  }

  // apply state-vector update
  // and emit yjs update for delta listeners
  applyRemoteUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update, REMOTE_ORIGIN);
  }

  // replace all content with the provided plain text (a non-state-vector update)
  replaceAllPlainText(value: string, origin: unknown): void {
    this.doc.transact(() => {
      const currentLength = this.text.length;
      if (currentLength > 0) {
        this.text.delete(0, currentLength);
      }
      if (value.length > 0) {
        this.text.insert(0, value);
      }
    }, origin);
  }

  // replace all content with the provided plain text
  // and emit yjs update for local update listeners
  applyLocalReplaceAll(value: string): void {
    this.replaceAllPlainText(value, LOCAL_ORIGIN);
  }

  // replace all content with the provided plain text
  // and emit yjs update for delta listeners
  applyRemotePlainTextSnapshot(value: string): void {
    this.replaceAllPlainText(value, REMOTE_ORIGIN);
  }

  // apply non-state-vector updates (deltas) (emitted by local changes)
  // and emit yjs update for local update listeners (as a state-vector update)
  applyLocalChanges(changes: MarkdownTextChange[]): void {
    if (changes.length === 0) {
      return;
    }

    this.doc.transact(() => {
      let offset = 0;

      for (const change of changes) {
        const from = change.from + offset;
        const removed = change.to - change.from;

        if (removed > 0) {
          this.text.delete(from, removed);
        }

        if (change.insert.length > 0) {
          this.text.insert(from, change.insert);
        }

        offset += change.insert.length - removed;
      }
    }, LOCAL_ORIGIN);
  }

  // cleanup listeners and destroy Yjs document object
  destroy(): void {
    this.deltaListeners.clear();
    this.localUpdateListeners.clear();
    this.doc.destroy();
  }
}
