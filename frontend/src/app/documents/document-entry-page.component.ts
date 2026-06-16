// document-entry-gate-page.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { of, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { DocumentService } from '../documents/document.service';
import { ModalComponent } from '../ui/modal.component';
import { DocumentLockDto } from '../documents/document.models';

type EntryIntent = 'open' | 'collaborate';
type LockState = 'none' | 'exclusive' | 'collaborative';

@Component({
  selector: 'app-document-entry-gate-page',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-h-0 w-full',
  },
  template: `
    @if (loading()) {
      <div class="flex h-full min-h-0 items-center justify-center">
        <span class="loading loading-spinner loading-lg" aria-label="Loading document"></span>
      </div>
    } @else if (error()) {
      <div class="alert alert-error">
        <span>{{ error() }}</span>
      </div>
    } @else {
      <app-modal
        [isOpen]="lockModalOpen()"
        [title]="lockState() === 'collaborative'
          ? 'Collaborative session already exists'
          : 'Document locked'"
        (close)="returnToLibrary()"
      >
        @if (lockState() === 'collaborative') {
          <p class="py-2">
            An existing collaborative session is already active
            {{ lockedByUsername() ? 'by ' + lockedByUsername() : '' }}.
            You can join that session.
          </p>

          <div modal-actions class="flex gap-2">
            <button class="btn btn-primary" (click)="joinCollaborativeSession()">
              Join session
            </button>
            <button class="btn btn-ghost" (click)="returnToLibrary()">
              Back
            </button>
          </div>
        } @else {
          <p class="py-2">
            Document is currently being edited by {{ lockedByUsername() ?? 'another user' }}.
            Proceed in readonly mode or return to library?
          </p>

          <div modal-actions class="flex gap-2">
            <button class="btn btn-primary" (click)="openReadonlyMode()">
              Proceed in readonly mode
            </button>
          </div>
        }
      </app-modal>
    }
  `,
})
export class DocumentEntryGatePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly documents = inject(DocumentService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly lockModalOpen = signal(false);
  readonly lockedByUsername = signal<string | null>(null);
  readonly lockState = signal<LockState>('none');

  readonly routeDocumentId = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const raw = params.get('id');
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      }),
      distinctUntilChanged(),
    ),
    { initialValue: null as number | null },
  );

  readonly intent = toSignal(
    this.route.url.pipe(
      map((segments) => {
        const last = segments[segments.length - 1]?.path;
        return last === 'collaborate' ? 'collaborate' : 'open';
      }),
      distinctUntilChanged(),
    ),
    { initialValue: 'open' as EntryIntent },
  );

  constructor() {
    effect(() => {
      const documentId = this.routeDocumentId();

      if (documentId === null) {
        this.loading.set(false);
        this.error.set('Missing or invalid document id.');
        return;
      }

      this.loading.set(true);
      this.error.set(null);
      this.lockModalOpen.set(false);
      this.lockedByUsername.set(null);
      this.lockState.set('none');

      this.documents
        .getDocumentLock(documentId)
        .pipe(
          catchError((err: unknown) => {
            if (err instanceof HttpErrorResponse && err.status === 404) {
              return of(null as DocumentLockDto | null);
            }
            return throwError(() => err);
          }),
          switchMap((lock) => {
            if (lock && lock.lockedByUsername !== this.auth.currentUser?.username) {
              if (lock.lockType === 'EXCLUSIVE') {
                this.lockedByUsername.set(lock.lockedByUsername);
                this.lockState.set('exclusive');
                this.lockModalOpen.set(true);
                this.loading.set(false);
                return of(null);
              }

              if (lock.lockType === 'COLLABORATIVE') {
                this.lockedByUsername.set(lock.lockedByUsername);
                this.lockState.set('collaborative');
                this.lockModalOpen.set(true);
                this.loading.set(false);
                return of(null);
              }
            }

            return this.documents.openDocument(documentId);
          }),
        )
        .subscribe({
          next: (doc) => {
            if (!doc) return;

            if (this.intent() === 'collaborate') {
              if (doc.myPermission === 'OWNER' || doc.myPermission === 'EDITOR') {
                this.router.navigate(['/documents', documentId, 'collaborate']);
                return;
              }

              this.router.navigate(['/documents', documentId, 'readonly']);
              return;
            }

            if (doc.myPermission === 'VIEWER') {
              this.router.navigate(['/documents', documentId, 'readonly']);
              return;
            }

            this.router.navigate(['/documents', documentId, 'edit']);
          },
          error: (err) => {
            this.error.set(this.describeError(err));
            this.loading.set(false);
          },
        });
    });
  }

  openReadonlyMode(): void {
    const documentId = this.routeDocumentId();
    if (documentId === null) return;

    this.lockModalOpen.set(false);
    this.router.navigate(['/documents', documentId, 'readonly']);
  }

  joinCollaborativeSession(): void {
    const documentId = this.routeDocumentId();
    if (documentId === null) return;

    this.lockModalOpen.set(false);
    this.router.navigate(['/documents', documentId, 'collaborate']);
  }

  returnToLibrary(): void {
    this.lockModalOpen.set(false);
    this.router.navigate(['/library']);
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) return error.message;

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }

    return 'Something went wrong.';
  }
}