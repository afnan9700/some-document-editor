import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import {
  ChangeSpec,
  Compartment,
  EditorState,
  type Extension,
  type TransactionSpec,
} from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { history } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

import {
  MarkdownEditorMode,
  MarkdownEditorTheme,
  MarkdownToolbarAction,
  MarkdownToolbarContext,
} from './markdown-editor.types';
import { MarkdownPreviewComponent } from './markdown-renderer/markdown-preview.component';
import { MarkdownToolbarComponent } from './markdown-editor-toolbar/markdown-editor-toolbar.component';
import { MarkdownRendererService } from './markdown-renderer/markdown-renderer.service';
import { createMarkdownToolbarActions } from './markdown-editor-toolbar/markdown-editor-toolbar.actions';
import { MarkdownYjsSession, type MarkdownTextChange, LOCAL_ORIGIN, REMOTE_ORIGIN } from './markdown-yjs-session';

@Component({
  selector: 'app-markdown-yjs-editor',
  standalone: true,
  imports: [MarkdownPreviewComponent, MarkdownToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-h-0 w-full',
  },
  template: `
    <div class="card h-full min-h-0 border border-base-300 bg-base-100 shadow-sm">
      <div class="card-body flex h-full min-h-0 flex-col gap-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="tabs tabs-box" role="tablist" aria-label="Editor mode">
            <button
              type="button"
              role="tab"
              class="tab"
              [class.tab-active]="activeMode() === 'source'"
              [attr.aria-selected]="activeMode() === 'source'"
              [attr.aria-controls]="editorPanelId"
              (click)="setMode('source')"
            >
              Source
            </button>

            <button
              type="button"
              role="tab"
              class="tab"
              [class.tab-active]="activeMode() === 'preview'"
              [attr.aria-selected]="activeMode() === 'preview'"
              [attr.aria-controls]="previewPanelId"
              (click)="setMode('preview')"
            >
              Preview
            </button>
          </div>

          <app-markdown-toolbar
            [actions]="toolbarActions()"
            [context]="toolbarContext()"
          />
        </div>

        <div class="flex min-h-0 flex-1 overflow-hidden rounded-box border border-base-300 bg-base-200">
          <div
            #editorHost
            class="h-full min-h-0 w-full"
            [style.display]="activeMode() === 'source' ? 'block' : 'none'"
          ></div>

          @if (activeMode() === 'preview') {
            <section class="h-full min-h-0 w-full overflow-auto" aria-label="Markdown preview">
              <app-markdown-preview [html]="previewHtml()" />
            </section>
          }
        </div>
      </div>
    </div>
  `,
})
export class MarkdownYjsEditorComponent implements AfterViewInit, OnDestroy {
  readonly content = input('');
  readonly readonly = input(false);
  readonly mode = input<MarkdownEditorMode>('source');
  readonly theme = input<MarkdownEditorTheme>({ extensions: [] });
  readonly extraExtensions = input<Extension[]>([]);
  readonly toolbarActions = input<MarkdownToolbarAction[]>(createMarkdownToolbarActions());
  readonly ariaLabel = input('Markdown editor');

  // plain text bootstrap from the synchronization worker
  readonly initialSnapshot = input<string | null>(null);

  // stream of raw Yjs updates coming from your websocket bridge
  readonly remoteUpdates = input<Observable<Uint8Array> | null>(null);

  readonly toolbarContext = computed<MarkdownToolbarContext>(() => ({
    getContent: () => this.getContent(),
    setContent: (value: string) => this.setContent(value),
    focus: () => this.focus(),
    toggleMode: () => this.toggleMode(),
    replaceSelection: (text: string) => this.replaceSelection(text),
    insertCodeBlock: (language?: string) => this.insertCodeBlock(language),
    dispatch: (spec: TransactionSpec) => this.dispatch(spec),
    readonly: this.isReadOnly(),
    mode: this.activeMode(),
  }));

  readonly contentChange = output<string>();
  readonly yjsUpdate = output<Uint8Array>();
  readonly modeChange = output<MarkdownEditorMode>();

  readonly activeMode = signal<MarkdownEditorMode>('source');
  readonly doc = signal('');
  readonly previewHtml = computed(() => this.renderer.render(this.doc()));

  readonly editorPanelId = `markdown-editor-panel-${++editorInstanceCounter}`;
  readonly previewPanelId = `markdown-preview-panel-${editorInstanceCounter}`;

