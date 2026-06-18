// markdown-toolbar.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { MarkdownToolbarAction, MarkdownToolbarContext } from '../markdown-editor.types';

@Component({
  selector: 'app-markdown-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  template: `
    <div class="join flex-wrap gap-2" role="toolbar" aria-label="Markdown toolbar">
      @for (action of actions(); track action.id) {
        @if (isVisible(action)) {
          <button
            type="button"
            class="btn btn-sm join-item"
            [class.btn-primary]="action.variant === 'primary'"
            [class.btn-secondary]="action.variant === 'secondary'"
            [class.btn-ghost]="!action.variant || action.variant === 'ghost'"
            [class.btn-neutral]="action.variant === 'neutral'"
            [disabled]="isDisabled(action)"
            [attr.title]="action.title || action.label"
            (click)="run(action)"
          >
            @if (action.icon) {
              <span aria-hidden="true">{{ action.icon }}</span>
            }
            <span>{{ action.label }}</span>
          </button>
        }
      }
    </div>
  `,
})
export class MarkdownToolbarComponent {
  readonly actions = input<MarkdownToolbarAction[]>([]);
  readonly context = input.required<MarkdownToolbarContext>();

  isVisible(action: MarkdownToolbarAction): boolean {
    const ctx = this.context();
    return typeof action.visible === 'function'
      ? action.visible(ctx)
      : action.visible !== false;
  } 

  isDisabled(action: MarkdownToolbarAction): boolean {
    const ctx = this.context();
    return typeof action.disabled === 'function'
      ? action.disabled(ctx)
      : action.disabled === true;
  }

  run(action: MarkdownToolbarAction): void {
    action.run(this.context());
  }
}