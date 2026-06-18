import "dotenv/config";
import Redis from "ioredis";
import { loadConfig } from "./config.js";
import { Logger } from "./logger.js";
import { SpringClient } from "./springClient.js";
import { DocumentManager } from "./documentManager.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger("worker");

  const redis = new Redis(config.redisUrl, {
    lazyConnect: true,  // to delay the connection process for later (why tho?)
    maxRetriesPerRequest: null,  // no limit to how many commands get queued during retries (eg. SUBSCRIPTION commands)
    enableReadyCheck: true,  // to ensure that redis server is ready
  });
  // duplicate connection because subscription requires its own unique connection, and another unique one for redis commands
  const subscriber = redis.duplicate({ lazyConnect: true, maxRetriesPerRequest: null, enableReadyCheck: true });

  const springClient = new SpringClient(config.springbootBaseUrl, config.springbootBearerToken);

  // initialize the document manager
  const documentManager = new DocumentManager(
    subscriber,
    springClient,
    logger,
    config.textFieldName,
    config.persistIntervalMs,
  );

  // register channel message handler
  // same message handler for all channels
  subscriber.on("message", (channel, message) => {
    void documentManager.handleRedisMessage(channel, message).catch((error: unknown) => {
      logger.error(`failed to handle redis message`, error);
    });
  });

  redis.on("error", (error) => logger.error("redis error", error));
  subscriber.on("error", (error) => logger.error("redis subscriber error", error));

  // start the both connections at once
  await Promise.all([redis.connect(), subscriber.connect()]);

  // start nodejs server
  const app = buildServer(config, documentManager);
  const server = app.listen(config.port, () => {
    logger.info(`server listening on port ${config.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`received ${signal}, shutting down`);
    server.close();
    await documentManager.shutdownAll();
    await Promise.allSettled([subscriber.quit(), redis.quit()]);
  };

  // to shutdown from kubernetes-triggered system commands
  process.on("SIGINT", () => {
    void shutdown("SIGINT").finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM").finally(() => process.exit(0));
  });
}

main().catch((error: unknown) => {
  console.error("fatal worker startup error", error);
  process.exit(1);
});
