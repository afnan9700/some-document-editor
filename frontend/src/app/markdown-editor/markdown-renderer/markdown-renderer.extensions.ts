// markdown-renderer.extensions.ts
import { InjectionToken, Provider } from '@angular/core';
import { Marked, Tokens } from 'marked';
import { MarkdownRendererExtension } from '../markdown-editor.types';

export const MARKDOWN_RENDERER_EXTENSIONS =
  new InjectionToken<readonly MarkdownRendererExtension[]>(
    'MARKDOWN_RENDERER_EXTENSIONS',
    {
      providedIn: 'root',
      factory: () => [],
    },
  );

export function provideMarkdownRendererExtensions(
  ...extensions: MarkdownRendererExtension[]
): Provider[] {
  return extensions.map((extension) => ({
    provide: MARKDOWN_RENDERER_EXTENSIONS,
    useValue: extension,
    multi: true,
  }));
}

interface CustomImageToken {
  type: 'customImage';
  raw: string;
  url: string;
  alt: string;
  scale: number;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function createCustomImageExtension(): MarkdownRendererExtension {
  return {
    apply(marked: Marked): void {
      marked.use({
        extensions: [
          {
            name: 'customImage',
            level: 'inline',
            start(src: string): number {
              return src.indexOf('![[');
            },
            tokenizer(src: string): CustomImageToken | undefined {
              const match =
                /^!\[\[([^|\]]+)\|([^|\]]+)\|([0-9]+(?:\.[0-9]+)?)\]\]/.exec(
                  src,
                );

              if (!match) {
                return undefined;
              }

              const [, url, alt, scaleRaw] = match;
              const scale = Number(scaleRaw);

              if (!Number.isFinite(scale) || scale <= 0) {
                return undefined;
              }

              return {
                type: 'customImage',
                raw: match[0],
                url: url.trim(),
                alt: alt.trim(),
                scale,
              };
            },
            
            renderer(genericToken: Tokens.Generic): string {
              const token = genericToken as unknown as CustomImageToken;
              
              const src = escapeHtmlAttr(token.url);
              const alt = escapeHtmlAttr(token.alt);

              return `<img src="${src}" alt="${alt}" loading="lazy" style="width:${token.scale * 100}%;height:auto;" />`;
            },
          },
        ],
      });
    },
  };
}
