"use client";

import React, { useState } from 'react';
import { costOptimizationRecommendations } from '@/ai/flows/cost-optimization-recommendations';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, CheckCircle2, TrendingDown, Layers, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export const OptimizationEngine: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const usageSummary = "User has heavy usage on GPT-4o for simple JSON parsing and summarization. Prompt average length is 2k tokens. Monthly spend is $1200 across OpenAI and Anthropic. Many prompts are repeated daily.";
      const result = await costOptimizationRecommendations({ usageSummary });
      setRecommendations(result.recommendations);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Model Downgrade': return <Layers className="text-primary" size={18} />;
      case 'Prompt Caching': return <Zap className="text-[#FF9F0A]" size={18} />;
      case 'Provider Switching': return <TrendingDown className="text-[#30D158]" size={18} />;
      default: return <Sparkles className="text-muted-foreground" size={18} />;
    }
  };

  return (
    <Card className="border-border bg-card shadow-xl overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles size={80} />
      </div>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              Optimization Engine
            </CardTitle>
            <CardDescription>GenAI-powered suggestions to reduce your monthly burn</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateRecommendations}
            disabled={loading}
            className="border-primary/20 hover:bg-primary/10"
          >
            {loading ? "Analyzing..." : "Run Analysis"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg bg-muted/20" />
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid gap-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="group p-4 rounded-lg bg-muted/20 border border-transparent hover:border-primary/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full bg-background border border-border">
                    {getIcon(rec.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{rec.type}</span>
                      <Badge variant="secondary" className="bg-[#30D158]/10 text-[#30D158] border-none font-code text-[10px]">
                        Save {rec.potentialSavings}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {rec.description}
                    </p>
                    <Button variant="link" className="p-0 h-auto text-xs text-primary group-hover:translate-x-1 transition-transform">
                      Implementation Guide <ArrowRight size={12} className="ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border rounded-lg bg-muted/10">
            <Layers className="text-muted-foreground mb-3" size={32} />
            <p className="text-sm text-muted-foreground max-w-xs">
              No recommendations generated yet. Run analysis to identify potential savings.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
