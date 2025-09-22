/**
 * Modern clipboard API wrapper with fallback support
 */

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Checks if the modern clipboard API is available
 */
export const isClipboardAPIAvailable = (): boolean => {
  return (
    typeof navigator !== 'undefined' &&
    'clipboard' in navigator &&
    'writeText' in navigator.clipboard
  );
};

/**
 * Fallback clipboard copy using document.execCommand (deprecated but more compatible)
 */
const fallbackCopyToClipboard = (text: string): ClipboardResult => {
  try {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.setAttribute('aria-hidden', 'true');

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    return {
      success,
      error: success ? undefined : 'execCommand copy failed'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown fallback error'
    };
  }
};

/**
 * Copies text to clipboard using modern API with fallback
 */
export const copyToClipboard = async (text: string): Promise<ClipboardResult> => {
  // Try modern clipboard API first
  if (isClipboardAPIAvailable()) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      // If modern API fails, try fallback
      console.warn('Modern clipboard API failed, trying fallback:', error);
      return fallbackCopyToClipboard(text);
    }
  }

  // Use fallback if modern API is not available
  return fallbackCopyToClipboard(text);
};

/**
 * Reads text from clipboard (if permissions allow)
 */
export const readFromClipboard = async (): Promise<{ success: boolean; text?: string; error?: string }> => {
  if (!isClipboardAPIAvailable()) {
    return {
      success: false,
      error: 'Clipboard API not available'
    };
  }

  try {
    const text = await navigator.clipboard.readText();
    return {
      success: true,
      text
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown read error'
    };
  }
};

/**
 * Checks clipboard permissions
 */
export const checkClipboardPermissions = async (): Promise<{
  canRead: boolean;
  canWrite: boolean;
}> => {
  if (!('permissions' in navigator)) {
    return { canRead: false, canWrite: isClipboardAPIAvailable() };
  }

  try {
    const readPermission = await navigator.permissions.query({
      name: 'clipboard-read' as PermissionName
    });
    const writePermission = await navigator.permissions.query({
      name: 'clipboard-write' as PermissionName
    });

    return {
      canRead: readPermission.state === 'granted',
      canWrite: writePermission.state === 'granted' || isClipboardAPIAvailable()
    };
  } catch (error) {
    // Fallback if permissions API is not supported
    return {
      canRead: false,
      canWrite: isClipboardAPIAvailable()
    };
  }
};