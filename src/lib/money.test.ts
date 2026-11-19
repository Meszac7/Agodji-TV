import { describe, expect, it } from "vitest";
import { formatPrice, isCurrencyCode } from "./money";

const NBSP = " ";
const NNBSP = " "; // séparateur de milliers utilisé par Intl en français

describe("formatPrice", () => {
  it("affiche les prix XOF validés", () => {
    expect(formatPrice(300, "XOF")).toBe(`300${NBSP}FCFA`);
    expect(formatPrice(1500, "XOF")).toBe(`1${NNBSP}500${NBSP}FCFA`);
  });
  it("affiche le XAF aussi en FCFA, sans conversion", () => {
    expect(formatPrice(300, "XAF")).toBe(`300${NBSP}FCFA`);
  });
  it("gère les devises à centimes (USD, CDF)", () => {
    expect(formatPrice(50, "USD")).toBe(`0,50${NBSP}$`);
    expect(formatPrice(150000, "CDF")).toBe(`1${NNBSP}500,00${NBSP}FC`);
  });
  it("refuse les montants non entiers ou négatifs", () => {
    expect(() => formatPrice(1.5, "XOF")).toThrow(RangeError);
    expect(() => formatPrice(-1, "XOF")).toThrow(RangeError);
  });
  it("reconnaît les devises prises en charge", () => {
    expect(isCurrencyCode("XOF")).toBe(true);
    expect(isCurrencyCode("EUR")).toBe(false);
  });
});
