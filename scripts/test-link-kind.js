// Runs the backend's link-kind test table against the copy in index.html
// (svcLinkKind / linkShape / deriveProfileLink / linkKindProblem).
// Usage: node scripts/test-link-kind.js <path to link_kind_cases.json>
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('const _PROFILE_PHRASES'), b = html.indexOf('function getLinkGuidance(svc)');
eval(html.slice(a, b).replace('function svcLinkKind', 'function _unusedSvcLinkKind'));
const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let bad = 0, n = 0;
const chk = (got, want, label) => { n++; if (got !== want) { bad++; console.log('FAIL', label, 'want', want, 'got', got); } };
c.shape.forEach(([u, w]) => chk(linkShape(u), w, u));
c.derive.forEach(([u, w]) => chk(deriveProfileLink(u), w, u));
c.kind.forEach(([nm, t, w]) => chk(linkKindOf(nm, t), w, nm));
c.video.forEach(([u, w]) => chk(isVideoLink(u), w, 'video ' + u));
c.problem.forEach(([need, u, w]) => chk(linkKindProblem(need, u) !== null, w, need + ' ' + u));
console.log(`${n - bad} / ${n} pass`);
process.exit(bad ? 1 : 0);
