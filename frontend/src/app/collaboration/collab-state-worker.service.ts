import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CollaborationEnvelope, ChatMessagePayload } from './collab.types';

export interface InitializeDocumentResponse {
  status: 'ok';
  documentId: number;
  content: string;
}

export interface WorkerSyncResponse {
  documentId: number;
  userCount: number;
  content: string;
  chatHistory: ChatHistoryEntry[];
  participantMap: Record<string, string>;
  yjsStateBase64: string;
}

export type ChatHistoryEntry = CollaborationEnvelope<ChatMessagePayload>;

export interface WorkerSyncResponse {
  documentId: number;
  userCount: number;
  content: string;
  chatHistory: ChatHistoryEntry[];
  participantMap: Record<string, string>;
  yjsStateBase64: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentWorkerProxyApiService {
  private readonly api = inject(ApiService);
  private readonly basePath = '/api/collab-session';

  initializeDocument(documentId: number): Observable<InitializeDocumentResponse> {
    return this.api.put<InitializeDocumentResponse>(
      `${this.basePath}/${documentId}/init`,
      null,
    );
  }

  syncDocument(documentId: number | string): Observable<WorkerSyncResponse> {
    return this.api.put<WorkerSyncResponse>(
      `${this.basePath}/${documentId}/sync`,
      null,
    );
  }
}