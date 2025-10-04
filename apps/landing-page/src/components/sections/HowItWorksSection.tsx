export function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: 'Developer publishes state machine to Nostr',
      description: 'State machine definitions are published as events, making them discoverable and verifiable.',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      number: 2,
      title: 'Users discover apps via NSM-compatible clients',
      description: 'Browse and install applications directly from the Nostr network without app stores.',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      number: 3,
      title: 'State synchronizes across devices via Nostr relays',
      description: 'Real-time state updates propagate automatically, enabling seamless multi-device experiences.',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      number: 4,
      title: 'Updates deploy instantly via content-addressed storage',
      description: 'Application updates are cryptographically verified and delivered instantly without downtime.',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="w-full px-4 py-20 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          How It Works
        </h2>
        <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
          NSM Framework combines state machines, Nostr protocol, and content-addressed storage
          for a new paradigm in application development.
        </p>

        <ol className="space-y-12">
          {steps.map((step) => (
            <li key={step.number} className="flex flex-col md:flex-row gap-6 items-start">
              {/* Step Number Badge */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  {step.number}
                </div>
              </div>

              {/* Icon and Content */}
              <div className="flex-1 bg-card rounded-lg p-6 border border-border">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-accent">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
