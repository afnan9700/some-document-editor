import { Component, signal } from '@angular/core';
import { EditorView } from '@codemirror/view';

import { MarkdownEditorPageComponent } from './markdown-editor-page.component';
import { createMarkdownToolbarActions } from './markdown-toolbar.actions';
import { MarkdownEditorMode } from './markdown-editor.types';

@Component({
  selector: 'app-document-editor-page',
  imports: [MarkdownEditorPageComponent],
  template: `
    <app-markdown-editor-page
      [content]="doc()"
      [mode]="mode()"
      [readonly]="isReadonly()"
      [theme]="editorTheme"
      [toolbarActions]="toolbarActions"
      ariaLabel="Document editor"
      (contentChange)="doc.set($event)"
      (modeChange)="mode.set($event)"
    >
      <div page-sidebar class="card h-full border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-base">Chat</h2>
          <p class="text-sm opacity-70">Drop your assistant UI here later.</p>
        </div>
      </div>
    </app-markdown-editor-page>
  `,
})
export class DocumentEditorPageComponent {
  readonly doc = signal('# Hello\n\nWrite **markdown** here.');
  readonly mode = signal<MarkdownEditorMode>('source');
  readonly isReadonly = signal(false);

  readonly editorTheme = {
    extensions: [
      EditorView.theme({
        '&': {
          fontSize: '14px',
        },
      }),
    ],
  };

  readonly toolbarActions = createMarkdownToolbarActions({
    codeBlockLanguage: 'ts',
  });
}