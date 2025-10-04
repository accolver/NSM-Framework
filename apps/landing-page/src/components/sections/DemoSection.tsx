import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';

export function DemoSection() {
  return (
    <section id="demo" className="w-full px-4 py-20 bg-muted/50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See It In Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Try our Wordle proof-of-concept built on NSM Framework
          </p>
        </div>

        {/* Application Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* NSM Wordle App Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-xl">NSM Wordle</CardTitle>
              <CardDescription>
                Decentralized word game with state synchronization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">React</Badge>
                <Badge variant="secondary">XState</Badge>
                <Badge variant="secondary">Nostr</Badge>
                <Badge variant="secondary">Blossom</Badge>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <a
                href="/wordle"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full">Try It</Button>
              </a>
              <a
                href="https://github.com/accolver/NSM-Framework/tree/main/apps/poc-wordle"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full">View Source</Button>
              </a>
            </CardFooter>
          </Card>

          {/* Placeholder Card 1 */}
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-xl text-muted-foreground">Coming Soon</CardTitle>
              <CardDescription>
                More apps coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We're working on more proof-of-concept applications to showcase NSM Framework capabilities.
              </p>
            </CardContent>
          </Card>

          {/* Developer CTA Card */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-xl">Build the next NSM app</CardTitle>
              <CardDescription>
                Join our developer community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Start building decentralized applications with NSM Framework today. Check out our documentation and examples.
              </p>
            </CardContent>
            <CardFooter>
              <a
                href="https://github.com/accolver/NSM-Framework"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full">Get Started</Button>
              </a>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
