export type MessageType =
  | "chat.message"
  | "doc.change"
  | "connection.ack"
  | "room.participant.joined"
  | "room.participant.left"
  | "error";

export interface Envelope {
  type: MessageType;
  documentId?: number;
  messageId?: string;
  senderId?: number;
  sentAt?: string;
  payload?: unknown;
}

export interface EnvelopeMessage {
  originNodeId: string;
  envelope: Envelope;
}

export interface ParticipantEventPayload {
  documentId: number;
  userId: number;
  username: string;
  permissionLevel: string;
  message: string;
}

export interface WorkerSyncResponse {
  documentId: number;
  userCount: number;
  content: string;
  chatHistory: Envelope[];
  participantMap: Record<string, string>;
  yjsStateBase64: string;
}

export interface InitDocumentRequestBody {
  content: string;
  userId: number;
  username: string;
}

export interface SpringSyncRequestBody {
  content: string;
}

export interface ParseResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}
