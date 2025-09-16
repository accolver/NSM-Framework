import '../../test-setup';
import { describe, test, expect, beforeEach } from 'bun:test';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeveloperDashboard } from '../DeveloperDashboard';
import { createEventLogService } from '../../services/event-log-service';
import { createTimeTravelService } from '../../services/time-travel-service';
import { createInspectorService } from '../../services/inspector-service';

// Simple test to verify component renders
describe('DeveloperDashboard Basic', () => {
  let services: any;

  beforeEach(() => {
    services = {
      eventLogService: createEventLogService({
        maxEvents: 100,
        enableRealtime: true,
        autoStart: false
      }),
      timeTravelService: createTimeTravelService({
        maxSnapshots: 100,
        enableRealtime: true,
        devOnly: false
      }),
      inspectorService: createInspectorService({
        autoStart: false,
        devOnly: false
      })
    };
  });

  test('should render without crashing', () => {
    expect(() => {
      render(<DeveloperDashboard {...services} />);
    }).not.toThrow();
  });

  test('should render dashboard title', () => {
    const { container } = render(<DeveloperDashboard {...services} />);
    expect(container).toBeInTheDocument();
    expect(container.textContent).toContain('NSM Developer Dashboard');
  });

  test('should render basic tabs', () => {
    const { container } = render(<DeveloperDashboard {...services} />);
    expect(container.textContent).toContain('XState Inspector');
    expect(container.textContent).toContain('Event Log');
    expect(container.textContent).toContain('Time Travel');
  });
});