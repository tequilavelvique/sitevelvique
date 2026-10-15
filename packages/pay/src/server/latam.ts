import type { OnrampProvider } from "../rails/onramp";

/**
 * Rail D: card in MXN and LATAM. Provider not selected yet (guide section 6).
 * Candidates: thirdweb Payments, Transak, MoonPay, Bitso Business.
 * Selection criteria: MXN card support, KYC friction, USDC delivered straight to Base.
 * Implement `OnrampProvider` here; nothing else in the app changes.
 */
export function latamProvider(): OnrampProvider | null {
  return null;
}
