// markdown-editor.component.ts
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { basicSetup } from 'codemirror';
import { Compartment, EditorState, type Extension, type TransactionSpec } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import { history, redo, undo } from '@codemirror/commands';
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

@Component({
  selector: 'app-markdown-editor',
  imports: [MarkdownPreviewComponent, MarkdownToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-h-0 w-full',
  },
  template: `
    <div class="card h-full min-h-0 border border-base-300 bg-base-100 shadow-sm">
      <div class="card-body flex h-full min-h-0 flex-col gap-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3"> <!-- toolbar area -->
          <div class="tabs tabs-box" role="tablist" aria-label="Editor mode">  <!-- preview tab group -->
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
export class MarkdownEditorComponent implements AfterViewInit {
  readonly content = input('');
  readonly readonly = input(false);
  readonly mode = input<MarkdownEditorMode>('source');
  readonly theme = input<MarkdownEditorTheme>({ extensions: [] });
  readonly extraExtensions = input<Extension[]>([]);
  readonly toolbarActions = input<MarkdownToolbarAction[]>(createMarkdownToolbarActions());
  readonly ariaLabel = input('Markdown editor');

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
  readonly modeChange = output<MarkdownEditorMode>();

  readonly activeMode = signal<MarkdownEditorMode>('source'); 
  readonly doc = signal('');  // main source of truth for editor content
  readonly previewHtml = computed(() => this.renderer.render(this.doc()));

  readonly editorPanelId = `markdown-editor-panel-${++editorInstanceCounter}`;
  readonly previewPanelId = `markdown-preview-panel-${editorInstanceCounter}`;

  private readonly renderer = inject(MarkdownRendererService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private readonly view = signal<EditorView | null>(null);

  private readonly interactionCompartment = new Compartment();
  private readonly extrasCompartment = new Compartment();
  private readonly ariaCompartment = new Compartment();

  constructor() {
    // mode change effect
    effect(() => {
      this.activeMode.set(this.mode());
    });

    // content change effect
    // for content changes from outside the editor 
    effect(() => {
      const next = this.content();
      this.doc.set(next);  // update doc signal

      const view = this.view();
      if (!view) {
        return;
      }

      const current = view.state.doc.toString();
      if (current === next) {
        return;
      }

      view.dispatch({
        changes: { from: 0, to: current.length, insert: next },
      });  // update codemirror internal state
    });
    
    // view readonly change effect
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

    // view extra extensions change effect
    effect(() => {
      const view = this.view();
      if (!view) {
        return;
      }

      view.dispatch({
        effects: this.extrasCompartment.reconfigure(this.extraExtensions()),
      });
    });

    // view aria label change effect
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

    // on destroy cleanup codemirror view
    this.destroyRef.onDestroy(() => {
      this.view()?.destroy();  // destroy codemirror view
      this.view.set(null);  // clear view signal
    });
  }

  ngAfterViewInit(): void {
    const state = EditorState.create({
      doc: this.content(),
      extensions: [
        basicSetup,
        history(),  // history for undo/redo
        markdown(),  // markdown support


        this.interactionCompartment.of([
          EditorState.readOnly.of(this.isReadOnly()),  // for any extensions that implement editing functionality
          EditorView.editable.of(!this.isReadOnly()),  // for editor content dom
        ]),
        this.extrasCompartment.of(this.extraExtensions()),
        this.ariaCompartment.of(
          EditorView.contentAttributes.of({
            'aria-label': this.ariaLabel(),
          }),
        ),

        // update doc signal and emit content change event upon codemirror view updates
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (!update.docChanged) {
            return;
          }

          const value = update.state.doc.toString();
          this.doc.set(value);
          this.contentChange.emit(value);
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

  dispatch(spec: TransactionSpec): void {
    this.view()?.dispatch(spec);
  }

  private isReadOnly(): boolean {
    return this.readonly() || this.activeMode() === 'preview';
  }

  focus(): void {
    this.view()?.focus();
  }

  setMode(next: MarkdownEditorMode): void {
    if (this.activeMode() === next) {
      return;
    }

    this.activeMode.set(next);
    this.modeChange.emit(next);
  }

  // source/preview mode toggle
  toggleMode(): void {
    this.setMode(this.activeMode() === 'source' ? 'preview' : 'source');
  }

  getContent(): string {
    return this.view()?.state.doc.toString() ?? this.doc();
  }

  // change editor content from outside
  setContent(value: string): void {
    this.doc.set(value);
    this.contentChange.emit(value);

    const view = this.view();
    if (!view) {
      return;
    }

    const current = view.state.doc.toString();
    if (current === value) {
      return;
    }

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
  
}

let editorInstanceCounter = 0;