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

export interface ChatHistoryEntry {
  receivedAt: string;
  originNodeId: string;
  envelope: Envelope;
}

export interface WorkerSyncResponse {
  documentId: number;
  userCount: number;
  content: string;
  chatHistory: ChatHistoryEntry[];
  yjsStateBase64: string;
}

export interface InitDocumentRequestBody {
  content: string;
}

export interface SyncDocumentRequestBody {
  // Intentionally left open for future compatibility.
  // The worker currently only needs documentId from the route.
  [key: string]: unknown;
}

export interface SpringSyncRequestBody {
  content: string;
}

export interface ParseResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}
