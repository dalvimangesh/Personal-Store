"use client";

import { useState, useEffect } from "react";
import { Quote } from "lucide-react";

export function MotivationalQuote() {
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);

  useEffect(() => {
    // Check session storage first to avoid redundant API calls within the same session
    const cachedQuote = sessionStorage.getItem("daily_quote");
    const cachedDate = sessionStorage.getItem("daily_quote_date");
    const today = new Date().toISOString().split('T')[0];

    if (cachedQuote && cachedDate === today) {
      setQuote(JSON.parse(cachedQuote));
      return;
    }

    fetch("/api/quote")
      .then(res => res.json())
      .then(data => {
        setQuote(data);
        sessionStorage.setItem("daily_quote", JSON.stringify(data));
        sessionStorage.setItem("daily_quote_date", today);
      })
      .catch(err => {
        console.error("Failed to fetch quote", err);
        // Fallback handled by API
      });
  }, []);

  if (!quote) return null;

  return (
    <div className="absolute top-0 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div className="flex items-center justify-center gap-2 px-3 py-1 bg-background/50 backdrop-blur-sm rounded-b-lg">
        <p className="text-[10px] sm:text-xs text-muted-foreground italic max-w-[70vw] sm:max-w-3xl text-center">
          "{quote.text}"
        </p>
        <span className="text-[8px] sm:text-[10px] text-muted-foreground/60 whitespace-nowrap">
          — {quote.author}
        </span>
      </div>
    </div>
  );
}
