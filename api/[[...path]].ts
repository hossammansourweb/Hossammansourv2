// Vercel serverless entry point. The Express app is defined in `server.ts` and
// is imported here. Vercel's @vercel/node builder bundles this file (and its
// imports) into a single serverless function that handles every `/api/*` path.
//
// Why a catch-all: keeping the Express app intact preserves the existing API
// contract, middleware, auth flow, and Firestore logic. No route refactor.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express expects (req, res, next). Vercel provides a compatible pair.
  return (app as any)(req, res);
}
