import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { NSMStatus } from './NSMStatus';

describe('NSMStatus Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render NSM status and login button', () => {
    render(<NSMStatus />);

    expect(screen.getByText('NSM: Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NSM Login' })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<NSMStatus className="custom-class" />);

    expect(container.firstChild).toHaveClass('nsm-status', 'custom-class');
  });

  it('should have proper accessibility structure', () => {
    const { container } = render(<NSMStatus />);

    const loginButton = container.querySelector('.nsm-login-button');
    expect(loginButton).toHaveAttribute('aria-label', 'NSM Login');
  });
});