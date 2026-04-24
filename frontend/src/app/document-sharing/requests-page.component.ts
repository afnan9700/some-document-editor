import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type AccessRequestDto, type PermissionLevel } from './document-sharing.models';
import { DocumentSharingService } from './document-sharing.service';

type RequestsTab = 'made-by-me' | 'for-my-docs';

@Component({
  selector: 'app-requests-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <header class="space-y-1">
        <h1 class="text-3xl font-bold tracking-tight">Requests</h1>
        <p class="text-base-content/70">
          Review requests you made and requests waiting on your approval.
        </p>
      </header>

      @if (toast()) {
        <div class="alert alert-success" role="status" aria-live="polite">
          <span>{{ toast() }}</span>
        </div>
      }

      @if (error()) {
        <div class="alert alert-error" role="alert">
          <span>{{ error() }}</span>
        </div>
      }

      <div role="tablist" aria-label="Requests tabs" class="tabs tabs-box">
        <button
          id="tab-made-by-me"
          type="button"
          role="tab"
          class="tab"
          [class.tab-active]="activeTab() === 'made-by-me'"
          [attr.aria-selected]="activeTab() === 'made-by-me'"
          [attr.aria-controls]="'panel-made-by-me'"
          (click)="activeTab.set('made-by-me')"
        >
          Requests made by me
        </button>

        <button
          id="tab-for-my-docs"
          type="button"
          role="tab"
          class="tab"
          [class.tab-active]="activeTab() === 'for-my-docs'"
          [attr.aria-selected]="activeTab() === 'for-my-docs'"
          [attr.aria-controls]="'panel-for-my-docs'"
          (click)="activeTab.set('for-my-docs')"
        >
          Requests for my documents
        </button>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <span class="loading loading-spinner loading-lg" aria-label="Loading requests"></span>
        </div>
      } @else {
        @if (activeTab() === 'made-by-me') {
          <section id="panel-made-by-me" role="tabpanel" aria-labelledby="tab-made-by-me" class="space-y-3">
            @for (req of madeByMe(); track req.id) {
              <article class="card bg-base-200 shadow-sm">
                <div class="card-body gap-2">
                  <h2 class="card-title text-lg">{{ req.documentTitle }}</h2>
                  <p class="text-sm opacity-70">Owner: {{ req.ownerUsername }}</p>
                  <p class="text-sm opacity-70">Request ID: {{ req.id }}</p>
                </div>
              </article>
            } @empty {
              <div class="rounded-box border border-dashed border-base-300 p-8 text-center text-base-content/70">
                You have no pending requests.
              </div>
            }
          </section>
        }

        @if (activeTab() === 'for-my-docs') {
          <section id="panel-for-my-docs" role="tabpanel" aria-labelledby="tab-for-my-docs" class="space-y-3">
            @for (req of forMyDocs(); track req.id) {
              <article class="card bg-base-200 shadow-sm">
                <div class="card-body gap-4">
                  <div class="space-y-1">
                    <h2 class="card-title text-lg">{{ req.documentTitle }}</h2>
                    <p class="text-sm opacity-70">Requester: {{ req.requesterUsername }}</p>
                    <p class="text-sm opacity-70">Request ID: {{ req.id }}</p>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="btn btn-sm btn-primary" (click)="approve(req.id, 'viewer')">
                      Approve as viewer
                    </button>
                    <button type="button" class="btn btn-sm btn-primary" (click)="approve(req.id, 'editor')">
                      Approve as editor
                    </button>
                    <button type="button" class="btn btn-sm btn-outline btn-error" (click)="reject(req.id)">
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            } @empty {
              <div class="rounded-box border border-dashed border-base-300 p-8 text-center text-base-content/70">
                No pending requests for your documents.
              </div>
            }
          </section>
        }
      }
    </div>
  `,
})
export class RequestsPageComponent implements OnInit {
  private readonly sharing = inject(DocumentSharingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<RequestsTab>('for-my-docs');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);

  readonly madeByMe = signal<AccessRequestDto[]>([]);
  readonly forMyDocs = signal<AccessRequestDto[]>([]);

  ngOnInit(): void {
    this.loadRequests();
    this.showInviteToastFromQuery();
  }

  loadRequests(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      madeByMe: this.sharing.listMadeByMe(),
      forMyDocs: this.sharing.listForMyDocs(),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ madeByMe, forMyDocs }) => {
          this.madeByMe.set(madeByMe);
          this.forMyDocs.set(forMyDocs);
        },
        error: () => {
          this.error.set('Failed to load requests.');
        },
      });
  }

  approve(requestId: number, level: PermissionLevel): void {
    this.sharing.processRequest(requestId, true, level)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast(`Request approved as ${level}.`);
          this.loadRequests();
        },
        error: () => {
          this.showToast('Could not approve the request.');
        },
      });
  }

  reject(requestId: number): void {
    this.sharing.processRequest(requestId, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast('Request rejected.');
          this.loadRequests();
        },
        error: () => {
          this.showToast('Could not reject the request.');
        },
      });
  }

  private showInviteToastFromQuery(): void {
    const status = this.route.snapshot.queryParamMap.get('status');

    if (status === 'granted') {
      this.showToast('Access granted.');
      return;
    }

    if (status === 'requested') {
      this.showToast('Access request submitted.');
      return;
    }

    if (status === 'existing-request') {
      this.showToast('You already have a pending request for that document.');
      return;
    }

    if (status === 'error') {
      this.showToast('The invite could not be processed.');
    }
  }

  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(null), 2500);
  }
}