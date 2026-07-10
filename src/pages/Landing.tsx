import { LandingLayout } from '../components/landing/LandingLayout';
import { HeroSection } from '../components/landing/sections/HeroSection';
import { FeaturesSection } from '../components/landing/sections/FeaturesSection';
import { ShowcaseSection } from '../components/landing/sections/ShowcaseSection';
import { SocialProofSection } from '../components/landing/sections/SocialProofSection';
import { BeforeAfterSection } from '../components/landing/sections/BeforeAfterSection';
import { RolesSection } from '../components/landing/sections/RolesSection';
import { HowItWorksSection } from '../components/landing/sections/HowItWorksSection';
import { FaqSection } from '../components/landing/sections/FaqSection';
import { CtaSection } from '../components/landing/sections/CtaSection';

export default function Landing() {
  return (
    <LandingLayout>
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <SocialProofSection />
      <BeforeAfterSection />
      <RolesSection />
      <HowItWorksSection />
      <FaqSection />
      <CtaSection />
    </LandingLayout>
  );
}
