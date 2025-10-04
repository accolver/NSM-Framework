import { Button } from './ui/Button';
import { trackCTAClick, trackExternalLink } from '@/lib/analytics';

export function Hero() {
  const handleDemoClick = () => {
    trackCTAClick('Try Live Demo', 'secondary');
    const demoSection = document.getElementById('demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGitHubClick = () => {
    trackCTAClick('Star on GitHub', 'primary');
    trackExternalLink('https://github.com/accolver/NSM-Framework', 'Star on GitHub');
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
          Build Censorship-Resistant Apps on Nostr
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          The NSM Framework provides deterministic state management for building collaborative,
          multi-user applications on the Nostr protocol. Build the next generation of decentralized apps.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://github.com/accolver/NSM-Framework"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleGitHubClick}
          >
            <Button size="lg" className="w-full sm:w-auto">
              Star on GitHub
            </Button>
          </a>

          <Button
            size="lg"
            variant="outline"
            onClick={handleDemoClick}
            className="w-full sm:w-auto"
          >
            Try Live Demo
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="text-success mb-3">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Deterministic</h3>
            <p className="text-sm text-muted-foreground">
              Predictable state management ensures all clients reach consensus
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="text-info mb-3">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Multi-User</h3>
            <p className="text-sm text-muted-foreground">
              Built for collaborative applications from the ground up
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="text-warning mb-3">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Nostr-Native</h3>
            <p className="text-sm text-muted-foreground">
              Leverages the power of the decentralized Nostr protocol
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
