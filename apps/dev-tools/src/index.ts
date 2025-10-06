// NSM Developer Tools UI Application
// import { NSMDebugger } from '@nsm/dev-tools';

const PORT = process.env.DEV_TOOLS_PORT || 3001;

console.log(`🔧 NSM Developer Tools starting on port ${PORT}...`);

// Create a simple HTTP server for development
const server = Bun.serve({
  port: PORT,
  fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>NSM Developer Tools</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 2rem;
              background: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; margin-bottom: 1rem; }
            .status {
              background: #e8f5e8;
              padding: 1rem;
              border-radius: 4px;
              border-left: 4px solid #4caf50;
              margin: 1rem 0;
            }
            .placeholder {
              background: #fff3cd;
              padding: 1rem;
              border-radius: 4px;
              border-left: 4px solid #ffc107;
              margin: 1rem 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔧 NSM Developer Tools</h1>
            <div class="status">
              ✅ Development server is running on port ${PORT}
            </div>
            <div class="placeholder">
              🚧 Full developer tools UI will be implemented in Task 7<br>
              This placeholder shows that the service is running and accessible.
            </div>
            <h2>Available Services</h2>
            <ul>
              <li><strong>POC Whiteboard:</strong> <a href="http://localhost:5173" target="_blank">http://localhost:5173</a></li>
              <li><strong>POC Wordle:</strong> <a href="http://localhost:5174" target="_blank">http://localhost:5174</a></li>
              <li><strong>Dev Tools:</strong> <a href="http://localhost:${PORT}" target="_blank">http://localhost:${PORT}</a> (this page)</li>
            </ul>
          </div>
        </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        service: 'nsm-dev-tools',
        port: PORT,
        timestamp: new Date().toISOString(),
      });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`✅ NSM Developer Tools UI running at: http://localhost:${server.port}`);

// Placeholder - will be implemented in Task 7
// const devTools = new NSMDebugger();
const devTools = null;

export { devTools, server };
