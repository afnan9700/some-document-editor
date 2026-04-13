// document-workspace/document-workspace-readonly-page.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map } from 'rxjs/operators';
import { of } from 'rxjs';

import { DocumentWorkspaceComponent } from './document-workspace.component';
import { MarkdownEditorMode } from '../markdown-editor/markdown-editor.types';
import { DocumentService } from '../documents/document.service';
import { DocPermission } from '../documents/document.models';

@Component({
  selector: 'app-document-workspace-readonly-page',
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
        [readonly]="true"
        [saving]="false"
        [dirty]="false"
        [saveError]="null"
        [permission]="permission()"
        [ariaLabel]="ariaLabel()"
      >
        <div page-sidebar class="flex h-full min-h-0 flex-col gap-4">
          <div class="card border border-base-300 bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title text-base">Readonly mode</h2>
              <p class="text-sm opacity-70">This document is open for viewing only.</p>
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
export class DocumentWorkspaceReadonlyPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly documents = inject(DocumentService);

  readonly title = signal('Untitled document');
  readonly content = signal('');
  readonly mode = signal<MarkdownEditorMode>('source');
  readonly permission = signal<DocPermission>('VIEWER');
  readonly version = signal<number | null>(null);
  readonly lastModified = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly ariaLabel = signal('Readonly document viewer');

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
    effect(() => {
      const documentId = this.routeDocumentId();

      if (documentId === null) {
        this.loading.set(false);
        this.error.set('Missing or invalid document id.');
        return;
      }

      this.loading.set(true);
      this.error.set(null);

      this.documents.getDocument(documentId).pipe(
        catchError((err) => {
          this.error.set(this.describeError(err));
          this.loading.set(false);
          return of(null);
        }),
      ).subscribe((doc) => {
        if (!doc) {
          return;
        }

        this.title.set(doc.title);
        this.content.set(doc.content);
        this.permission.set(doc.myPermission);
        this.version.set(doc.version);
        this.lastModified.set(doc.lastModified);
        this.mode.set('source');
        this.loading.set(false);
      });
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