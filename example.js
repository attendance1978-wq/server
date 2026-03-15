import { createServer } from './index.js';

const app = createServer();

// Middleware: request logger
app.use('/', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.pathname}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to @server!', status: 'ok' });
});

app.get('/hello/:name', (req, res) => {
  res.json({ greeting: `Hello, ${req.params.name}!` });
});

app.post('/echo', (req, res) => {
  res.json({ received: req.body });
});

app.get('/query', (req, res) => {
  res.json({ query: req.query });
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Example server running on http://localhost:${PORT}`);
  console.log('Routes:');
  console.log('  GET  /');
  console.log('  GET  /hello/:name');
  console.log('  POST /echo');
  console.log('  GET  /query?foo=bar');
});
