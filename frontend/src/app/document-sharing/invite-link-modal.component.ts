import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalComponent } from '../ui/modal.component';
import { DocumentSharingService } from './document-sharing.service';

@Component({
  selector: 'app-invite-link-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, ReactiveFormsModule],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="modalTitle()" (close)="close.emit()">
      @if (step() === 'configure') {
        <form id="invite-form" [formGroup]="inviteForm" (ngSubmit)="generateInvite()">
          <div class="space-y-4">
            <p class="text-sm text-base-content/70">
              Configure the invite, then generate a shareable link.
            </p>

            <label class="form-control w-full">
              <div class="label">
                <span class="label-text font-medium">Auto-approve access</span>
              </div>

              <label class="flex items-center gap-3 rounded-box border border-base-300 p-3">
                <input
                  type="checkbox"
                  class="checkbox"
                  formControlName="autoApprove"
                  aria-label="Auto-approve access"
                />
                <span class="text-sm text-base-content/70">
                  Grant access immediately when someone uses this link.
                </span>
              </label>
            </label>

            <label class="form-control w-full">
              <div class="label">
                <span class="label-text font-medium">Expiry duration (hours)</span>
              </div>

              <input
                type="number"
                class="input input-bordered w-full"
                formControlName="expiresInHours"
                min="1"
                max="168"
                inputmode="numeric"
                aria-describedby="expiry-help"
              />

              <div class="label">
                <span id="expiry-help" class="label-text-alt text-base-content/70">
                  Enter a value between 1 and 168 hours.
                </span>
              </div>

              @if (inviteForm.controls.expiresInHours.touched && inviteForm.controls.expiresInHours.invalid) {
                <div class="label">
                  <span class="label-text-alt text-error">
                    Please enter a valid expiry duration.
                  </span>
                </div>
              }
            </label>

            @if (error()) {
              <div class="alert alert-error" role="alert">
                <span>{{ error() }}</span>
              </div>
            }
          </div>
        </form>
      } @else {
        <div class="space-y-4">
          <p class="text-sm text-base-content/70">
            Your invite link is ready. Copy it and share it with others.
          </p>

          <div class="join w-full">
            <input
              class="input input-bordered join-item w-full"
              [value]="inviteLink()"
              readonly
              aria-label="Invite link"
            />
            <button type="button" class="btn join-item" (click)="copyLink()">
              Copy
            </button>
          </div>

          @if (copied()) {
            <p class="text-sm text-success" aria-live="polite">Link copied.</p>
          }

          @if (error()) {
            <div class="alert alert-error" role="alert">
              <span>{{ error() }}</span>
            </div>
          }
        </div>
      }

      <div modal-actions class="flex flex-wrap gap-2">
        @if (step() === 'configure') {
          <button type="button" class="btn btn-ghost" (click)="close.emit()">
            Cancel
          </button>

          <button
            type="submit"
            form="invite-form"
            class="btn btn-primary"
            [disabled]="inviteForm.invalid || generating()"
          >
            @if (generating()) {
              <span class="loading loading-spinner loading-sm"></span>
              Generating...
            } @else {
              Generate invite link
            }
          </button>
        } @else {
          <button type="button" class="btn btn-ghost" (click)="backToConfig()">
            Back
          </button>

          <button type="button" class="btn btn-primary" (click)="close.emit()">
            Close
          </button>
        }
      </div>
    </app-modal>
  `,
})
export class InviteLinkModalComponent {
  private readonly sharing = inject(DocumentSharingService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  isOpen = input.required<boolean>();
  documentId = input<number | null>(null);
  documentTitle = input<string>('');

  close = output<void>();

  readonly step = signal<'configure' | 'link'>('configure');
  readonly generating = signal(false);
  readonly copied = signal(false);
  readonly inviteLink = signal('');
  readonly error = signal<string | null>(null);

  readonly inviteForm = this.fb.group({
    autoApprove: [true],
    expiresInHours: [3, [Validators.required, Validators.min(1), Validators.max(168)]],
  });

  readonly modalTitle = () =>
    this.step() === 'configure'
      ? `Create invite link${this.documentTitle() ? ` for ${this.documentTitle()}` : ''}`
      : 'Invite link ready';

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.resetState();
      }
    });
  }

  generateInvite(): void {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const documentId = this.documentId();
    if (documentId === null) {
      this.error.set('No document selected.');
      return;
    }

    const { autoApprove, expiresInHours } = this.inviteForm.getRawValue();

    this.generating.set(true);
    this.error.set(null);

    this.sharing
      .createInvite(documentId, autoApprove, expiresInHours * 3600)
      .pipe(
        finalize(() => this.generating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.inviteLink.set(this.buildInviteUrl(response.token));
          this.step.set('link');
          this.copied.set(false);
        },
        error: () => {
          this.error.set('Could not generate the invite link.');
        },
      });
  }

  copyLink(): void {
    const link = this.inviteLink();
    if (!link) {
      return;
    }

    navigator.clipboard.writeText(link)
      .then(() => {
        this.copied.set(true);
        window.setTimeout(() => this.copied.set(false), 1200);
      })
      .catch(() => {
        this.error.set('Could not copy the link.');
      });
  }

  backToConfig(): void {
    this.step.set('configure');
    this.error.set(null);
    this.copied.set(false);
  }

  private resetState(): void {
    this.step.set('configure');
    this.generating.set(false);
    this.copied.set(false);
    this.inviteLink.set('');
    this.error.set(null);
    this.inviteForm.reset({
      autoApprove: true,
      expiresInHours: 3,
    });
  }

  private buildInviteUrl(token: string): string {
    const origin = this.document.defaultView?.location.origin ?? '';
    return `${origin}/invite/${token}`;
  }
}