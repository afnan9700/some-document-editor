import { Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { marked } from 'marked';
import { CollaborationEnvelope, CollaborationMessageType, ParticipantEventPayload, ChatMessagePayload } from './collab.types';

type ChatLineKind = 'message' | 'system' | 'error';

interface ChatLine {
  id: string;
  kind: ChatLineKind;
  username: string;
  sentAtLabel: string;
  html: string;
  isMine: boolean;
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

@Component({
  selector: 'app-collaboration-chat',
  template: `
    <section class="card h-full bg-base-100 shadow">
      <div class="card-body flex h-full min-h-0 flex-col gap-4 p-4">
        <header class="flex items-start justify-between gap-3">
          <div>
            <h2 class="card-title text-base">Chat</h2>
            <p class="text-sm opacity-70">All messages stay on one side, Discord-style.</p>
          </div>

          @if (messageCount() > 0) {
            <span class="badge badge-ghost">{{ messageCount() }}</span>
          }
        </header>

        <div
          #scrollArea
          class="min-h-0 flex-1 overflow-y-auto rounded-box bg-base-200 p-3"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="Chat messages"
        >
          @if (messageCount() === 0) {
            <div class="flex h-full items-center justify-center text-sm opacity-60">
              No messages yet.
            </div>
          } @else {
            <div class="space-y-3">
              @for (message of messages(); track message.id) {
                @if (message.kind === 'system') {
                  <article class="rounded-box border border-dashed border-base-300 bg-base-100 p-3">
                    <div class="mb-1 flex items-baseline gap-2">
                      <span class="font-semibold">{{ message.username }}</span>
                      @if (message.isMine) {
                        <span class="badge badge-primary badge-outline badge-xs">you</span>
                      }
                      <time class="text-xs opacity-60">{{ message.sentAtLabel }}</time>
                    </div>

                    <div class="text-sm break-words" [innerHTML]="message.html"></div>
                  </article>
                } @else if (message.kind === 'error') {
                  <article class="rounded-box border border-error bg-error/10 p-3">
                    <div class="mb-1 flex items-baseline gap-2">
                      <span class="font-semibold text-error">{{ message.username }}</span>
                      <time class="text-xs opacity-60">{{ message.sentAtLabel }}</time>
                    </div>

                    <div class="text-sm break-words" [innerHTML]="message.html"></div>
                  </article>
                } @else {
                  <article
                    class="rounded-box border border-base-300 bg-base-100 p-3"
                    [class.border-primary]="message.isMine"
                  >
                    <div class="mb-1 flex items-baseline gap-2">
                      <span class="font-semibold" [class.text-primary]="message.isMine">
                        {{ message.username }}
                      </span>

                      @if (message.isMine) {
                        <span class="badge badge-primary badge-outline badge-xs">you</span>
                      }

                      <time class="text-xs opacity-60">{{ message.sentAtLabel }}</time>
                    </div>

                    <div class="text-sm break-words" [innerHTML]="message.html"></div>
                  </article>
                }
              }
            </div>
          }
        </div>

        <form class="flex gap-2" (submit)="submitMessage($event)">
          <label class="sr-only" for="chat-draft">Message</label>

          <textarea
            id="chat-draft"
            class="textarea textarea-bordered textarea-sm min-h-24 flex-1 resize-none"
            rows="3"
            [value]="draft()"
            (input)="onDraftInput($event)"
            (keydown)="onDraftKeydown($event)"
            placeholder="Write a message..."
            autocomplete="off"
            autocapitalize="sentences"
            spellcheck="true"
          ></textarea>

          <button class="btn btn-primary self-end" type="submit" [disabled]="!canSend()">
            Send
          </button>
        </form>
      </div>
    </section>
  `,
})
export class CollaborationChatComponent {
  readonly incomingMessages$ = input.required<Observable<CollaborationEnvelope<unknown>>>();
  readonly usernames = input<Record<number, string>>({});
  readonly currentUserId = input<number | null>(null);

  readonly sendMessage = output<ChatMessagePayload>();

  readonly draft = signal('');
  readonly messages = signal<ChatLine[]>([]);
  readonly messageCount = computed(() => this.messages().length);
  readonly canSend = computed(() => this.draft().trim().length > 0);

  private readonly scrollArea = viewChild<ElementRef<HTMLDivElement>>('scrollArea');
  private nextLocalId = 0;

  constructor() {
    effect((onCleanup) => {
      const source$ = this.incomingMessages$();
      const subscription: Subscription = source$.subscribe((envelope) => {
        const next = this.toChatLine(envelope);
        if (next) {
          this.messages.update((current) => [...current, next]);
        }
      });

      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      this.messages();

      const host = this.scrollArea();
      if (!host) {
        return;
      }

      setTimeout(() => {
        const element = host.nativeElement;
        element.scrollTop = element.scrollHeight;
      });
    });
  }

  onDraftInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    this.draft.set(target.value);
  }

  onDraftKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.submitMessage(event);
  }

  submitMessage(event?: Event): void {
    event?.preventDefault();

    const content = this.draft().trim();
    if (!content) {
      return;
    }

    this.sendMessage.emit({ content });
    this.draft.set('');
  }

  private toChatLine(envelope: CollaborationEnvelope<unknown>): ChatLine | null {
    const sentAtLabel = this.formatSentAt(envelope.sentAt);
    const id = envelope.messageId ?? `local-${++this.nextLocalId}`;

    switch (envelope.type) {
      case 'chat.message': {
        const content = this.readChatContent(envelope.payload);
        const senderId = envelope.senderId ?? null;
        const username = this.resolveUsername(senderId, 'Unknown user');

        return {
          id,
          kind: 'message',
          username,
          sentAtLabel,
          html: this.renderMarkdown(content),
          isMine: senderId !== null && senderId === this.currentUserId(),
        };
      }

      case 'room.participant.joined':
      case 'room.participant.left': {
        const payload = this.readParticipantEventPayload(envelope.payload);
        const fallbackUsername = payload?.username ?? 'Unknown user';
        const userId = payload?.userId ?? envelope.senderId ?? null;
        const username = this.resolveUsername(userId, fallbackUsername);

        const defaultMessage =
          envelope.type === 'room.participant.joined'
            ? `${username} joined the room.`
            : `${username} left the room.`;

        return {
          id,
          kind: 'system',
          username,
          sentAtLabel,
          html: this.renderMarkdown(payload?.message?.trim() ? payload.message : defaultMessage),
          isMine: userId !== null && userId === this.currentUserId(),
        };
      }

      case 'error': {
        const message = this.readErrorMessage(envelope.payload);
        return {
          id,
          kind: 'error',
          username: 'System',
          sentAtLabel,
          html: this.renderMarkdown(message),
          isMine: false,
        };
      }

      default:
        return null;
    }
  }

  private resolveUsername(userId: number | null, fallback: string): string {
    if (userId === null) {
      return fallback;
    }

    const map = this.usernames();
    const resolved = map[userId]?.trim();
    return resolved && resolved.length > 0 ? resolved : fallback;
  }

  private readChatContent(payload: unknown): string {
    if (isRecord(payload) && typeof payload['content'] === 'string') {
      return payload['content'];
    }

    if (typeof payload === 'string') {
      return payload;
    }

    return '';
  }

  private readParticipantEventPayload(payload: unknown): ParticipantEventPayload | null {
    if (!isRecord(payload)) {
      return null;
    }

    const documentId = typeof payload['documentId'] === 'number' ? payload['documentId'] : null;
    const userId = typeof payload['userId'] === 'number' ? payload['userId'] : null;
    const username = typeof payload['username'] === 'string' ? payload['username'] : null;
    const permissionLevel = typeof payload['permissionLevel'] === 'string' ? payload['permissionLevel'] : '';
    const message = typeof payload['message'] === 'string' ? payload['message'] : '';

    if (documentId === null || userId === null || username === null) {
      return null;
    }

    return {
      documentId,
      userId,
      username,
      permissionLevel,
      message,
    };
  }

  private readErrorMessage(payload: unknown): string {
    if (typeof payload === 'string' && payload.trim().length > 0) {
      return payload;
    }

    if (isRecord(payload)) {
      if (typeof payload['message'] === 'string' && payload['message'].trim().length > 0) {
        return payload['message'];
      }

      if (typeof payload['error'] === 'string' && payload['error'].trim().length > 0) {
        return payload['error'];
      }
    }

    return 'Something went wrong.';
  }

  private renderMarkdown(content: string): string {
    const value = content.trim();
    if (!value) {
      return '';
    }

    return marked.parse(value) as string;
  }

  private formatSentAt(sentAt: string | undefined): string {
    if (!sentAt) {
      return '';
    }

    const date = new Date(sentAt);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}