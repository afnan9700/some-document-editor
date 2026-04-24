// document-sharing/document-sharing.models.ts

export interface AccessRequestDto {
  id: number;
  documentTitle: string;
  ownerUsername: string;
  requesterUsername: string;
}

export type PermissionLevel = 'viewer' | 'editor';


export interface CreateInviteResponse {
  token: string;
}

export interface UseInviteResponse {
  granted: boolean;
  requestId: number | null;
}
