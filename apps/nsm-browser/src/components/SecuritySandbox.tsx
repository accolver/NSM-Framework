import { ReactNode, useEffect, useState, useRef } from 'react';

interface SecuritySandboxProps {
  application: {
    name: string;
    [key: string]: any;
  };
  children: ReactNode;
  isolationMode?: 'iframe' | 'worker' | 'inline';
  requiredPermissions?: string[];
  grantedPermissions?: string[];
  allowedDomains?: string[];
  enforceSSL?: boolean;
  resourceLimits?: {
    maxMemory?: number;
    maxCPU?: number;
  };
  resourceUsage?: {
    memory?: number;
    cpu?: number;
  };
  onPermissionDenied?: (permission: string) => void;
  onPermissionRevoked?: (permission: string) => void;
  onResourceExceeded?: (resource: string) => void;
  onNetworkBlocked?: (url: string) => void;
}

export default function SecuritySandbox({
  application,
  children,
  isolationMode = 'inline',
  requiredPermissions = [],
  grantedPermissions = [],
  allowedDomains = [],
  enforceSSL = false,
  resourceLimits = {},
  resourceUsage = {},
  onPermissionDenied,
  onPermissionRevoked,
  onResourceExceeded,
  onNetworkBlocked
}: SecuritySandboxProps) {
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Set up Content Security Policy
    let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
    if (!cspMeta) {
      cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      document.head.appendChild(cspMeta);
    }

    const cspValue = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      allowedDomains.length > 0 ? `connect-src ${allowedDomains.join(' ')}` : '',
      enforceSSL ? "upgrade-insecure-requests" : ''
    ].filter(Boolean).join('; ');

    cspMeta.content = cspValue;

    // Monitor for network requests
    const handleNetworkRequest = (event: CustomEvent) => {
      const url = event.detail?.url;
      if (url && allowedDomains.length > 0) {
        const urlObj = new URL(url);
        const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));

        if (!isAllowed && onNetworkBlocked) {
          onNetworkBlocked(url);
        }
      }
    };

    window.addEventListener('network-request-blocked', handleNetworkRequest as EventListener);

    // Monitor resource usage
    if (resourceLimits.maxMemory && resourceUsage.memory && resourceUsage.memory > resourceLimits.maxMemory) {
      if (onResourceExceeded) {
        onResourceExceeded('memory');
      }
    }

    // Handle permission requests
    const handlePermissionRequest = (event: CustomEvent) => {
      const permission = event.detail?.permission;
      if (permission && !grantedPermissions.includes(permission)) {
        if (onPermissionDenied) {
          onPermissionDenied(permission);
        }
      }
    };

    document.addEventListener('network-request', handlePermissionRequest as EventListener);

    return () => {
      window.removeEventListener('network-request-blocked', handleNetworkRequest as EventListener);
      document.removeEventListener('network-request', handlePermissionRequest as EventListener);
    };
  }, [allowedDomains, enforceSSL, grantedPermissions, resourceLimits, resourceUsage, onPermissionDenied, onResourceExceeded, onNetworkBlocked]);

  const handlePermissionRequest = (permission: string) => {
    if (grantedPermissions.includes(permission)) {
      return true;
    }

    setPendingPermission(permission);
    setShowPermissionDialog(true);
    return false;
  };

  const handleGrantPermission = () => {
    if (pendingPermission) {
      // Would typically update grantedPermissions through parent component
      setShowPermissionDialog(false);
      setPendingPermission(null);
    }
  };

  const handleDenyPermission = () => {
    if (pendingPermission && onPermissionDenied) {
      onPermissionDenied(pendingPermission);
    }
    setShowPermissionDialog(false);
    setPendingPermission(null);
  };

  const handleRevokePermission = (permission: string) => {
    if (onPermissionRevoked) {
      onPermissionRevoked(permission);
    }
  };

  const sanitizeHTML = (html: string) => {
    // Basic HTML sanitization - remove script tags
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  const renderContent = () => {
    if (isolationMode === 'iframe') {
      return (
        <iframe
          ref={iframeRef}
          data-testid="security-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms"
          style={{ width: '100%', height: '100%', border: 'none' }}
          srcDoc={sanitizeHTML(children?.toString() || '')}
        />
      );
    }

    return (
      <div data-testid="sandbox-container" className="sandbox-content">
        {children}
      </div>
    );
  };

  return (
    <div className="security-sandbox">
      <div className="sandbox-info">
        <h3>Security Information</h3>

        {requiredPermissions.length > 0 && (
          <div>
            <strong>Permissions:</strong>
            {requiredPermissions.map(permission => (
              <div key={permission} className="permission-item">
                <span>{permission}</span>
                {grantedPermissions.includes(permission) && (
                  <button onClick={() => handleRevokePermission(permission)}>
                    Revoke {permission}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {allowedDomains.length > 0 && (
          <div>
            <strong>Allowed domains:</strong>
            {allowedDomains.map(domain => (
              <span key={domain}>{domain}</span>
            ))}
          </div>
        )}

        {enforceSSL && (
          <div>SSL required for all connections</div>
        )}

        {resourceLimits.maxMemory && (
          <div>Memory limit: {Math.round(resourceLimits.maxMemory / (1024 * 1024))} MB</div>
        )}

        {resourceLimits.maxCPU && (
          <div>CPU limit: {resourceLimits.maxCPU}%</div>
        )}

        {resourceUsage.memory && resourceLimits.maxMemory &&
         resourceUsage.memory > resourceLimits.maxMemory && (
          <div className="error">Memory limit exceeded</div>
        )}
      </div>

      {renderContent()}

      {showPermissionDialog && (
        <div className="permission-dialog">
          <h3>Permission Required</h3>
          <p>This application requires {pendingPermission} permission.</p>
          <button onClick={handleGrantPermission}>Grant Permissions</button>
          <button onClick={handleDenyPermission}>Deny</button>
        </div>
      )}

      {grantedPermissions.includes('notifications') && requiredPermissions.includes('notifications') && (
        <div className="permission-status">Permissions denied</div>
      )}
    </div>
  );
}