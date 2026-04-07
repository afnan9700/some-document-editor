// markdown-toolbar.actions.ts
import { MarkdownToolbarAction } from '../markdown-editor.types';

export interface MarkdownToolbarActionOptions {
  codeBlockLanguage?: string;
}

export function createMarkdownToolbarActions(
  options: MarkdownToolbarActionOptions = {},
): MarkdownToolbarAction[] {
  const codeBlockLanguage = options.codeBlockLanguage?.trim() ?? '';

  return [
    {
      id: 'insert-code-block',
      label: 'Code block {}',
      title: 'Insert a fenced code block',
      variant: 'ghost',
      run: (ctx) => ctx.insertCodeBlock(codeBlockLanguage),
    },
  ];
}