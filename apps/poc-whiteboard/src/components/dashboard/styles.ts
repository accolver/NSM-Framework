/**
 * Dashboard Shared Styles
 *
 * Centralized styles for dashboard components following CSS-in-JS patterns
 */

export const dashboardStyles = `
  /* Base dashboard styles */
  .developer-dashboard {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
    font-size: 12px;
    border-left: 1px solid #333;
    z-index: 1000;
    display: flex;
    flex-direction: column;
  }

  /* Layout variants */
  .mobile-layout {
    position: relative;
    width: 100% !important;
    height: auto;
    max-height: 100vh;
    left: 0;
    right: 0;
    border-left: none;
    border-top: 1px solid #333;
  }

  .tablet-layout {
    max-height: 100vh;
    overflow: hidden;
    width: 350px !important;
    max-width: 50vw;
  }

  .desktop-layout {
    max-height: 100vh;
    overflow: hidden;
    min-width: 400px;
  }

  /* Responsive breakpoints */
  @media (max-width: 767px) {
    .developer-dashboard {
      position: relative;
      width: 100% !important;
      height: auto;
      max-height: 80vh;
      left: 0;
      right: 0;
      border-left: none;
      border-top: 1px solid #333;
    }

    .dashboard-header {
      padding: 8px 12px;
    }

    .dashboard-title h2 {
      font-size: 12px;
    }

    .dashboard-title p {
      display: none;
    }
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    .developer-dashboard {
      width: 350px !important;
      max-width: 50vw;
    }

    .tab {
      min-width: 100px;
    }
  }

  @media (min-width: 1024px) {
    .developer-dashboard {
      min-width: 400px;
    }
  }

  /* Header styles */
  .dashboard-header {
    padding: 12px 16px;
    background: #2d2d30;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dashboard-title h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
  }

  .dashboard-title p {
    margin: 2px 0 0 0;
    font-size: 11px;
    color: #999;
  }

  .dashboard-controls {
    display: flex;
    gap: 8px;
  }

  .control-btn {
    background: transparent;
    border: 1px solid #555;
    color: #d4d4d4;
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
  }

  .control-btn:hover {
    background: #333;
  }

  /* Tab styles */
  .tab-container {
    display: flex;
    background: #252526;
    border-bottom: 1px solid #333;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: #555 #252526;
    -webkit-overflow-scrolling: touch;
  }

  .tabs-horizontal-scroll {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    scrollbar-width: thin;
    scrollbar-color: #555 #252526;
    scroll-behavior: smooth;
  }

  .tabs-horizontal-scroll::-webkit-scrollbar {
    height: 6px;
  }

  .tabs-horizontal-scroll::-webkit-scrollbar-track {
    background: #252526;
  }

  .tabs-horizontal-scroll::-webkit-scrollbar-thumb {
    background-color: #555;
    border-radius: 3px;
  }

  .tabs-horizontal-scroll::-webkit-scrollbar-thumb:hover {
    background-color: #777;
  }

  .tab {
    padding: 8px 12px;
    cursor: pointer;
    border-right: 1px solid #333;
    background: #2d2d30;
    color: #999;
    transition: all 0.2s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    min-width: fit-content;
  }

  @media (max-width: 767px) {
    .tab {
      min-width: 110px;
      padding: 8px 10px;
      font-size: 11px;
    }

    .tab-shortcut {
      display: none;
    }
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    .tab {
      min-width: 100px;
      padding: 8px 12px;
    }
  }

  @media (min-width: 1024px) {
    .tab {
      min-width: 120px;
    }
  }

  .tab:hover {
    background: #333;
    color: #fff;
  }

  .tab:focus {
    outline: 2px solid #007acc;
    outline-offset: -2px;
    background: #333;
    color: #fff;
  }

  .tab.active {
    background: #007acc;
    color: #fff;
    border-bottom: 2px solid #007acc;
  }

  .tab.active:focus {
    outline: 2px solid #ffffff;
    outline-offset: -2px;
  }

  .tab-shortcut {
    font-size: 10px;
    opacity: 0.6;
    background: #333;
    padding: 1px 4px;
    border-radius: 2px;
  }

  /* Content area styles */
  .tool-content {
    flex: 1;
    overflow: auto;
    background: #1e1e1e;
    display: flex;
    flex-direction: column;
    height: 0;
    -webkit-overflow-scrolling: touch;
  }

  @media (max-width: 767px) {
    .tool-content {
      height: auto;
      min-height: 0;
      flex: 1 1 auto;
    }
  }

  /* Panel styles */
  .inspector-panel, .app-discovery-panel, .performance-panel {
    padding: 16px;
    height: 100%;
    overflow-y: auto;
  }

  @media (max-width: 767px) {
    .inspector-panel, .app-discovery-panel, .performance-panel {
      padding: 12px;
    }
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    .inspector-panel, .app-discovery-panel, .performance-panel {
      padding: 14px;
    }
  }

  .inspector-panel h3, .app-discovery-panel h3, .performance-panel h3 {
    margin: 0 0 8px 0;
    color: #4fc3f7;
  }

  /* Status indicators */
  .service-unavailable {
    padding: 20px;
    text-align: center;
    color: #ff6b6b;
  }

  .error-state {
    padding: 20px;
    text-align: center;
    color: #ff6b6b;
  }

  .error-state h3 {
    color: #ff6b6b;
    margin: 0 0 8px 0;
  }

  .status-indicator {
    margin-left: 8px;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .status-warning {
    background: #ff9800;
    color: #000;
  }

  .status-indicator.connected {
    color: #4caf50;
    font-weight: bold;
  }

  .status-indicator.disconnected {
    color: #ff9800;
    font-weight: bold;
  }

  .inspector-status {
    margin-top: 16px;
    padding: 8px;
    background: #252526;
    border: 1px solid #333;
    border-radius: 4px;
  }

  /* App discovery styles */
  .scanning-state {
    text-align: center;
    padding: 20px;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #333;
    border-top: 2px solid #007acc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 8px auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .app-list {
    margin-top: 16px;
  }

  .app-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    margin: 8px 0;
    background: #252526;
    border: 1px solid #333;
    border-radius: 4px;
  }

  .app-info h5 {
    margin: 0 0 4px 0;
    color: #fff;
  }

  .app-info p {
    margin: 2px 0;
    font-size: 11px;
    color: #999;
  }

  .connect-btn {
    padding: 6px 12px;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
  }

  .connect-btn.connected {
    background: #4caf50;
  }

  .connect-btn:hover {
    opacity: 0.8;
  }

  /* Performance metrics styles */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin: 16px 0;
  }

  @media (max-width: 767px) {
    .metrics-grid {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 8px;
      margin: 12px 0;
    }
  }

  .metric-card {
    padding: 12px;
    background: #252526;
    border: 1px solid #333;
    border-radius: 4px;
    text-align: center;
  }

  @media (max-width: 767px) {
    .metric-card {
      padding: 8px;
    }
  }

  .metric-card h4 {
    margin: 0 0 8px 0;
    font-size: 11px;
    color: #999;
  }

  .metric-value {
    font-size: 18px;
    font-weight: bold;
    color: #4fc3f7;
  }

  @media (max-width: 767px) {
    .metric-value {
      font-size: 14px;
    }
  }

  /* Resize handle styles */
  .resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: transparent;
    cursor: ew-resize;
    z-index: 10;
    transition: background-color 0.2s ease;
  }

  .resize-handle:hover {
    background: #007acc;
  }

  @media (max-width: 767px) {
    .resize-handle {
      display: none;
    }
  }

  /* Keyboard shortcuts panel */
  .shortcuts-panel {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #2d2d30;
    border-top: 1px solid #333;
    padding: 8px 16px;
    font-size: 10px;
    color: #666;
  }

  .shortcuts-panel h4 {
    margin: 0 0 4px 0;
    color: #999;
  }

  .shortcut-list {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .shortcut-key {
    background: #333;
    padding: 1px 4px;
    border-radius: 2px;
    font-family: monospace;
  }

  /* Transitions */
  .developer-dashboard {
    transition: width 0.3s ease, max-width 0.3s ease;
  }

  .tab {
    transition: all 0.2s ease, min-width 0.3s ease;
  }

  .minimized {
    display: none;
  }
`;