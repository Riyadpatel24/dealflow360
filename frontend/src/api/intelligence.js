const API_BASE_URL = "http://127.0.0.1:8000";

async function request(path, options = {}, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export const getNotifications = (token) => request("/intelligence/notifications", {}, token);
export const markNotificationRead = (id, token) => request(`/intelligence/notifications/${id}/read`, { method: "POST" }, token);
export const markAllNotificationsRead = (token) => request("/intelligence/notifications/read-all", { method: "POST" }, token);
export const getAuditTrail = (token) => request("/intelligence/audit", {}, token);
export const globalSearch = (q, token) => request(`/intelligence/search?q=${encodeURIComponent(q)}`, {}, token);
export const getCustomer360 = (id, token) => request(`/intelligence/customers/${id}/360`, {}, token);
export const getRevenueAnalytics = (token) => request("/intelligence/analytics/revenue", {}, token);
export const getDealHealthV2 = (token) => request("/intelligence/deal-health", {}, token);
export const getWarehouse = (token) => request("/intelligence/warehouse", {}, token);
export const getNextBestActions = (token) => request("/intelligence/next-best-actions", {}, token);
export const getPipeline = (token) => request("/intelligence/pipeline", {}, token);
export const getReceivables = (token) => request("/intelligence/receivables", {}, token);
export const getDealAI = (id, token) => request(`/intelligence/ai/deal/${id}`, {}, token);
export const changePassword = (current_password, new_password, token) => request("/intelligence/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) }, token);
