// /apiList.ts (ADMIN CMS)

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://localhost:4000/api";

const path = (...parts: (string | number)[]) => `${API_BASE}/${parts.join("/")}`;

// Simple querystring helper (optional to use)
const withQuery = (
  url: string,
  params?: Record<string, string | number | boolean | undefined>
) => {
  if (!params) return url;
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${url}?${qs}` : url;
};

const apiList = {
  base: API_BASE,

  dashboard: {
    summary: path("dashboard", "summary"),
  },

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
    get: path("settings"),
    update: path("settings"),
  },

  // ----- Newsletter (admin) -----
  newsletter: {
    // GET /api/newsletter/settings
    settingsGet: path("newsletter", "settings"),

    // PUT /api/newsletter/settings
    settingsUpdate: path("newsletter", "settings"),

    // GET /api/newsletter/subscribers
    listSubscribers: path("newsletter", "subscribers"),
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
    // Shows (CRUD)
    list: path("shows"),
    create: path("shows"),
    get: (id: string) => path("shows", id),
    update: (id: string) => path("shows", id),
    delete: (id: string) => path("shows", id),

    // -------- Seasons --------
    // List all seasons (optionally filter using withQuery(..., { showId }))
    seasons: path("shows", "seasons"),
    // Seasons for one show
    seasonsByShow: (showId: string) => path("shows", showId, "seasons"),
    // Create season under a show
    createSeason: (showId: string) => path("shows", showId, "seasons"),
    // Update/Delete a season under a show
    updateSeason: (showId: string, seasonId: string) =>
      path("shows", showId, "seasons", seasonId),
    deleteSeason: (showId: string, seasonId: string) =>
      path("shows", showId, "seasons", seasonId),

    // -------- Episodes --------
    // List all episodes (optionally filter using withQuery(..., { showId, seasonId }))
    episodes: path("shows", "episodes"),
    // Episodes by season
    episodesBySeason: (showId: string, seasonId: string) =>
      path("shows", showId, "seasons", seasonId, "episodes"),
    // Create episode under a season
    createEpisode: (showId: string, seasonId: string) =>
      path("shows", showId, "seasons", seasonId, "episodes"),
    // Update/Delete an episode
    updateEpisode: (showId: string, seasonId: string, episodeId: string) =>
      path("shows", showId, "seasons", seasonId, "episodes", episodeId),
    deleteEpisode: (showId: string, seasonId: string, episodeId: string) =>
      path("shows", showId, "seasons", seasonId, "episodes", episodeId),

    // -------- Reels --------
    // List all reels (optionally filter using withQuery(..., { showId }))
    reels: path("shows", "reels"),
    // Reels for one show
    reelsByShow: (showId: string) => path("shows", showId, "reels"),
    // Create reel for a show
    createReel: (showId: string) => path("shows", showId, "reels"),
    // Update/Delete a reel
    updateReel: (showId: string, reelId: string) =>
      path("shows", showId, "reels", reelId),
    deleteReel: (showId: string, reelId: string) =>
      path("shows", showId, "reels", reelId),

    // helper to attach query params when needed
    withQuery,
  },
  banners: {
    // GET /api/banners?type=about|gallery
    get: (type: "about" | "gallery") =>
      withQuery(path("banners"), { type }),

    // PUT /api/banners?type=about|gallery  (upsert)
    update: (type: "about" | "gallery") =>
      withQuery(path("banners"), { type }),
  },
  contact: {
    create: path("contact"),
    list: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
      const url = new URL(path("contact"), API_BASE);

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, String(value));
          }
        });
      }

      return url.toString();
    },
    updateStatus: (id: string) => path("contact", id, "status"),
    delete: (id: string) => path("contact", id),
  },


  upload: {
    image: `${API_BASE}/upload-image`,
  },
};

export default apiList;
export { withQuery };
