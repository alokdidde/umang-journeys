import { readFile } from "node:fs/promises";

const sourcePath = new URL("../src/domain/journey-engine.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const urls = [...new Set([...source.matchAll(/"(https:\/\/[^"\s]+)"/g)].map((match) => match[1]))];
const verifiedDates = [...source.matchAll(/verifiedOn\s*[:=]\s*"(\d{4}-\d{2}-\d{2})"/g)].map((match) => match[1]);
const cutoff = new Date();
cutoff.setUTCDate(cutoff.getUTCDate() - 120);

if (!urls.length) throw new Error("No official service URLs were found.");
if (verifiedDates.some((value) => new Date(`${value}T00:00:00.000Z`) < cutoff)) {
  throw new Error("One or more official sources have not been reviewed in the last 120 days.");
}

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const headers = {
      "user-agent": "Mozilla/5.0 (compatible; UMANG-Journeys-source-verifier/1.0)",
      accept: "text/html,application/pdf;q=0.9,*/*;q=0.8",
    };
    let response = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal, headers });
    // A number of Indian government hosts return a synthetic 404 for HEAD even
    // when an ordinary browser GET succeeds. Confirm every failed HEAD with GET.
    if (response.status >= 400 && ![401, 403, 429].includes(response.status)) {
      response = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal, headers: { ...headers, range: "bytes=0-1024" } });
    }
    const reachable = response.status < 400 || response.status === 401 || response.status === 403 || response.status === 429;
    return { url, status: response.status, reachable, finalUrl: response.url };
  } catch (error) {
    return { url, status: null, reachable: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
let cursor = 0;
await Promise.all(Array.from({ length: Math.min(16, urls.length) }, async () => {
  while (cursor < urls.length) {
    const index = cursor;
    cursor += 1;
    results[index] = await check(urls[index]);
  }
}));
const hardFailures = results.filter((result) => result.status === 404 || result.status === 410);
const unconfirmed = results.filter((result) => !result.reachable && !hardFailures.includes(result));

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), sources: results.length, reachable: results.filter((result) => result.reachable).length, unconfirmed: unconfirmed.length, hardFailures }, null, 2));
if (hardFailures.length) process.exitCode = 1;
