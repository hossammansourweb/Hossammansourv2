// Vercel serverless entry point. The Express app is defined in `server.ts`
// and is imported here. Vercel's @vercel/node builder bundles this file (and
// its imports) into a single serverless function that handles requests
// rewritten from `/api/*` (see vercel.json).
//
// Why this approach: keeping the Express app intact preserves the existing
// API contract, middleware, auth flow, and Firestore logic. No route refactor.
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always declare JSON so a failure here (e.g. a module-load error during
  // `import('../server')`) returns JSON instead of Vercel's default
  // text/plain error page, which the frontend cannot parse.
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    // Lazy-load the Express app. If any transitive import (server code,
    // firebase-admin, etc.) throws while evaluating, we catch it here and
    // still respond with JSON — preventing the `text/plain` 500 that Vercel
    // emits for an uncaught module error.
    const { app } = await import('../server');
    return (app as any)(req, res);
  } catch (err: any) {
    // Log server-side only; never leak secrets/stack to the client.
    console.error('[api] handler failed to load/execute:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error. Check server logs for details.',
      });
    }
  }
}
