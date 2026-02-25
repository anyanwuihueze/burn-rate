"use client";

import { useState } from 'react';
import { BurnRateTracker } from '@/lib/burnrate-sdk';

export default function TestGoogle() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const testGoogleAI = async () => {
    setLoading(true);
    
    // Initialize tracker
    const tracker = new BurnRateTracker({
      supabaseUrl: 'https://thbpkpynvoueniovmdop.supabase.co',
      userId: 'test-user-123' // Replace with actual user ID
    });

    try {
      // Test Google AI with your key
      const response = await tracker.trackGoogle('gemini-pro', async () => {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCKMvKbohBQT0gH7PkYTx_jEk03NZU1IwQ`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: "Say hello and count to 5" }]
              }]
            })
          }
        );
        return res.json();
      });

      setResult(response);

      // Get current spend
      const spend = await tracker.getCurrentSpend();
      
      setLogs(prev => [...prev, {
        time: new Date().toISOString(),
        spend: spend.toFixed(4),
        remaining: (2000 - spend).toFixed(2),
        percent: ((spend / 2000) * 100).toFixed(2)
      }]);

    } catch (error) {
      console.error('Test failed:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔥 BURN RATE TEST</h1>
      
      <button 
        onClick={testGoogleAI}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold"
      >
        {loading ? 'Testing...' : 'TEST GOOGLE AI + TRACK USAGE'}
      </button>

      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="font-bold">API Response:</h2>
          <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-6">
          <h2 className="font-bold text-xl mb-4">⛽ FUEL GAUGE (Real-Time)</h2>
          {logs.map((log, i) => (
            <div key={i} className="mb-4 p-4 border rounded bg-white shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">{new Date(log.time).toLocaleTimeString()}</span>
                <span className={`font-bold ${parseFloat(log.percent) > 80 ? 'text-red-600' : 'text-green-600'}`}>
                  {log.percent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div 
                  className={`h-4 rounded-full ${parseFloat(log.percent) > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(parseFloat(log.percent), 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Used: ${log.spend}</span>
                <span>Remaining: ${log.remaining}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}