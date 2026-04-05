// markdown-editor.types.ts
import type { Extension, TransactionSpec } from '@codemirror/state';

export type MarkdownEditorMode = 'source' | 'preview';

export interface MarkdownEditorTheme {
  extensions: Extension[];
}

export interface MarkdownToolbarContext {
  getContent(): string;
  setContent(value: string): void;
  focus(): void;
  toggleMode(): void;
  replaceSelection(text: string): void;
  insertCodeBlock(language?: string): void;
  dispatch(spec: TransactionSpec): void;
  readonly: boolean;
  mode: MarkdownEditorMode;
}

export interface MarkdownToolbarAction {
  id: string;
  label: string;
  title?: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'neutral';
  visible?: boolean | ((ctx: MarkdownToolbarContext) => boolean);
  disabled?: boolean | ((ctx: MarkdownToolbarContext) => boolean);
  run: (ctx: MarkdownToolbarContext) => void;
}