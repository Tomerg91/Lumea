import React from 'react';
import DesignSystemShowcase from '@/components/DesignSystemShowcase';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const DesignSystemPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      {/* Navigation button at the top */}
      <div className="bg-background p-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← Back
        </Button>
        <h1 className="text-xl font-serif">Satya Design System</h1>
        <div></div> {/* Empty div for flexbox spacing */}
      </div>

      {/* Render the full showcase */}
      <DesignSystemShowcase />
    </div>
  );
};

export default DesignSystemPage;
