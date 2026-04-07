// markdown-renderer.service.ts
import { Inject, Injectable, inject } from '@angular/core';
import { Marked } from 'marked';
import {
  MARKDOWN_RENDERER_EXTENSIONS,
} from './markdown-renderer.extensions';
import { MarkdownRendererExtension } from '../markdown-editor.types';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

@Injectable({ providedIn: 'root' })
export class MarkdownRendererService {
  private readonly marked = new Marked({
    gfm: true,
  });

  private readonly sanitizer = inject(DomSanitizer);

  constructor(
    @Inject(MARKDOWN_RENDERER_EXTENSIONS)
    extensions: readonly MarkdownRendererExtension[],
  ) {
    for (const extension of extensions) {
      extension.apply(this.marked);
    }
  }

  render(markdown: string): SafeHtml {
    const rawHtml = this.marked.parse(markdown ?? '') as string;
    const cleanedHtml = DOMPurify.sanitize(rawHtml);
    return this.sanitizer.bypassSecurityTrustHtml(cleanedHtml);
  }

  renderInline(markdown: string): SafeHtml {
    const rawHtml = this.marked.parseInline(markdown ?? '') as string;
    const cleanedHtml = DOMPurify.sanitize(rawHtml);
    return this.sanitizer.bypassSecurityTrustHtml(cleanedHtml);
  }
}
