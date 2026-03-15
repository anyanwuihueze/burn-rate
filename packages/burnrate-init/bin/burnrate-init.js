#!/usr/bin/env node
'use strict';

const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const readline = require('readline');
const { execSync } = require('child_process');

// COLOR FUNCTIONS FIRST
const bold    = s => `\x1b[1m${s}\x1b[0m`;
const green   = s => `\x1b[32m${s}\x1b[0m`;
const red     = s => `\x1b[31m${s}\x1b[0m`;
const cyan    = s => `\x1b[36m${s}\x1b[0m`;
const gray    = s => `\x1b[90m${s}\x1b[0m`;
const white   = s => `\x1b[37m${s}\x1b[0m`;
const yellow  = s => `\x1b[33m${s}\x1b[0m`;
const magenta = s => `\x1b[35m${s}\x1b[0m`;

// NOW load TypeScript - AFTER colors defined
let tsParser;
try {
  tsParser = require('typescript');
} catch {
  console.log(gray('TypeScript not installed, using enhanced regex mode'));
}

function spinner(text) {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  const iv = setInterval(() => { process.stdout.write(`\r${cyan(frames[i++ % frames.length])} ${gray(text)}`); }, 80);
  return {
    succeed: msg => { clearInterval(iv); process.stdout.write(`\r${green('✓')} ${msg}\n`); },
    fail:    msg => { clearInterval(iv); process.stdout.write(`\r${red('✗')} ${msg}\n`); },
    stop:    ()  => { clearInterval(iv); process.stdout.write(`\r${' '.repeat(text.length + 4)}\r`); },
  };
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, a => { rl.close(); resolve(a.trim()); }));
}
async function confirm(q) {
  const a = await ask(`${q} ${gray('(Y/n)')} `);
  return a === '' || a.toLowerCase() === 'y' || a.toLowerCase() === 'yes';
}

function inferFeatureFromPath(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  const cleaned = base
    .replace(/[-_](flow|assistant|handler|service|route|api|helper|util|utils|generator|client|server|controller|action)$/i, '')
    .toLowerCase();
  return cleaned.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untagged';
}

const AI_PATTERNS = {
  groq: { identifiers: ['groq', 'groqClient'], methods: ['chat.completions.create'], defaultModel: 'llama-3.3-70b-versatile' },
  openai: { identifiers: ['openai', 'client', 'openAI'], methods: ['chat.completions.create'], defaultModel: 'gpt-4o' },
  google: { identifiers: ['generativeModel', 'model', 'googleAI', 'gemini'], methods: ['generateContent'], defaultModel: 'gemini-2.0-flash' },
  anthropic: { identifiers: ['anthropic', 'claude'], methods: ['messages.create'], defaultModel: 'claude-3-5-sonnet-20241022' },
  openrouter: { endpoints: ['openrouter.ai/api/v1/chat/completions'], defaultModel: 'openrouter-model' },
  together: { endpoints: ['api.together.xyz/v1/chat/completions'], defaultModel: 'together-model' },
  replicate: { endpoints: ['api.replicate.com/v1/predictions'], defaultModel: 'replicate-model' },
  vercel_ai: { identifiers: ['generateText', 'generateObject', 'streamText'], defaultModel: 'vercel-ai-model' }
};

const SKIP = new Set(['node_modules','.git','dist','build','.next','.vercel','coverage','.cache','out','.turbo']);
const EXT  = new Set(['.ts','.tsx','.js','.jsx','.mjs']);

