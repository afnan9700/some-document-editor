import express, { type Request, type Response, type NextFunction } from "express";
import type { DocumentManager } from "./documentManager.js";
import type { AppConfig } from "./config.js";
import { isAuthorizedBearer, toBooleanHeaderValue } from "./utils.js";

export function buildServer(config: AppConfig, documentManager: DocumentManager) {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // for kubernetes
  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });
  app.get("/readyz", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", documents: documentManager.getDocumentCount() });
  });

  // basic token auth
  app.use(authMiddleware(config.workerBearerToken));

  // document session initialization request
  app.put("/internal/workers/documents/:documentId/init", async (req: Request, res: Response) => {
    const documentId = parseDocumentId(req.params.documentId);
    if (documentId == null) {
      return res.status(400).json({ error: "invalid_document_id" });
    }

    const content = typeof req.body?.content === "string" ? req.body.content : null;
    if (content == null) {
      return res.status(400).json({ error: "content_is_required" });
    }

    await documentManager.initializeDocument(documentId, content);
    return res.status(200).json({ status: "ok", documentId });
  });

  // document state synchronization request (received when a new user joins)
  app.put("/internal/workers/documents/:documentId/sync", async (req: Request, res: Response) => {
    const documentId = parseDocumentId(req.params.documentId);
    if (documentId == null) {
      return res.status(400).json({ error: "invalid_document_id" });
    }

    const snapshot = await documentManager.syncDocument(documentId);
    if (!snapshot) {
      return res.status(404).json({ error: "document_not_found" });
    }

    return res.status(200).json(snapshot);
  });

  // undefined routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "not_found" });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_server_error" });
  });

  return app;
}

function authMiddleware(expectedToken: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const headerValue = toBooleanHeaderValue(req.header("authorization"));
    if (!isAuthorizedBearer(headerValue, expectedToken)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    return next();
  };
}

function parseDocumentId(raw: unknown): number | null {
  if (!(typeof raw === "string")) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return value;
}
