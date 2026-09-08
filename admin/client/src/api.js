// Thin fetch wrapper. All calls go to /api (proxied to the backend by Vite) and
// include credentials so the httpOnly auth cookie travels with every request.
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : undefined,
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Ошибка ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  me: () => request("/auth/me"),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),

  // meta
  meta: () => request("/meta"),

  // products
  listProducts: () => request("/products"),
  getProduct: (slug) => request(`/products/${slug}`),
  createProduct: (body) => request("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (slug, body) =>
    request(`/products/${slug}`, { method: "PUT", body: JSON.stringify(body) }),
  setVisibility: (slug, hidden) =>
    request(`/products/${slug}/visibility`, { method: "PATCH", body: JSON.stringify({ hidden }) }),
  deleteProduct: (slug) => request(`/products/${slug}`, { method: "DELETE" }),

  uploadImage: (file, baseSlug) => {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("baseSlug", baseSlug || "product");
    return request("/products/upload", { method: "POST", body: fd });
  },

  // UZ/EN auto-draft
  translateDraft: (text, to = "uz") =>
    request("/translate-draft", {
      method: "POST",
      body: JSON.stringify({ text, from: "ru", to }),
    }),

  // audit log
  auditList: (limit = 100) => request(`/audit?limit=${limit}`),
  auditDetails: (hash) => request(`/audit/${hash}`),
  auditRevert: (hash) => request(`/audit/${hash}/revert`, { method: "POST" }),

  // price list
  priceListInfo: () => request("/pricelist"),
  priceListUpload: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("/pricelist", { method: "POST", body: fd });
  },

  // publish (catch up any commits that piled up without going out)
  publishStatus: () => request("/publish/status"),
  publish: () => request("/publish", { method: "POST" }),
};

// Generic resource API for the Phase 2 content types (partners, clients,
// certificates, events). Mirrors the server's contentRouter contract.
function resource(name) {
  return {
    list: () => request(`/${name}`),
    get: (id) => request(`/${name}/${id}`),
    create: (body) => request(`/${name}`, { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/${name}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    setVisibility: (id, hidden) =>
      request(`/${name}/${id}/visibility`, { method: "PATCH", body: JSON.stringify({ hidden }) }),
    reorder: (ids) => request(`/${name}/reorder`, { method: "POST", body: JSON.stringify({ ids }) }),
    remove: (id) => request(`/${name}/${id}`, { method: "DELETE" }),
    upload: (file, kind, base, extra = {}) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      fd.append("base", base || "");
      for (const [k, v] of Object.entries(extra)) fd.append(k, v);
      return request(`/${name}/upload`, { method: "POST", body: fd });
    },
  };
}

export const partnersApi = resource("partners");
export const clientsApi = resource("clients");
export const certificatesApi = resource("certificates");
export const eventsApi = resource("events");
