"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const PollButton = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const pollNow = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/poll', { method: 'POST' });
      const data = await res.json();
      setResult(data);
      console.log('Poll result:', data);
    } catch (error) {
      console.error('Poll error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button 
        onClick={pollNow} 
        disabled={loading}
        className="w-full"
      >
        <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={16} />
        {loading ? 'Polling...' : 'Poll APIs Now'}
      </Button>
      {result && (
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
};
