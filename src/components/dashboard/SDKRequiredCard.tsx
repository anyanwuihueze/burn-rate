"use client";
import React, { useState } from 'react';
import { Shield, Copy, CheckCheck, ChevronDown, ChevronUp, Zap, Lock, Eye, ExternalLink } from 'lucide-react';

interface SDKRequiredCardProps {
  provider: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId: string;
}

const PROVIDER_MODELS: Record<string, string> = {
  google: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b',
  nvidia: 'meta/llama-3.3-70b-instruct',
  deepseek: 'deepseek-chat',
};

const PROVIDER_COLORS: Record<string, { bg: string; border: string; accent: string; dot: string }> = {
  google:  { bg: 'bg-blue-950/40',   border: 'border-blue-500/20',   accent: 'text-blue-400',   dot: 'bg-blue-400' },
  groq:    { bg: 'bg-orange-950/40', border: 'border-orange-500/20', accent: 'text-orange-400', dot: 'bg-orange-400' },
  nvidia:  { bg: 'bg-green-950/40',  border: 'border-green-500/20',  accent: 'text-green-400',  dot: 'bg-green-400' },
  default: { bg: 'bg-zinc-900/40',   border: 'border-zinc-700/40',   accent: 'text-zinc-300',   dot: 'bg-zinc-400' },
};

const PROVIDER_REVOKE_LINKS: Record<string, string> = {
  google:    'https://aistudio.google.com/app/apikey',
  groq:      'https://console.groq.com/keys',
  nvidia:    'https://build.nvidia.com/settings/api-key',
  deepseek:  'https://platform.deepseek.com/api_keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  openai:    'https://platform.openai.com/api-keys',
};

export const SDKRequiredCard: React.FC<SDKRequiredCardProps> = ({ provider, supabaseUrl, supabaseAnonKey, userId }) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const colors = PROVIDER_COLORS[provider] ?? PROVIDER_COLORS.default;
  const model = PROVIDER_MODELS[provider] ?? 'your-model';
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  const revokeLink = PROVIDER_REVOKE_LINKS[provider];

  const copy = async (text: string, step: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const sdkSnippet = [
    "import { BurnRateTracker } from '@/lib/burnrate-sdk';",
    "",
    "const tracker = new BurnRateTracker({",
    "  supabaseUrl: '" + supabaseUrl + "',",
    "  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,",
    "  userId: '" + userId + "',",
    "  monthlyBudget: 200,",
    "});",
    "",
    "// Wrap your " + providerName + " call:",
    "const result = await tracker.track" + providerName + "(",
    "  '" + model + "',",
    "  () => your" + providerName + "Client.generateContent('Hello!')",
    ");",
    "// Usage appears in your dashboard within 5 seconds",
  ].join('\n');

  const steps = [
    {
      n: 1,
      title: 'Auto-install BurnRate',
      desc: 'Run this from your project root. It scans your codebase, wraps all AI calls, and sets up tracking automatically.',
      code: 'npx burnrate-init@2.1.3',
    }, {
      n: 2,
      title: 'Wrap your ' + providerName + ' API calls',
      desc: 'Your API key stays in your code. We only receive token counts and cost â€” nothing else.',
      code: sdkSnippet,
    },
    {
      n: 3,
      title: 'Make a call and watch it appear here',
      desc: 'Run your app and trigger any API call. Usage updates on this dashboard within 5 seconds.',
      code: null,
    },
  ];

  return (
    <div className={[colors.bg, colors.border, 'rounded-2xl border backdrop-blur-sm overflow-hidden'].join(' ')}>

      {/* Header */}
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="mt-1 relative flex-shrink-0">
          <span className={[colors.dot, 'absolute inline-flex h-3 w-3 rounded-full opacity-75 animate-ping'].join(' ')} />
          <span className={[colors.dot, 'relative inline-flex h-3 w-3 rounded-full'].join(' ')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={[colors.accent, 'text-xs font-semibold uppercase tracking-widest'].join(' ')}>
              SDK Required
            </span>
            <span className="text-xs text-zinc-500 font-mono">- {providerName}</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {providerName} has no usage API â€” we track it directly from your code instead.
            Takes <span className="text-white font-medium">2 minutes</span> to set up, then data flows here in real time.
          </p>
        </div>
      </div>

      {/* Trust signals */}
      <div className="mx-5 mb-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60 px-4 py-3 flex flex-wrap gap-4">
        {[
          { icon: Lock, label: 'Your API keys never leave your server' },
          { icon: Eye,  label: 'We only receive token counts and cost' },
          { icon: Zap,  label: 'One wrapper line, zero config' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon size={13} className="text-zinc-500" />
            <span className="text-xs text-zinc-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Revoke link */}
      {revokeLink && (
        <div className="mx-5 mb-4 rounded-xl bg-red-950/30 border border-red-500/20 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-300">Key compromised? Revoke it at {providerName}</span>
          </div>
          <a
            href={revokeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 underline underline-offset-2 whitespace-nowrap"
          >
            Revoke now
            <ExternalLink size={11} />
          </a>
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={[
          'w-full px-5 py-3 flex items-center justify-between',
          'text-sm font-medium border-t transition-colors hover:bg-white/5',
          colors.border,
          colors.accent,
        ].join(' ')}
      >
        <span>{expanded ? 'Hide setup instructions' : 'Show me how to set it up'}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Steps */}
      {expanded && (
        <div className="px-5 pb-5 pt-4 space-y-6 border-t border-zinc-800/40">
          {steps.map(({ n, title, desc, code }) => (
            <div key={n} className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="text-[11px] font-bold text-zinc-400">{n}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm font-medium text-zinc-200">{title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                {code && (
                  <div className="relative group">
                    <pre className="text-[11px] leading-relaxed text-zinc-300 bg-zinc-950/80 border border-zinc-800/60 rounded-xl p-4 overflow-x-auto font-mono whitespace-pre-wrap break-all">
                      {code}
                    </pre>
                    <button
                      onClick={() => copy(code, n)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      {copiedStep === n
                        ? <CheckCheck size={13} className="text-green-400" />
                        : <Copy size={13} />
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Security note */}
          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 px-4 py-3 flex gap-3">
            <Shield size={16} className="text-zinc-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              The SDK only sends{' '}
              <span className="text-zinc-300">token counts, model name, and cost</span>
              {' '}to your Burn Rate database. Your prompts, responses, and API keys never leave your server.
              Full source:{' '}
              <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded text-[11px]">
                src/lib/burnrate-sdk.ts
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SDKRequiredCard;
