import { normalizeUrl } from "./utils.js";

export class SpringClient {
  constructor(
    private readonly baseUrl: string,
    private readonly bearerToken: string,
  ) {}

  // sync request to springboot for document content persistence and lock refresh
  async syncDocument(
    documentId: number,
    content: string,
    finalSync: boolean = false
  ): Promise<void> {
    const url = normalizeUrl(this.baseUrl, `/internal/workers/documents/${documentId}/sync`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.bearerToken}`,
    };

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({ 
        content,
        final: finalSync
       }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `SpringBoot sync failed for document ${documentId}: ${response.status} ${response.statusText} ${body}`.trim()
      );
    }
  }
}
