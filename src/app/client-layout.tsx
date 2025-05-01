"use client";

import { useEffect } from "react";
import Script from "next/script";

// This is a client component to handle hydration fixes
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use client-side effect to suppress hydration warnings
  useEffect(() => {
    // This runs after hydration to prevent warnings
    if (typeof window !== 'undefined') {
      // Configure any third-party script behaviors if needed
      // window.someGlobalVariable = true;
    }
  }, []);

  return (
    <>
      {children}

      {/* Load any third-party scripts properly with Next.js Script component */}
      <Script id="hydration-fix" strategy="afterInteractive">
        {`
          // Optional: Clean up any attributes that might cause hydration warnings
          document.addEventListener('DOMContentLoaded', () => {
            // Allow React to hydrate first
            setTimeout(() => {
              // Script runs after hydration to prevent warnings
            }, 100);
          });
        `}
      </Script>
    </>
  );
} 