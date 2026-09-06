const BASE = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const token = sessionStorage.getItem("dealflow360_token");
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export async function getWarehouses() { return request("/warehouses"); }
export async function getInventory() { return request("/inventory"); }

export async function getQuotations() { return request("/quotations/"); }

export async function getFulfillmentRecommendation(quotationId) {
  return request(`/quotations/${quotationId}/fulfillment/recommendation`);
}
export async function getFulfillment(quotationId) {
  return request(`/quotations/${quotationId}/fulfillment`);
}
export async function fulfillQuotation(quotationId, overrides = null) {
  return request(`/quotations/${quotationId}/fulfill`, { method: "POST", body: JSON.stringify({ overrides }) });
}
export async function shipQuotation(quotationId) {
  return request(`/quotations/${quotationId}/ship`, { method: "POST" });
}
export async function consolidateBackorder(backorderId) {
  return request(`/backorders/${backorderId}/consolidate`, { method: "POST" });
}

export async function actOnApproval(quoteId, stepId, action, reason = null) {
  return request(`/quotations/${quoteId}/approvals/${stepId}/action`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
}

export async function getCustomerQuote(quotationId) {
  return request(`/customer/quotations/${quotationId}`);
}
export async function submitNegotiation(quotationId, data) {
  return request(`/customer/quotations/${quotationId}/negotiations`, { method: "POST", body: JSON.stringify(data) });
}

export async function createInvoices(quotationId) {
  return request(`/quotations/${quotationId}/invoices`, { method: "POST" });
}
export async function getInvoices() { return request("/invoices"); }
export async function recordPayment(invoiceId, data) {
  return request(`/invoices/${invoiceId}/payments`, { method: "POST", body: JSON.stringify(data) });
}
