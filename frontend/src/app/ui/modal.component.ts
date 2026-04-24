import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      class="modal"
      [class.modal-open]="isOpen()"
      [attr.open]="isOpen() ? '' : null"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
    >
      <div class="modal-box">
        <h3 class="mb-4 text-lg font-bold">{{ title() }}</h3>

        <div class="py-2">
          <ng-content />
        </div>

        <div class="modal-action">
          <ng-content select="[modal-actions]" />
        </div>
      </div>

      <button
        type="button"
        tabindex="-1"
        class="modal-backdrop"
        aria-hidden="true"
        (click)="close.emit()"
      ></button>
    </dialog>
  `,
})
export class ModalComponent {
  isOpen = input.required<boolean>();
  title = input.required<string>();

  close = output<void>();
}