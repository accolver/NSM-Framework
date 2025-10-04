export function Footer() {
  return (
    <footer className="border-t border-border mt-auto" role="contentinfo">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-sm text-muted-foreground">
            NSM Framework - Build on Nostr
          </div>

          <div className="flex items-center space-x-6">
            <a
              href="https://github.com/accolver/NSM-Framework"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub repository"
            >
              GitHub
            </a>
            <a
              href="https://nostr.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Nostr protocol"
            >
              Nostr
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
