// client.js — DICOM SCU using this library's echoScu/storeScu. Prints one JSON line {ok, f}.
//   node client.js <libDir> echo  <port> <count> <concurrency>
//   node client.js <libDir> store <port> <dicomDir> <repeats>
'use strict';
const path = require('path');
const [libDir, mode, port, a, b] = process.argv.slice(2);
const { echoScu, storeScu } = require(path.resolve(libDir, 'index.js'));
const source = { aet: 'STRESS_SCU', ip: '127.0.0.1', port: 9999 }; // not listened on; 0 is rejected
const target = { aet: 'PACS_TESTE', ip: '127.0.0.1', port: Number(port) };

let firstError = null;
function once(fn, opts) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { firstError = firstError || 'timeout (60 s)'; resolve(false); }, 60000);
    fn(opts, (res) => {
      let r; try { r = JSON.parse(res); } catch (_) { return; }
      if (r.code === 1) return;              // progress
      clearTimeout(timer);
      if (r.code !== 0 && !firstError) firstError = String(r.message || JSON.stringify(r)).slice(0, 300);
      resolve(r.code === 0);
    });
  });
}

(async () => {
  let ok = 0, f = 0;
  if (mode === 'echo') {
    const total = Number(a), conc = Number(b);
    let started = 0;
    const worker = async () => { while (started < total) { started++; (await once(echoScu, { source, target })) ? ok++ : f++; } };
    await Promise.all(Array.from({ length: conc }, worker));
  } else {
    for (let i = 0; i < Number(b); i++) (await once(storeScu, { source, target, sourcePath: path.resolve(a) })) ? ok++ : f++;
  }
  console.log(JSON.stringify({ ok, f, err: firstError }));
  process.exit(0);
})();
