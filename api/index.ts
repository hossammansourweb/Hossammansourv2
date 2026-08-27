// Vercel serverless entry point.
//
// We load the pre-built Express app from `dist/server.cjs` (produced by
// `npm run build` via esbuild) using `createRequire`. This is intentional:
//
//   1. It avoids the "Directory import '/var/task/server' is not supported"
//      error that occurs when Vercel's ESM bundler tries to resolve
//      `import '../server'` — the project root contains both `server.ts`
//      and a `server/` directory, so an extension-less ESM import is
//      ambiguous and Vercel picks the directory.
//
//   2. It uses the exact same bundle the project ships for non-Vercel
//      hosts, so behavior is identical.
//
//   3. The bundle is CJS, so we bridge via `createRequire` from the ESM
//      function entry.

// CRITICAL: Vercel's bundler only traces static imports/requires in
// `api/index.ts` to discover the function's npm dependencies. The pre-built
// CJS bundle (`api/_server.cjs`) is opaque to it — its `require("firebase-admin/...")`
// calls are inside a compiled file, so Vercel never detects `firebase-admin`
// as a function dependency and does not include it in the function's
// `node_modules`. The static `require()` calls then crash at module-load
// time (before any try/catch in route handlers can catch them), and Vercel
// returns its default text/plain 500 for every route.
//
// Referencing the package here — at the top of the function entry — makes
// Vercel see `firebase-admin` as a dependency and externalize it (loaded
// from `node_modules` at runtime, not bundled). This is the only place
// Vercel's bundler will look.
require('firebase-admin/app');

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRequire } from 'module';

const requireCjs = createRequire(import.meta.url);
// `api/_server.cjs` is produced by `esbuild server.ts --format=cjs` in the
// build script. The leading underscore tells Vercel to ignore it as a
// function (only files without a leading underscore in `api/` are
// treated as serverless functions). Co-locating the bundle with the
// function guarantees it is present in the Vercel function's filesystem
// and avoids any ambiguity with the `server/` source directory at the
// project root.
const { app } = requireCjs('./_server.cjs');

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express expects (req, res, next). Vercel provides a compatible pair.
  // The original URL is preserved through the rewrite, so Express routes
  // such as `/api/public/clinic-info` match correctly.
  return (app as any)(req, res);
}