  private readonly renderer = inject(MarkdownRendererService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private readonly view = signal<EditorView | null>(null);

  private readonly themeCompartment = new Compartment();
  private readonly interactionCompartment = new Compartment();
  private readonly extrasCompartment = new Compartment();
  private readonly ariaCompartment = new Compartment();

  private readonly session = signal<MarkdownYjsSession | null>(null);

  // to prevent codemirror from running update listeners when content is changed via a remote Yjs update
  private applyingRemotePatch = false;

  // to keep track of Yjs session listeners for proper cleanup
  private sessionCleanup: Array<() => void> = [];

  // keep track of the observable subscription separately
  private remoteUpdatesSubscription: Subscription | null = null;

  // only apply the initial snapshot once
  private initialSnapshotApplied = false;

  constructor() {
    // source/preview mode change effect
    effect(() => {
      this.activeMode.set(this.mode());
    });

    // read-only mode effect (also makes editor non-editable in preview mode)
    effect(() => {
      const view = this.view();
      if (!view) {
        return;
      }

      const readOnly = this.isReadOnly();
      view.dispatch({
        effects: this.interactionCompartment.reconfigure([
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
        ]),
      });
    });

    effect(() => {
      const view = this.view();
      if (!view) {
        return;
      }

      view.dispatch({
        effects: this.themeCompartment.reconfigure(this.theme().extensions),
      });
    });

    // extra extensions change effect
    effect(() => {
      const view = this.view();
      if (!view) {
        return;
      }

      view.dispatch({
        effects: this.extrasCompartment.reconfigure(this.extraExtensions()),
      });
    });

    // aria-label change effect
    effect(() => {
      const view = this.view();
      if (!view) {
        return;
      }

      view.dispatch({
        effects: this.ariaCompartment.reconfigure(
          EditorView.contentAttributes.of({
            'aria-label': this.ariaLabel(),
          }),
        ),
      });
    });

    // content change effect (for changes from outside)
    // update the Yjs session and editor content accordingly
    effect(() => {
      const next = this.content();
      const session = this.session();

      if (!session) {
        return;
      }

      if (next === session.getPlainText()) {
        return;
      }

      this.setContent(next);
    });

    // subscribe to incoming remote Yjs updates and apply them to codemirror
    effect((onCleanup) => {
      const session = this.session();
      const updates$ = this.remoteUpdates();

      this.remoteUpdatesSubscription?.unsubscribe();
      this.remoteUpdatesSubscription = null;

      if (!session || !updates$) {
        return;
      }

      this.remoteUpdatesSubscription = updates$.subscribe((update) => {
        session.applyRemoteUpdate(update);
      });

      onCleanup(() => {
        this.remoteUpdatesSubscription?.unsubscribe();
        this.remoteUpdatesSubscription = null;
      });
    });

    // apply the plain-text bootstrap snapshot once the session exists
    effect(() => {
      const session = this.session();
      const snapshot = this.initialSnapshot();

      if (!session || snapshot === null || this.initialSnapshotApplied) {
        return;
      }

      session.applyRemotePlainTextSnapshot(snapshot);
      this.initialSnapshotApplied = true;
    });

    this.destroyRef.onDestroy(() => {
      this.cleanupSession();
      this.view()?.destroy();
      this.view.set(null);
    });
  }

  ngAfterViewInit(): void {
    // initialize Yjs session with the initial content
    const session = new MarkdownYjsSession(this.content());
    this.session.set(session);

    // register local update listener to emit Yjs updates (state-vectors) as output signals
    this.sessionCleanup.push(
      session.onLocalUpdate((update) => {
        this.yjsUpdate.emit(update);
      }),
    );

    this.sessionCleanup.push(
      session.onDelta((delta, origin) => {
        // sync angular signal with Yjs document content
        const plainText = session.getPlainText();
        this.doc.set(plainText);

        // if the delta had local origin, Y.Doc is already in sync with codemirror content
        if (origin === LOCAL_ORIGIN) {
          this.contentChange.emit(plainText);
          return;
        }

        const view = this.view();
        if (!view) {
          return;
        }

        // a change spec is codemirror's way of describing a change to the document
        const changes: ChangeSpec[] = [];
        let pos = 0;

        // convert Yjs deltas to codemirror change spec format
        for (const op of delta) {
          if (typeof op.retain === 'number') {
            pos += op.retain;
            continue;
          }

          if (typeof op.delete === 'number') {
            changes.push({ from: pos, to: pos + op.delete });
            continue;
          }

          if (typeof op.insert !== 'undefined') {
            const inserted = typeof op.insert === 'string' ? op.insert : String(op.insert);
            changes.push({ from: pos, insert: inserted });
            pos += inserted.length;
          }
        }

        if (changes.length === 0) {
          return;
        }

        // apply delta changes to codemirror content
        this.applyingRemotePatch = true;
        try {
          view.dispatch({ changes });
        } finally {
          this.applyingRemotePatch = false;
        }
      }),
    );

    const state = EditorState.create({
      doc: session.getPlainText(),
      extensions: [
        basicSetup,
        history(),
        markdown(),  // markdown highlight support

        this.interactionCompartment.of([
          EditorState.readOnly.of(this.isReadOnly()),  // to prevent any extensions from making changes
          EditorView.editable.of(!this.isReadOnly()),  // to make the editor non-editable
        ]),
        this.themeCompartment.of(this.theme().extensions),
        this.extrasCompartment.of(this.extraExtensions()),
        this.ariaCompartment.of(
          EditorView.contentAttributes.of({
            'aria-label': this.ariaLabel(),
          }),
        ),

        // registering a function codemirror calls whenever the editor content changes
        // ViewUpdate object provides details about the change
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (!update.docChanged) {
            return;
          }

          if (this.applyingRemotePatch || !this.session()) {
            return;
          }

          const changes: MarkdownTextChange[] = [];  // delta format expected by Yjs
          let offset = 0;

          // translating codemirror changes to Yjs delta format
          update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
            const from = fromA + offset;
            const to = toA + offset;
            const insert = inserted.toString();

            changes.push({ from, to, insert });
            offset += insert.length - (toA - fromA);
          });

          // updating Yjs state
          this.session()?.applyLocalChanges(changes);
        }),

        EditorView.theme({
          '&': {
            width: '100%',
            height: '100%',
          },
          '.cm-editor': {
            height: '100%',
            backgroundColor: 'transparent',
          },
          '.cm-scroller': {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
          '.cm-focused': {
            outline: 'none',
          },
        }),
      ],
    });

    // initializing codemirror editor
    const view = new EditorView({
      state,
      parent: this.editorHost().nativeElement,
    });

    this.view.set(view);
  }

  ngOnDestroy(): void {
    this.cleanupSession();
    this.view()?.destroy();
    this.view.set(null);
  }

  applyRemoteUpdate(update: Uint8Array): void {
    this.session()?.applyRemoteUpdate(update);
  }

  applyPlainTextSnapshot(value: string): void {
    this.session()?.applyRemotePlainTextSnapshot(value);
  }

  getStateVector(): Uint8Array | null {
    return this.session()?.getStateVector() ?? null;
  }

  getSnapshot(stateVector?: Uint8Array): Uint8Array | null {
    return this.session()?.getSnapshot(stateVector) ?? null;
  }

  dispatch(spec: TransactionSpec): void {
    this.view()?.dispatch(spec);
  }

  focus(): void {
    this.view()?.focus();
  }

  getContent(): string {
    return this.session()?.getPlainText() ?? this.doc();
  }

  // TODO: a bit skeptical about this one
  setContent(value: string): void {
    const view = this.view();

    if (!view) {
      // before mount, keep local state in sync
      this.doc.set(value);
      this.session()?.applyLocalReplaceAll(value); // local, so it can be broadcast once mounted
      return;
    }

    const current = view.state.doc.toString();
    if (current === value) {
      return;
    }

    // Let CodeMirror produce the change.
    // Your updateListener will convert it into a local Yjs update.
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }

  // change selected text from outside
  replaceSelection(text: string): void {
    const view = this.view();
    if (!view) {
      return;
    }

    const selection = view.state.selection.main;
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: text,
      },
      selection: { anchor: selection.from + text.length },
    });
  }

  insertCodeBlock(language = ''): void {
    const view = this.view();
    if (!view) {
      return;
    }

    const selection = view.state.selection.main;
    const selectedText = view.state.sliceDoc(selection.from, selection.to);

    const opener = language ? `\`\`\`${language}\n` : '```\n';
    const insert = `${opener}${selectedText}\n\`\`\``;

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert,
      },
      selection: {
        anchor: selection.from + opener.length,
      },
    });
  }

  setMode(next: MarkdownEditorMode): void {
    if (this.activeMode() === next) {
      return;
    }

    this.activeMode.set(next);
    this.modeChange.emit(next);
  }

  toggleMode(): void {
    this.setMode(this.activeMode() === 'source' ? 'preview' : 'source');
  }

  private isReadOnly(): boolean {
    return this.readonly() || this.activeMode() === 'preview';
  }

  private cleanupSession(): void {
    for (const dispose of this.sessionCleanup) {
      dispose();
    }
    this.sessionCleanup = [];

    this.remoteUpdatesSubscription?.unsubscribe();
    this.remoteUpdatesSubscription = null;

    this.session()?.destroy();
    this.session.set(null);
  }
}

let editorInstanceCounter = 0;