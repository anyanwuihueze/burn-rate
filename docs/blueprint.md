# **App Name**: Burn Rate

## Core Features:

- Secure API Key Vault: Encrypted storage for API keys using AES-256 via Supabase Edge Functions. Keys are masked in UI (showing only last 4 chars) and identifiable by custom nicknames. Security messaging emphasizes encrypted at rest, never shared.
- Live Burn Rate Dashboard: Real-time API usage monitoring across Anthropic, OpenAI, and Google. Aggregated token consumption, costs, and velocity metrics delivered via Supabase Realtime. Hero element is a circular fuel gauge showing budget burn percentage with animated color transitions.
- Predictive Cost Intelligence: Monthly spend projections based on current burn velocity. Calculates days until budget exhausted and surfaces trend analysis (accelerating, stable, or declining usage patterns).
- Smart Threshold Alerts: User-configurable budget alerts (default: 80%, 90%, 95%). Multi-channel notifications via in-app banners, push (PWA), and email (Edge Function + Resend). Alert severity escalates through amber → orange → crimson states.
- Cost Optimization Engine: Intelligent recommendations based on usage patterns: model downgrades for simple tasks, prompt caching opportunities, and provider switching suggestions. Shows potential monthly savings with one-click implementation guides.
- Multi-Provider Connectivity: Native integration with Anthropic Claude, OpenAI GPT, and Google Gemini. Per-provider breakdowns showing model-level cost attribution and usage trends.
- Command Center Settings: Centralized control for profile, monthly budgets, alert preferences, notification channels, and data export (CSV). Dark mode follows system preference with manual override.

## Style Guidelines:

- Primary Background: #0A0A0A (Obsidian Black) in Light Mode, #000000 (Pure Black) in Dark Mode. Moving from the light-blue fresh/clean vibe to Apple's Pro device palette - think iPhone Pro, MacBook Pro, Apple Watch Ultra. Deep blacks create OLED-optimized contrast, reduce eye strain, and feel premium/scientific.
- Secondary Surface: #1C1C1E (Deep Charcoal) in both Light Mode and Dark Mode (System Gray 6).
- Tertiary Elevation: #2C2C2E (Elevated Gray) in both Light Mode and Dark Mode (System Gray 5).
- Accent - Safe: #30D158 (Apple Green).
- Accent - Warning: #FF9F0A (Apple Orange).
- Accent - Critical: #FF453A (Apple Red).
- Accent - Info: #0A84FF (Apple Blue).
- Text Primary: #F5F5F7 (White).
- Text Secondary: #8E8E93 (Gray).
- Text Tertiary: #48484A (Muted).
- Display/Headings: SF Pro Display or Inter (600-700 weight) - machined, objective, authoritative. Dropping Space Grotesk - it's too designery. We want the feel of a scientific instrument, not a marketing site.
- Data/Numbers: SF Mono or JetBrains Mono - tabular figures for cost/token alignment. Monospace for numbers creates clean vertical alignment in tables and prevents jitter when values update.
- Body: Inter (400-500 weight) - neutral, highly legible at small sizes.
- SF Symbols-style line icons (1.5px stroke weight). Consistent 24×24 grid. Monochrome with accent color tinting for active states.
- Dashboard Layout: Hero: Large circular burn gauge (280px) centered, showing % consumed with animated ring; Stats row: 4-up grid below gauge (burn rate, monthly cost, days remaining, top provider); Mini charts: Sparklines showing 7-day trend for each metric; Alert banner: Full-width, color-coded, dismissible, appears above content