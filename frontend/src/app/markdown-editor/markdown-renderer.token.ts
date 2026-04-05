// markdown-renderer.token.ts
import { InjectionToken } from '@angular/core';

export interface MarkdownRenderer {
  render(markdown: string): string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('>', '&gt;');
}

export const MARKDOWN_RENDERER = new InjectionToken<MarkdownRenderer>(
  'MARKDOWN_RENDERER',
  {
    providedIn: 'root',
    factory: () => ({
      render: (markdown: string) => `
        <div class="p-4 text-base-content">
          <pre class="whitespace-pre-wrap font-mono text-sm">${escapeHtml(markdown)}</pre>
        </div>
      `,
    }),
  },
);