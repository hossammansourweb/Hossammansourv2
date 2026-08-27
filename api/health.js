// Minimal probe — NO imports, NO firebase, NO require. If this returns
// JSON, then api/*.js files DO execute on Vercel. If this also returns
// text/plain 500, the problem is the function file itself (transpile,
// file discovery, or runtime mismatch).
module.exports = function handler(req, res) {
  res.status(200).json({
    ok: true,
    probe: 'health',
    node: process.version,
    vercel: process.env.VERCEL || 'n/a',
    region: process.env.VERCEL_REGION || 'n/a',
    files: {
      // list files we can see in /var/task and api
      cwd: process.cwd(),
      apiDir: (() => {
        try {
          const fs = require('fs');
          return fs.readdirSync('./api');
        } catch (e) {
          return 'ERR: ' + (e && e.code);
        }
      })(),
    },
  });
};
