import { readFile } from 'node:fs/promises';

const bank = JSON.parse(await readFile(new URL('../seed/questions.json', import.meta.url), 'utf8'));
const sources = [...new Set(bank.questions.map(question => question.source))].sort();

async function check(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'user-agent': 'HuroofAlKora-SourceCheck/1.0' },
        signal: AbortSignal.timeout(20_000),
      });
      await response.body?.cancel();
      if (response.ok) return { url, status: response.status };
      if (attempt === 2) return { url, status: response.status, error: `HTTP ${response.status}` };
    } catch (error) {
      if (attempt === 2) return { url, status: 0, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

const results = [];
for (let index = 0; index < sources.length; index += 6)
  results.push(...await Promise.all(sources.slice(index, index + 6).map(check)));

for (const result of results)
  console.log(`${result.status || 'ERR'}\t${result.url}${result.error ? `\t${result.error}` : ''}`);

const failed = results.filter(result => !result.status || result.status >= 400);
console.log(`Checked ${results.length} unique sources; ${failed.length} failed.`);
if (failed.length) process.exitCode = 1;
