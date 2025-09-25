import { useState, useEffect, useRef } from 'react';
import { UIResolver, UICapabilities, NSMUIEvent } from '@nsm/client/ui/ui-resolver';

interface UIFallbackSpec {
  type: 'mcp-ui' | 'web-components' | 'json-ui';
  mcpServerUrl?: string;
  componentPath?: string;
  capabilities?: string[];
  bundle?: {
    url: string;
    integrity: string;
    components: string[];
  };
  schema?: {
    title: string;
    description: string;
    components: Array<{
      type: string;
      text?: string;
      event?: string;
      [key: string]: any;
    }>;
  };
}

interface ApplicationWithUI {
  name: string;
  description: string;
  machine: string;
  ui?: {
    fallbacks: UIFallbackSpec[];
  };
  [key: string]: any;
}

interface ProgressiveUIRendererProps {
  application: ApplicationWithUI;
  currentState?: { value: string; context: any };
  onNSMEvent?: (event: NSMUIEvent) => void;
}

export default function ProgressiveUIRenderer({
  application,
  currentState,
  onNSMEvent
}: ProgressiveUIRendererProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendererType, setRendererType] = useState<string>('');
  const [capabilities, setCapabilities] = useState<UICapabilities | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const uiResolverRef = useRef<UIResolver | null>(null);

  useEffect(() => {
    if (!uiResolverRef.current) {
      uiResolverRef.current = new UIResolver();
    }

    const resolver = uiResolverRef.current;
    const detectedCapabilities = resolver.detectCapabilities();
    setCapabilities(detectedCapabilities);

    return () => {
      resolver.cleanup();
    };
  }, []);

  useEffect(() => {
    if (!capabilities || !containerRef.current || !application.ui?.fallbacks) {
      return;
    }

    renderUI();
  }, [capabilities, application, currentState]);

  const renderUI = async () => {
    if (!uiResolverRef.current || !containerRef.current || !application.ui?.fallbacks) {
      return;
    }

    setLoading(true);
    setError(null);

    const resolver = uiResolverRef.current;
    const fallbacks = application.ui.fallbacks;

    // Try each fallback in order
    let renderResult = null;
    let selectedSpec = null;

    for (const spec of fallbacks) {
      selectedSpec = resolver.selectFallback([spec]);
      if (!selectedSpec) continue;

      try {
        renderResult = await resolver.renderUI(
          selectedSpec,
          containerRef.current,
          handleUIEvent
        );

        if (renderResult.success) {
          setRendererType(renderResult.renderer || spec.type);
          break;
        }
      } catch (renderError) {
        console.warn(`Failed to render ${spec.type}:`, renderError);
        continue;
      }
    }

    if (!renderResult?.success) {
      // Try fallback again with different specs
      const fallbackSpec = resolver.selectFallback(fallbacks);
      if (fallbackSpec) {
        try {
          renderResult = await resolver.renderUI(
            fallbackSpec,
            containerRef.current,
            handleUIEvent
          );

          if (renderResult.success) {
            setRendererType(renderResult.renderer || fallbackSpec.type);
          }
        } catch (fallbackError) {
          setError(`Failed to load UI: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
      } else {
        setError('No compatible UI renderer available');
      }
    }

    setLoading(false);
  };

  const handleUIEvent = (event: NSMUIEvent) => {
    if (onNSMEvent) {
      onNSMEvent(event);
    }
  };

  if (loading) {
    return (
      <div className="ui-renderer-loading">
        <p>Loading UI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-renderer-error">
        <p>Failed to load UI: {error}</p>
        <button onClick={renderUI}>Retry</button>
      </div>
    );
  }

  return (
    <div className="progressive-ui-renderer">
      {rendererType && (
        <div className="renderer-info">
          <span className="renderer-type">
            {rendererType === 'mcp-ui' && 'MCP-UI'}
            {rendererType === 'web-components' && 'Web Components'}
            {rendererType === 'json-ui' && 'JSON-UI'}
          </span>
        </div>
      )}
      <div
        ref={containerRef}
        className="ui-container"
        data-renderer={rendererType}
      />
    </div>
  );
}