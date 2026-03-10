import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StatusBadgeComponent, DocStatus } from './status-badge.component';

@Component({
  selector: 'app-document-card',
  imports: [DatePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      (click)="openDoc.emit(id())"  
      role="article"
      tabindex="0"
      (keydown.enter)="openDoc.emit(id())">
      
      <div class="card-body p-5">
        <div class="flex justify-between items-start mb-2 gap-2">
          <h3 class="card-title text-lg truncate" [title]="title()">{{ title() }}</h3>
          <app-status-badge [status]="status()" />
        </div>
        
        <p class="text-sm text-base-content/70">
          Edited: {{ lastModified() | date:'mediumDate' }}
        </p>
        <p class="text-xs text-base-content/50 mt-1">
          Owner: {{ ownerName() }}
        </p>

        <div class="card-actions justify-end mt-4">
          <button 
            class="btn btn-ghost btn-sm" 
            aria-label="Manage sharing for this document"
            (click)="$event.stopPropagation(); shareDoc.emit(id())">
            Share
          </button>
          
          @if (status() === 'owned') {
            <button 
              class="btn btn-ghost btn-sm text-error" 
              aria-label="Delete this document"
              (click)="$event.stopPropagation(); deleteDoc.emit(id())">
              Delete
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class DocumentCardComponent {
  // Data inputs
  id = input.required<string>();
  title = input.required<string>();
  lastModified = input.required<string | number>(); 
  ownerName = input.required<string>();
  status = input.required<DocStatus>();

  // Event outputs
  openDoc = output<string>();
  shareDoc = output<string>();
  deleteDoc = output<string>();
}