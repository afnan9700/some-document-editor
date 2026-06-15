// src/app/collaboration/collaboration-websocket.service.ts
import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { WS_BASE_URL } from '../core/tokens';
import {
  CollaborationEnvelope,
  ConnectionAckPayload,
  ConnectionState,
  ErrorPayload,
} from './collab.types';
import { WebSocketTicketService } from './websocket-ticket.service';

@Injectable({ providedIn: 'root' })
export class CollaborationWebSocketService {
  private readonly ticketService = inject(WebSocketTicketService);
  private readonly wsBaseUrl = inject(WS_BASE_URL);
  private readonly documentRef = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private socket: WebSocket | null = null;  
  private requestedDocumentId: number | null = null;

  private readonly _state = signal<ConnectionState>('idle');
  readonly state = this._state.asReadonly();

  private readonly _connectionError = signal<string | null>(null);
  readonly connectionError = this._connectionError.asReadonly();

  private readonly _sessionInfo = signal<ConnectionAckPayload | null>(null);
  readonly sessionInfo = this._sessionInfo.asReadonly();

  readonly connectedDocumentId = computed(() => {
    return this._sessionInfo()?.documentId ?? this.requestedDocumentId;
  });

  readonly isConnected = computed(() => this._state() === 'open');

  private readonly inboundSubject = new Subject<CollaborationEnvelope>();
  readonly inbound$ = this.inboundSubject.asObservable();  // to read received messages

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.disconnect(1000, 'service destroyed');
      this.inboundSubject.complete();
    });
  }

  async connect(documentId: number): Promise<void> {
    if (!Number.isInteger(documentId) || documentId <= 0) {
      throw new Error(`Invalid documentId: ${documentId}`);
    }

    this.disconnect(1000, 'reconnect');
    this.requestedDocumentId = documentId;
    this._connectionError.set(null);
    this._sessionInfo.set(null);
    this._state.set('requesting-ticket');

    const ticketResponse = await firstValueFrom(this.ticketService.createTicket(documentId));

    if (!ticketResponse) {
      throw new Error('Failed to create websocket ticket');
    }

    const socketUrl = this.buildWebSocketUrl(ticketResponse.ticket);
    this._state.set('connecting');

    const socket = new WebSocket(socketUrl);
    this.socket = socket;

    // just update connection state 
    socket.addEventListener('open', () => {
      if (this.socket !== socket) {
        return;
      }

      this._state.set('open');
    });

    // session info, errors, and expose messages as observables
    socket.addEventListener('message', (event) => {
      if (this.socket !== socket) {
        return;
      }

      const envelope = this.parseEnvelope(event.data);
      if (!envelope) {
        return;
      }

      if (envelope.type === 'connection.ack') {
        const payload = this.parseConnectionAckPayload(envelope.payload);
        if (payload) {
          this._sessionInfo.set(payload);
        }
      }

      if (envelope.type === 'error') {
        const payload = this.parseErrorPayload(envelope.payload);
        if (payload) {
          this._connectionError.set(payload.message);
        }
      }

      this.inboundSubject.next(envelope);
    });

    socket.addEventListener('error', () => {
      if (this.socket !== socket) {
        return;
      }

      this._state.set('error');
      if (!this._connectionError()) {
        this._connectionError.set('websocket error');
      }
    });

    socket.addEventListener('close', () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      this._state.set('closed');
    });
  }

  disconnect(code = 1000, reason = 'client disconnect'): void {
    if (!this.socket) {
      this._state.set('closed');
      return;
    }

    const socket = this.socket;
    this.socket = null;

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close(code, reason);
    }

    this._state.set('closed');
  }

  // to send messages
  send<TPayload>(envelope: CollaborationEnvelope<TPayload>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    this.socket.send(JSON.stringify(envelope));
  }

  private buildWebSocketUrl(ticket: string): string {
    const base = this.wsBaseUrl.replace(/\/+$/, '');
    const url = new URL(base, this.documentRef.location.origin);
    url.searchParams.set('ticket', ticket);
    return url.toString();
  }

  private parseEnvelope(data: unknown): CollaborationEnvelope | null {
    if (typeof data !== 'string') {
      return null;
    }

    try {
      const value: unknown = JSON.parse(data);
      if (typeof value !== 'object' || value === null) {
        return null;
      }

      // consider valid if the field 'type' exists 
      const record = value as Record<string, unknown>;
      if (typeof record['type'] !== 'string') {
        return null;
      }

      // cast via unknown first to avoid unsafe direct cast from Record<string, unknown>
      return record as unknown as CollaborationEnvelope;
    } catch {
      return null;
    }
  }

  private parseConnectionAckPayload(payload: unknown): ConnectionAckPayload | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const record = payload as Record<string, unknown>;

    if (
      typeof record['documentId'] !== 'number' ||
      typeof record['userId'] !== 'number' ||
      typeof record['permissionLevel'] !== 'string' ||
      typeof record['message'] !== 'string'
    ) {
      return null;
    }

    return {
      documentId: record['documentId'],
      userId: record['userId'],
      permissionLevel: record['permissionLevel'],
      message: record['message'],
    };
  }

  private parseErrorPayload(payload: unknown): ErrorPayload | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const record = payload as Record<string, unknown>;

    if (
      typeof record['code'] !== 'string' ||
      typeof record['message'] !== 'string'
    ) {
      return null;
    }

    return {
      code: record['code'],
      message: record['message'],
    };
  }
}