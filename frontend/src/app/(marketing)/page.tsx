import { HeroSection } from '@/components/features/landing/HeroSection';
import { FeatureGrid } from '@/components/features/landing/FeatureGrid';
import { DemoSection } from '@/components/features/landing/DemoSection';
import { CTASection } from '@/components/features/landing/CTASection';

export default function MarketingPage() {
  return (
    <>
      <HeroSection />
      <FeatureGrid />
      <DemoSection />
      <CTASection />
    </>
  );
}
