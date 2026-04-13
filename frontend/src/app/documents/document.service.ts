// src/app/documents/document.service.ts
import { inject, Injectable, signal, computed } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { ApiService } from '../core/api.service';
import type { DocumentSummary, CreateDocRequest, DocumentSaveResponse, Document, DocumentLockDto } from './document.models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private api = inject(ApiService);

  // private writable document list state signal
  private documentsState = signal<DocumentSummary[]>([]);
  
  // public read-only document list state signal
  readonly documents = computed(() => this.documentsState());
  
  // derived state signal for owned documents, used to conditionally show "Delete" button in the UI
  readonly ownedDocuments = computed(() => 
    this.documentsState().filter(doc => doc.myPermission === 'OWNER')
  );

  readonly defaultLockTtlSeconds = 300;

  // fetch the user's document library from the backend and update internal state signal  
  loadLibrary(): Observable<DocumentSummary[]> {
    return this.api.get<DocumentSummary[]>('/api/docs').pipe(
      tap((docs) => {
        // Update the signal with the fresh data
        this.documentsState.set(docs);
      }),
      catchError(err => {
        console.error('Failed to load document library', err);
        return throwError(() => err);
      })
    );
  }
  
  createDocument(payload: CreateDocRequest): Observable<DocumentSummary> {
    return this.api.post<DocumentSummary>('/api/docs/', payload).pipe(
      tap((newDoc) => {
        newDoc.myPermission = 'OWNER'; // The creator is always the owner
        // Immutably prepend the newly created document to our existing signal state
        this.documentsState.update(docs => [newDoc, ...docs]);
      }),
      catchError(err => {
        console.error('Failed to create document', err);
        return throwError(() => err);
      })
    );
  }

  getDocument(documentId: number): Observable<Document> {
    return this.api.get<Document>(`/api/docs/${documentId}`);
  }

  lockDocument(
    documentId: number, 
    ttlSeconds: number = this.defaultLockTtlSeconds
  ): Observable<void> {
    return this.api.post<void>(
      `/api/docs/${documentId}/lock`,
      {},
      { ttlseconds: String(ttlSeconds) },
    );
  }

  refreshLock(
    documentId: number,
    ttlSeconds: number = this.defaultLockTtlSeconds,
  ): Observable<void> {
    return this.api.post<void>(
      `/api/docs/${documentId}/lock/refresh`,
      {},
      { ttlseconds: String(ttlSeconds) },
    );
  }

  openDocument(
    documentId: number,
    ttlSeconds: number = this.defaultLockTtlSeconds,
  ): Observable<Document> {
    return this.lockDocument(documentId, ttlSeconds).pipe(
      switchMap(() => this.getDocument(documentId)),
    );
  }

  unlockDocument(documentId: number): Observable<void> {
    return this.api.post<void>(`/api/docs/${documentId}/unlock`, {});
  }

  getDocumentLock(documentId: number): Observable<DocumentLockDto> {
    return this.api.get<DocumentLockDto>(`/api/docs/${documentId}/lock`);
  }

  saveDocument(documentId: number, content: string): Observable<DocumentSaveResponse> {
    return this.api.put<DocumentSaveResponse>(`/api/docs/${documentId}`, { content });
  }

}