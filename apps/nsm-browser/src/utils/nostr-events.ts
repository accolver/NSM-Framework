export interface NSMEvent {
  kind: number;
  content: string;
  tags: string[][];
  pubkey?: string;
  created_at?: number;
}

export interface NSMApplication {
  name: string;
  description: string;
  author: string;
  timestamp: number;
  machine: string;
  category?: string;
  tags?: string[];
  rating?: number;
  id?: string;
  version?: string;
  latestVersion?: string;
  installed?: boolean;
  cached?: boolean;
  changelog?: string;
  permissions?: string[];
  metadata?: {
    version?: string;
    screenshots?: string[];
    previewImage?: string;
  };
  activity?: {
    downloads: number;
    lastUsed: number;
    userCount: number;
  };
}

export function createNSMEvent(
  machine: any,
  appName: string,
  description: string
): NSMEvent {
  // Validate input parameters
  if (!machine) {
    throw new Error('Machine is required and cannot be null or undefined');
  }

  if (!appName || typeof appName !== 'string' || appName.trim() === '') {
    throw new Error('App name is required and must be a non-empty string');
  }

  if (!description || typeof description !== 'string') {
    throw new Error('Description is required and must be a string');
  }

  const identifier = `${appName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  return {
    kind: 30079,
    content: JSON.stringify({
      initialState: machine
    }),
    tags: [
      ['d', identifier],
      ['name', appName],
      ['description', description],
      ['engine', 'xstate'],
      ['engineCodeURI', 'https://xstate.js.org/']
    ]
  };
}

export function parseNSMEvent(event: any): NSMApplication | null {
  try {
    if (event.kind !== 30079) {
      return null;
    }

    const nameTag = event.tags.find((tag: string[]) => tag[0] === 'name')?.[1];
    const descriptionTag = event.tags.find((tag: string[]) => tag[0] === 'description')?.[1];
    const engineTag = event.tags.find((tag: string[]) => tag[0] === 'engine')?.[1];
    const engineCodeURITag = event.tags.find((tag: string[]) => tag[0] === 'engineCodeURI')?.[1];
    const dTag = event.tags.find((tag: string[]) => tag[0] === 'd')?.[1];

    if (!nameTag) {
      return null;
    }

    return {
      identifier: dTag || '',
      name: nameTag,
      description: descriptionTag || '',
      author: event.pubkey || '',
      timestamp: event.created_at || 0,
      machine: event.content,
      engine: engineTag || '',
      engineCodeURI: engineCodeURITag || '',
      initialState: null, // Will be parsed from machine content
      stateSchema: null,
      interactionSchema: null
    };
  } catch (error) {
    return null;
  }
}