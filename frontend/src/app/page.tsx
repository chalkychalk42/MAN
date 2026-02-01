import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/features/landing/HeroSection';
import { FeatureGrid } from '@/components/features/landing/FeatureGrid';
import { DemoSection } from '@/components/features/landing/DemoSection';
import { CTASection } from '@/components/features/landing/CTASection';

export default function HomePage() {
  return (
    <>
      <Header showSearch={false} />
      <main>
        <HeroSection />
        <FeatureGrid />
        <DemoSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
