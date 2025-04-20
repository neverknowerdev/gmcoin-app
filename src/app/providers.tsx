"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "thirdweb/react";
import { client } from "@/src/config/thirdweb";

// Creating an instance of QueryClient
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider client={client}>{children}</ThirdwebProvider>
    </QueryClientProvider>
  );
}
