import * as Y from "yjs";
import type {
  Envelope,
  ParticipantEventPayload,
  WorkerSyncResponse,
} from "./types.js";
import { Logger } from "./logger.js";
import { SpringClient } from "./springClient.js";
import { base64ToUint8Array, isProbablyBase64, nowIso, safeJsonStringify } from "./utils.js";

// for data related to a single document session
export class DocumentRuntime {
  public userCount = 1;
  public content = "";
  public readonly doc: Y.Doc;
  public readonly chatHistory: Envelope[] = [];
  public readonly participantMap = new Map<number, string>();

  private readonly yText: Y.Text;
  private persistTimer?: NodeJS.Timeout | undefined;
  private shutdownCompleted = false;

  constructor(
    public readonly documentId: number,
    initialContent: string,
    private readonly textFieldName: string,  // name for identifying ytext object (yjs requires it idk why). but i know that it'll be just 'markdown' cuz thats what frontend sends
    private readonly springClient: SpringClient,
    private readonly logger: Logger,
    private readonly persistIntervalMs: number,
  ) {
    this.doc = new Y.Doc();
    this.yText = this.doc.getText(this.textFieldName);
    this.setContent(initialContent);
  }

  startAutoPersistence(): void {
    if (this.persistTimer) return;  // if timer already exists, return

    this.persistTimer = setInterval(() => {
      void this.persistToSpringBoot().catch((error: unknown) => {
        this.logger.error(`periodic persistence failed for document ${this.documentId}`, error);
      });
    }, this.persistIntervalMs);
    this.persistTimer.unref?.();  // to prevent timer from blocking event loop termination 
  }
  stopAutoPersistence(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = undefined;
    }
  }

  // initialize local ydoc copy with the content provided by springboot
  setContent(content: string): void {
    this.yText.delete(0, this.yText.length);
    if (content.length > 0) {
      this.yText.insert(0, content);
    }
    this.content = this.yText.toString();
  }

  // for every doc change received
  applyDocChange(payload: { update: string }): void {
    const update = this.parseYjsUpdate(payload.update);
    if (!update) {
      this.logger.warn(`ignored invalid doc change payload for document ${this.documentId}`, safeJsonStringify(payload));
      return;
    }

    // update local ydoc copy for new participant synchronization
    Y.applyUpdate(this.doc, update);
    // update local plain text copy for persistence
    this.content = this.yText.toString();
  }

  // the original node id is here because it keeps some other parts from breaking
  addChatMessage(originNodeId: string, envelope: Envelope): void { 
    this.chatHistory.push(envelope);
  }

  // for user count tracking to unsubsctibe from the redis channel
  incrementUserCount(): void {
    this.userCount += 1;
  }
  decrementUserCount(): void {
    this.userCount = Math.max(0, this.userCount - 1);
  }
  shouldClose(): boolean {
    return this.userCount <= 0;
  }

  // track participant presence for snapshot responses
  addParticipant(payload: unknown): void {
    const participant = this.parseParticipantEventPayload(payload);
    if (!participant) {
      this.logger.warn(`ignored invalid participant join payload for document ${this.documentId}`, safeJsonStringify(payload));
      return;
    }

    this.participantMap.set(participant.userId, participant.username);
  }

  removeParticipant(payload: unknown): void {
    const participant = this.parseParticipantEventPayload(payload);
    if (!participant) {
      this.logger.warn(`ignored invalid participant leave payload for document ${this.documentId}`, safeJsonStringify(payload));
      return;
    }

    this.participantMap.delete(participant.userId);
  }

  // for periodic persistence
  async persistToSpringBoot(): Promise<void> {
    await this.springClient.syncDocument(this.documentId, this.content);
  }

  // to be sent to springboot which will in turn forward it to the newly joined client
  snapshot(): WorkerSyncResponse {
    return {
      documentId: this.documentId,
      userCount: this.userCount,
      content: this.content,
      chatHistory: this.chatHistory,
      participantMap: Object.fromEntries(this.participantMap.entries()),
      yjsStateBase64: Buffer.from(Y.encodeStateAsUpdate(this.doc)).toString("base64"),
    };
  }

  // to stop tracking the document state
  async shutdown(): Promise<void> {
    if (this.shutdownCompleted) return;
    this.shutdownCompleted = true;
    this.stopAutoPersistence();
    await this.springClient.syncDocument(this.documentId, this.content, true).catch((error: unknown) => {
      this.logger.error(`final persistence failed for document ${this.documentId}`, error);
    });
    this.doc.destroy();
  }

  // temporary method because the frontend message type is not finalized yet
  // though base64 is most likely what it will be
  private parseYjsUpdate(base64: string): Uint8Array | null {
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private parseParticipantEventPayload(payload: unknown): ParticipantEventPayload | null {
    if (payload == null || typeof payload !== "object") return null;

    const record = payload as Record<string, unknown>;
    const userId = record.userId;
    const username = record.username;

    if (typeof userId !== "number") return null;
    if (typeof username !== "string") return null;

    return {
      documentId: typeof record.documentId === "number" ? record.documentId : this.documentId,
      userId,
      username,
      permissionLevel: typeof record.permissionLevel === "string" ? record.permissionLevel : "",
      message: typeof record.message === "string" ? record.message : "",
    };
  }
}