function detectAICallsRegex(filePath, content) {
  const matches = [];
  const lines = content.split('\n');
  
  const patterns = [
    { regex: /await\s+(groq|groqClient)\.chat\.completions\.create\s*\(/, provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { regex: /await\s+(openai|client|openAI)\.chat\.completions\.create\s*\(/, provider: 'openai', model: 'gpt-4o' },
    { regex: /await\s+(generativeModel|model|googleAI|gemini)\.(generateContent|generateContentStream)\s*\(/, provider: 'google', model: 'gemini-2.0-flash' },
    { regex: /await\s+(anthropic|claude)\.messages\.create\s*\(/, provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    { regex: /await\s+(generateText|generateObject|streamText|streamObject)\s*\(/, provider: 'vercel_ai', model: 'vercel-ai-model' },
    { regex: /await\s+fetch\s*\(\s*['"`]https:\/\/openrouter\.ai\/api\/v1\/chat\/completions['"`]/, provider: 'openrouter', model: 'openrouter-model' },
    { regex: /await\s+fetch\s*\(\s*['"`][^'"`]*(?:api|ai|llm)[^'"`]*(?:chat|completion|generate)[^'"`]*['"`]/i, provider: 'generic', model: 'unknown' },
    { regex: /await\s+fetch\s*\(\s*['"`]https:\/\/api\.together\.xyz\/v1\/chat\/completions['"`]/, provider: 'together', model: 'together-model' },
    { regex: /await\s+fetch\s*\(\s*['"`]https:\/\/api\.replicate\.com\/v1\/predictions['"`]/, provider: 'replicate', model: 'replicate-model' },
  ];

  lines.forEach((line, idx) => {
    for (const pattern of patterns) {
      if (pattern.regex.test(line) && !line.includes('__burnrateTracker') && !line.includes('track')) {
        matches.push({
          file: filePath,
          line: idx + 1,
          provider: pattern.provider,
          model: extractModelFromContext(lines, idx) || pattern.model,
          suggestedFeature: inferFeatureFromPath(filePath),
          originalLine: line
        });
        break;
      }
    }
  });

  return matches;
}

function extractModelFromContext(lines, idx) {
  const context = lines.slice(Math.max(0, idx - 10), Math.min(lines.length, idx + 10)).join('\n');
  const modelMatch = context.match(/model:\s*['"`]([^'"`]+)['"`]/);
  return modelMatch ? modelMatch[1] : null;
}

function scanFile(filePath) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); } catch { return []; }
  if (content.includes('__burnrateTracker') && content.includes('burnrate-sdk')) return [];
  return detectAICallsRegex(filePath, content);
}

function walkDir(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, results);
    else if (entry.isFile() && EXT.has(path.extname(entry.name))) results.push(...scanFile(full));
  }
  return results;
}

function findSafeImportInsertionPoint(lines) {
  let lastCompleteImport = 0;
  let insideMultiLine = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^import\s*\{/.test(line) && !line.includes('}')) { insideMultiLine = true; continue; }
    if (insideMultiLine) { if (line.includes('}')) { insideMultiLine = false; lastCompleteImport = i; } continue; }
    if (/^import\s/.test(line) || /^const\s.*require\(/.test(line)) lastCompleteImport = i;
  }
  return lastCompleteImport;
}

function getWrapFunction(provider, model) {
  const wrapMap = {
    groq: `__burnrateTracker.trackGroq('${model}', () =>`,
    openai: `__burnrateTracker.trackOpenAI('${model}', () =>`,
    google: `__burnrateTracker.trackGoogle('${model}', () =>`,
    anthropic: `__burnrateTracker.trackAnthropic('${model}', () =>`,
    openrouter: `__burnrateTracker.trackOpenRouter('${model}', () =>`,
    together: `__burnrateTracker.trackTogether('${model}', () =>`,
    replicate: `__burnrateTracker.trackReplicate('${model}', () =>`,
    vercel_ai: `__burnrateTracker.trackVercelAI('${model}', () =>`,
    generic: `__burnrateTracker.trackGeneric('${model}', () =>`,
  };
  return wrapMap[provider] || wrapMap.generic;
}

function patchContent(content, matches, featureTag) {
  const lines = content.split('\n');
  const patched = [...lines];
  matches.sort((a, b) => b.line - a.line);
  
  for (const match of matches) {
    const lineIdx = match.line - 1;
    const line = lines[lineIdx];
    if (!line || line.includes('__burnrateTracker')) continue;
    
    const wrapFn = getWrapFunction(match.provider, match.model);
    
    if (line.includes('await')) {
      const awaitIdx = line.indexOf('await');
      const beforeAwait = line.substring(0, awaitIdx);
      const afterAwait = line.substring(awaitIdx + 5).trim();
      const newLine = `${beforeAwait}await ${wrapFn} ${afterAwait}, '${featureTag}')`;
      patched[lineIdx] = newLine;
    }
  }
  return patched.join('\n');
}

function patchFile(filePath, matches, apiKey, featureTag) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); } catch (e) { 
    return { file: filePath, count: 0, success: false, error: e.message }; 
  }
  try { fs.writeFileSync(filePath + '.burnrate-backup', content); } catch {}
  
  const sdkPath = '@/lib/burnrate-sdk';
  const importLine = `import { BurnRateTracker } from '${sdkPath}';`;
  const lines = content.split('\n');
  const safePoint = findSafeImportInsertionPoint(lines);
  lines.splice(safePoint + 1, 0, importLine);
  
  const initBlock = `const __burnrateTracker = new BurnRateTracker({ apiKey: process.env.BURNRATE_API_KEY || '${apiKey}' });\n`;
  let insertAt = -1;
  for (let i = safePoint + 2; i < lines.length; i++) {
    if (/^(export\s+)?(async\s+)?function\s+\w|^(export\s+)?class\s+\w|^const\s+\w+\s*=/.test(lines[i])) {
      insertAt = i;
      break;
    }
  }
  if (insertAt === -1) insertAt = safePoint + 2;
  lines.splice(insertAt, 0, initBlock);
  content = lines.join('\n');
  
  const patched = patchContent(content, matches, featureTag);
  try { 
    fs.writeFileSync(filePath, patched); 
    return { file: filePath, count: matches.length, success: true, feature: featureTag }; 
  }
  catch (e) { 
    return { file: filePath, count: 0, success: false, error: e.message }; 
  }
}

function rollbackAll(byFile) {
  console.log(yellow('\n⚠  Rolling back...'));
  for (const [filePath] of byFile) {
    const backup = filePath + '.burnrate-backup';
    if (fs.existsSync(backup)) {
      try { fs.copyFileSync(backup, filePath); fs.unlinkSync(backup); }
      catch { }
    }
  }
}

function runTypeCheck(cwd) {
  try {
    execSync('npx tsc --noEmit', { cwd, stdio: 'pipe', timeout: 30000 });
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

function writeEnv(cwd, apiKey) {
  const envPath = path.join(cwd, '.env.local');
  let existing = '';
  try { existing = fs.readFileSync(envPath, 'utf-8'); } catch {}
  if (existing.includes('BURNRATE_API_KEY')) return;
  fs.appendFileSync(envPath, `\nBURNRATE_API_KEY=${apiKey}\n`);
}

function findLibDir(cwd) {
  for (const c of [path.join(cwd,'src','lib'), path.join(cwd,'lib'), path.join(cwd,'src')]) {
    if (fs.existsSync(c)) return c;
  }
  const def = path.join(cwd, 'src', 'lib');
  fs.mkdirSync(def, { recursive: true });
  return def;
}

function rel(cwd, full) { return path.relative(cwd, full); }

async function main() {
  const cwd = process.cwd();
  console.log('\n' + bold(cyan('⚡ BurnRate Init')) + gray(' v2.1.3'));
  console.log(gray('Universal AI API tracking') + '\n');
  console.log(white('Get API key: ') + cyan('https://burn-rate-zeta.vercel.app') + '\n');

  let apiKey = await ask(white('? Paste BurnRate API key: '));
  while (!apiKey || !apiKey.startsWith('br_live_')) {
    console.log(red('  Key must start with br_live_'));
    apiKey = await ask(white('? Paste BurnRate API key: '));
  }

  const scanSpin = spinner('Scanning for AI calls...');
  const matches = walkDir(cwd);
  scanSpin.stop();

  if (!matches.length) {
    console.log(yellow('\n⚠  No untracked AI calls found.\n'));
    process.exit(0);
  }

  const byFile = new Map();
  for (const m of matches) { if (!byFile.has(m.file)) byFile.set(m.file, []); byFile.get(m.file).push(m); }

  const counts = {};
  for (const m of matches) counts[m.provider] = (counts[m.provider] || 0) + 1;
  console.log(green(`\n✓ Found ${matches.length} AI calls:\n`));
  
  const icons = { groq: '🟠', openai: '🟢', google: '🔵', anthropic: '🟣', openrouter: '🔴', together: '🟡', replicate: '⚪', vercel_ai: '⚫', generic: '💿' };
  for (const [p, n] of Object.entries(counts)) {
    console.log(`  ${icons[p] || '⚪'}  ${white(p.padEnd(15))} ${gray(n + ' calls')}`);
  }
  
  console.log('');
  for (const [file, ms] of byFile) {
    console.log(`  ${cyan(rel(cwd, file))}`);
    for (const m of ms) console.log(`    ${gray('L' + m.line + ':')} ${m.originalLine.trim().slice(0, 55)}`);
  }

  const ok = await confirm(`\n${white('Patch ' + matches.length + ' calls?')}`);
  if (!ok) { console.log(gray('\nCancelled.\n')); process.exit(0); }

  const featureMap = new Map();
  console.log('\n' + bold(magenta('🏷  Feature Tags')) + '\n');
  for (const [filePath, fileMatches] of byFile) {
    const suggested = fileMatches[0].suggestedFeature;
    const relPath = path.relative(cwd, filePath);
    process.stdout.write(`  ${cyan(relPath)} ${gray('[' + suggested + ']')}: `);
    const input = await ask('');
    const tag = input.trim().replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || suggested;
    featureMap.set(filePath, tag);
    console.log(`  ${green('✓')} ${magenta(tag)}\n`);
  }

  const sdkDir = findLibDir(cwd);
  const sdkPath = path.join(sdkDir, 'burnrate-sdk.ts');
  
  // Write SDK inline to avoid template literal issues
  const sdkContent = `// BurnRate SDK v2.1.3
const SUPABASE_URL = 'https://thbpkpynvoueniovmdop.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYnBrcHludm91ZW5pb3ZtZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTI5MTAsImV4cCI6MjA4NzA4ODkxMH0.tIzHk1eWEd7NrF21jdP6FiwgwEp3EjGikcHC1xs9Lak';

export class BurnRateTracker {
  userId: string; budget: number; queue: any[]; timer: any;
  constructor(config: { apiKey: string; monthlyBudget?: number }) {
    const match = (config.apiKey || '').match(/br_live_([a-f0-9-]{36})/i);
    this.userId = match ? match[1] : '';
    this.budget = config.monthlyBudget || 200;
    this.queue = []; this.timer = setInterval(() => this.flush(), 5000);
    if (!this.userId) console.warn('[BurnRate] Invalid API key');
  }
  cost(model: string, input: number, output: number): number {
    const prices: Record<string, [number, number]> = {
      'gpt-4o': [0.005, 0.015], 'gpt-4o-mini': [0.00015, 0.0006], 'gpt-4': [0.03, 0.06], 'gpt-3.5-turbo': [0.0005, 0.0015],
      'claude-3-5-sonnet-20241022': [0.003, 0.015], 'claude-3-haiku': [0.00025, 0.00125], 'claude-3-opus': [0.015, 0.075],
      'gemini-2.0-flash': [0.0001, 0.0004], 'gemini-1.5-pro': [0.00125, 0.005], 'gemini-1.5-flash': [0.000075, 0.0003],
      'llama-3.3-70b-versatile': [0.00059, 0.00079], 'llama-3.1-8b-instant': [0.00005, 0.00008],
      'googleai/gemini-1.5-flash': [0.000075, 0.0003], 'openai/gpt-4o': [0.005, 0.015], 'anthropic/claude-3.5-sonnet': [0.003, 0.015],
    };
    const [i, o] = prices[model] || [0.001, 0.001];
    return ((input * i) + (output * o)) / 1000;
  }
  async track(provider: string, model: string, fn: () => any, feature?: string): Promise<any> {
    const t = Date.now();
    try {
      const res = await fn();
      let inp = 0, out = 0;
      if (res?.usage) { inp = res.usage.prompt_tokens || 0; out = res.usage.completion_tokens || 0; }
      else if (res?.usageMetadata) { inp = res.usageMetadata.promptTokenCount || 0; out = res.usageMetadata.candidatesTokenCount || 0; }
      this.queue.push({ user_id: this.userId, provider, model, tokens_input: inp, tokens_output: out, cost: this.cost(model, inp, out), timestamp: new Date().toISOString(), feature: feature || null, metadata: { latency_ms: Date.now() - t, status: 'success' } });
      void this.flush(); return res;
    } catch (err: any) {
      this.queue.push({ user_id: this.userId, provider, model, tokens_input: 0, tokens_output: 0, cost: 0, timestamp: new Date().toISOString(), feature: feature || null, metadata: { error: err.message, latency_ms: Date.now() - t, status: 'error' } });
      void this.flush(); throw err;
    }
  }
  trackGroq(model: string, fn: () => any, feature?: string) { return this.track('groq', model, fn, feature); }
  trackOpenAI(model: string, fn: () => any, feature?: string) { return this.track('openai', model, fn, feature); }
  trackGoogle(model: string, fn: () => any, feature?: string) { return this.track('google', model, fn, feature); }
  trackAnthropic(model: string, fn: () => any, feature?: string) { return this.track('anthropic', model, fn, feature); }
  trackOpenRouter(model: string, fn: () => any, feature?: string) { return this.track('openrouter', model, fn, feature); }
  trackTogether(model: string, fn: () => any, feature?: string) { return this.track('together', model, fn, feature); }
  trackReplicate(model: string, fn: () => any, feature?: string) { return this.track('replicate', model, fn, feature); }
  trackVercelAI(model: string, fn: () => any, feature?: string) { return this.track('vercel-ai', model, fn, feature); }
  trackNvidia(model: string, fn: () => any, feature?: string) { return this.track('nvidia', model, fn, feature); }
  trackGeneric(model: string, fn: () => any, feature?: string) { return this.track('generic', model, fn, feature); }
  async flush(): Promise<void> {
    if (!this.queue.length) return;
    const batch = [...this.queue]; this.queue = [];
    try {
      const r = await fetch(SUPABASE_URL + '/functions/v1/track-usage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY }, body: JSON.stringify({ metrics: batch }) });
      if (!r.ok) this.queue.unshift(...batch);
    } catch { this.queue.unshift(...batch); }
  }
  async stop(): Promise<void> { clearInterval(this.timer); await this.flush(); }
}
`;
  
  fs.writeFileSync(sdkPath, sdkContent);
  console.log(green('✓ SDK v2.1.3 ready'));

  writeEnv(cwd, apiKey);
  console.log(green('✓ API key added'));

  const patchSpin = spinner('Patching...');
  const results = [];
  for (const [filePath, fileMatches] of byFile) {
    results.push(patchFile(filePath, fileMatches, apiKey, featureMap.get(filePath)));
  }
  patchSpin.stop();

  const good = results.filter(r => r.success);
  const total = good.reduce((s, r) => s + r.count, 0);
  console.log(green(`\n✓ Patched ${total} calls in ${good.length} files`));

  const check = runTypeCheck(cwd);
  if (!check.ok) {
    console.log(red('\n✗ TypeScript errors, rolling back...'));
    rollbackAll(byFile);
    process.exit(1);
  }

  console.log(bold(green('\n🚀 Done!\n')));
  console.log(gray('Next: run app, trigger AI, check dashboard'));
}

main().catch(err => { console.error(red('\n✗ ' + err.message)); process.exit(1); });
