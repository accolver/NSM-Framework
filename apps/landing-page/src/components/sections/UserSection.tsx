import { Button } from '../ui/Button';

export function UserSection() {
  const handleTryAppClick = () => {
    const demoSection = document.getElementById('demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full px-4 py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Your Data, Your Control
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Benefit 1: Censorship Resistant */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 text-success">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Censorship Resistant</h3>
                <p className="text-muted-foreground">
                  No single authority can block or shut down applications. True freedom to communicate.
                </p>
              </div>
            </div>
          </div>

          {/* Benefit 2: Data Sovereignty */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 text-info">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Data Sovereignty</h3>
                <p className="text-muted-foreground">
                  You own your application state and data. No corporate intermediaries or data mining.
                </p>
              </div>
            </div>
          </div>

          {/* Benefit 3: True Portability */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 text-warning">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">True Portability</h3>
                <p className="text-muted-foreground">
                  Switch clients anytime without losing your data. Never locked into a single vendor.
                </p>
              </div>
            </div>
          </div>

          {/* Benefit 4: Privacy First */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 text-accent">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
                <p className="text-muted-foreground">
                  End-to-end encrypted state ensures your data remains private and secure.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" onClick={handleTryAppClick}>
            Try an Application
          </Button>
        </div>
      </div>
    </section>
  );
}
