const BASE = "http://127.0.0.1:8000";

export async function getDealHealth() {
  const token = sessionStorage.getItem("dealflow360_token");
  const response = await fetch(`${BASE}/dashboard/deal-health`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Failed to load deal health");
  return data;
}
