// Dependency-free Chrome DevTools Protocol driver for the local-only UAT API.
// Usage: node scripts/property-write-browser-uat.mjs <chrome.exe> <temporary-profile-directory>
// Requires property-write-uat.mjs :3099 and Admin (API_URL=:3099) :3101.
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import process from "node:process";

const chrome = spawn(
  process.argv[2],
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-pipe",
    `--user-data-dir=${process.argv[3]}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] },
);
let sequence = 0;
let buffer = "";
const pending = new Map();
chrome.stdio[4].on("data", (chunk) => {
  buffer += chunk.toString();
  let end;
  while ((end = buffer.indexOf("\0")) >= 0) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    const callback = pending.get(message.id);
    if (callback) {
      pending.delete(message.id);
      if (message.error) {
        callback.reject(new Error(JSON.stringify(message.error)));
      } else {
        callback.resolve(message.result);
      }
    }
  }
});
const command = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    chrome.stdio[3].write(
      JSON.stringify({
        id,
        method,
        params,
        ...(sessionId ? { sessionId } : {}),
      }) + "\0",
    );
  });
const deadline = setTimeout(() => {
  chrome.kill();
  console.error("UAT timed out");
  process.exit(1);
}, 120000);

try {
  await fetch("http://127.0.0.1:3099/__reset");
  const { targetId } = await command("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await command("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const evaluate = async (expression) => {
    const result = await command(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (result.exceptionDetails)
      throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = (expression) =>
    evaluate(
      `new Promise((resolve, reject) => { const started = Date.now(); const check = () => { if (${expression}) resolve(true); else if (Date.now() - started > 60000) reject(new Error('Condition timed out')); else setTimeout(check, 100); }; check(); })`,
    );
  await command("Page.enable", {}, sessionId);
  await command(
    "Page.navigate",
    { url: "http://localhost:3099/session" },
    sessionId,
  );
  // Navigation switches execution contexts; the load event is followed by this
  // DOM wait rather than relying on request-count/network-idle heuristics.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await wait(
    `document.querySelector('input[placeholder="Departamento en Palermo"]') && [...document.querySelectorAll('button')].some(b => b.textContent.includes('Guardar'))`,
  );
  await wait(
    `Object.keys(document.querySelector('form')).some(key => key.startsWith('__reactProps'))`,
  );

  const clear = () => fetch("http://127.0.0.1:3099/__clear-trace");
  const trace = async () =>
    (await fetch("http://127.0.0.1:3099/__trace")).json();
  const save = async () => {
    await evaluate(
      `[...document.querySelectorAll('button')].find(b => b.textContent.includes('Guardar')).click()`,
    );
    await wait(
      `document.body?.textContent.includes('Propiedad actualizada correctamente.') && ![...document.querySelectorAll('button')].find(b => b.textContent.includes('Guardar'))?.disabled`,
    );
    // Let the separately scheduled router.refresh settle when present.
    await new Promise((resolve) => setTimeout(resolve, 750));
  };
  const text = `P1.2 título ${Date.now()}`;
  await clear();
  await evaluate(
    `(() => { const input = document.querySelector('input[placeholder="Departamento en Palermo"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(text)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await save();
  await wait(
    `document.querySelector('h1')?.textContent.includes(${JSON.stringify(text)})`,
  );
  const first = await trace();
  assert.deepEqual(
    first.filter((item) => item.method === "PATCH").map((item) => item.body),
    [{ title: text }],
  );
  assert.equal(first.filter((item) => item.method === "PUT").length, 0);
  assert.equal(
    first.filter((item) => item.path.endsWith("/detail-context")).length,
    1,
  );
  console.info(
    JSON.stringify({ step: "title", headerUpdated: true, trace: first }),
  );

  // A subsequent attribute save must carry an empty PATCH, preserve other
  // features and update the executive count through the real RSC response.
  await clear();
  await evaluate(
    `document.querySelectorAll('input[type="checkbox"]')[3].click()`,
  );
  await save();
  const second = await trace();
  assert.deepEqual(
    second.filter((item) => item.method === "PATCH").map((item) => item.body),
    [{}],
  );
  assert.equal(second.filter((item) => item.method === "PUT").length, 1);
  assert.equal(
    second.filter((item) => item.path.endsWith("/detail-context")).length,
    2,
  );
  assert.equal(
    await evaluate(
      `document.querySelectorAll('input[type="checkbox"]')[3].checked`,
    ),
    true,
  );
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('p')].find(p => p.textContent === 'Características')?.nextElementSibling?.textContent`,
    ),
    "3",
  );
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('p')].find(p => p.textContent === 'Publicable')?.nextElementSibling?.textContent`,
    ),
    "1/1",
  );
  console.info(JSON.stringify({ step: "attributes", trace: second }));

  // Browser navigation back to the list must show the persisted title.
  await evaluate(`document.querySelector('a[href="/propiedades"]').click()`);
  await wait(
    `location.pathname === '/propiedades' && document.body.textContent.includes(${JSON.stringify(text)})`,
  );
  console.info(JSON.stringify({ step: "list", persistedTitleVisible: true }));
  await command(
    "Emulation.setDeviceMetricsOverride",
    { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await command(
    "Page.navigate",
    { url: "http://localhost:3101/propiedades/property-1" },
    sessionId,
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await wait(
    `document.querySelector('h1')?.textContent.includes(${JSON.stringify(text)})`,
  );
  assert.equal(
    await evaluate(
      `document.querySelector('input[placeholder="Departamento en Palermo"]').value`,
    ),
    text,
  );
  console.info(
    JSON.stringify({ step: "mobile-reload", titleVisible: true, width: 390 }),
  );
} finally {
  clearTimeout(deadline);
  chrome.kill();
}
