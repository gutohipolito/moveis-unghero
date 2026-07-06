import { isDatabaseOffline } from "@/lib/prisma";

export function isProductionEnv() {
  return process.env.NODE_ENV === "production";
}

/** Mocks de demonstração só em desenvolvimento local. */
export function allowDevMocks() {
  return !isProductionEnv();
}

export function shouldUseOfflineMocks() {
  return isDatabaseOffline() && allowDevMocks();
}
