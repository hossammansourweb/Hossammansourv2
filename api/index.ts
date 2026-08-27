// Vercel serverless entry point.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRequire } from 'module';

// =====================================================================
// DIAGNOSTIC: trace module load to find the first runtime exception.
// These logs are removed once the Vercel function is stable.
// =====================================================================
console.log('[diag] api/index: enter module, vercel_region=', process.env.VERCEL_REGION || 'n/a', 'vercel=', process.env.VERCEL || 'n/a');

let __app: any = null;
let __loadError: any = null;
try {
  const require = createRequire(import.meta.url);
  console.log('[diag] api/index: createRequire OK, requiring firebase-admin/app');
  require('firebase-admin/app');
  console.log('[diag] api/index: firebase-admin/app OK, requiring ./_server.cjs');
  const mod = require('./_server.cjs');
  __app = mod.app || mod.default || mod;
  console.log('[diag] api/index: bundle loaded, app typeof=', typeof __app);
} catch (e: any) {
  __loadError = e;
  console.error('[diag] api/index: LOAD FAILED code=', e?.code, 'msg=', String(e?.message || e).slice(0, 500));
  if (e?.stack) console.error('[diag] api/index: stack=', String(e.stack).slice(0, 1500));
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (__loadError) {
    res.status(500).json({
      success: false,
      message: 'server bundle failed to load',
      _diag: {
        code: __loadError?.code || 'unknown',
        msg: String(__loadError?.message || __loadError).slice(0, 500),
        path: req.url,
      },
    });
    return;
  }
  if (!__app) {
    res.status(500).json({ success: false, message: 'server app not initialised' });
    return;
  }
  try {
    return (__app as any)(req, res);
  } catch (e: any) {
    console.error('[diag] handler threw:', e?.code, String(e?.message || e).slice(0, 500));
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'handler threw',
        _diag: { code: e?.code || 'unknown', msg: String(e?.message || e).slice(0, 500) },
      });
    }
  }
}
