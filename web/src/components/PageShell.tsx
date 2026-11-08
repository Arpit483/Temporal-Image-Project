import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = ({ children, className = '' }) => {
  return (
    <div className={`ff-page-enter space-y-6 ${className}`}>
      {children}
    </div>
  );
};

export default PageShell;
