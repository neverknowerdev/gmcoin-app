"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    gtag: ((...args: any[]) => void) & { q?: any[] };
    hj: ((...args: any[]) => void) & { q?: any[] };
    _hjSettings: {
      hjid: number;
      hjsv: number;
    };
    googleAnalyticsId?: string;
  }
}

interface AnalyticsProps {
  gaId?: string;
  hotjarId?: string;
}

export default function Analytics({ gaId, hotjarId }: AnalyticsProps) {
  // Initialize Google Analytics
  useEffect(() => {
    if (gaId && typeof window !== "undefined") {
      window.gtag = window.gtag || function (...args: any[]) {
        (window.gtag.q = window.gtag.q || []).push(args);
      };
      // Store the GA ID for later use
      window.googleAnalyticsId = gaId;
      window.gtag("js", new Date());
      window.gtag("config", gaId, {
        page_title: document.title,
        page_location: window.location.href,
      });
    }
  }, [gaId]);

  // Initialize Hotjar
  useEffect(() => {
    if (hotjarId && typeof window !== "undefined") {
      const hjid = parseInt(hotjarId);
      window._hjSettings = { hjid, hjsv: 6 };

      window.hj = window.hj || function (...args: any[]) {
        (window.hj.q = window.hj.q || []).push(args);
      };
    }
  }, [hotjarId]);

  return (
    <>
      {/* Google Analytics */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}

      {/* Hotjar */}
      {hotjarId && (
        <Script id="hotjar" strategy="afterInteractive">
          {`
            (function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:${hotjarId},hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>
      )}
    </>
  );
}

// Custom hook for tracking events
export const useAnalytics = () => {
  const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
    // Google Analytics event tracking
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, parameters);
    }

    // Hotjar event tracking
    if (typeof window !== "undefined" && window.hj) {
      window.hj("event", eventName);
    }
  };

  const trackPageView = (pageTitle: string, pagePath: string) => {
    // Google Analytics page view
    if (typeof window !== "undefined" && window.gtag) {
      // Use the current active GA ID instead of environment variable
      window.gtag("config", window.googleAnalyticsId, {
        page_title: pageTitle,
        page_location: window.location.origin + pagePath,
      });
    }
  };

  const identifyUser = (userId: string, traits?: Record<string, any>) => {
    // Hotjar user identification
    if (typeof window !== "undefined" && window.hj) {
      window.hj("identify", userId, traits);
    }
  };

  return {
    trackEvent,
    trackPageView,
    identifyUser,
  };
};