"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Email remembered for an order (sessionStorage). null = not known yet (server render), "" = none stored. */
export function useStoredEmail(reference: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem(`vm_email_${reference}`) ?? "";
      } catch {
        return "";
      }
    },
    () => null,
  );
}
