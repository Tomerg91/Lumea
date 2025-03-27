import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CTASection } from "@/components/landing/cta-section";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  
  // If user is already logged in, redirect to their dashboard
  if (!isLoading && user) {
    const dashboardUrl = user.role === "coach" ? "/coach/dashboard" : "/client/dashboard";
    return <Redirect to={dashboardUrl} />;
  }
  
  return (
    <div className="landing-page">
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
}
