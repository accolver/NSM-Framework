import React, { KeyboardEvent } from 'react';

export interface TabItem {
  id: string;
  label: string;
  shortcut: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface TabContainerProps {
  tabs: TabItem[];
  activeTab: string;
  onTabClick: (tabId: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  isMobile?: boolean;
  'data-testid'?: string;
}

/**
 * Reusable Tab Container Component
 *
 * Features:
 * - Responsive design (horizontal scroll on desktop, vertical on mobile)
 * - Keyboard navigation support
 * - Accessibility compliance
 * - Customizable styling
 */
export const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  activeTab,
  onTabClick,
  onKeyDown,
  className = '',
  isMobile = false,
  'data-testid': testId = 'tab-container'
}) => {
  return (
    <div
      className={`tab-container ${isMobile ? 'vertical-tabs' : 'tabs-horizontal-scroll'} ${className}`}
      data-testid={testId}
      onKeyDown={onKeyDown}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
          onClick={() => !tab.disabled && onTabClick(tab.id)}
          role="tab"
          id={`tab-${tab.id}`}
          aria-controls={`panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          disabled={tab.disabled}
        >
          {tab.icon && <span className="tab-icon">{tab.icon}</span>}
          <span>{tab.label}</span>
          <span className="tab-shortcut">{tab.shortcut}</span>
        </button>
      ))}
    </div>
  );
};

export default TabContainer;