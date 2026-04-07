// markdown-editor-page.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MarkdownEditorComponent } from '../markdown-editor/markdown-editor.component';
import { MarkdownEditorMode, MarkdownEditorTheme, MarkdownToolbarAction } from '../markdown-editor/markdown-editor.types';

@Component({
  selector: 'app-document-editor-workspace',
  imports: [MarkdownEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-h-0 w-full',
  },
  template: `
    <div class="flex h-full min-h-0 w-full justify-center">
      <section class="grid h-full min-h-0 w-full max-w-screen-2xl gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="flex min-h-0 flex-col">
          <app-markdown-editor
            class="h-full min-h-0"
            [content]="content()"
            [readonly]="readonly()"
            [mode]="mode()"
            [theme]="theme()"
            [extraExtensions]="extraExtensions()"
            [toolbarActions]="toolbarActions()"
            [ariaLabel]="ariaLabel()"
            (contentChange)="contentChange.emit($event)"
            (modeChange)="modeChange.emit($event)"
          />
        </div>

        <aside class="hidden min-h-0 xl:block">
          <div class="sticky top-0 h-[calc(100dvh-8rem)] min-h-0">
            <ng-content select="[page-sidebar]"></ng-content>
          </div>
        </aside>
      </section>
    </div>
  `,
})
export class DocumentEditorWorkspaceComponent {
  readonly content = input('');
  readonly readonly = input(false);
  readonly mode = input<MarkdownEditorMode>('source');
  readonly theme = input<MarkdownEditorTheme>({ extensions: [] });
  readonly extraExtensions = input([]);
  readonly toolbarActions = input<MarkdownToolbarAction[]>([]);
  readonly ariaLabel = input('Markdown editor page');

  readonly contentChange = output<string>();
  readonly modeChange = output<MarkdownEditorMode>();
}