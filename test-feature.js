const path = require('path');

function inferFeatureFromPath(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  const cleaned = base
    .replace(/[-_](flow|assistant|handler|service|route|api|helper|util|utils|generator|client|server)$/i, '')
    .replace(/[-_](flow|assistant|handler|service|route|api|helper|util|utils|generator|client|server)$/i, '')
    .toLowerCase();
  return cleaned.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untagged';
}

const files = [
  'src/ai/flows/visa-chat-assistant.ts',
  'src/ai/flows/interview-flow.ts',
  'src/ai/flows/rejection-reversal.ts',
  'src/ai/flows/visa-matchmaker.ts',
  'src/ai/flows/site-assistant-flow.ts',
  'src/ai/insights-generator.ts',
  'src/lib/gemini-client.ts',
  'src/app/api/rejection-reversal/route.ts',
];

files.forEach(f => console.log(inferFeatureFromPath(f), '←', f));
