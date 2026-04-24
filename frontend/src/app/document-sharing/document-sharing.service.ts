import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CreateInviteResponse, UseInviteResponse, AccessRequestDto, PermissionLevel } from './document-sharing.models';

@Injectable({ providedIn: 'root' })
export class DocumentSharingService {
  private readonly api = inject(ApiService);

  createInvite(
    docId: number,
    autoApprove: boolean,
    expiresInSeconds: number | null,
  ): Observable<CreateInviteResponse> {
    return this.api.post<CreateInviteResponse>(`/api/sharing/docs/${docId}/invite`, {
      autoApprove,
      expiresInSeconds,
    });
  }

  useInvite(token: string): Observable<UseInviteResponse> {
    return this.api.post<UseInviteResponse>(`/api/sharing/invite/use`, { token });
  }

  listMadeByMe(): Observable<AccessRequestDto[]> {
    return this.api.get<AccessRequestDto[]>(`/api/sharing/requests/made-by-me`);
  }

  listForMyDocs(): Observable<AccessRequestDto[]> {
    return this.api.get<AccessRequestDto[]>(`/api/sharing/requests/for-my-docs`);
  }

  processRequest(
    requestId: number,
    approve: boolean,
    level?: PermissionLevel,
  ): Observable<{ status: string }> {
    const params: Record<string, string> = {
      approve: String(approve),
    };

    if (level) {
      params['level'] = level;
    }

    return this.api.post<{ status: string }>(`/api/sharing/requests/${requestId}/process`, {}, params);
  }
}
