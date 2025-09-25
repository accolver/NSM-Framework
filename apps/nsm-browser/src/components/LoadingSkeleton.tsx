import { memo } from 'react';

interface LoadingSkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  borderRadius?: string;
}

const LoadingSkeleton = memo(function LoadingSkeleton({
  className = '',
  width = '100%',
  height = '20px',
  borderRadius = '4px'
}: LoadingSkeletonProps) {
  return (
    <div
      className={`loading-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#f0f0f0',
        backgroundImage: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
        backgroundSize: '200px 100%',
        backgroundRepeat: 'no-repeat',
        animation: 'loading-shimmer 1.5s infinite',
      }}
      aria-label="Loading..."
      role="status"
    >
      <span className="visually-hidden">Loading...</span>
    </div>
  );
});

export const ApplicationItemSkeleton = memo(function ApplicationItemSkeleton() {
  return (
    <div className="app-item" aria-label="Loading application">
      <div className="app-info">
        <LoadingSkeleton width="60%" height="24px" />
        <LoadingSkeleton width="90%" height="16px" />
        <LoadingSkeleton width="30%" height="14px" />
      </div>
      <div className="app-actions">
        <LoadingSkeleton width="40px" height="32px" borderRadius="50%" />
        <LoadingSkeleton width="80px" height="32px" />
      </div>
    </div>
  );
});

export default LoadingSkeleton;