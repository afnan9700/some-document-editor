import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DocumentService } from './document.service';
import { DocumentCardComponent } from '../ui/document-card.component';
import { ModalComponent } from '../ui/modal.component';
import { InviteLinkModalComponent } from '../document-sharing/invite-link-modal.component';
import type { DocPermission, DocumentSummary } from './document.models';
import type { DocStatus } from '../ui/status-badge.component';

@Component({
  selector: 'app-library-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocumentCardComponent, ModalComponent, InviteLinkModalComponent, ReactiveFormsModule],
  template: `
    <div class="flex h-full flex-col">
      <div class="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Library</h1>
          <p class="mt-1 text-base-content/70">Manage and access your documents.</p>
        </div>

        <button
          type="button"
          class="btn btn-primary"
          aria-label="Create a new document"
          (click)="openCreateModal()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New document
        </button>
      </div>

      @if (isLoading()) {
        <div class="flex flex-1 items-center justify-center">
          <span class="loading loading-spinner loading-lg" aria-label="Loading documents"></span>
        </div>
      } @else if (documents().length > 0) {
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          @for (doc of documents(); track doc.documentId) {
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
      } @else {
        <div class="flex flex-1 flex-col items-center justify-center rounded-box border-2 border-dashed border-base-300 p-8 text-center">
          <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h2 class="mb-2 text-xl font-semibold">No documents yet</h2>
          <p class="mb-6 max-w-sm text-base-content/70">
            You have not created or been invited to any documents yet.
          </p>

          <button type="button" class="btn btn-outline" (click)="openCreateModal()">
            Create document
          </button>
        </div>
      }
    </div>

    <app-modal
      [isOpen]="isCreateModalOpen()"
      title="Create new document"
      (close)="closeCreateModal()"
    >
      <form id="create-doc-form" [formGroup]="createForm" (ngSubmit)="submitCreateDocument()">
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text font-medium">Document title</span>
          </div>
          <input
            type="text"
            formControlName="title"
            placeholder="e.g. Project specifications"
            class="input input-bordered w-full"
            [class.input-error]="createForm.controls.title.invalid && createForm.controls.title.touched"
            autofocus
          />
          @if (createForm.controls.title.invalid && createForm.controls.title.touched) {
            <div class="label">
              <span class="label-text-alt text-error">
                Title is required and must be 100 characters or fewer.
              </span>
            </div>
          }
        </label>
      </form>

      <div modal-actions class="flex gap-2">
        <button type="button" class="btn btn-ghost" (click)="closeCreateModal()">
          Cancel
        </button>

        <button
          type="submit"
          form="create-doc-form"
          class="btn btn-primary"
          [disabled]="createForm.invalid || isCreating()"
        >
          @if (isCreating()) {
            <span class="loading loading-spinner loading-sm"></span>
            Creating...
          } @else {
            Create & open
          }
        </button>
      </div>
    </app-modal>

    <app-modal
      [isOpen]="isDeleteModalOpen()"
      title="Delete document"
      (close)="closeDeleteModal()"
    >
      <p class="py-2">
        Are you sure you want to delete
        <span class="font-semibold">
          "{{ selectedDeleteDocumentTitle() }}"
        </span>
        ? This action cannot be undone.
      </p>

      <div modal-actions class="flex gap-2">
        <button
          type="button"
          class="btn btn-ghost"
          (click)="closeDeleteModal()"
          [disabled]="isDeleting()"
        >
          Cancel
        </button>

        <button
          type="button"
          class="btn btn-error"
          (click)="confirmDeleteDocument()"
          [disabled]="isDeleting() || selectedDeleteDocumentId() === null"
        >
          @if (isDeleting()) {
            <span class="loading loading-spinner loading-sm"></span>
            Deleting...
          } @else {
            Yes, delete
          }
        </button>
      </div>
    </app-modal>

    <app-invite-link-modal
      [isOpen]="isShareModalOpen()"
      [documentId]="selectedShareDocumentId()"
      [documentTitle]="selectedShareDocumentTitle()"
      (close)="closeShareModal()"
    />
  `,
})
export class LibraryPageComponent implements OnInit {
  readonly docService = inject(DocumentService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly isCreateModalOpen = signal(false);
  readonly isCreating = signal(false);

  readonly isShareModalOpen = signal(false);
  readonly selectedShareDocumentId = signal<number | null>(null);

  readonly isDeleteModalOpen = signal(false);
  readonly isDeleting = signal(false);
  readonly selectedDeleteDocumentId = signal<number | null>(null);

  readonly documents = computed(() => this.docService.documents());

  readonly selectedShareDocumentTitle = computed(() => {
    const id = this.selectedShareDocumentId();
    const doc = this.documents().find((item) => item.documentId === id);
    return doc?.title ?? '';
  });

  readonly selectedDeleteDocumentTitle = computed(() => {
    const id = this.selectedDeleteDocumentId();
    const doc = this.documents().find((item) => item.documentId === id);
    return doc?.title ?? 'this document';
  });

  readonly createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    this.fetchDocuments();
  }

  private fetchDocuments(): void {
    this.isLoading.set(true);

    this.docService
      .loadLibrary()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  mapPermissionToStatus(permission: DocPermission): DocStatus {
    if (permission == 'OWNER') 
      return 'owned';
    else if (permission == 'EDITOR')
      return 'shared: Editable';
    else (permission == 'VIEWER')
      return 'shared: Readonly';
  }

  openCreateModal(): void {
    this.createForm.reset({ title: '' });
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

    const payload = {
      title: this.createForm.getRawValue().title.trim(),
      content: '',
    };

    this.docService
      .createDocument(payload)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (newDoc: DocumentSummary) => {
          this.closeCreateModal();
          void this.router.navigate(['/documents', newDoc.documentId, 'open']);
        },
        error: () => {
          // toast or error state
        },
      });
  }

  handleOpenDocument(id: string): void {
    void this.router.navigate(['/documents', id, 'open']);
  }

  handleCollaborateDocument(id: string): void {
    void this.router.navigate(['/documents', id, 'collaborate']);
  }

  handleShareDocument(id: string): void {
    const documentId = Number(id);

    if (!Number.isFinite(documentId)) {
      return;
    }

    this.selectedShareDocumentId.set(documentId);
    this.isShareModalOpen.set(true);
  }

  closeShareModal(): void {
    this.isShareModalOpen.set(false);
    this.selectedShareDocumentId.set(null);
  }

  handleDeleteDocument(id: string): void {
    const documentId = Number(id);

    if (!Number.isFinite(documentId)) {
      return;
    }

    this.selectedDeleteDocumentId.set(documentId);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.selectedDeleteDocumentId.set(null);
  }

  confirmDeleteDocument(): void {
    const documentId = this.selectedDeleteDocumentId();

    if (documentId === null || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);

    this.docService
      .deleteDocument(documentId)
      .pipe(
        finalize(() => this.isDeleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.closeDeleteModal();
        },
        error: () => {
          // toast or error state
        },
      });
  }
}