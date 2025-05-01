import React, { useState, useEffect } from 'react';

const quotes = [
  {
    text: 'The body keeps the score. If the body knows how to harbor trauma, it also knows how to heal.',
    author: 'Satya Method',
  },
  {
    text: 'Between stimulus and response, there is a space. In that space lies our freedom and power to choose our response.',
    author: 'Viktor Frankl',
  },
  {
    text: 'Within you, there is a stillness and a sanctuary to which you can retreat at any time and be yourself.',
    author: 'Hermann Hesse',
  },
  {
    text: 'The moment one gives close attention to anything, even a blade of grass, it becomes a mysterious, awesome, indescribably magnificent world in itself.',
    author: 'Henry Miller',
  },
  {
    text: 'The wound is the place where the Light enters you.',
    author: 'Rumi',
  },
];

const QuoteOfTheDay = () => {
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    try {
      console.log('[QuoteOfTheDay] Component mounted');
      // Get a random quote based on the day
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 0);
      const diffTime = today.getTime() - startOfYear.getTime();
      const dayOfYear = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const quoteIndex = dayOfYear % quotes.length;
      const selectedQuote = quotes[quoteIndex];

      console.log('[QuoteOfTheDay] Selected quote at index', quoteIndex);
      setQuote(selectedQuote);
    } catch (err) {
      console.error('[QuoteOfTheDay] Error selecting quote:', err);
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <div className="lumea-card p-6 text-center">
        <p className="text-muted-foreground">Daily inspiration coming soon...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="lumea-card p-6 text-center">
        <p className="text-muted-foreground">Loading daily wisdom...</p>
      </div>
    );
  }

  return (
    <div className="lumea-card p-6 text-center">
      <p className="font-playfair text-lg italic text-lumea-stone dark:text-lumea-beige mb-2">
        &quot;{quote.text}&quot;
      </p>
      <p className="text-sm text-lumea-stone/70 dark:text-lumea-beige/70">— {quote.author}</p>
    </div>
  );
};

export default QuoteOfTheDay;
