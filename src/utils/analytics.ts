export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
}

export const trackEvent = (event: string, properties?: Record<string, any>) => {
  try {
    // Add your analytics service integration here
    // Examples: Google Analytics, Mixpanel, Amplitude, etc.
    
    console.log('Analytics Event:', { event, properties });
    
    // Example for Google Analytics (gtag)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, properties);
    }
    
    // Example for custom analytics service
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(event, properties);
    }
    
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

export const trackFarcasterSignup = (fid: string, address?: string) => {
  trackEvent('website_signup_farcaster', {
    fid,
    address,
    timestamp: new Date().toISOString(),
    source: 'reown_appkit'
  });
};

export const trackFarcasterLogin = (fid: string, address?: string) => {
  trackEvent('website_login_farcaster', {
    fid,
    address,
    timestamp: new Date().toISOString(),
    source: 'reown_appkit'
  });
};