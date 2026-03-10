// src/app/documents/document.service.ts
import { inject, Injectable, signal, computed } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from '../core/api.service';
import type { DocumentSummary, CreateDocRequest } from './document.models';

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
}