import './index.css';
import { Layout, Hero } from './components';
import { DeveloperSection, UserSection, HowItWorksSection, DemoSection } from './components/sections';

function App() {
  return (
    <Layout>
      <Hero />
      <DeveloperSection />
      <UserSection />
      <HowItWorksSection />
      <DemoSection />
    </Layout>
  );
}

export default App;
