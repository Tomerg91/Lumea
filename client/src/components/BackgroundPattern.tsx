import React from 'react';

interface BackgroundPatternProps {
  children: React.ReactNode;
}

const BackgroundPattern: React.FC<BackgroundPatternProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full lumea-gradient lumea-pattern">
      <div className="absolute inset-0 bg-gradient-to-b from-lumea-beige/20 to-white/5 dark:from-lumea-stone/20 dark:to-black/5"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3/4 max-w-md aspect-square rounded-full bg-lumea-sage/10 dark:bg-lumea-sage/5 blur-3xl animate-breathe"></div>
      </div>
      {children}
    </div>
  );
};

export default BackgroundPattern;
