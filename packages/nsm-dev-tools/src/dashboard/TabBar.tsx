/**
 * TabBar Component
 *
 * Horizontal scrollable tab navigation for the developer dashboard
 */

import React, { useRef } from 'react';
import type { TabBarProps } from './types';

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabClick,
  isHorizontalScroll = true,
  className = ''
}) => {
  const tabContainerRef = useRef<HTMLDivElement>(null);

  const handleTabClick = (tabId: typeof activeTab) => {
    onTabClick(tabId);

    // Ensure the tab is visible after switching
    setTimeout(() => {
      if (tabContainerRef.current) {
        const tabElement = tabContainerRef.current.querySelector(`#tab-${tabId}`) as HTMLElement;
        if (tabElement) {
          // Scroll into view
          tabElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
          // Also focus the tab for keyboard accessibility
          if (document.activeElement === document.body) {
            tabElement.focus();
          }
        }
      }
    }, 100);
  };

  const containerClass = isHorizontalScroll
    ? 'tab-container tabs-horizontal-scroll'
    : 'tab-container vertical-tabs';

  return (
    <div
      ref={tabContainerRef}
      className={`${containerClass} ${className}`}
      data-testid="tab-container"
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
          role="tab"
          id={`tab-${tab.id}`}
          aria-controls={`panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
        >
          <span>{tab.label}</span>
          <span className="tab-shortcut">{tab.shortcut}</span>
        </button>
      ))}
    </div>
  );
};