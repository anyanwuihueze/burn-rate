#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

// ─── Colors ───────────────────────────────────────────────
const bold   = s => `\x1b[1m${s}\x1b[0m`;
const green  = s => `\x1b[32m${s}\x1b[0m`;
const red    = s => `\x1b[31m${s}\x1b[0m`;
const cyan   = s => `\x1b[36m${s}\x1b[0m`;
const gray   = s => `\x1b[90m${s}\x1b[0m`;
const white  = s => `\x1b[37m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const magenta = s => `\x1b[35m${s}\x1b[0m`;

// ─── Spinner ──────────────────────────────────────────────
function spinner(text) {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  const iv = setInterval(() => {
    process.stdout.write(`\r${cyan(frames[i++ % frames.length])} ${gray(text)}`);
  }, 80);
  return {
    succeed: msg => { clearInterval(iv); process.stdout.write(`\r${green('✓')} ${msg}\n`); },
    fail:    msg => { clearInterval(iv); process.stdout.write(`\r${red('✗')} ${msg}\n`); },
    stop:    ()  => { clearInterval(iv); process.stdout.write(`\r${' '.repeat(text.length + 4)}\r`); },
  };
}

// ─── Prompt ───────────────────────────────────────────────
function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, a => { rl.close(); resolve(a.trim()); }));
}
async function confirm(q) {
  const a = await ask(`${q} ${gray('(Y/n)')} `);
  return a === '' || a.toLowerCase() === 'y' || a.toLowerCase() === 'yes';
}

// ─── Feature name auto-detection from file path ───────────
// Tries to derive a meaningful feature tag from the file path and surrounding code context.
// e.g. "src/ai/flows/visa-chat-assistant.ts" → "visa-chat"
//      "src/ai/flows/interview-flow.ts"       → "interview"
//      "src/ai/insights-generator.ts"         → "insights"
function inferFeatureFromPath(filePath) {
  const base = path.basename(filePath, path.extname(filePath));

  // Strip common suffixes that don't add meaning
  const cleaned = base
    .replace(/[-_](flow|assistant|handler|service|route|api|helper|util|utils|generator|client|server)$/i, '')
    .replace(/[-_](flow|assistant|handler|service|route|api|helper|util|utils|generator|client|server)$/i, '') // double pass
    .toLowerCase();

  // Convert to kebab-case slug
  return cleaned.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untagged';
}

// ─── Patterns ─────────────────────────────────────────────
const PATTERNS = {
  groq: [
    { re: /groq\.chat\.completions\.create\s*\(/,       wrap: (m, f) => `__burnrateTracker.trackGroq('${m}', () => groq.chat.completions.create(` },
    { re: /groqClient\.chat\.completions\.create\s*\(/, wrap: (m, f) => `__burnrateTracker.trackGroq('${m}', () => groqClient.chat.completions.create(` },
  ],
  openai: [
    { re: /openai\.chat\.completions\.create\s*\(/,     wrap: (m, f) => `__burnrateTracker.trackOpenAI('${m}', () => openai.chat.completions.create(` },
    { re: /client\.chat\.completions\.create\s*\(/,     wrap: (m, f) => `__burnrateTracker.trackOpenAI('${m}', () => client.chat.completions.create(` },
  ],
  google: [
    { re: /generativeModel\.generateContent\s*\(/,      wrap: (m, f) => `__burnrateTracker.trackGoogle('${m}', () => generativeModel.generateContent(` },
    { re: /(?<!\w)model\.generateContent\s*\(/,         wrap: (m, f) => `__burnrateTracker.trackGoogle('${m}', () => model.generateContent(` },
  ],
  anthropic: [
    { re: /anthropic\.messages\.create\s*\(/,           wrap: (m, f) => `__burnrateTracker.trackAnthropic('${m}', () => anthropic.messages.create(` },
  ],
};

const DEFAULT_MODELS = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o',
  google: 'gemini-2.0-flash',
  anthropic: 'claude-3-5-sonnet-20241022',
};
const SKIP = new Set(['node_modules','.git','dist','build','.next','.vercel','coverage','.cache','out']);
const EXT  = new Set(['.ts','.tsx','.js','.jsx','.mjs']);

// ─── Scanner ──────────────────────────────────────────────
function extractModel(lines, idx, provider) {
  const win = lines.slice(idx, idx + 12).join('\n');
  const m = win.match(/model:\s*['"`]([^'"`]+)['"`]/);
  return m ? m[1] : DEFAULT_MODELS[provider] || 'unknown';
}

function scanFile(filePath) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); } catch { return []; }
  if (content.includes('__burnrateTracker') || content.includes('burnrate-sdk')) return [];
  const lines = content.split('\n');
  const matches = [];
  const seenLines = new Set();
  for (const [provider, pats] of Object.entries(PATTERNS)) {
    for (const { re } of pats) {
      lines.forEach((line, idx) => {
        if (seenLines.has(idx)) return;
        if (re.test(line) && line.includes('await') && !line.includes('track')) {
          seenLines.add(idx);
          matches.push({
            file: filePath,
            line: idx + 1,
            lineIdx: idx,
            provider,
            originalLine: line,
            model: extractModel(lines, idx, provider),
            suggestedFeature: inferFeatureFromPath(filePath),
          });
        }
      });
    }
  }
  return matches;
}

// ─── Retag: scan already-patched files for missing feature arg ───────
function scanFileForRetag(filePath) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); } catch { return []; }
  if (!content.includes('__burnrateTracker')) return [];
  const lines = content.split('\n');
  const matches = [];
  const retagRe = /trackGroq|trackOpenAI|trackGoogle|trackAnthropic|trackNvidia/;
  lines.forEach((line, idx) => {
    if (retagRe.test(line) && line.includes('await')) {
      const provider = line.includes('trackGroq') ? 'groq'
        : line.includes('trackOpenAI') ? 'openai'
        : line.includes('trackGoogle') ? 'google'
        : line.includes('trackAnthropic') ? 'anthropic' : 'nvidia';
      matches.push({ file: filePath, line: idx + 1, provider, originalLine: line, suggestedFeature: inferFeatureFromPath(filePath), isRetag: true });
    }
  });
  return matches;
}

function walkDirForRetag(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDirForRetag(full, results);
    else if (entry.isFile() && EXT.has(path.extname(entry.name))) results.push(...scanFileForRetag(full));
  }
  return results;
}

// ─── Retag patcher: injects feature tag into already-wrapped calls ───
function retagFile(filePath, featureTag) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); } catch (e) {
    return { file: filePath, count: 0, success: false, error: e.message };
  }
  try { fs.writeFileSync(filePath + '.burnrate-backup', content); } catch {}

  const lines = content.split('\n');
  const patched = [];
  let i = 0;
  let count = 0;
  const trackStartRe = /await\s+__burnrateTracker\.(trackGroq|trackOpenAI|trackGoogle|trackAnthropic|trackNvidia)\(/;

  while (i < lines.length) {
    const line = lines[i];
    if (trackStartRe.test(line)) {
      // Collect all lines of this call until parens balance
      let depth = 0;
      const callLines = [];
      let j = i;
      while (j < lines.length) {
        const l = lines[j];
        for (const ch of l) {
          if (ch === '(') depth++;
          if (ch === ')') depth--;
        }
        callLines.push(l);
        j++;
        if (depth === 0) break;
      }
      // Check if already tagged — look for 3rd string arg pattern
      const full = callLines.join('\n');
      const alreadyTagged = /,\s*'[a-z][a-z0-9-]*'\s*\)/.test(full);
      if (!alreadyTagged) {
        // Replace the final )); with ), 'feature');
        const lastIdx = callLines.length - 1;
        callLines[lastIdx] = callLines[lastIdx].replace(/\)\s*;(\s*)$/, `), '${featureTag}';$1`);
        count++;
      }
      for (const l of callLines) patched.push(l);
      i = j;
    } else {
      patched.push(line);
      i++;
    }
  }

  try {
    fs.writeFileSync(filePath, patched.join('\n'));
    return { file: filePath, count, success: true, feature: featureTag };
  } catch (e) {
    return { file: filePath, count: 0, success: false, error: e.message };
  }
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

// ─── Patcher (line-by-line with balanced parens) ─────────
// KEY CHANGE v2.0: appends the feature string as a 3rd arg after the closing ))
function patchContent(content, patternRe, wrapFn, model, feature) {
  const lines = content.split('\n');
  const patched = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const awaitPattern = new RegExp('await\\s+' + patternRe.source);

    if (awaitPattern.test(line) && !line.includes('track')) {
      const newLine = line.replace(awaitPattern, () => 'await ' + wrapFn(model, feature));
      patched.push(newLine);
      i++;

      let extraOpen = 1;
      while (i < lines.length && extraOpen > 0) {
        const l = lines[i];
        for (const ch of l) {
          if (ch === '(') extraOpen++;
          if (ch === ')') extraOpen--;
        }
        if (extraOpen === 0) {
          // v2.0 CHANGE: close arrow fn wrapper AND add feature as 3rd arg
          // Before: ...));
          // After:  ...}, '${feature}'));
          // The inner arrow function ends with ), then we need ), feature)
          patched.push(l.replace(/\)(\s*);(\s*)$/, (_, trailing, ws) => {
            return `), '${feature}')${trailing};${ws}`;
          }));
        } else {
          patched.push(l);
        }
        i++;
      }
    } else {
      patched.push(line);
      i++;
    }
  }

  return patched.join('\n');
}

// ─── Ask user for feature tags per-file ──────────────────
// Groups matches by file, shows the suggested tag, lets user confirm or rename.
// Returns a Map<filePath, featureTag>
async function collectFeatureTags(byFile, cwd) {
  const featureMap = new Map(); // filePath → featureTag

  console.log('\n' + bold(magenta('🏷  Feature Tagging (v2.0)')) + '\n');
  console.log(gray('  Each file needs a feature tag so BurnRate can break costs down by feature.'));
  console.log(gray('  Press Enter to accept the suggestion, or type your own name.\n'));
  console.log(gray('  Good names: visa-chat, interview, insights, rejection-reversal, auth, search\n'));

  for (const [filePath, matches] of byFile) {
    const suggested = matches[0].suggestedFeature;
    const relPath = path.relative(cwd, filePath);
    const providers = [...new Set(matches.map(m => m.provider))].join(', ');

    process.stdout.write(
      `  ${cyan(relPath)}\n` +
      `  ${gray(providers + ' · ' + matches.length + ' call' + (matches.length !== 1 ? 's' : ''))}\n` +
      `  Feature tag ${gray('[' + suggested + ']')}: `
    );

    const input = await ask('');
    const tag = input.trim().replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || suggested;

    featureMap.set(filePath, tag);
    // Clear last line and show confirmation
    process.stdout.moveCursor?.(0, -1);
    process.stdout.clearLine?.(0);
    console.log(`  ${green('✓')} ${cyan(relPath)} ${gray('→')} ${magenta(tag)}\n`);
  }

  return featureMap;
}

function patchFile(filePath, matches, apiKey, featureTag) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); } catch (e) {
    return { file: filePath, count: 0, success: false, error: e.message };
  }

  // Backup original
  try { fs.writeFileSync(filePath + '.burnrate-backup', content); } catch {}

  // Detect import style
  const hasAlias = content.includes("from '@/") || content.includes('from "@/');
  const sdkPath = hasAlias ? '@/lib/burnrate-sdk' : './lib/burnrate-sdk';

  // 1. Inject SDK import after last existing import
  const importLine = `import { BurnRateTracker } from '${sdkPath}';`;
  const lines = content.split('\n');
  let lastImport = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i]) || /^const\s.*require\(/.test(lines[i])) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, importLine);
  content = lines.join('\n');

  // 2. Inject tracker init before first exported function
  const initBlock = `\nconst __burnrateTracker = new BurnRateTracker({ apiKey: process.env.BURNRATE_API_KEY || '${apiKey}' });\n`;
  const newLines = content.split('\n');
  let insertAt = -1;
  for (let i = 0; i < newLines.length; i++) {
    if (/^export\s+(async\s+)?function/.test(newLines[i]) || /^(async\s+)?function\s+\w/.test(newLines[i])) {
      insertAt = i; break;
    }
  }
  if (insertAt === -1) insertAt = lastImport + 2;
  newLines.splice(insertAt, 0, initBlock);
  content = newLines.join('\n');

  // 3. Wrap each detected call — now passing featureTag
  let patchCount = 0;
  for (const match of matches) {
    for (const { re, wrap } of PATTERNS[match.provider] || []) {
      const before = content;
      content = patchContent(content, re, wrap, match.model, featureTag);
      if (content !== before) patchCount++;
    }
  }

  try {
    fs.writeFileSync(filePath, content);
    return { file: filePath, count: patchCount, success: true, feature: featureTag };
  } catch (e) {
    return { file: filePath, count: 0, success: false, error: e.message };
  }
}

