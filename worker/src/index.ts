import { startIndexingConsumer } from './indexingConsumer';

startIndexingConsumer().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[worker] Fatal error', err);
  process.exit(1);
});
