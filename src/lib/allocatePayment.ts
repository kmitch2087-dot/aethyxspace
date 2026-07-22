// Oldest-first payment allocation, mirrored server-side in the settle-balance edge
// function (which is the authority — this copy only powers the UI preview).
// Invoices must already be ordered oldest-first; amounts are dollars.

export interface PayableInvoice {
  id: string;
  remaining: number;
}

export interface PaymentAllocation {
  id: string;
  amount: number;
  fullyPaid: boolean;
}

const toCents = (n: number) => Math.round(n * 100);

export function allocatePayment(invoices: PayableInvoice[], amount: number): PaymentAllocation[] {
  let leftCents = toCents(amount);
  const allocations: PaymentAllocation[] = [];
  for (const inv of invoices) {
    if (leftCents <= 0) break;
    const remCents = toCents(inv.remaining);
    if (remCents <= 0) continue;
    const portionCents = Math.min(remCents, leftCents);
    leftCents -= portionCents;
    allocations.push({
      id: inv.id,
      amount: portionCents / 100,
      fullyPaid: portionCents === remCents,
    });
  }
  return allocations;
}
