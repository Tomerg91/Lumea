import React from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: string | React.ReactNode;
  action?: React.ReactNode;
};

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action }) => {
  const renderIcon = () => {
    if (!icon) {
      return null;
    }

    if (typeof icon === 'string') {
      return <div className="text-4xl mb-4">{icon}</div>;
    }

    return <div className="mb-4">{icon}</div>;
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      {renderIcon()}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
