const API_BASE_URL = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const token = sessionStorage.getItem("dealflow360_token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}


// USERS

export async function getUsers() {
  return request("/admin/users");
}

export async function createUser(user) {
  return request("/admin/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
}


// CUSTOMERS

export async function getCustomers() {
  return request("/admin/customers");
}

export async function createCustomer(customer) {
  return request("/admin/customers", {
    method: "POST",
    body: JSON.stringify(customer),
  });
}


// PRODUCTS

export async function getProducts() {
  return request("/admin/products");
}

export async function createProduct(product) {
  return request("/admin/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}


// DISCOUNT POLICIES

export async function getDiscountPolicies() {
  return request("/admin/discount-policies");
}

export async function createDiscountPolicy(policy) {
  return request("/admin/discount-policies", {
    method: "POST",
    body: JSON.stringify(policy),
  });
}