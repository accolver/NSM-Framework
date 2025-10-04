import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  return (
    <nav className="border-b border-border" role="navigation" aria-label="Main navigation">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="text-xl font-bold text-primary">NSM Framework</div>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/accolver/NSM-Framework"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