// ─── Bundled SDK ──────────────────────────────────────────
// This is the v2.0 SDK with feature parameter support
const SDK_CONTENT = `// BurnRate SDK v2.0 — auto-installed by burnrate-init
// Docs: https://burn-rate-zeta.vercel.app

const SUPABASE_URL = 'https://thbpkpynvoueniovmdop.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYnBrcHludm91ZW5pb3ZtZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTI5MTAsImV4cCI6MjA4NzA4ODkxMH0.tIzHk1eWEd7NrF21jdP6FiwgwEp3EjGikcHC1xs9Lak';

export class BurnRateTracker {
  constructor(config) {
    const without = (config.apiKey || '').replace(/^br_live_/, '');
    this.userId = without.length >= 36 ? without.substring(0, 36) : without;
    this.budget = config.monthlyBudget || 200;
    this.queue  = [];
    this.timer  = setInterval(() => this.flush(), 5000);
    if (!this.userId) console.warn('[BurnRate] Invalid API key. Get yours at https://burn-rate-zeta.vercel.app');
  }

  cost(model, input, output) {
    const p = {
      'gpt-4o':[0.005,0.015],'gpt-4o-mini':[0.00015,0.0006],'gpt-4':[0.03,0.06],'gpt-3.5-turbo':[0.0005,0.0015],
      'claude-3-5-sonnet-20241022':[0.003,0.015],'claude-3-haiku':[0.00025,0.00125],'claude-3-opus':[0.015,0.075],'claude-opus-4':[0.015,0.075],
      'gemini-2.0-flash':[0.0001,0.0004],'gemini-1.5-pro':[0.00125,0.005],'gemini-1.5-flash':[0.000075,0.0003],
      'llama-3.3-70b-versatile':[0.00059,0.00079],'llama-3.1-8b-instant':[0.00005,0.00008],
      'mixtral-8x7b-32768':[0.00024,0.00024],'meta/llama-3.3-70b-instruct':[0.00077,0.00077],
    };
    const [i, o] = p[model] || [0.001, 0.001];
    return ((input * i) + (output * o)) / 1000;
  }

  // v2.0: feature is now the 3rd argument
  async track(provider, model, fn, feature) {
    const t = Date.now();
    try {
      const res = await fn();
      let inp = 0, out = 0;
      if (res.usage)             { inp = res.usage.prompt_tokens      || res.usage.input_tokens      || 0; out = res.usage.completion_tokens  || res.usage.output_tokens     || 0; }
      else if (res.usageMetadata){ inp = res.usageMetadata.promptTokenCount || 0; out = res.usageMetadata.candidatesTokenCount || 0; }
      this.queue.push({
        user_id: this.userId, provider, model,
        tokens_input: inp, tokens_output: out,
        cost: this.cost(model, inp, out),
        timestamp: new Date().toISOString(),
        feature: feature || null,                          // ← stored in DB
        metadata: { latency_ms: Date.now() - t, status: 'success' }
      });
      void this.flush();
      return res;
    } catch (err) {
      this.queue.push({
        user_id: this.userId, provider, model,
        tokens_input: 0, tokens_output: 0, cost: 0,
        timestamp: new Date().toISOString(),
        feature: feature || null,
        metadata: { error: err.message, latency_ms: Date.now() - t, status: 'error' }
      });
      void this.flush();
      throw err;
    }
  }

  // v2.0: convenience wrappers accept feature as 3rd arg
  trackGroq(model, fn, feature)      { return this.track('groq',      model, fn, feature); }
  trackOpenAI(model, fn, feature)    { return this.track('openai',    model, fn, feature); }
  trackGoogle(model, fn, feature)    { return this.track('google',    model, fn, feature); }
  trackAnthropic(model, fn, feature) { return this.track('anthropic', model, fn, feature); }
  trackNvidia(model, fn, feature)    { return this.track('nvidia',    model, fn, feature); }

  async flush() {
    if (!this.queue.length) return;
    const batch = [...this.queue]; this.queue = [];
    try {
      const r = await fetch(SUPABASE_URL + '/functions/v1/track-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
        body: JSON.stringify({ metrics: batch }),
      });
      if (!r.ok) this.queue.unshift(...batch);
    } catch { this.queue.unshift(...batch); }
  }

  async stop() { clearInterval(this.timer); await this.flush(); }
}
`;

