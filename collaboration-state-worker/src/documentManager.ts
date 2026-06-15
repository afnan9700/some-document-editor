import Redis from "ioredis";
import { DocumentRuntime } from "./documentRuntime.js";
import { Logger } from "./logger.js";
import { SpringClient } from "./springClient.js";
import type { Envelope, EnvelopeMessage, MessageType } from "./types.js";
import { parseEnvelopeMessage, safeJsonStringify } from "./utils.js";

const DOCUMENT_CHANNEL_PREFIX = "ws:doc:";

export class DocumentManager {
  // all document sessions currently being managed by the worker
  private readonly documents = new Map<number, DocumentRuntime>();
  // redis channel per document session
  private readonly subscribedChannels = new Set<string>();

  constructor(
    private readonly redisSubscriber: Redis,  // main redis object 
    private readonly springClient: SpringClient,
    private readonly logger: Logger,
    private readonly textFieldName: string,
    private readonly persistIntervalMs: number,
  ) {}

  async initializeDocument(documentId: number, content: string): Promise<void> {
    const existing = this.documents.get(documentId);
    if (existing) {
      // if document session is already being managed before initialization (should not happen)
      await existing.shutdown().catch((error: unknown) => {
        this.logger.error(`failed to shutdown existing runtime for document ${documentId}`, error);
      });
      this.documents.delete(documentId);
    }

    const runtime = new DocumentRuntime(
      documentId,
      content,
      this.textFieldName,  
      this.springClient,
      this.logger,
      this.persistIntervalMs,
    );

    this.documents.set(documentId, runtime);  
    await this.subscribeToDocument(documentId);
    runtime.startAutoPersistence();
    this.logger.info(`initialized document runtime`, { documentId, initialContentLength: content.length });
  }

  // get document snapshot
  syncDocument(documentId: number): ReturnType<DocumentRuntime["snapshot"]> | null {
    const runtime = this.documents.get(documentId);
    if (!runtime) return null;
    return runtime.snapshot();
  }

  // for every message received on a redis channel
  async handleRedisMessage(channel: string, rawMessage: string): Promise<void> {
    // doc id is included in the channel name
    const documentId = this.parseDocumentIdFromChannel(channel);  

    if (documentId == null) {
      this.logger.warn(`received message for unknown channel`, { channel, rawMessage });
      return;
    }

    const runtime = this.documents.get(documentId);
    if (!runtime) {
      this.logger.warn(`no runtime found for message`, { documentId, channel });
      return;
    }

    const parsedMessage = parseEnvelopeMessage(rawMessage);  // parse to get the envelope
    if (!parsedMessage) {
      this.logger.warn(`failed to parse envelope message`, { documentId, rawMessage });
      return;
    }

    await this.applyEnvelope(runtime, parsedMessage, channel, rawMessage);  // handle the envelope based on message type

    // last user may have left after the received envelope, so check if connection should be closed
    if (runtime.shouldClose()) {
      await this.closeDocument(documentId);
    }
  }

  async closeDocument(documentId: number): Promise<void> {
    const runtime = this.documents.get(documentId);
    if (!runtime) return;

    await this.unsubscribeFromDocument(documentId);
    await runtime.shutdown();
    this.documents.delete(documentId);
    this.logger.info(`document runtime closed`, { documentId });
  }

  async shutdownAll(): Promise<void> {
    const ids = [...this.documents.keys()];
    for (const documentId of ids) {
      await this.closeDocument(documentId).catch((error: unknown) => {
        this.logger.error(`failed to close document during shutdown`, { documentId, error });
      });
    }
  }

  getDocumentCount(): number {
    return this.documents.size;
  }

  private async applyEnvelope(runtime: DocumentRuntime, message: EnvelopeMessage, channel: string, rawMessage: string): Promise<void> {
    const { envelope, originNodeId } = message;

    switch (envelope.type as MessageType) {
      case "room.participant.joined":
        runtime.incrementUserCount();
        runtime.addParticipant(envelope.payload);
        this.logger.debug(`participant joined`, { documentId: runtime.documentId, userCount: runtime.userCount, channel, originNodeId });
        return;
      case "room.participant.left":
        runtime.decrementUserCount();
        runtime.removeParticipant(envelope.payload);
        this.logger.debug(`participant left`, { documentId: runtime.documentId, userCount: runtime.userCount, channel, originNodeId });
        return;
      case "doc.change":
        runtime.applyDocChange(envelope.payload);
        this.logger.debug(`document changed`, { documentId: runtime.documentId, contentLength: runtime.content.length, channel, originNodeId });
        return;
      case "chat.message":
        runtime.addChatMessage(originNodeId, envelope);
        this.logger.debug(`chat message stored`, { documentId: runtime.documentId, chatCount: runtime.chatHistory.length, channel, originNodeId });
        return;
      case "connection.ack":
      case "error":
        this.logger.debug(`ignored envelope type`, { documentId: runtime.documentId, type: envelope.type, channel, originNodeId });
        return;
      default:
        this.logger.warn(`unknown envelope type`, { documentId: runtime.documentId, type: envelope.type, channel, rawMessage });
    }
  }

  private async subscribeToDocument(documentId: number): Promise<void> {
    const channel = this.documentChannel(documentId);
    if (this.subscribedChannels.has(channel)) return;
    await this.redisSubscriber.subscribe(channel);  // subscribe to redis channel 
    this.subscribedChannels.add(channel);  // add to subscribed channels list 
  }

  private async unsubscribeFromDocument(documentId: number): Promise<void> {
    const channel = this.documentChannel(documentId);
    if (!this.subscribedChannels.has(channel)) return;
    await this.redisSubscriber.unsubscribe(channel);  // subscribe to redis channel 
    this.subscribedChannels.delete(channel);  // add to subscribed channels list 
  }

  // redis channel identifier based on document id
  private documentChannel(documentId: number): string {
    return `${DOCUMENT_CHANNEL_PREFIX}${documentId}`;
  }

  private parseDocumentIdFromChannel(channel: string): number | null {
    if (!channel.startsWith(DOCUMENT_CHANNEL_PREFIX)) return null;
    const id = Number(channel.slice(DOCUMENT_CHANNEL_PREFIX.length));
    return Number.isFinite(id) ? id : null;
  }
}