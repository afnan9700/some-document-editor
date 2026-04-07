import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-markdown-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-h-0 w-full',
  },
  template: `
    <article class="prose prose-base max-w-none h-full min-h-0 overflow-auto p-4">
      <div [innerHTML]="html()"></div>
    </article>
  `,
})
export class MarkdownPreviewComponent {
  readonly html = input.required<SafeHtml>();
}