// ─── Helpers ──────────────────────────────────────────────
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

// ─── MAIN ──────────────────────────────────────────────────
async function main() {
  const cwd = process.cwd();

  console.log('\n' + bold(cyan('⚡ BurnRate Init')) + gray(' v2.0'));
  console.log(gray('Zero-friction AI API tracking — auto-patches your codebase') + '\n');
  console.log(white('Get your free API key at: ') + cyan('https://burn-rate-zeta.vercel.app') + '\n');

  // Get + validate API key
  let apiKey = await ask(white('? Paste your BurnRate API key: '));
  while (!apiKey || !apiKey.startsWith('br_live_')) {
    console.log(red('  Key must start with br_live_  — copy it from your dashboard'));
    apiKey = await ask(white('? Paste your BurnRate API key: '));
  }

  // Scan for fresh (unpatched) calls
  const scanSpin = spinner('Scanning codebase for AI API calls...');
  const matches = walkDir(cwd);
  scanSpin.stop();

  // RETAG MODE: already patched but missing feature tags
  if (!matches.length) {
    const retagMatches = walkDirForRetag(cwd);
    if (retagMatches.length) {
      console.log(yellow('\n⚡ Found ' + retagMatches.length + ' already-tracked call(s) missing feature tags.'));
      console.log(gray('   Running retag mode...\n'));
      const byFile = new Map();
      for (const m of retagMatches) {
        if (!byFile.has(m.file)) byFile.set(m.file, []);
        byFile.get(m.file).push(m);
      }
      const featureMap = await collectFeatureTags(byFile, cwd);
      const results = [];
      for (const [filePath] of byFile) {
        const featureTag = featureMap.get(filePath) || inferFeatureFromPath(filePath);
        results.push(retagFile(filePath, featureTag));
      }
      const good = results.filter(r => r.success);
      const bad  = results.filter(r => !r.success);
      console.log('');
      for (const r of good) console.log(green('✓ Retagged') + gray(' ' + rel(cwd, r.file)) + ' ' + magenta('→ ' + r.feature));
      for (const r of bad)  console.log(red('✗ Failed')   + gray(' ' + rel(cwd, r.file) + ': ' + r.error));
      console.log(bold(green('\n🚀 Done! Feature tags added. Run your app and check the dashboard.\n')));
      process.exit(0);
    }
    console.log(yellow('\n⚠  No untracked AI calls found.'));
    console.log(gray('   Scanned for: Groq, OpenAI, Google Gemini, Anthropic'));
    console.log(gray('   Make sure you are running this from your project root.\n'));
    process.exit(0);
  }

  // Group by file
  const byFile = new Map();
  for (const m of matches) {
    if (!byFile.has(m.file)) byFile.set(m.file, []);
    byFile.get(m.file).push(m);
  }

  // Show summary
  const counts = {};
  for (const m of matches) counts[m.provider] = (counts[m.provider] || 0) + 1;
  console.log(green(`\n✓ Found ${matches.length} AI call${matches.length !== 1 ? 's' : ''} across ${byFile.size} file${byFile.size !== 1 ? 's' : ''}:\n`));

  const icons = { groq: '🟠', openai: '🟢', google: '🔵', anthropic: '🟣' };
  for (const [p, n] of Object.entries(counts)) {
    console.log(`  ${icons[p] || '⚪'}  ${white(p.padEnd(12))} ${gray(n + ' call' + (n !== 1 ? 's' : ''))}`);
  }
  console.log('');
  for (const [file, ms] of byFile) {
    console.log(`  ${cyan(rel(cwd, file))}`);
    for (const m of ms) {
      const preview = m.originalLine.trim().slice(0, 65);
      console.log(`    ${gray('line ' + m.line + ':')} ${gray(preview + (m.originalLine.trim().length > 65 ? '...' : ''))}`);
    }
  }

  const ok = await confirm(`\n${white('Patch all ' + matches.length + ' call' + (matches.length !== 1 ? 's' : '') + ' with BurnRate tracking?')}`);
  if (!ok) { console.log(gray('\nNo changes made.\n')); process.exit(0); }

  // ── NEW v2.0: Collect feature tags per file ──────────────
  const featureMap = await collectFeatureTags(byFile, cwd);

  // Download / write SDK
  const sdkDir  = findLibDir(cwd);
  const sdkPath  = path.join(sdkDir, 'burnrate-sdk.ts');
  const sdkSpin  = spinner('Writing burnrate-sdk.ts...');
  try {
    await new Promise((resolve, reject) => {
      const req = https.get('https://burn-rate-zeta.vercel.app/sdk', res => {
        if (res.statusCode !== 200) { reject(new Error('non-200')); return; }
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { fs.writeFileSync(sdkPath, d); resolve(); });
      });
      req.on('error', reject);
      req.setTimeout(6000, () => { req.destroy(); reject(new Error('timeout')); });
    });
  } catch {
    fs.writeFileSync(sdkPath, SDK_CONTENT); // use bundled v2.0 fallback
  }
  sdkSpin.succeed(green('SDK ready') + gray(' → ' + rel(cwd, sdkPath)));

  // Write env
  writeEnv(cwd, apiKey);
  console.log(green('✓ BURNRATE_API_KEY') + gray(' added to .env.local'));

  // Patch files — now passes featureTag from the map
  const patchSpin = spinner('Patching API calls with feature tags...');
  const results = [];
  for (const [filePath, fileMatches] of byFile) {
    const featureTag = featureMap.get(filePath) || inferFeatureFromPath(filePath);
    results.push(patchFile(filePath, fileMatches, apiKey, featureTag));
  }
  patchSpin.stop();

  const good  = results.filter(r => r.success);
  const bad   = results.filter(r => !r.success);
  const total = good.reduce((s, r) => s + r.count, 0);

  console.log('');
  for (const r of good) {
    console.log(green('✓ Patched') + gray(` ${rel(cwd, r.file)} (${r.count} call${r.count !== 1 ? 's' : ''})`) + ` ${magenta('→ ' + r.feature)}`);
  }
  for (const r of bad) {
    console.log(red('✗ Failed') + gray(` ${rel(cwd, r.file)}: ${r.error}`));
  }

  // Done — show what the tags look like in code
  console.log('\n' + gray('─'.repeat(50)));
  console.log(bold(green(`\n🚀 Done! ${total} call${total !== 1 ? 's' : ''} now tracked with feature tags.\n`)));

  // Show a before/after example
  if (good.length > 0) {
    const ex = good[0];
    console.log(gray('  Example patch applied:\n'));
    console.log(gray('  Before:'));
    console.log(gray('    await groq.chat.completions.create({ model: \'llama-3.3-70b\', ... })'));
    console.log(gray('\n  After:'));
    console.log(white(`    await __burnrateTracker.trackGroq('llama-3.3-70b', () => groq.chat.completions.create({ ... }), '${ex.feature}')`));
    console.log('');
  }

  console.log(white('Next steps:'));
  console.log(gray('  1. Run your app and trigger any API call'));
  console.log(gray('  2. Watch costs broken down by feature at ') + cyan('https://burn-rate-zeta.vercel.app'));
  console.log(gray('  3. Backups saved as .burnrate-backup — delete when happy'));
  console.log(gray('  4. To undo: ') + white('git checkout -- .') + '\n');
}

main().catch(err => { console.error(red('\n✗ ' + err.message)); process.exit(1); });