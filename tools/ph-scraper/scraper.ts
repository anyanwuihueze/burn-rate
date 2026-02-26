// Product Hunt Scraper for Burn Rate - AI Tool Launch Monitor
// Monitors Product Hunt daily, extracts AI tool launches, finds founder contact info

import { FirecrawlClient } from 'firecrawl';

interface PHLaunch {
  id: string;
  name: string;
  tagline: string;
  url: string;
  votes: number;
  comments: number;
  maker: {
    name: string;
    twitter?: string;
    email?: string;
    linkedin?: string;
  };
  topics: string[];
  launchedAt: string;
  aiRelated: boolean;
  contactFound: boolean;
}

export class ProductHuntScraper {
  private firecrawl: FirecrawlClient;
  
  constructor(apiKey: string) {
    this.firecrawl = new FirecrawlClient({ apiKey });
  }

  // Scrape Product Hunt homepage for today's launches
  async scrapeDailyLaunches(): Promise<PHLaunch[]> {
    const url = 'https://www.producthunt.com';
    
    const result = await this.firecrawl.scrape(url, {
      pageOptions: {
        onlyMainContent: false,
        waitFor: 3000
      }
    });

    if (!result.success) {
      throw new Error(`Scrape failed: ${result.error}`);
    }

    // Extract launch cards from HTML
    const launches = this.parsePHPage(result.content);
    return launches.filter(l => this.isAITool(l));
  }

  private parsePHPage(html: string): PHLaunch[] {
    // Regex patterns for PH launch cards
    const patterns = {
      productCard: /data-test="product-item"[^>]*>([\s\S]*?)<\/div>/g,
      name: /<h2[^>]*>([^<]+)<\/h2>/,
      tagline: /<p[^>]*class="[^"]*text-gray-600[^"]*"[^>]*>([^<]+)<\/p>/,
      votes: /data-test="vote-button"[^>]*>(\d+)<\/span>/,
      comments: /data-test="comment-count"[^>]*>(\d+)<\/span>/,
      maker: /<a[^>]*href="\/@[^"]*"[^>]*>([^<]+)<\/a>/
    };

    const launches: PHLaunch[] = [];
    let match;

    while ((match = patterns.productCard.exec(html)) !== null) {
      const card = match[0];
      
      const name = card.match(patterns.name)?.[1]?.trim();
      const tagline = card.match(patterns.tagline)?.[1]?.trim();
      const votes = parseInt(card.match(patterns.votes)?.[1] || '0');
      const comments = parseInt(card.match(patterns.comments)?.[1] || '0');
      const makerName = card.match(patterns.maker)?.[1]?.trim();

      if (name && tagline) {
        launches.push({
          id: `ph_${Date.now()}_${launches.length}`,
          name,
          tagline,
          url: `https://producthunt.com/posts/${name.toLowerCase().replace(/\s+/g, '-')}`,
          votes,
          comments,
          maker: { name: makerName || 'Unknown' },
          topics: this.extractTopics(tagline),
          launchedAt: new Date().toISOString(),
          aiRelated: false,
          contactFound: false
        });
      }
    }

