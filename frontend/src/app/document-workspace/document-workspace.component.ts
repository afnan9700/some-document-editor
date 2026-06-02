// document-workspace/document-workspace.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { MarkdownEditorComponent } from '../markdown-editor/markdown-editor.component';
import {
  MarkdownEditorMode,
  MarkdownEditorTheme,
  MarkdownToolbarAction,
} from '../markdown-editor/markdown-editor.types';
import { DocPermission } from '../documents/document.models';
import { createMarkdownToolbarActions } from '../markdown-editor/markdown-editor-toolbar/markdown-editor-toolbar.actions';

@Component({
  selector: 'app-document-workspace',
  imports: [MarkdownEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-h-0 w-full',
  },
  template: `
    <div class="flex h-full min-h-0 w-full justify-center">
      <section class="grid h-full min-h-0 w-full max-w-screen-2xl gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="flex min-h-0 flex-col gap-2">
          <div class="flex flex-row items-center justify-between gap-4 border-b border-base-300 px-1 pb-2 pt-1">
            <div class="flex min-w-0 items-center gap-3">
              <h1 class="truncate text-lg font-medium text-base-content">
                {{ title() }}
              </h1>

              <div class="h-4 w-px bg-base-300" aria-hidden="true"></div>

              <div class="flex items-center gap-2 text-xs font-medium text-base-content/50">
                <span class="uppercase tracking-wider">{{ permission() }}</span>

                <span aria-hidden="true">•</span>

                @if (dirty()) {
                  <span class="flex items-center gap-1.5 text-base-content/80">
                    <span class="relative flex h-1.5 w-1.5">
                      <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75"></span>
                      <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning"></span>
                    </span>
                    Unsaved
                  </span>
                } @else {
                  <span>Saved</span>
                }

                @if (saveError()) {
                  <span aria-hidden="true">•</span>
                  <span class="max-w-[200px] truncate text-error" [title]="saveError()">
                    {{ saveError() }}
                  </span>
                }
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <button
                type="button"
                class="btn btn-ghost btn-sm text-primary hover:bg-primary/10"
                [disabled]="readonly() || saving() || !dirty()"
                (click)="saveRequested.emit()"
              >
                @if (saving()) {
                  <span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
                }
                <span>Save</span>
              </button>
            </div>
          </div>

          <app-markdown-editor
            class="min-h-0 flex-1"
            [content]="content()"
            [readonly]="readonly()"
            [mode]="mode()"
            [theme]="resolvedTheme()"
            [toolbarActions]="resolvedToolbarActions()"
            [extraExtensions]="extraExtensions()"
            [ariaLabel]="ariaLabel()"
            (contentChange)="contentChange.emit($event)"
            (modeChange)="modeChange.emit($event)"
          />
        </div>

        <aside class="min-h-0">
          <div class="card h-full min-h-0 border border-base-300 bg-base-100 shadow-sm">
            <div class="card-body min-h-0">
              <ng-content select="[page-sidebar]"></ng-content>
            </div>
          </div>
        </aside>
      </section>
    </div>
  `,
})
export class DocumentWorkspaceComponent {
  // values provided by the parent page component
  readonly title = input('Untitled document');
  readonly content = input('');
  readonly mode = input<MarkdownEditorMode>('source');
  readonly readonly = input(false);
  readonly saving = input(false);
  readonly dirty = input(false);
  readonly saveError = input<string | null>(null);
  readonly permission = input<DocPermission>('VIEWER');
  readonly ariaLabel = input('Document editor');

  // optional configs that can be set by the parent page component
  readonly toolbarActions = input<MarkdownToolbarAction[] | null>(null);
  readonly theme = input<MarkdownEditorTheme | null>(null);
  readonly extraExtensions = input<Extension[]>([]);
  
  // forwarding events from the child component to the parent page component
  readonly contentChange = output<string>();
  readonly modeChange = output<MarkdownEditorMode>();
  readonly saveRequested = output<void>();

  // default config values
  readonly resolvedToolbarActions = computed(
    () => this.toolbarActions() ?? createMarkdownToolbarActions({ codeBlockLanguage: '' }),
  );

  readonly resolvedTheme = computed<MarkdownEditorTheme>(
    () =>
      this.theme() ?? {
        extensions: [
          EditorView.theme({
            '&': {
              fontSize: '14px',
            },
          }),
        ],
      },
  );
}