import { normalizeUrl } from "./utils.js";

export class SpringClient {
  constructor(
    private readonly baseUrl: string,
    private readonly bearerToken: string,
  ) {}

  // sync request to springboot for document content persistence and lock refresh
  async syncDocument(documentId: number, content: string): Promise<void> {
    const url = normalizeUrl(this.baseUrl, `/internal/workers/documents/${documentId}/sync`);
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.bearerToken}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`SpringBoot sync failed for document ${documentId}: ${response.status} ${response.statusText} ${body}`.trim());
    }
  }
}
