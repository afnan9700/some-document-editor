// markdown-renderer.service.ts
import { Injectable } from '@angular/core';
import { marked } from 'marked';

@Injectable({ providedIn: 'root' })
export class MarkdownRendererService {
  render(markdown: string): string {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
    return String(marked.parse(markdown ?? ''));
  }
}