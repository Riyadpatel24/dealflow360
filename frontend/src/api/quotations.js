const API_BASE_URL = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const token = sessionStorage.getItem("dealflow360_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export async function getQuotations() { return request("/quotations"); }
export async function getQuotation(quotationId) { return request(`/quotations/${quotationId}`); }
export async function createQuotation(data) { return request("/quotations", { method: "POST", body: JSON.stringify(data) }); }
export async function addQuotationLine(quotationId, data) { return request(`/quotations/${quotationId}/lines`, { method: "POST", body: JSON.stringify(data) }); }
export async function evaluateQuotationRisk(quotationId) { return request(`/quotations/${quotationId}/evaluate-risk`, { method: "POST" }); }
export async function getQuotationApproval(quotationId) { return request(`/quotations/${quotationId}/approval`); }
export async function actOnQuotationApproval(quotationId, stepId, action, reason = null) {
  return request(`/quotations/${quotationId}/approval/${stepId}/action`, { method: "POST", body: JSON.stringify({ action, reason }) });
}
export async function getMyQuotations() { return request("/quotations/customer/my-quotes"); }
export async function getCustomerQuotation(quotationId) { return request(`/customer/quotations/${quotationId}`); }
export async function submitNegotiation(quotationId, data) {
  return request(`/customer/quotations/${quotationId}/negotiations`, { method: "POST", body: JSON.stringify(data) });
}
