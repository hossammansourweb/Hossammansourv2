process.env.VERCEL = '1';
// Simulate missing Firebase credentials (as on a fresh Vercel deploy)
delete process.env.FIREBASE_SERVICE_ACCOUNT;
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

const handler = require('C:\\Users\\WAFAA3~1\\AppData\\Local\\Temp\\opencode\\api-test-bundle.cjs').default;

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    ended: false,
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    getHeader(k) { return this.headers[k.toLowerCase()]; },
    json(obj) { this.body = JSON.stringify(obj); this.ended = true; return this; },
    send(v) { this.body = (typeof v === 'string') ? v : JSON.stringify(v); this.ended = true; return this; },
    end(v) { if (v) this.body = v; this.ended = true; },
  };
  return res;
}

const req = {
  method: 'GET',
  url: '/api/public/clinic-info',
  originalUrl: '/api/public/clinic-info',
  headers: {},
  query: {},
};

const res = makeRes();
Promise.resolve(handler(req, res)).then(() => {
  console.log('STATUS:', res.statusCode);
  console.log('CONTENT-TYPE:', res.getHeader('content-type'));
  console.log('BODY:', String(res.body).slice(0, 300));
}).catch(e => {
  console.log('HANDLER THREW (uncaught):', e && e.message);
  console.log(e && e.stack);
});
