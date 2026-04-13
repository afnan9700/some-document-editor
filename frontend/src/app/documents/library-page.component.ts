import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { DocumentService } from './document.service';
import { DocumentCardComponent } from '../ui/document-card.component';
import { ModalComponent } from '../ui/modal.component'; // Path varies based on your structure
import type { DocPermission, DocumentSummary, DocumentLockDto } from './document.models';
import type { DocStatus } from '../ui/status-badge.component';

@Component({
  selector: 'app-library-page',
  // standalone: true is natively omitted
  imports: [DocumentCardComponent, ModalComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Library</h1>
          <p class="text-base-content/70 mt-1">Manage and access your documents.</p>
        </div>
        
        <button 
          class="btn btn-primary" 
          aria-label="Create a new document"
          (click)="openCreateModal()">  
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          New Document
        </button>
      </div>

      @if (isLoading()) {
        <div class="flex-1 flex justify-center items-center">
          <span class="loading loading-spinner loading-lg text-primary" aria-label="Loading documents"></span>
        </div>
      }

      @if (!isLoading() && docService.documents().length > 0) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (doc of docService.documents(); track doc.documentId) {
            <app-document-card
              [id]="doc.documentId.toString()"
              [title]="doc.title"
              [lastModified]="doc.lastModified"
              [ownerName]="doc.ownerUsername"
              [status]="mapPermissionToStatus(doc.myPermission)"
              (openDoc)="handleOpenDocument($event)"
              (shareDoc)="handleShareDocument($event)"
              (deleteDoc)="handleDeleteDocument($event)"
            />
          }
        </div>
      }

      @if (!isLoading() && docService.documents().length === 0) {
        <div class="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-base-300 rounded-box">
          <div class="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h2 class="text-xl font-semibold mb-2">No documents yet</h2>
          <p class="text-base-content/70 max-w-sm mb-6">You haven't created or been invited to any documents. Create your first one to get started.</p>
          <button class="btn btn-outline" (click)="openCreateModal()">Create Document</button>
        </div>
      }
    </div>

    <app-modal 
      [isOpen]="isCreateModalOpen()" 
      title="Create New Document"
      (close)="closeCreateModal()">
      
      <form [formGroup]="createForm" id="create-doc-form" (ngSubmit)="submitCreateDocument()">
        <label class="form-control w-full mb-4">
          <div class="label"><span class="label-text font-medium">Document Title</span></div>
          <input 
            type="text" 
            formControlName="title"
            placeholder="e.g., Project Specifications" 
            class="input input-bordered w-full"
            [class.input-error]="createForm.controls.title.invalid && createForm.controls.title.touched"
            autofocus
          />
        </label>
      </form>

      <div modal-actions class="flex gap-2">
        <button 
          type="submit" 
          form="create-doc-form" 
          class="btn btn-primary" 
          [disabled]="createForm.invalid || isCreating()">
          @if (isCreating()) {
            <span class="loading loading-spinner loading-sm"></span>
            Creating...
          } @else {
            Create & Open
          }
        </button>
      </div>
    </app-modal>
  `
})
export class LibraryPageComponent implements OnInit {
  // We make docService public here purely so the template can read its signals.
  public docService = inject(DocumentService);
  private router = inject(Router);
  private fb = inject(NonNullableFormBuilder);

  // Local UI State Signals
  readonly isLoading = signal<boolean>(true);  // Starts as true since we load documents on init
  readonly isCreateModalOpen = signal<boolean>(false);  // to open and close the create document modal
  readonly isCreating = signal<boolean>(false);  // loading state for document creation process

  // form for new document creation
  // to be used in the create document modal 
  readonly createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]]
  });

  // On component initialization, we load the user's document library
  ngOnInit(): void {
    this.fetchDocuments();
  }
  
  private fetchDocuments(): void {
    this.isLoading.set(true);
    
    // updating the library document list state
    this.docService.loadLibrary().subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        // Error handling (e.g., showing a toast notification) goes here
      }
    });
  }
  
  mapPermissionToStatus(permission: DocPermission): DocStatus {
    if (permission === 'OWNER') return 'owned';
    // If they are an EDITOR or VIEWER, it is a shared document.
    return 'shared'; 
  }

  // --- Modal & Creation Logic ---

  openCreateModal(): void {
    this.createForm.reset();  // Clear form state each time we open the modal
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreateDocument(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);
    
    // We send an empty string for content initially
    const payload = {
      title: this.createForm.getRawValue().title,
      content: '' 
    };

    this.docService.createDocument(payload).subscribe({
      next: (newDoc: DocumentSummary) => {
        this.isCreating.set(false);
        this.closeCreateModal();
        // Immediately navigate the user to the editor workspace for their new document
        // this.router.navigate(['/editor', newDoc.documentId]);
      },
      error: (err) => {
        this.isCreating.set(false);
        console.error('Document creation failed', err);
      }
    });
  }

  // --- Card Action Handlers ---

  handleOpenDocument(id: string): void {
    this.router.navigate(['/documents', id]);
  }

  handleShareDocument(id: string): void {
    // We will hook this up to a sharing modal in the future
    // console.log('Initiate share flow for doc:', id);
  }

  handleDeleteDocument(id: string): void {
    // We will hook this up to a deletion confirmation modal and service call
    // console.log('Initiate delete flow for doc:', id);
  }
}