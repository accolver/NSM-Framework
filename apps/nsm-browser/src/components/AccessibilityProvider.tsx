import { ReactNode, useEffect, useState } from 'react';

interface AccessibilityProviderProps {
  children: ReactNode;
  fontSize?: 'small' | 'medium' | 'large';
}

export default function AccessibilityProvider({
  children,
  fontSize = 'medium'
}: AccessibilityProviderProps) {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    // Check for high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(highContrastQuery.matches);

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    highContrastQuery.addEventListener('change', handleHighContrastChange);

    // Check for reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(reducedMotionQuery.matches);

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    // Handle focus-visible
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    // Add ARIA labels to buttons without labels
    const addAriaLabels = () => {
      const buttons = document.querySelectorAll('button:not([aria-label])');
      buttons.forEach((button) => {
        const textContent = button.textContent?.trim();
        if (textContent) {
          button.setAttribute('aria-label', textContent);
        }
      });
    };

    // Run after mount and on mutations
    addAriaLabels();
    const observer = new MutationObserver(addAriaLabels);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      observer.disconnect();
    };
  }, []);

  const className = [
    highContrast ? 'high-contrast' : '',
    reducedMotion ? 'reduced-motion' : '',
    focusVisible ? 'focus-visible' : '',
    `font-${fontSize}`,
    window.devicePixelRatio >= 2 ? 'zoom-compatible' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={className}>
      {children}
    </div>
  );
}