    return launches;
  }

  private isAITool(launch: PHLaunch): boolean {
    const aiKeywords = [
      'ai', 'artificial intelligence', 'llm', 'gpt', 'claude', 'openai', 
      'anthropic', 'gemini', 'assistant', 'chatbot', 'automation',
      'ml', 'machine learning', 'agent', 'copilot', 'api', 'saas'
    ];
    
    const text = `${launch.name} ${launch.tagline}`.toLowerCase();
    
    launch.aiRelated = aiKeywords.some(kw => text.includes(kw));
    return launch.aiRelated;
  }

  private extractTopics(tagline: string): string[] {
    const topics: string[] = [];
    const topicKeywords = [
      { keyword: 'developer', topic: 'Developer Tools' },
      { keyword: 'api', topic: 'API' },
      { keyword: 'ai', topic: 'AI' },
      { keyword: 'productivity', topic: 'Productivity' },
      { keyword: 'chat', topic: 'Chat' },
      { keyword: 'code', topic: 'Code' },
      { keyword: 'automation', topic: 'Automation' }
    ];

    for (const { keyword, topic } of topicKeywords) {
      if (tagline.toLowerCase().includes(keyword)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  // Deep scrape for maker contact info
  async scrapeMakerContact(launch: PHLaunch): Promise<PHLaunch> {
    try {
      // Scrape the product page
      const result = await this.firecrawl.scrape(launch.url, {
        pageOptions: { waitFor: 3000 }
      });

      if (!result.success) return launch;

      const content = result.content;

      // Extract maker profile links
      const twitterMatch = content.match(/twitter.com\/([a-zA-Z0-9_]+)/);
      const linkedinMatch = content.match(/linkedin.com\/in\/([a-zA-Z0-9-]+)/);
      const emailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

      if (twitterMatch) launch.maker.twitter = `@${twitterMatch[1]}`;
      if (linkedinMatch) launch.maker.linkedin = `linkedin.com/in/${linkedinMatch[1]}`;
      if (emailMatch) launch.maker.email = emailMatch[1];

      launch.contactFound = !!(twitterMatch || linkedinMatch || emailMatch);

    } catch (error) {
      console.error(`Error scraping ${launch.name}:`, error);
    }

    return launch;
  }

  // Get contact info from maker's PH profile
  async scrapeMakerProfile(username: string): Promise<Partial<PHLaunch['maker']>> {
    const profileUrl = `https://www.producthunt.com/@${username}`;
    
    try {
      const result = await this.firecrawl.scrape(profileUrl, {
        pageOptions: { waitFor: 3000 }
      });

      if (!result.success) return {};

      const content = result.content;
      
      const twitter = content.match(/twitter.com\/([a-zA-Z0-9_]+)/)?.[1];
      const linkedin = content.match(/linkedin.com\/in\/([a-zA-Z0-9-]+)/)?.[1];
      const website = content.match(/Website:\s*([^\s]+)/)?.[1];

      return {
        twitter: twitter ? `@${twitter}` : undefined,
        linkedin: linkedin ? `linkedin.com/in/${linkedin}` : undefined,
      };

    } catch (error) {
      console.error(`Error scraping profile ${username}:`, error);
      return {};
    }
  }

  // Generate outreach message
  generateOutreach(launch: PHLaunch): string {
    const painPoint = launch.topics.includes('API') 
      ? 'managing API costs'
      : launch.topics.includes('AI')
      ? 'controlling AI spend'
      : 'tracking usage costs';

    const message = `Hey ${launch.maker.name},

Saw ${launch.name} on Product Hunt today. Congrats on the launch!

Quick question: how are you handling ${painPoint}? I built a tool called Burn Rate ($5/mo) that helps AI devs avoid bill shock - monitor API spend in real-time, get alerts before disasters.

Might be useful for your users (and for you). Want to check it out?

Cheers,
Prince`;

    return message;
  }
}

// Scheduler function - runs daily
export async function runDailyScrape() {
  const scraper = new ProductHuntScraper(process.env.FIRECRAWL_API_KEY!);
  
  console.log('Starting PH scrape at', new Date().toISOString());
  
  // Get today's AI launches
  const launches = await scraper.scrapeDailyLaunches();
  console.log(`Found ${launches.length} AI-related launches`);

  // Deep scrape for contact info
  const enriched = [];
  for (const launch of launches) {
    const enrichedLaunch = await scraper.scrapeMakerContact(launch);
    enriched.push(enrichedLaunch);
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  // Filter for high-priority targets (have contact info)
  const targets = enriched.filter(l => l.contactFound && l.votes >= 50);
  
  // Generate outreach drafts
  const outreachList = targets.map(l => ({
    ...l,
    outreachMessage: scraper.generateOutreach(l)
  }));

  // Save results
  const output = {
    scrapedAt: new Date().toISOString(),
    totalFound: launches.length,
    targetsFound: targets.length,
    launches: outreachList
  };

  return output;
}

export default ProductHuntScraper;