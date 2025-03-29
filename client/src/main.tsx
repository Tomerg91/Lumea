import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import App from "./App";
import "./index.css";
import "./styles/onboarding.css";
import "./styles/mobile.css";
import { queryClient } from "./lib/queryClient";
import { registerServiceWorker } from "./lib/service-worker";

// Check if we're running in a mobile environment
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Dynamically import mobile features only when needed (if available)
const tryInitMobileFeatures = async () => {
  if (isMobile()) {
    try {
      // The mobile module might not be available in development environment
      const mobileModule = await import('./lib/mobile').catch(() => null);
      if (mobileModule && mobileModule.initMobilePlatform) {
        await mobileModule.initMobilePlatform();
      }
    } catch (error) {
      console.log('Mobile features not available in this environment:', error);
    }
  }
};

// Try to initialize mobile features, but don't block rendering
tryInitMobileFeatures();

// Unregister any existing service workers and temporarily disable registration
import { unregisterServiceWorker } from "./lib/service-worker";

// Unregister service worker to fix homepage issues
unregisterServiceWorker().catch(error => {
  console.warn('Service worker unregistration failed:', error);
});

// Initialize the app
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OnboardingProvider>
        <App />
      </OnboardingProvider>
    </AuthProvider>
  </QueryClientProvider>
);
