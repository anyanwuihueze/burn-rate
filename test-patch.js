function patchContent(content, patternRe, wrapFn, model, feature) {
  const lines = content.split('\n');
  const patched = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const awaitPattern = new RegExp('await\\s+' + patternRe.source);
    if (awaitPattern.test(line) && !line.includes('track')) {
      const newLine = line.replace(awaitPattern, () => 'await ' + wrapFn(model));
      patched.push(newLine);
      i++;
      let extraOpen = 1;
      while (i < lines.length && extraOpen > 0) {
        const l = lines[i];
        for (const ch of l) { if (ch === '(') extraOpen++; if (ch === ')') extraOpen--; }
        if (extraOpen === 0) {
          const fixed = l.replace(/\)(\s*;?\s*)$/, `), '${feature}')$1`);
          patched.push(fixed);
        } else { patched.push(l); }
        i++;
      }
    } else { patched.push(line); i++; }
  }
  return patched.join('\n');
}

const test = `    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7
    });`;

const re = /groq\.chat\.completions\.create\s*\(/;
const wrap = (m) => `__burnrateTracker.trackGroq('${m}', () => groq.chat.completions.create(`;
const result = patchContent(test, re, wrap, 'llama-3.3-70b-versatile', 'visa-chat');
console.log(result);
console.log('Feature tag present:', result.includes("'visa-chat'"));
