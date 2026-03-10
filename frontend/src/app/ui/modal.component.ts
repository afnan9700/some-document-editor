// src/app/ui/modal.component.ts

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog class="modal" [class.modal-open]="isOpen()" aria-modal="true">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ title() }}</h3>
        
        <div class="py-2">
          <ng-content></ng-content> <!-- Modal body content is provided by the parent component -->
        </div>
        
        <div class="modal-action">
          <button class="btn btn-ghost" (click)="close.emit()">Cancel</button>
          
          <ng-content select="[modal-actions]"></ng-content> <!-- Modal action buttons provided by the parent component -->
        </div>
      </div>
      
      <div class="modal-backdrop bg-neutral/40" (click)="close.emit()"></div>
    </dialog>
  `
})
export class ModalComponent {
  isOpen = input.required<boolean>();
  title = input.required<string>();
  
  close = output<void>();  // Signal output to notify parent component when modal should be closed
}