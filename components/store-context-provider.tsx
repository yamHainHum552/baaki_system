"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { StoreContext } from "@/lib/auth";

type StoreClientContextValue = StoreContext["store"];

const StoreClientContext = createContext<StoreClientContextValue | null>(null);

export function StoreContextProvider({
  store,
  children,
}: {
  store: StoreClientContextValue;
  children: ReactNode;
}) {
  return (
    <StoreClientContext.Provider value={store}>
      {children}
    </StoreClientContext.Provider>
  );
}

export function useStoreClientContext() {
  const value = useContext(StoreClientContext);

  if (!value) {
    throw new Error("Store client context is not available.");
  }

  return value;
}
