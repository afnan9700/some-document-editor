// markdown-toolbar.actions.ts
import { MarkdownToolbarAction } from './markdown-editor.types';

export interface MarkdownToolbarActionOptions {
  codeBlockLanguage?: string;
}

export function createMarkdownToolbarActions(
  options: MarkdownToolbarActionOptions = {},
): MarkdownToolbarAction[] {
  const codeBlockLanguage = options.codeBlockLanguage?.trim() ?? '';

  return [
    {
      id: 'toggle-source-preview',
      label: 'Mode',
      title: 'Switch between source and preview',
      variant: 'secondary',
      run: (ctx) => ctx.toggleMode(),
    },
    {
      id: 'insert-code-block',
      label: 'Code block',
      title: 'Insert a fenced code block',
      variant: 'ghost',
      run: (ctx) => ctx.insertCodeBlock(codeBlockLanguage),
    },
    {
      id: 'insert-inline-code',
      label: 'Inline code',
      title: 'Insert inline code',
      variant: 'ghost',
      run: (ctx) => ctx.replaceSelection('`code`'),
    },
  ];
}