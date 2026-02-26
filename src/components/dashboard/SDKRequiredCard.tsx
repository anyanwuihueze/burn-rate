"use client";
import React, { useState } from 'react';
import { Shield, Copy, CheckCheck, ChevronDown, ChevronUp, Zap, Lock, Eye } from 'lucide-react';

interface SDKRequiredCardProps {
  provider: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const PROVIDER_MODELS: Record<string, string> = {
  google: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b',
  nvidia: 'meta/llama-3.3-70b-instruct',
};

const PROVIDER_COLORS: Record<string, { bg: string; border: string; accent: string; dot: string }> = {
  google:  { bg: 'bg-blue-950/40',   border: 'border-blue-500/20',   accent: 'text-blue-400',   dot: 'bg-blue-400' },
  groq:    { bg: 'bg-orange-950/40', border: 'border-orange-500/20', accent: 'text-orange-400', dot: 'bg-orange-400' },
  nvidia:  { bg: 'bg-green-950/40',  border: 'border-green-500/20',  accent: 'text-green-400',  dot: 'bg-green-400' },
  default: { bg: 'bg-zinc-900/40',   border: 'border-zinc-700/40',   accent: 'text-zinc-300',   dot: 'bg-zinc-400' },
};

export const SDKRequiredCard: React.FC<SDKRequiredCardProps> = ({ provider, supabaseUrl, supabaseAnonKey }) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const colors = PROVIDER_COLORS[provider] ?? PROVIDER_COLORS.default;
  const model = PROVIDER_MODELS[provider] ?? 'your-model';
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  const copy = async (text: string, step: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const sdkSnippet = `import { BurnRateTracker } from '@/lib/burnrate-sdk';

const tracker = new BurnRateTracker({
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  userId: user.id, // from your Supabase auth session
  monthlyBudget: 200,
});

// Wrap your ${providerName} call like this:
const result = await tracker.track${providerName}(
  '${model}',
  () => your${providerName}Client.generateContent('Hello!')
);
// Usage appears in your dashboard within 5 seconds ⚡`;

  return (
    <div className={\`rounded-2xl border \${colors.border} \${colors.bg} backdrop-blur-sm overflow-hidden\`}>
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="mt-1 relative flex-shrink-0">
          <span className={\`absolute inline-flex h-3 w-3 rounded-full \${colors.dot} opacity-75 animate-ping\`} />
          <span className={\`relative inline-flex h-3 w-3 rounded-full \${colors.dot}\`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={\`text-xs font-semibold uppercase tracking-widest \${colors.accent}\`}>SDK Required</span>
            <span className="text-xs text-zinc-500 font-mono">· {providerName}</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {providerName} has no usage API — we track it directly from your code instead.
            Takes <span className="text-white font-medium">2 minutes</span> to set up, then data flows here in real time.
          </p>
        </div>
      </div>

      <div className="mx-5 mb-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60 px-4 py-3 flex flex-wrap gap-4">
        {[
          { icon: Lock, label: 'Your API keys never leave your server' },
          { icon: Eye,  label: 'We only receive token counts + cost' },
          { icon: Zap,  label: 'One wrapper line, zero config' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon size={13} className="text-zinc-500" />
            <span className="text-xs text-zinc-400">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded(v => !v)}
        className={\`w-full px-5 py-3 flex items-center justify-between text-sm font-medium border-t \${colors.border} \${colors.accent} hover:bg-white/5 transition-colors\`}
      >
        <span>{expanded ? 'Hide setup instructions' : 'Show me how to set it up →'}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-4 space-y-6 border-t border-zinc-800/40">
          {[
            {
              n: 1,
              title: 'Copy burnrate-sdk.ts into your project',
              desc: 'The SDK file is already in your Burn Rate project at src/lib/burnrate-sdk.ts — copy it into the app you want to track.',
              code: `cp path/to/burnrate/src/lib/burnrate-sdk.ts your-app/src/lib/burnrate-sdk.ts`,
            },
            {
              n: 2,
              title: `Wrap your ${providerName} API calls`,
              desc: `Your API key stays in your code. We only receive token counts and cost — nothing else.`,
              code: sdkSnippet,
            },
            {
              n: 3,
              title: 'Make a call — watch it appear here',
              desc: 'Run your app and trigger any API call. Come back to this dashboard — usage updates within 5 seconds.',
              code: null,
            },
          ].map(({ n, title, desc, code }) => (
            <div key={n} className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="text-[11px] font-bold text-zinc-400">{n}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
                {code && (
                  <div className="relative group">
                    <pre className="text-[11px] leading-relaxed text-zinc-300 bg-zinc-950/80 border border-zinc-800/60 rounded-xl p-4 overflow-x-auto font-mono whitespace-pre-wrap break-all">{code}</pre>
                    <button
                      onClick={() => copy(code, n)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      {copiedStep === n ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 px-4 py-3 flex gap-3">
            <Shield size={16} className="text-zinc-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              The SDK only sends <span className="text-zinc-300">token counts, model name, and cost</span> to your Burn Rate database.
              Your prompts, responses, and API keys never leave your server.
              Full source: <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded text-[11px]">src/lib/burnrate-sdk.ts</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SDKRequiredCard;
