// markdown-editor.types.ts
import type { Extension, TransactionSpec } from '@codemirror/state';
import { Marked } from 'marked';

export interface MarkdownRendererExtension {
  apply(marked: Marked): void;
}

export type MarkdownEditorMode = 'source' | 'preview';

export interface MarkdownEditorTheme {
  extensions: Extension[];
}

// will be provided by the markdown editor to the toolbar actions
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
  id: string;  // a unique id for the action
  label: string;  // label that gets displayed 
  title?: string;  // title that gets displayed on hover
  icon?: string;  
  variant?: 'primary' | 'secondary' | 'ghost' | 'neutral';  
  visible?: boolean | ((ctx: MarkdownToolbarContext) => boolean);  
  disabled?: boolean | ((ctx: MarkdownToolbarContext) => boolean); 
  run: (ctx: MarkdownToolbarContext) => void;  // function that gets called when the button is clicked
}