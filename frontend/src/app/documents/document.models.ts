// src/app/documents/document.models.ts

// Defining specific string literal types prevents invalid permission strings
export type DocPermission = 'OWNER' | 'EDITOR' | 'VIEWER';

// document metadata for UI
export interface DocumentSummary {
  documentId: number;
  title: string;
  ownerId: number;
  ownerUsername: string;
  lastModified: string; // ISO 8601 string from Java Instant
  version: number;
  myPermission: DocPermission;
}

export interface Document {
  documentId: number;
  title: string;
  content: string;
  ownerId: number;
  ownerUsername: string;
  lastModified: string; // ISO 8601 string from Java Instant
  version: number;
  myPermission: DocPermission;
}

export interface CreateDocRequest {
  title: string;
  content: string;
}

export interface DocumentSaveResponse {
  documentId: number;
  title: string;
  ownerId: number;
  ownerUsername: string;
  lastModified: string;
  version: number;
}