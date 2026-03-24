# Burn Rate

**Real-Time LLM API Cost Intelligence & Monitoring**

![Burn Rate Hero](./burn_rate_hero.webp)

## What It Does

Burn Rate is a real-time monitoring platform that tracks your AI API spending across OpenAI, Anthropic, Google, Groq, and NVIDIA. It provides instant alerts for unusual spending patterns, identifies compromised API keys before they drain your budget, and gives you complete visibility into where every dollar goes.

**Problem Solved:** Developers using AI APIs face surprise bills, leaked keys costing thousands, and zero visibility into token consumption. Burn Rate eliminates these problems with real-time monitoring and automatic key revocation.

---

## Key Features

### 🔍 Real-Time Cost Tracking
Monitor every API call, token consumption, and spending spike as it happens. See costs updated every 10 minutes across all providers.

### 🚨 Intelligent Alerts
Get notified instantly when:
- Hourly spending exceeds your budget
- Unusual spending patterns detected
- API keys potentially compromised
- Usage anomalies identified

### 🔑 Compromised Key Detection
Automatically detect and revoke leaked API keys before fraudulent charges accumulate. One-tap key deactivation across all providers.

### 💰 Budget Projections
Forecast your monthly AI spending based on current usage patterns. Plan ahead and avoid surprise bills.

### 📊 Multi-Provider Support
Track spending across:
- OpenAI (GPT-4, GPT-3.5, Embeddings)
- Anthropic Claude
- Google Gemini
- Groq Llama
- NVIDIA NIM

### 📈 Usage Analytics
Detailed breakdowns by:
- Model used
- Feature/endpoint
- Time period
- Cost per token

### 🛡️ SDK Integration
Lightweight SDK wrapper for Groq, Google, and NVIDIA to track usage without modifying your code.

### 📱 Team Collaboration
Multi-user access, Slack alerts, and white-label reports for teams.

---

## Tech Stack

| Category | Technologies |
|----------|---------------|
| **Frontend** | React, TypeScript, Next.js, Tailwind CSS |
| **Backend** | Node.js, Express.js, Firebase Functions |
| **Database** | Supabase PostgreSQL, Firebase Realtime DB |
| **API Integration** | OpenAI SDK, Anthropic SDK, REST APIs |
| **Monitoring** | Real-time polling, WebSocket updates |
| **Deployment** | Vercel, Firebase Cloud Functions |
| **Authentication** | Firebase Auth, OAuth 2.0 |
| **SDK** | Node.js, Python (planned) |

---

## Screenshots

### Dashboard
Real-time overview of API spending with budget usage gauge and hourly breakdown.

### Cost Breakdown
Detailed analysis by provider, model, and feature with trend visualization.

### Alert Settings
Configure budget thresholds, anomaly detection, and notification channels.

---

## Demo

