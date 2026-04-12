// document-workspace/document-workspace-page.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, interval } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { DocumentWorkspaceComponent } from './document-workspace.component';
import { MarkdownEditorMode } from '../markdown-editor/markdown-editor.types';
import { DocumentService } from '../documents/document.service';
import { DocPermission } from '../documents/document.models';

@Component({
  selector: 'app-document-workspace-page',
  imports: [DocumentWorkspaceComponent],
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
      <app-document-workspace
        [title]="title()"
        [content]="content()"
        [mode]="mode()"
        [readonly]="isReadonly()"
        [saving]="saving()"
        [dirty]="dirty()"
        [saveError]="saveError()"
        [permission]="permission()"
        [ariaLabel]="ariaLabel()"
        (contentChange)="handleContentChange($event)"
        (modeChange)="mode.set($event)"
        (saveRequested)="saveDocument()"
      >
        <div page-sidebar class="flex h-full min-h-0 flex-col gap-4">
          <div class="card border border-base-300 bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title text-base">Chat</h2>
              <p class="text-sm opacity-70">Drop your assistant UI here later.</p>
            </div>
          </div>

          <div class="card border border-base-300 bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title text-base">Document info</h2>
              <p class="text-sm opacity-70">Version: {{ version() ?? '—' }}</p>
              <p class="text-sm opacity-70">Last modified: {{ lastModified() ?? '—' }}</p>
            </div>
          </div>
        </div>
      </app-document-workspace>
    }
  `,
})
export class DocumentWorkspacePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly documents = inject(DocumentService);

  readonly title = signal('Untitled document');
  readonly content = signal('');
  readonly savedContent = signal('');
  readonly mode = signal<MarkdownEditorMode>('source');
  readonly permission = signal<DocPermission>('VIEWER');
  readonly version = signal<number | null>(null);
  readonly lastModified = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly lockHeld = signal(false);
  readonly activeDocumentId = signal<number | null>(null);

  readonly canEdit = computed(
    () => this.permission() === 'OWNER' || this.permission() === 'EDITOR',
  );
  readonly isReadonly = computed(() => !this.canEdit());
  readonly dirty = computed(() => this.content() !== this.savedContent());
  readonly ariaLabel = signal('Document editor');

  readonly routeDocumentId = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const raw = params.get('id');
        if (!raw) {
          return null;
        }

        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      }),
      distinctUntilChanged(),
    ),
    { initialValue: null as number | null },
  );

  constructor() {
    // effect to load the document when the route document id changes
    effect((onCleanup) => {
      const documentId = this.routeDocumentId();

      if (documentId === null) {
        this.loading.set(false);
        this.error.set('Missing or invalid document id.');
        return;
      }

      this.loading.set(true);
      this.error.set(null);
      this.saveError.set(null);
      this.lockHeld.set(false);
      this.activeDocumentId.set(documentId);

      const sub = this.documents.openDocument(documentId).subscribe({
        next: (doc) => {
          this.title.set(doc.title);
          this.content.set(doc.content);
          this.savedContent.set(doc.content);
          this.permission.set(doc.myPermission);
          this.version.set(doc.version);
          this.lastModified.set(doc.lastModified);
          this.mode.set('source');
          this.lockHeld.set(true);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.describeError(err));
          this.loading.set(false);
        },
      });

      // to call after effect is destroyed
      // (either before an effect re-run or when the component is destroyed or .destroy())
      onCleanup(() => {
        sub.unsubscribe();

        if (this.lockHeld()) {
          this.releaseLock(documentId);
        }

        this.lockHeld.set(false);
        this.activeDocumentId.set(null);
      });
    });

    // periodic lock refresh
    effect((onCleanup) => {
      const documentId = this.activeDocumentId();
      if (documentId === null || !this.lockHeld()) {
        return;
      }

      const sub = interval(60_000).subscribe(() => {
        this.documents.refreshLock(documentId).subscribe({
          error: (err) => {
            this.saveError.set(`Lock refresh failed: ${this.describeError(err)}`);
          },
        });
      });

      onCleanup(() => sub.unsubscribe());
    });

    // periodic document save
    effect((onCleanup) => {
      const documentId = this.activeDocumentId();
      if (documentId === null || !this.canEdit()) {
        return;
      }

      const sub = interval(20_000).subscribe(() => {
        void this.saveDocument();
      });

      onCleanup(() => sub.unsubscribe());
    });
  }

  handleContentChange(value: string): void {
    this.content.set(value);
    this.saveError.set(null);
  }

  async saveDocument(): Promise<void> {
    const documentId = this.activeDocumentId();
    if (documentId === null || !this.canEdit() || this.saving() || !this.dirty()) {
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    try {
      const saved = await firstValueFrom(
        this.documents.saveDocument(documentId, this.content()),
      );

      this.title.set(saved.title);
      this.version.set(saved.version);
      this.lastModified.set(saved.lastModified);
      this.savedContent.set(this.content());
    } catch (err) {
      this.saveError.set(this.describeError(err));
    } finally {
      this.saving.set(false);
    }
  }

  private releaseLock(documentId: number): void {
    this.documents.unlockDocument(documentId).subscribe({
      error: () => {
        // best effort only
      },
    });
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return 'Something went wrong.';
  }
}