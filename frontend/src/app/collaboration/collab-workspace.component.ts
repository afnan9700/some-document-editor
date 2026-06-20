// src/app/collaboration/collab-workspace.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom, filter, ReplaySubject, Subscription } from 'rxjs';

import { CollaborationWebSocketService } from './collab-websocket.service';
import {
  DocumentWorkerProxyApiService,
  InitializeDocumentResponse,
  WorkerSyncResponse,
} from './collab-state-worker.service';
import {
  CollaborationEnvelope,
  ChatMessagePayload,
  ParticipantEventPayload,
} from './collab.types';
import { MarkdownYjsEditorComponent } from '../markdown-editor/markdown-yjs-editor.component';
import { CollaborationChatComponent } from './collab-chat.component';

export type CollabWorkspaceMode = 'initialize' | 'join';
type WorkspacePhase = 'idle' | 'connecting' | 'syncing' | 'active' | 'error';

@Component({
  selector: 'app-collab-workspace',
  standalone: true,
  imports: [MarkdownYjsEditorComponent, CollaborationChatComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    @if (phase() === 'active') {

      <div class="flex h-full min-h-0 flex-col">

        <!-- ── Session header ───────────────────────────────────────────── -->
        <header
          class="flex shrink-0 items-center justify-between border-b border-base-300
                 bg-base-100 px-4 py-2"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">Document #{{ documentId() }}</span>

            <!-- @if (mode() === 'initialize') {
              <span class="badge badge-primary badge-sm">Host</span>
            } @else {
              <span class="badge badge-secondary badge-sm">Guest</span>
            } -->
          </div>

          <span class="inline-flex items-center gap-1.5 text-sm opacity-60">
            <span class="inline-block h-2 w-2 rounded-full bg-success"></span>
            {{ userCount() }} online
          </span>
        </header>

        <!-- ── Editor + Chat ─────────────────────────────────────────────── -->
        <div class="flex min-h-0 flex-1 gap-4 p-4">

          <app-markdown-yjs-editor
            class="min-w-0 flex-1"
            [initialSnapshot]="initialSnapshot()"
            [remoteUpdates]="remoteUpdates$"
            (yjsUpdate)="onYjsUpdate($event)"
          />

          <app-collaboration-chat
            class="w-80 shrink-0"
            [incomingMessages$]="chatMessages$"
            [usernames]="usernames()"
            [currentUserId]="currentUserId()"
            (sendMessage)="onSendMessage($event)"
          />

        </div>
      </div>

    } @else if (phase() === 'error') {

      <!-- ── Error state ───────────────────────────────────────────────── -->
      <div class="flex flex-1 items-center justify-center p-6">
        <div class="card w-full max-w-sm bg-base-100 shadow">
          <div class="card-body items-center gap-3 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-10 w-10 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0
                   001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <h2 class="card-title text-error">Connection failed</h2>
            <p class="max-w-xs text-sm opacity-70">{{ error() }}</p>
          </div>
        </div>
      </div>

    } @else {

      <!-- ── Loading / connecting state ────────────────────────────────── -->
      <div class="flex flex-1 items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="text-sm opacity-60">{{ statusMessage() }}</p>
        </div>
      </div>

    }
  `,
})
export class CollabWorkspaceComponent implements OnInit {

  // ── Inputs ────────────────────────────────────────────────────────────

  readonly documentId = input.required<number>();
  readonly mode = input.required<CollabWorkspaceMode>();

  // ── Services ──────────────────────────────────────────────────────────

  private readonly wsService = inject(CollaborationWebSocketService);
  private readonly workerService = inject(DocumentWorkerProxyApiService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Phase & error ─────────────────────────────────────────────────────

  readonly phase = signal<WorkspacePhase>('idle');
  readonly error = signal<string | null>(null);

  readonly statusMessage = computed<string>(() => {
    switch (this.phase()) {
      case 'connecting': return 'Connecting to collaboration server…';
      case 'syncing':
        return this.mode() === 'initialize'
          ? 'Initializing document…'
          : 'Syncing with active session…';
      default: return 'Please wait…';
    }
  });

  // ── Participant state ─────────────────────────────────────────────────

  readonly userCount  = signal(1);
  readonly usernames  = signal<Record<number, string>>({});
  readonly currentUserId = computed(() => this.wsService.sessionInfo()?.userId ?? null);

  // ── Editor inputs ─────────────────────────────────────────────────────

  // Stays null for the join flow (Yjs state arrives via remoteUpdates$ instead).
  readonly initialSnapshot = signal<string | null>(null);

  // ReplaySubject so updates queued *before* the editor's ngAfterViewInit
  // (where the Yjs session is created and the subscription fires) are still
  // delivered once the editor subscribes.
  readonly remoteUpdates$ = new ReplaySubject<Uint8Array>();

  // ── Chat stream ───────────────────────────────────────────────────────

  // Same replay reasoning: the join flow emits chat history before the chat
  // component is mounted.
  readonly chatMessages$ = new ReplaySubject<CollaborationEnvelope<unknown>>();

  // ── Active subscriptions ──────────────────────────────────────────────

  private readonly subscriptions: Subscription[] = [];

  // ── Lifecycle ─────────────────────────────────────────────────────────

  constructor() {
    // Watch for unexpected disconnections once the session is live.
    effect(() => {
      const wsState = this.wsService.state();
      if (this.phase() !== 'active') return;

      if (wsState === 'closed' || wsState === 'error') {
        this.phase.set('error');
        this.error.set(
          this.wsService.connectionError() ?? 'The connection was closed unexpectedly.',
        );
      }
    });

    this.destroyRef.onDestroy(() => {
      this.subscriptions.forEach(s => s.unsubscribe());
      this.wsService.disconnect(1000, 'workspace destroyed');
    });
  }

  ngOnInit(): void {
    if (this.mode() === 'initialize') {
      void this.runInitFlow();
    } else {
      void this.runJoinFlow();
    }
  }

  // ── Initialization flow ───────────────────────────────────────────────

  private async runInitFlow(): Promise<void> {
    try {
      this.phase.set('connecting');

      // 1. Request a WS ticket and open the socket.
      await this.wsService.connect(this.documentId());

      // 2. Wait for the server's connection acknowledgement.
      await firstValueFrom(
        this.wsService.inbound$.pipe(filter(e => e.type === 'connection.ack')),
      );

      this.phase.set('syncing');

      // 3. Register the document on the backend. The backend also starts the
      //    synchronization service in the background.
      const response: InitializeDocumentResponse = await firstValueFrom(
        this.workerService.initializeDocument(this.documentId()),
      );

      // 4. Open the live feeds before revealing the UI so the editor and chat
      //    receive every message from the moment they mount.
      this.routeDocChanges();
      this.routeParticipantEvents();
      this.routeChatMessages();

      // 5. Supply the plain-text bootstrap and switch to active.
      // this.initialSnapshot.set(response.content);


      // !!! A VERY HAPHAZARD TEMPORARY FIX !!! 
      const responseAgain: WorkerSyncResponse = await firstValueFrom(
        this.workerService.syncDocument(this.documentId()),
      );
      this.usernames.set(parseParticipantMap(responseAgain.participantMap));
      this.remoteUpdates$.next(decodeBase64ToUint8(responseAgain.yjsStateBase64));
      for (const entry of responseAgain.chatHistory) {
        this.chatMessages$.next(entry);
      }
      // ONLY TEMPORARY

      this.phase.set('active');

    } catch (err) {
      this.phase.set('error');
      this.error.set(extractErrorMessage(err));
    }
  }

  // ── Join flow ─────────────────────────────────────────────────────────

  private async runJoinFlow(): Promise<void> {
    try {
      this.phase.set('connecting');

      // 1. Request a WS ticket and open the socket.
      await this.wsService.connect(this.documentId());

      // 2. Start buffering ALL inbound messages immediately.
      //    This prevents any update from being lost while the sync HTTP
      //    request is in flight.
      const buffer: CollaborationEnvelope[] = [];
      const bufferSub = this.wsService.inbound$.subscribe(e => buffer.push(e));

      // 3. Wait for the server's connection acknowledgement.
      //    The ack lands in the buffer too — that is intentional and harmless,
      //    since we filter by type when draining.
      await firstValueFrom(
        this.wsService.inbound$.pipe(filter(e => e.type === 'connection.ack')),
      );

      this.phase.set('syncing');

      // 4. Fetch the live Yjs state, chat history, and participant map from
      //    the backend.
      const response: WorkerSyncResponse = await firstValueFrom(
        this.workerService.syncDocument(this.documentId()),
      );

      // 5. Stop buffering — real-time routing takes over from here.
      bufferSub.unsubscribe();

      // 6. Seed participant state from the sync snapshot.
      this.userCount.set(response.userCount - 1); // because the frontend will listen to its own participant joining message
      this.usernames.set(parseParticipantMap(response.participantMap));

      // 7. Push the full Yjs state snapshot first, so the editor starts from
      //    the correct base, then drain buffered doc.change updates on top.
      //    The ReplaySubject delivers these even before the editor mounts.
      this.remoteUpdates$.next(decodeBase64ToUint8(response.yjsStateBase64));

      // 8. Push the persisted chat history before the buffered live messages
      //    so the timeline is in the correct order.
      for (const entry of response.chatHistory) {
        this.chatMessages$.next(entry);
      }

      // 9. Drain the buffer in arrival order.
      //    doc.change    → apply on top of the Yjs snapshot
      //    participant   → adjust live count and add to chat
      //    chat / error  → forward to chat
      for (const envelope of buffer) {
        switch (envelope.type) {

          case 'doc.change': {
            const update = extractYjsPayload(envelope);

            if (update) this.remoteUpdates$.next(update);
            break;
          }

          case 'room.participant.joined': {
            const p = parseParticipantPayload(envelope.payload);
            if (p) {
              this.usernames.update(m => ({ ...m, [p.userId]: p.username }));
              this.userCount.update(c => c + 1);
            }
            this.chatMessages$.next(envelope);
            break;
          }

          case 'room.participant.left': {
            const p = parseParticipantPayload(envelope.payload);
            if (p) {
              // Keep the username entry so historical chat messages can still
              // resolve it; only the live count shrinks.
              this.userCount.update(c => Math.max(0, c - 1));
            }
            this.chatMessages$.next(envelope);
            break;
          }

          case 'chat.message':
          case 'error': {
            this.chatMessages$.next(envelope);
            break;
          }
        }
      }

      // 10. Open the live feeds for ongoing updates.
      this.routeDocChanges();
      this.routeParticipantEvents();
      this.routeChatMessages();

      // 11. Reveal the UI.
      this.phase.set('active');

    } catch (err) {
      this.phase.set('error');
      this.error.set(extractErrorMessage(err));
    }
  }

  // ── Event routing (wired once, after sync completes) ──────────────────

  /** Forward incoming Yjs updates from the socket to the editor. */
  private routeDocChanges(): void {
    const sub = this.wsService.inbound$
      .pipe(filter(e => e.type === 'doc.change'))
      .subscribe(envelope => {
        const update = extractYjsPayload(envelope);
        if (update) this.remoteUpdates$.next(update);
      });
    this.subscriptions.push(sub);
  }

  /** Keep userCount and the usernames map in sync with participant events. */
  private routeParticipantEvents(): void {
    const sub = this.wsService.inbound$
      .pipe(
        filter(
          e => e.type === 'room.participant.joined' || e.type === 'room.participant.left',
        ),
      )
      .subscribe(envelope => {
        const p = parseParticipantPayload(envelope.payload);
        if (!p) return;

        if (envelope.type === 'room.participant.joined') {
          this.usernames.update(m => ({ ...m, [p.userId]: p.username }));
          this.userCount.update(c => c + 1);
        } else {
          this.userCount.update(c => Math.max(0, c - 1));
        }
      });
    this.subscriptions.push(sub);
  }

  /** Forward chat-relevant messages to the chat component stream. */
  private routeChatMessages(): void {
    const sub = this.wsService.inbound$
      .pipe(
        filter(e =>
          e.type === 'chat.message' ||
          e.type === 'room.participant.joined' ||
          e.type === 'room.participant.left' ||
          e.type === 'error',
        ),
      )
      .subscribe(envelope => this.chatMessages$.next(envelope));
    this.subscriptions.push(sub);
  }

  // ── Output handlers ───────────────────────────────────────────────────

  onYjsUpdate(update: Uint8Array): void {
    try {
      console.log('Sent yjs update: ',update);
      this.wsService.send<{ update: string }>({
        type: 'doc.change',
        documentId: this.documentId(),
        payload: { update: encodeUint8ToBase64(update) },
      });
    } catch {
      // Socket may be momentarily unavailable; silently drop the update.
      // Yjs CRDT semantics mean the peer will re-sync on the next exchange.
    }
  }

  onSendMessage(payload: ChatMessagePayload): void {
    this.wsService.send<ChatMessagePayload>({
      type: 'chat.message',
      documentId: this.documentId(),
      payload,
    });
  }
}

// ─── Module-level utilities ────────────────────────────────────────────────────

/** Extract a Uint8Array Yjs update from a doc.change envelope payload. */
function extractYjsPayload(envelope: CollaborationEnvelope): Uint8Array | null {
  const p = envelope.payload;
  console.log('Received yjs base64 update payload: ', p);
  if (typeof p !== 'object' || p === null) return null;
  const update = (p as Record<string, unknown>)['update'];
  if (typeof update !== 'string') return null;
  try {
    return decodeBase64ToUint8(update);
  } catch {
    return null;
  }
}

/** Safely parse a participant event payload, returning null on shape mismatch. */
function parseParticipantPayload(payload: unknown): ParticipantEventPayload | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const r = payload as Record<string, unknown>;

  if (
    typeof r['documentId'] !== 'number' ||
    typeof r['userId']     !== 'number' ||
    typeof r['username']   !== 'string'
  ) {
    return null;
  }

  return {
    documentId:      r['documentId'],
    userId:          r['userId'],
    username:        r['username'],
    permissionLevel: typeof r['permissionLevel'] === 'string' ? r['permissionLevel'] : '',
    message:         typeof r['message']         === 'string' ? r['message']         : '',
  };
}

/**
 * Convert the participantMap from the sync response (string keys) to the
 * Record<number, string> shape used by the chat component.
 */
function parseParticipantMap(raw: Record<string, string>): Record<number, string> {
  const result: Record<number, string> = {};
  for (const [key, username] of Object.entries(raw)) {
    const id = Number(key);
    if (Number.isFinite(id)) result[id] = username;
  }
  return result;
}

/** Encode a Uint8Array to a base64 string for JSON transport. */
function encodeUint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  // Avoid spread operator to stay safe with large arrays (no stack overflow).
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode a base64 string back to a Uint8Array. */
function decodeBase64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred.';
}