**Live Demo:** [burn-rate-zeta.vercel.app](https://burn-rate-zeta.vercel.app)

**Features Available:**
- 7-day free trial (no credit card required)
- 3 API keys included
- Full dashboard access
- Real-time alerts
- 30-day history

---

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Firebase project setup
- Supabase account
- API keys from providers you want to monitor (OpenAI, Anthropic, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/anyanwuihueze/burn-rate.git
   cd burn-rate
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Set up Supabase database**
   ```bash
   npx supabase db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

---

## Project Structure

```
burn-rate/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── lib/             # Utility functions
│   ├── pages/           # API routes
│   └── types/           # TypeScript types
├── packages/            # SDK packages
│   ├── sdk-core/        # Core SDK logic
│   └── sdk-node/        # Node.js SDK
├── supabase/            # Database migrations
├── docs/                # Documentation
├── package.json         # Dependencies
└── README.md           # This file
```

---

## Key Components

### Cost Tracking Engine
Polls API providers every 10 minutes to fetch usage data and calculate costs in real-time.

### Alert System
Monitors spending patterns and triggers alerts based on configurable thresholds and anomaly detection.

### Key Management
Securely stores API keys with AES-256 encryption and provides one-tap revocation across providers.

### Analytics Dashboard
Visualizes spending trends, cost breakdowns, and provides actionable insights.

### SDK Wrapper
Lightweight integration for providers without native cost tracking (Groq, Google, NVIDIA).

---

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| **Starter** | Free (7 days) | 3 API keys, real-time dashboard, hourly alerts, 30-day history |
| **Pro** | $5/month | 10 API keys, all 5 providers, SDK support, anomaly detection, 90-day history |
| **Team** | $29/month | Unlimited keys, multi-user access, Slack alerts, 1-year history, priority support |

---

## Usage Examples

### Example 1: Monitor OpenAI Spending
```javascript
import { BurnRateSDK } from '@burn-rate/sdk-node';

const sdk = new BurnRateSDK({
  apiKey: 'your_burn_rate_api_key',
  providers: ['openai']
});

// Get current spending
const spending = await sdk.getSpending();
console.log(`Today's spend: $${spending.today}`);
```

### Example 2: Set Budget Alerts
```javascript
// Alert when daily spend exceeds $50
await sdk.setAlert({
  type: 'budget_threshold',
  threshold: 50,
  frequency: 'daily',
  channel: 'email'
});
```

### Example 3: Detect Compromised Keys
```javascript
// Get alerts for suspicious activity
const alerts = await sdk.getAlerts();
alerts.forEach(alert => {
  if (alert.type === 'compromised_key') {
    console.log(`Compromised key detected: ${alert.keyId}`);
    // Revoke immediately
    await sdk.revokeKey(alert.keyId);
  }
});
```

---

## API Documentation

### Authentication
All requests require a Bearer token:
```bash
Authorization: Bearer your_burn_rate_api_key
```

### Endpoints

**Get Spending Summary**
```
GET /api/spending
Response: { today: 0.42, thisMonth: 12.50, budget: 200 }
```

**Get Usage by Provider**
```
GET /api/usage/by-provider
Response: [
  { provider: 'openai', tokens: 84291, cost: 0.42 },
  { provider: 'anthropic', tokens: 12000, cost: 0.08 }
]
```

**Set Budget Alert**
```
POST /api/alerts
Body: { threshold: 50, type: 'budget_threshold' }
```

**Revoke API Key**
```
POST /api/keys/:keyId/revoke
Response: { success: true, revokedAt: '2026-03-24T12:00:00Z' }
```

---

## Contributing

We welcome contributions! Here's how:

1. **Fork the repository** on GitHub
2. **Create a feature branch** (`git checkout -b feature/your-feature-name`)
3. **Make your changes** and commit them (`git commit -m 'Add your feature'`)
4. **Push to your branch** (`git push origin feature/your-feature-name`)
5. **Open a Pull Request** with a clear description

### Development Guidelines

- Follow the existing code style
- Write clear commit messages
- Test your changes thoroughly
- Update documentation for new features
- Ensure all tests pass

---

## Roadmap

- [ ] Python SDK
- [ ] Real-time streaming alerts
- [ ] Custom webhook integrations
- [ ] Advanced ML-based anomaly detection
- [ ] Cost optimization recommendations
- [ ] Multi-organization support
- [ ] Audit logs and compliance reporting
- [ ] Integration with major cloud platforms (AWS, GCP, Azure)

---

## Support

**Need help?** Contact us:

- **Email:** support@burn-rate.dev
- **Chat:** In-app support on the platform
- **Documentation:** [docs.burn-rate.dev](https://burn-rate-zeta.vercel.app)
- **Status Page:** [status.burn-rate.dev](https://burn-rate-zeta.vercel.app)

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## Acknowledgments

- Built for developers who use AI APIs
- Powered by real-time monitoring technology
- Hosted on Vercel and Firebase
- Special thanks to our beta users

---

## Contact

**Prince Anyanwu** | AI Infrastructure & Cost Optimization Engineer

- Portfolio: [prince-portfolio.vercel.app](https://prince-portfolio.vercel.app)
- Email: anyanwuihueze@gmail.com
- LinkedIn: [linkedin.com/in/anyanwuihueze](https://www.linkedin.com/in/anyanwuihueze)

---

**Last Updated:** March 2026

*Burn Rate: Know your AI spend. Control your costs. Prevent disasters.*
