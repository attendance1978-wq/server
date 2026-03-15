import { createServer } from './server.js';

export { createServer };

// Auto-start if run directly
const isMain = process.argv[1] === new URL(import.meta.url).pathname;
if (isMain) {
  const server = createServer();
  const PORT = process.env.PORT || 3000;

  server.listen(PORT, () => {
    console.log(`🚀 @server running on http://localhost:${PORT}`);
  });
}
