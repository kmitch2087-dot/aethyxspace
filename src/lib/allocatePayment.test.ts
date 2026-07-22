import { describe, it, expect } from "vitest";
import { allocatePayment } from "./allocatePayment";

const invoices = [
  { id: "a", remaining: 350 },
  { id: "b", remaining: 350 },
];

describe("allocatePayment", () => {
  it("pays a single invoice exactly", () => {
    expect(allocatePayment(invoices, 350)).toEqual([
      { id: "a", amount: 350, fullyPaid: true },
    ]);
  });

  it("splits a partial across the oldest invoice only", () => {
    expect(allocatePayment(invoices, 200)).toEqual([
      { id: "a", amount: 200, fullyPaid: false },
    ]);
  });

  it("rolls over into the next invoice oldest-first", () => {
    expect(allocatePayment(invoices, 500)).toEqual([
      { id: "a", amount: 350, fullyPaid: true },
      { id: "b", amount: 150, fullyPaid: false },
    ]);
  });

  it("settles the whole balance", () => {
    expect(allocatePayment(invoices, 700)).toEqual([
      { id: "a", amount: 350, fullyPaid: true },
      { id: "b", amount: 350, fullyPaid: true },
    ]);
  });

  it("skips zero-remaining invoices and handles cents without float drift", () => {
    const mixed = [
      { id: "x", remaining: 0 },
      { id: "y", remaining: 0.1 },
      { id: "z", remaining: 0.2 },
    ];
    expect(allocatePayment(mixed, 0.3)).toEqual([
      { id: "y", amount: 0.1, fullyPaid: true },
      { id: "z", amount: 0.2, fullyPaid: true },
    ]);
  });

  it("caps allocations at the total remaining", () => {
    const allocs = allocatePayment(invoices, 900);
    expect(allocs.reduce((s, a) => s + a.amount, 0)).toBe(700);
  });
});
