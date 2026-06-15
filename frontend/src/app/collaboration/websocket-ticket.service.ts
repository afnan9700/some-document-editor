// src/app/collaboration/websocket-ticket.service.ts
import { inject, Injectable } from '@angular/core';
import { map, Observable, pipe } from 'rxjs';
import { WebSocketTicketResponse } from './collab.types';
import { ApiService } from '../core/api.service';

@Injectable({
  providedIn: 'root',
})
export class WebSocketTicketService {
  private api = inject(ApiService);
    
  createTicket(documentId: number): Observable<WebSocketTicketResponse> {
    if (!Number.isInteger(documentId) || documentId <= 0) {
      throw new Error(`Invalid documentId: ${documentId}`);
    }

    const url = `/api/docs/${documentId}/ws-ticket`;
    return this.api.post<WebSocketTicketResponse>(url, {}).pipe(
      map((response) => ({
        ticket: response.ticket,
        expiresAt: response.expiresAt
      })),
    );
  }
}