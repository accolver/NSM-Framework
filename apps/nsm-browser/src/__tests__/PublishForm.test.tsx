import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PublishForm from '../components/PublishForm';

describe('PublishForm Component', () => {
  it('should exist and be importable', () => {
    expect(PublishForm).toBeDefined();
    expect(typeof PublishForm).toBe('function');
  });

  it('should have required properties', () => {
    expect(PublishForm).toHaveProperty('name');
    expect(PublishForm.name).toBe('PublishForm');
  });

  it('should render all form fields', () => {
    const mockOnPublish = vi.fn();
    render(<PublishForm onPublish={mockOnPublish} />);

    // Check for form fields
    expect(screen.getByLabelText(/App Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/XState Machine JSON/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish to Nostr/ })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const mockOnPublish = vi.fn();
    render(<PublishForm onPublish={mockOnPublish} />);

    const submitButton = screen.getByRole('button', { name: /Publish to Nostr/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnPublish).not.toHaveBeenCalled();
    });
  });

  it('should call onPublish with valid data', async () => {
    const mockOnPublish = vi.fn();
    render(<PublishForm onPublish={mockOnPublish} />);

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/App Name/), {
      target: { value: 'Test App' }
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'Test Description' }
    });
    fireEvent.change(screen.getByLabelText(/XState Machine JSON/), {
      target: { value: '{"id":"test","initial":"start","states":{"start":{}}}' }
    });

    const submitButton = screen.getByRole('button', { name: /Publish to Nostr/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnPublish).toHaveBeenCalledWith({
        name: 'Test App',
        description: 'Test Description',
        machine: '{"id":"test","initial":"start","states":{"start":{}}}'
      });
    });
  });
});