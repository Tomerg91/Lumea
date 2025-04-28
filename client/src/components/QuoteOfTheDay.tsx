
import React from 'react';

const quotes = [
  {
    text: "The body keeps the score. If the body knows how to harbor trauma, it also knows how to heal.",
    author: "Satya Method"
  },
  {
    text: "Between stimulus and response, there is a space. In that space lies our freedom and power to choose our response.",
    author: "Viktor Frankl"
  },
  {
    text: "Within you, there is a stillness and a sanctuary to which you can retreat at any time and be yourself.",
    author: "Hermann Hesse"
  },
  {
    text: "The moment one gives close attention to anything, even a blade of grass, it becomes a mysterious, awesome, indescribably magnificent world in itself.",
    author: "Henry Miller"
  },
  {
    text: "The wound is the place where the Light enters you.",
    author: "Rumi"
  }
];

const QuoteOfTheDay = () => {
  // Get a random quote based on the day
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const quoteIndex = dayOfYear % quotes.length;
  const quote = quotes[quoteIndex];

  return (
    <div className="lumea-card p-6 text-center">
      <p className="font-playfair text-lg italic text-lumea-stone dark:text-lumea-beige mb-2">"{quote.text}"</p>
      <p className="text-sm text-lumea-stone/70 dark:text-lumea-beige/70">— {quote.author}</p>
    </div>
  );
};

export default QuoteOfTheDay;
