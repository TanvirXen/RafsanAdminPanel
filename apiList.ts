// /apiList.ts
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://localhost:4000/api";

const path = (...parts: (string | number)[]) => `${API_BASE}/${parts.join("/")}`;

const apiList = {
  base: API_BASE,

  auth: {
    register: path("auth", "register"),
    login: path("auth", "login"),
    logout: path("auth", "logout"),
    me: path("auth", "me"),
    changePassword: path("auth", "change-password"),
    resetPassword: (userId: string) => path("auth", "reset-password", userId),
      reset: {
      request: path("auth", "reset", "request"),
      verify: path("auth", "reset", "verify"),
      confirm: path("auth", "reset", "confirm"),
    },
  },

  adminUsers: {
    list: path("admin-users"),
    create: path("admin-users"),
    get: (id: string) => path("admin-users", id),
    update: (id: string) => path("admin-users", id),
    delete: (id: string) => path("admin-users", id),
  },

  brands: {
    list: path("brands"),
    create: path("brands"),
    get: (id: string) => path("brands", id),
    update: (id: string) => path("brands", id),
    delete: (id: string) => path("brands", id),
  },

  events: {
    list: path("events"),
    create: path("events"),
    get: (id: string) => path("events", id),
    update: (id: string) => path("events", id),
    delete: (id: string) => path("events", id),
  },

  registrations: {
    list: path("registrations"),
    create: path("registrations"),
    get: (id: string) => path("registrations", id),
    update: (id: string) => path("registrations", id),
    delete: (id: string) => path("registrations", id),
  },

  payments: {
    list: path("payments"),
    create: path("payments"),
    get: (id: string) => path("payments", id),
    update: (id: string) => path("payments", id),
    delete: (id: string) => path("payments", id),
  },

  settings: {
    // adjust if your settings routes differ
    get: path("settings"),
    update: path("settings"),
  },

  notableEvents: {
    list: path("notable-events"),
    create: path("notable-events"),
    get: (id: string) => path("notable-events", id),
    update: (id: string) => path("notable-events", id),
    delete: (id: string) => path("notable-events", id),
  },

  timeline: {
    list: path("timeline"),
    create: path("timeline"),
    get: (id: string) => path("timeline", id),
    update: (id: string) => path("timeline", id),
    delete: (id: string) => path("timeline", id),
  },

  shots: {
    list: path("shots"),
    create: path("shots"),
    get: (id: string) => path("shots", id),
    update: (id: string) => path("shots", id),
    delete: (id: string) => path("shots", id),
  },

  shows: {
    list: path("shows"),
    create: path("shows"),
    get: (id: string) => path("shows", id),
    update: (id: string) => path("shows", id),
    delete: (id: string) => path("shows", id),
  },
};

export default apiList;
