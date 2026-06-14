// collaboration/collab.types.ts
export type CollaborationMessageType =
  | 'chat.message'
  | 'doc.change'
  | 'connection.ack'
  | 'error'
  | 'room.participant.joined'
  | 'room.participant.left';

export interface CollaborationEnvelope<TPayload = unknown> {
  type: CollaborationMessageType;
  documentId?: number;  
  messageId?: string;
  senderId?: number;
  sentAt?: string;
  payload?: TPayload;
}

export interface WebSocketTicketResponse {
  ticket: string;
  expiresAt: string;
  content: string;
}

export interface ConnectionAckPayload {
  documentId: number;
  userId: number;
  permissionLevel: string;
  message: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface ParticipantEventPayload {
  documentId: number;
  userId: number;
  username: string;
  permissionLevel: string;
  message: string;
}


export type ConnectionState =
  | 'idle'
  | 'requesting-ticket'
  | 'connecting'
  | 'open'
  | 'closing'
  | 'closed'
  | 'error';
