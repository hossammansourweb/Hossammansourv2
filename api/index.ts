// Vercel serverless entry point. The Express app is defined in `server.ts`
// and is imported here. Vercel's @vercel/node builder bundles this file (and
// its imports) into a single serverless function that handles requests
// rewritten from `/api/*` (see vercel.json).
//
// Why this approach: keeping the Express app intact preserves the existing
// API contract, middleware, auth flow, and Firestore logic. No route refactor.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express expects (req, res, next). Vercel provides a compatible pair.
  // The original URL is preserved through the rewrite, so Express routes
  // such as `/api/public/clinic-info` match correctly.
  return (app as any)(req, res);
}
