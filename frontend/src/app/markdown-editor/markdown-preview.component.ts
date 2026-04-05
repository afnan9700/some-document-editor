import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-markdown-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-h-0 w-full overflow-auto',
  },
  template: `
    <article class="prose prose-base max-w-none p-4 prose-pre:rounded-box prose-code:rounded-md">
      <div [innerHTML]="html()"></div>
    </article>
  `,
})
export class MarkdownPreviewComponent {
  readonly html = input.required<string>();
}