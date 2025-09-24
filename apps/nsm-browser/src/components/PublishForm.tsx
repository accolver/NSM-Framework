import { useState } from 'react';
import { validateXStateJSON } from '../utils/xstate-validator';

interface PublishFormProps {
  onPublish: (data: { name: string; description: string; machine: string }) => void;
}

interface PublishFormData {
  name: string;
  description: string;
  machine: string;
}

const EXAMPLE_MACHINE = JSON.stringify({
  id: 'toggle',
  initial: 'inactive',
  context: {
    count: 0
  },
  states: {
    inactive: {
      on: {
        TOGGLE: 'active',
        INCREMENT: {
          actions: 'increment'
        }
      }
    },
    active: {
      on: {
        TOGGLE: 'inactive',
        RESET: {
          target: 'inactive',
          actions: 'reset'
        }
      }
    }
  }
}, null, 2);

export default function PublishForm({ onPublish }: PublishFormProps) {
  const [formData, setFormData] = useState<PublishFormData>({
    name: '',
    description: '',
    machine: EXAMPLE_MACHINE
  });
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate machine JSON
    const validation = validateXStateJSON(formData.machine);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid machine JSON');
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      setError('App name is required');
      return;
    }

    onPublish({
      name: formData.name.trim(),
      description: formData.description.trim(),
      machine: formData.machine
    });
  };

  const handleInputChange = (field: keyof PublishFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="publish-form">
      <div className="form-group">
        <label htmlFor="app-name" className="form-label">
          App Name *
        </label>
        <input
          id="app-name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="form-input"
          placeholder="Enter app name..."
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="form-input"
          placeholder="Enter description..."
        />
      </div>

      <div className="form-group">
        <label htmlFor="machine-json" className="form-label">
          XState Machine JSON *
        </label>
        <textarea
          id="machine-json"
          value={formData.machine}
          onChange={(e) => handleInputChange('machine', e.target.value)}
          className="form-input form-textarea"
          placeholder="Paste XState machine JSON here..."
          required
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <button type="submit" className="publish-button">
        🚀 Publish to Nostr
      </button>
    </form>
  );
}