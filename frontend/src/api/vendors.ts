import { request } from "./client";
import { arr, parsePurchaseOrder, parseRecord, parseVendor } from "./parse";
import type { PurchaseOrder, SeedResult, Vendor } from "../types/api";

export const listVendors = (): Promise<Vendor[]> => request("/vendors", (r) => arr(r, "vendors", parseVendor));

export const getVendor = (id: string): Promise<Vendor> => request(`/vendors/${encodeURIComponent(id)}`, parseVendor);

export const getVendorHistory = (id: string): Promise<PurchaseOrder[]> =>
  request(`/vendors/${encodeURIComponent(id)}/history`, (r) => arr(r, "vendor history", parsePurchaseOrder));

/** POST /seed — idempotent seeding of the processed datasets into the database. */
export const seedDatabase = (): Promise<SeedResult> => request("/seed", parseRecord, { method: "POST" });
