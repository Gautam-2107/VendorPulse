import { request } from "./client";
import { arr, parsePurchaseRequest } from "./parse";
import type { PurchaseRequest, PurchaseRequestCreate } from "../types/api";

export const listPurchaseRequests = (): Promise<PurchaseRequest[]> =>
  request("/purchase-requests", (r) => arr(r, "purchase requests", parsePurchaseRequest));

export const getPurchaseRequest = (id: string): Promise<PurchaseRequest> =>
  request(`/purchase-requests/${encodeURIComponent(id)}`, parsePurchaseRequest);

export const createPurchaseRequest = (body: PurchaseRequestCreate): Promise<PurchaseRequest> =>
  request("/purchase-requests", parsePurchaseRequest, { method: "POST", body });
