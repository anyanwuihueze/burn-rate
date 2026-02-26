# Product Hunt Scraper - Setup Guide

## What It Does
- Scrapes Product Hunt homepage daily
- Filters for AI/API-related launches only
- Extracts maker contact info (Twitter, LinkedIn, email)
- Generates personalized outreach messages
- Outputs priority target list for sub-agents

## Setup

### 1. Environment Variables
```bash
FIRECRAWL_API_KEY=fc-dc42bcd4fdac4f4cba28e33147b57b04
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 2. Install Dependencies
```bash
npm install firecrawl
```

### 3. Run Manually
```bash
ts-node scraper.ts
```

### 4. Schedule (Cron)
```bash
# Run daily at 9AM UTC (when PH day resets)
crontab -e
0 9 * * * cd /path/to/scraper && ts-node scraper.ts >> ph-scrape.log 2>&1
```

### 5. OpenClaw Integration
Add to openclaw.json:
```json
{
  "name": "PH Scraper - Burn Rate",
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * *",
    "tz": "UTC"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "Run Product Hunt scraper. Filter AI launches, extract contacts, generate outreach messages. Save results to burn-rate/ph-targets/[date].json"
  },
  "sessionTarget": "isolated"
}
```

## Output Format

### CSV (for manual review)
```csv
name,url,votes,maker_twitter,maker_email,priority,outreach_message
```

### JSON (for sub-agent automation)
```json
{
  "targets": [
    {
      "priority": "high|medium|low",
      "channel": "twitter|email|linkedin",
      "message": "...",
      "status": "pending|sent|replied"
    }
  ]
}
```

## Priority Rules
- **High**: 100+ votes, has Twitter/email, AI/API tool
- **Medium**: 50+ votes, has contact info
- **Low**: <50 votes or limited contact info