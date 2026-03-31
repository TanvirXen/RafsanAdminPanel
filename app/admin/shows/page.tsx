"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import apiList, { withQuery } from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { runBulkDelete } from "@/lib/bulk-actions";
import { resolvePagination } from "@/lib/pagination";
import { useAuth } from "@/hooks/use-auth";
import { broadcastAdminSync, useAdminSync } from "@/hooks/use-admin-sync";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShowForm } from "@/components/admin/forms/show-form";
import { SeasonForm } from "@/components/admin/forms/season-form";
import { EpisodeForm } from "@/components/admin/forms/episode-form";
import { ReelForm } from "@/components/admin/forms/reel-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Film, List, Grid3x3 } from "lucide-react";
import { toast } from "react-toastify";

interface Show {
  _id: string;
  title: string;
  seasons?: number;
  reels?: number;
  featured: boolean;
  description?: string;
  thumbnail?: string;
  heroImage?: string;
  // 🔥 NOW supports podcast
  designVariant?: "base" | "cinematic" | "podcast";
}

interface Season {
  _id: string;
  title: string;
  showId: string;
  description?: string;
  showTitle?: string; // derived client-side
}

interface Episode {
  _id: string;
  title: string;
  showId: string;
  seasonId: string;
  thumbnail?: string;
  link?: string;
  featured?: boolean;
  showTitle?: string; // derived
  seasonTitle?: string; // derived
}

interface Reel {
  _id: string;
  title: string;
  showId: string;
  description?: string;
  thumbnail?: string;
  link?: string;
  showTitle?: string; // derived
}

type PaginatedResponse<T> = {
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
} & T;

const PAGE_SIZE = 12;

export default function ShowsPage() {
  // Enforce auth + redirect to /login if unauthenticated
  const { isLoading: authLoading } = useAuth({ redirectOnUnauthed: true });

  const [shows, setShows] = useState<Show[]>([]);
  const [allShows, setAllShows] = useState<Show[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [showsPage, setShowsPage] = useState(1);
  const [showsTotalPages, setShowsTotalPages] = useState(1);
  const [showsTotalItems, setShowsTotalItems] = useState(0);
  const [seasonsPage, setSeasonsPage] = useState(1);
  const [seasonsTotalPages, setSeasonsTotalPages] = useState(1);
  const [seasonsTotalItems, setSeasonsTotalItems] = useState(0);
  const [episodesPage, setEpisodesPage] = useState(1);
  const [episodesTotalPages, setEpisodesTotalPages] = useState(1);
  const [episodesTotalItems, setEpisodesTotalItems] = useState(0);
  const [reelsPage, setReelsPage] = useState(1);
  const [reelsTotalPages, setReelsTotalPages] = useState(1);
  const [reelsTotalItems, setReelsTotalItems] = useState(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<
    "show" | "season" | "episode" | "reel"
  >("show");

  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [editingReel, setEditingReel] = useState<Reel | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [episodeFilter, setEpisodeFilter] = useState<string>("all");
  const [reelFilter, setReelFilter] = useState<string>("all");

  // ---- confirmation modal state ----
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<string>("");
  const [confirmDesc, setConfirmDesc] = useState<string>("");
  const confirmResolveRef = useRef<((val: boolean) => void) | undefined>(
    undefined
  );

  const askConfirm = (title: string, desc: string) =>
    new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmTitle(title);
      setConfirmDesc(desc);
      setConfirmOpen(true);
    });

  const resolveConfirm = (val: boolean) => {
    setConfirmOpen(false);
    confirmResolveRef.current?.(val);
    confirmResolveRef.current = undefined;
  };

  const showMap = useMemo(() => {
    const m = new Map<string, Show>();
    allShows.forEach((s) => m.set(s._id, s));
    return m;
  }, [allShows]);

  const seasonMap = useMemo(() => {
    const m = new Map<string, Season>();
    allSeasons.forEach((s) => m.set(s._id, s));
    return m;
  }, [allSeasons]);

  const loadShowsData = async (
    overrides?: Partial<{
      showsPage: number;
      seasonsPage: number;
      episodesPage: number;
      reelsPage: number;
      seasonFilter: string;
      episodeFilter: string;
      reelFilter: string;
    }>
  ) => {
    try {
      const nextShowsPage = overrides?.showsPage ?? showsPage;
      const nextSeasonsPage = overrides?.seasonsPage ?? seasonsPage;
      const nextEpisodesPage = overrides?.episodesPage ?? episodesPage;
      const nextReelsPage = overrides?.reelsPage ?? reelsPage;
      const nextSeasonFilter = overrides?.seasonFilter ?? seasonFilter;
      const nextEpisodeFilter = overrides?.episodeFilter ?? episodeFilter;
      const nextReelFilter = overrides?.reelFilter ?? reelFilter;

      const [
        allShowsResponse,
        allSeasonsResponse,
        showsResponse,
        seasonsResponse,
        episodesResponse,
        reelsResponse,
      ] = await Promise.all([
        apiFetch<{ shows: Show[] }>(apiList.shows.list),
        apiFetch<{ seasons: Season[] }>(apiList.shows.seasons),
        apiFetch<PaginatedResponse<{ shows: Show[] }>>(
          withQuery(apiList.shows.list, {
            page: nextShowsPage,
            limit: PAGE_SIZE,
          })
        ),
        apiFetch<PaginatedResponse<{ seasons: Season[] }>>(
          withQuery(apiList.shows.seasons, {
            showId: nextSeasonFilter === "all" ? undefined : nextSeasonFilter,
            page: nextSeasonsPage,
            limit: PAGE_SIZE,
          })
        ),
        apiFetch<PaginatedResponse<{ episodes: Episode[] }>>(
          withQuery(apiList.shows.episodes, {
            showId: nextEpisodeFilter === "all" ? undefined : nextEpisodeFilter,
            page: nextEpisodesPage,
            limit: PAGE_SIZE,
          })
        ),
        apiFetch<PaginatedResponse<{ reels: Reel[] }>>(
          withQuery(apiList.shows.reels, {
            showId: nextReelFilter === "all" ? undefined : nextReelFilter,
            page: nextReelsPage,
            limit: PAGE_SIZE,
          })
        ),
      ]);

      const showsPagination = resolvePagination(showsResponse, PAGE_SIZE);
      const seasonsPagination = resolvePagination(seasonsResponse, PAGE_SIZE);
      const episodesPagination = resolvePagination(episodesResponse, PAGE_SIZE);
      const reelsPagination = resolvePagination(reelsResponse, PAGE_SIZE);

      setAllShows(allShowsResponse.shows || []);
      setAllSeasons(allSeasonsResponse.seasons || []);
      setShows(showsResponse.shows || []);
      setSeasons(seasonsResponse.seasons || []);
      setEpisodes(episodesResponse.episodes || []);
      setReels(reelsResponse.reels || []);
      setShowsPage(showsPagination.page);
      setShowsTotalPages(showsPagination.pages);
      setShowsTotalItems(showsPagination.total);
      setSeasonsPage(seasonsPagination.page);
      setSeasonsTotalPages(seasonsPagination.pages);
      setSeasonsTotalItems(seasonsPagination.total);
      setEpisodesPage(episodesPagination.page);
      setEpisodesTotalPages(episodesPagination.pages);
      setEpisodesTotalItems(episodesPagination.total);
      setReelsPage(reelsPagination.page);
      setReelsTotalPages(reelsPagination.pages);
      setReelsTotalItems(reelsPagination.total);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load data");
    }
  };

  /* ------------------------------ load data ------------------------------ */
  useEffect(() => {
    // Wait for auth check to settle first to avoid unnecessary requests
    if (authLoading) return;

    void loadShowsData();
  }, [authLoading]);

  useAdminSync("shows", () => {
    if (authLoading) return;
    void loadShowsData();
  });

  /* ------------------------------ shows CRUD ------------------------------ */
  const handleAdd = () => {
    setEditingShow(null);
    setDialogType("show");
    setIsDialogOpen(true);
  };

  const handleEdit = (show: Show) => {
    setEditingShow(show);
    setDialogType("show");
    setIsDialogOpen(true);
  };

  const handleDelete = async (show: Show) => {
    const ok = await askConfirm(
      "Delete Show",
      `Are you sure you want to delete "${show.title}"?`
    );
    if (!ok) return;

    try {
      await apiFetch<{ ok?: true }>(apiList.shows.delete(show._id), {
        method: "DELETE",
      });

      setShows((prev) => prev.filter((s) => s._id !== show._id));
      // cascade remove client-side
      setSeasons((prev) => prev.filter((s) => s.showId !== show._id));
      setEpisodes((prev) => prev.filter((e) => e.showId !== show._id));
      setReels((prev) => prev.filter((r) => r.showId !== show._id));
      await loadShowsData();
      broadcastAdminSync("shows");
      toast.success("Show deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete show");
    }
  };

  const handleBulkDeleteShows = async (selectedShows: Show[]) => {
    const ok = await askConfirm(
      "Delete Shows",
      `Are you sure you want to delete ${selectedShows.length} selected show${
        selectedShows.length === 1 ? "" : "s"
      }?`
    );
    if (!ok) return false;

    const { successCount, failureCount, errors } = await runBulkDelete(
      selectedShows,
      (show) => apiFetch(apiList.shows.delete(show._id), { method: "DELETE" })
    );

    await loadShowsData();
    broadcastAdminSync("shows");

    if (successCount > 0) {
      toast.success(
        `${successCount} show${successCount === 1 ? "" : "s"} deleted`
      );
    }

    if (failureCount > 0) {
      toast.error(errors[0] || `Failed to delete ${failureCount} show(s)`);
    }
  };

  const handleSave = async (data: Partial<Show>) => {
    try {
      if (editingShow) {
        const j = await apiFetch<{ show: Show }>(
          apiList.shows.update(editingShow._id),
          {
            method: "PATCH",
            body: JSON.stringify(data),
          }
        );
        setShows((prev) =>
          prev.map((s) => (s._id === editingShow._id ? j.show : s))
        );
        toast.success("Show updated");
      } else {
        const j = await apiFetch<{ show: Show }>(apiList.shows.create, {
          method: "POST",
          body: JSON.stringify(data),
        });
        setShows((prev) => [j.show, ...prev]);
        toast.success("Show created");
      }
      await loadShowsData();
      broadcastAdminSync("shows");
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(
        err?.message ||
          (editingShow ? "Failed to update show" : "Failed to create show")
      );
    }
  };

  /* ------------------------------ seasons CRUD ------------------------------ */
  const handleAddSeason = () => {
    setEditingSeason(null);
    setDialogType("season");
    setIsDialogOpen(true);
  };

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    setDialogType("season");
    setIsDialogOpen(true);
  };

  const handleDeleteSeason = async (season: Season) => {
    const ok = await askConfirm(
      "Delete Season",
      `Are you sure you want to delete "${season.title}"?`
    );
    if (!ok) return;

    try {
      await apiFetch(apiList.shows.deleteSeason(season.showId, season._id), {
        method: "DELETE",
      });

      setSeasons((prev) => prev.filter((s) => s._id !== season._id));
      // also drop episodes of this season
      setEpisodes((prev) => prev.filter((e) => e.seasonId !== season._id));
      // refresh show's season count client-side
      setShows((prev) =>
        prev.map((sh) =>
          sh._id === season.showId
            ? { ...sh, seasons: Math.max(0, (sh.seasons || 1) - 1) }
            : sh
        )
      );
      await loadShowsData();
      broadcastAdminSync("shows");
      toast.success("Season deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete season");
    }
  };

  const handleBulkDeleteSeasons = async (selectedSeasons: Season[]) => {
    const ok = await askConfirm(
      "Delete Seasons",
      `Are you sure you want to delete ${selectedSeasons.length} selected season${
        selectedSeasons.length === 1 ? "" : "s"
      }?`
    );
    if (!ok) return false;

    const { successCount, failureCount, errors } = await runBulkDelete(
      selectedSeasons,
      (season) =>
        apiFetch(apiList.shows.deleteSeason(season.showId, season._id), {
          method: "DELETE",
        })
    );

    await loadShowsData();
    broadcastAdminSync("shows");

    if (successCount > 0) {
      toast.success(
        `${successCount} season${successCount === 1 ? "" : "s"} deleted`
      );
    }

    if (failureCount > 0) {
      toast.error(errors[0] || `Failed to delete ${failureCount} season(s)`);
    }
  };

  const handleSaveSeason = async (data: Partial<Season>) => {
    if (!data.showId) return toast.error("Show is required for a season");

    try {
      if (editingSeason) {
        const j = await apiFetch<{ season: Season }>(
          apiList.shows.updateSeason(editingSeason.showId, editingSeason._id),
          {
            method: "PATCH",
            body: JSON.stringify(pick(data, ["title", "description"])),
          }
        );
        const showTitle = showMap.get(j.season.showId)?.title;
        setSeasons((prev) =>
          prev.map((s) =>
            s._id === editingSeason._id ? { ...j.season, showTitle } : s
          )
        );
        toast.success("Season updated");
      } else {
        const j = await apiFetch<{ season: Season }>(
          apiList.shows.createSeason(String(data.showId)),
          {
            method: "POST",
            body: JSON.stringify(pick(data, ["title", "description"])),
          }
        );
        const showTitle = showMap.get(String(data.showId))?.title;
        setSeasons((prev) => [{ ...j.season, showTitle }, ...prev]);

        // bump season count on the show
        const count = await apiFetch<{ seasons: Season[] }>(
          apiList.shows.seasonsByShow(String(data.showId))
        );
        setShows((prev) =>
          prev.map((sh) =>
            sh._id === data.showId
              ? { ...sh, seasons: (count.seasons || []).length }
              : sh
          )
        );
        toast.success("Season created");
      }
      await loadShowsData();
      broadcastAdminSync("shows");
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(
        err?.message ||
          (editingSeason
            ? "Failed to update season"
            : "Failed to create season")
      );
    }
  };

  /* ------------------------------ episodes CRUD ------------------------------ */
  const handleAddEpisode = () => {
    setEditingEpisode(null);
    setDialogType("episode");
    setIsDialogOpen(true);
  };

  const handleEditEpisode = (episode: Episode) => {
    setEditingEpisode(episode);
    setDialogType("episode");
    setIsDialogOpen(true);
  };

  const handleDeleteEpisode = async (episode: Episode) => {
    const ok = await askConfirm(
      "Delete Episode",
      `Are you sure you want to delete "${episode.title}"?`
    );
    if (!ok) return;

    try {
      await apiFetch(
        apiList.shows.deleteEpisode(
          episode.showId,
          episode.seasonId,
          episode._id
        ),
        { method: "DELETE" }
      );
      setEpisodes((prev) => prev.filter((e) => e._id !== episode._id));
      await loadShowsData();
      broadcastAdminSync("shows");
      toast.success("Episode deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete episode");
    }
  };

  const handleBulkDeleteEpisodes = async (selectedEpisodes: Episode[]) => {
    const ok = await askConfirm(
      "Delete Episodes",
      `Are you sure you want to delete ${selectedEpisodes.length} selected episode${
        selectedEpisodes.length === 1 ? "" : "s"
      }?`
    );
    if (!ok) return false;

    const { successCount, failureCount, errors } = await runBulkDelete(
      selectedEpisodes,
      (episode) =>
        apiFetch(
          apiList.shows.deleteEpisode(
            episode.showId,
            episode.seasonId,
            episode._id
          ),
          { method: "DELETE" }
        )
    );

    await loadShowsData();
    broadcastAdminSync("shows");

    if (successCount > 0) {
      toast.success(
        `${successCount} episode${successCount === 1 ? "" : "s"} deleted`
      );
    }

    if (failureCount > 0) {
      toast.error(errors[0] || `Failed to delete ${failureCount} episode(s)`);
    }
  };

  const handleSaveEpisode = async (data: Partial<Episode>) => {
    if (!data.showId || !data.seasonId)
      return toast.error("Show & Season are required for an episode");

    try {
      if (editingEpisode) {
        const j = await apiFetch<{ episode: Episode }>(
          apiList.shows.updateEpisode(
            editingEpisode.showId,
            editingEpisode.seasonId,
            editingEpisode._id
          ),
          {
            method: "PATCH",
            body: JSON.stringify(
              pick(data, ["title", "thumbnail", "link", "featured"])
            ),
          }
        );
        const showTitle = showMap.get(j.episode.showId)?.title;
        const seasonTitle = seasonMap.get(j.episode.seasonId)?.title;
        setEpisodes((prev) =>
          prev.map((e) =>
            e._id === editingEpisode._id
              ? { ...j.episode, showTitle, seasonTitle }
              : e
          )
        );
        toast.success("Episode updated");
      } else {
        const j = await apiFetch<{ episode: Episode }>(
          apiList.shows.createEpisode(
            String(data.showId),
            String(data.seasonId)
          ),
          {
            method: "POST",
            body: JSON.stringify(
              pick(data, ["title", "thumbnail", "link", "featured"])
            ),
          }
        );
        const showTitle = showMap.get(String(data.showId))?.title;
        const seasonTitle = seasonMap.get(String(data.seasonId))?.title;
        setEpisodes((prev) => [
          { ...j.episode, showTitle, seasonTitle },
          ...prev,
        ]);
        toast.success("Episode created");
      }
      await loadShowsData();
      broadcastAdminSync("shows");
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(
        err?.message ||
          (editingEpisode
            ? "Failed to update episode"
            : "Failed to create episode")
      );
    }
  };

  /* ------------------------------ reels CRUD ------------------------------ */
  const handleAddReel = () => {
    setEditingReel(null);
    setDialogType("reel");
    setIsDialogOpen(true);
  };

  const handleEditReel = (reel: Reel) => {
    setEditingReel(reel);
    setDialogType("reel");
    setIsDialogOpen(true);
  };

  const handleDeleteReel = async (reel: Reel) => {
    const ok = await askConfirm(
      "Delete Reel",
      `Are you sure you want to delete "${reel.title}"?`
    );
    if (!ok) return;

    try {
      await apiFetch(apiList.shows.deleteReel(reel.showId, reel._id), {
        method: "DELETE",
      });

      setReels((prev) => prev.filter((r) => r._id !== reel._id));
      // refresh show's reels count client-side
      setShows((prev) =>
        prev.map((sh) =>
          sh._id === reel.showId
            ? { ...sh, reels: Math.max(0, (sh.reels || 1) - 1) }
            : sh
        )
      );
      await loadShowsData();
      broadcastAdminSync("shows");
      toast.success("Reel deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete reel");
    }
  };

  const handleBulkDeleteReels = async (selectedReels: Reel[]) => {
    const ok = await askConfirm(
      "Delete Reels",
      `Are you sure you want to delete ${selectedReels.length} selected reel${
        selectedReels.length === 1 ? "" : "s"
      }?`
    );
    if (!ok) return false;

    const { successCount, failureCount, errors } = await runBulkDelete(
      selectedReels,
      (reel) =>
        apiFetch(apiList.shows.deleteReel(reel.showId, reel._id), {
          method: "DELETE",
        })
    );

    await loadShowsData();
    broadcastAdminSync("shows");

    if (successCount > 0) {
      toast.success(
        `${successCount} reel${successCount === 1 ? "" : "s"} deleted`
      );
    }

    if (failureCount > 0) {
      toast.error(errors[0] || `Failed to delete ${failureCount} reel(s)`);
    }
  };

  const handleSaveReel = async (data: Partial<Reel>) => {
    if (!data.showId) return toast.error("Show is required for a reel");

    try {
      if (editingReel) {
        const j = await apiFetch<{ reel: Reel }>(
          apiList.shows.updateReel(editingReel.showId, editingReel._id),
          {
            method: "PATCH",
            body: JSON.stringify(
              pick(data, ["title", "description", "thumbnail", "link"])
            ),
          }
        );
        const showTitle = showMap.get(j.reel.showId)?.title;
        setReels((prev) =>
          prev.map((r) =>
            r._id === editingReel._id ? { ...j.reel, showTitle } : r
          )
        );
        toast.success("Reel updated");
      } else {
        const j = await apiFetch<{ reel: Reel }>(
          apiList.shows.createReel(String(data.showId)),
          {
            method: "POST",
            body: JSON.stringify(
              pick(data, ["title", "description", "thumbnail", "link"])
            ),
          }
        );
        const showTitle = showMap.get(String(data.showId))?.title;
        setReels((prev) => [{ ...j.reel, showTitle }, ...prev]);

        // bump reels count
        const count = await apiFetch<{ reels: Reel[] }>(
          apiList.shows.reelsByShow(String(data.showId))
        );
        setShows((prev) =>
          prev.map((sh) =>
            sh._id === data.showId
              ? { ...sh, reels: (count.reels || []).length }
              : sh
          )
        );
        toast.success("Reel created");
      }
      await loadShowsData();
      broadcastAdminSync("shows");
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(
        err?.message ||
          (editingReel ? "Failed to update reel" : "Failed to create reel")
      );
    }
  };

  /* -------------------------------- tables -------------------------------- */
  const columns = [
    { key: "title", label: "Title" },
    {
      key: "seasons",
      label: "Seasons",
      render: (show: Show) => show.seasons ?? "-",
    },
    { key: "reels", label: "Reels", render: (show: Show) => show.reels ?? "-" },
    {
      key: "featured",
      label: "Featured",
      render: (show: Show) =>
        show.featured ? (
          <Badge>Featured</Badge>
        ) : (
          <Badge variant='outline'>Regular</Badge>
        ),
    },
    {
      key: "designVariant",
      label: "Design",
      render: (show: Show) => {
        const dv = show.designVariant || "base";
        const label =
          dv === "cinematic"
            ? "Cinematic"
            : dv === "podcast"
            ? "Podcast"
            : "Base";
        return <Badge variant='outline'>{label}</Badge>;
      },
    },
    {
      key: "description",
      label: "Description",
      render: (show: Show) => (
        <span className='block max-w-[34rem] line-clamp-2 text-muted-foreground'>
          {show.description || "-"}
        </span>
      ),
    },
  ];

  const seasonColumns = [
    { key: "title", label: "Title" },
    {
      key: "showTitle",
      label: "Show",
      render: (season: Season) => showMap.get(season.showId)?.title || season.showId,
    },
    {
      key: "description",
      label: "Description",
      render: (season: Season) => (
        <span className='block max-w-[28rem] line-clamp-2 text-muted-foreground'>
          {season.description || "-"}
        </span>
      ),
    },
  ];

  const episodeColumns = [
    { key: "title", label: "Title" },
    {
      key: "showTitle",
      label: "Show",
      render: (episode: Episode) => showMap.get(episode.showId)?.title || episode.showId,
    },
    {
      key: "seasonTitle",
      label: "Season",
      render: (episode: Episode) =>
        seasonMap.get(episode.seasonId)?.title || episode.seasonId,
    },
    {
      key: "thumbnail",
      label: "Thumbnail",
      render: (episode: Episode) => (
        <img
          src={episode.thumbnail || "/placeholder.svg"}
          alt={episode.title}
          className='h-10 w-16 rounded object-cover'
        />
      ),
    },
  ];

  const reelColumns = [
    { key: "title", label: "Title" },
    {
      key: "showTitle",
      label: "Show",
      render: (reel: Reel) => showMap.get(reel.showId)?.title || reel.showId,
    },
    {
      key: "thumbnail",
      label: "Thumbnail",
      render: (reel: Reel) => (
        <img
          src={reel.thumbnail || "/placeholder.svg"}
          alt={reel.title}
          className='h-16 w-12 rounded object-cover'
        />
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (reel: Reel) => (
        <span className='block max-w-[28rem] line-clamp-2 text-muted-foreground'>
          {reel.description || "-"}
        </span>
      ),
    },
  ];

  // simple loading skeleton while auth resolving
  if (authLoading) {
    return (
      <div className='p-8'>
        <div className='mb-2 h-6 w-40 animate-pulse rounded bg-muted' />
        <div className='h-4 w-64 animate-pulse rounded bg-muted' />
        <div className='mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-28 rounded-lg bg-muted animate-pulse' />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto flex w-full max-w-[1600px] min-w-0 flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8'>
      <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
        <PageHeader
          title='Shows'
          description='Manage your shows, seasons, episodes, and reels'
        />
        <div className='flex items-center gap-2 self-start rounded-xl border bg-background p-1 shadow-sm xl:self-center'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setViewMode("table")}
            aria-label='Table view'
          >
            <List className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setViewMode("grid")}
            aria-label='Grid view'
          >
            <Grid3x3 className='h-4 w-4' />
          </Button>
        </div>
      </div>

      <Tabs defaultValue='shows' className='min-w-0 space-y-6'>
        <TabsList>
          <TabsTrigger value='shows'>Shows</TabsTrigger>
          <TabsTrigger value='seasons'>Seasons</TabsTrigger>
          <TabsTrigger value='episodes'>Episodes</TabsTrigger>
          <TabsTrigger value='reels'>Reels</TabsTrigger>
        </TabsList>

        <TabsContent value='shows' className='space-y-4'>
          {viewMode === "table" ? (
            <DataTable
              data={shows}
              columns={columns}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onBulkDelete={handleBulkDeleteShows}
              searchPlaceholder='Search shows...'
              page={showsPage}
              totalPages={showsTotalPages}
              totalItems={showsTotalItems}
              paginationLabel='shows'
              onPageChange={(nextPage) => void loadShowsData({ showsPage: nextPage })}
            />
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
              {shows.map((show) => (
                <Card key={show._id}>
                  <CardHeader>
                    <div className='flex items-start justify-between'>
                      <CardTitle className='text-lg'>{show.title}</CardTitle>
                      <div className='flex gap-2'>
                        {show.designVariant && (
                          <Badge variant='outline'>
                            {show.designVariant === "cinematic"
                              ? "Cinematic"
                              : show.designVariant === "podcast"
                              ? "Podcast"
                              : "Base"}
                          </Badge>
                        )}
                        {show.featured && <Badge>Featured</Badge>}
                      </div>
                    </div>
                    <CardDescription className='line-clamp-2'>
                      {show.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                      <span>{show.seasons || 0} Seasons</span>
                      <span>{show.reels || 0} Reels</span>
                    </div>
                    <div className='mt-4 flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleEdit(show)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleDelete(show)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className='flex items-center justify-center border-dashed'>
                <Button variant='ghost' onClick={handleAdd}>
                  <Film className='mr-2 h-4 w-4' />
                  Add New Show
                </Button>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value='seasons' className='space-y-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <span className='text-sm text-muted-foreground sm:shrink-0'>
                Filter by show:
              </span>
              <Select
                value={seasonFilter}
                onValueChange={(value) => {
                  setSeasonFilter(value);
                  void loadShowsData({ seasonsPage: 1, seasonFilter: value });
                }}
              >
                <SelectTrigger className='w-full bg-background sm:w-[220px]'>
                  <SelectValue placeholder='All shows' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All shows</SelectItem>
                  {allShows.map((show) => (
                    <SelectItem key={show._id} value={show._id}>
                      {show.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            data={seasons}
            columns={seasonColumns}
            onAdd={handleAddSeason}
            onEdit={handleEditSeason}
            onDelete={handleDeleteSeason}
            onBulkDelete={handleBulkDeleteSeasons}
            searchPlaceholder='Search seasons...'
            page={seasonsPage}
            totalPages={seasonsTotalPages}
            totalItems={seasonsTotalItems}
            paginationLabel='seasons'
            onPageChange={(nextPage) => void loadShowsData({ seasonsPage: nextPage })}
          />
        </TabsContent>

        <TabsContent value='episodes' className='space-y-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <span className='text-sm text-muted-foreground sm:shrink-0'>
                Filter by show:
              </span>
              <Select
                value={episodeFilter}
                onValueChange={(value) => {
                  setEpisodeFilter(value);
                  void loadShowsData({ episodesPage: 1, episodeFilter: value });
                }}
              >
                <SelectTrigger className='w-full bg-background sm:w-[220px]'>
                  <SelectValue placeholder='All shows' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All shows</SelectItem>
                  {allShows.map((show) => (
                    <SelectItem key={show._id} value={show._id}>
                      {show.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            data={episodes}
            columns={episodeColumns}
            onAdd={handleAddEpisode}
            onEdit={handleEditEpisode}
            onDelete={handleDeleteEpisode}
            onBulkDelete={handleBulkDeleteEpisodes}
            searchPlaceholder='Search episodes...'
            page={episodesPage}
            totalPages={episodesTotalPages}
            totalItems={episodesTotalItems}
            paginationLabel='episodes'
            onPageChange={(nextPage) => void loadShowsData({ episodesPage: nextPage })}
          />
        </TabsContent>

        <TabsContent value='reels' className='space-y-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <span className='text-sm text-muted-foreground sm:shrink-0'>
                Filter by show:
              </span>
              <Select
                value={reelFilter}
                onValueChange={(value) => {
                  setReelFilter(value);
                  void loadShowsData({ reelsPage: 1, reelFilter: value });
                }}
              >
                <SelectTrigger className='w-full bg-background sm:w-[220px]'>
                  <SelectValue placeholder='All shows' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All shows</SelectItem>
                  {allShows.map((show) => (
                    <SelectItem key={show._id} value={show._id}>
                      {show.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            data={reels}
            columns={reelColumns}
            onAdd={handleAddReel}
            onEdit={handleEditReel}
            onDelete={handleDeleteReel}
            onBulkDelete={handleBulkDeleteReels}
            searchPlaceholder='Search reels...'
            page={reelsPage}
            totalPages={reelsTotalPages}
            totalItems={reelsTotalItems}
            paginationLabel='reels'
            onPageChange={(nextPage) => void loadShowsData({ reelsPage: nextPage })}
          />
        </TabsContent>
      </Tabs>

      {/* Form dialog (scrollable) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='w-[95vw] sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden'>
          {/* Sticky header so title stays visible while scrolling */}
          <DialogHeader className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4'>
            <DialogTitle>
              {dialogType === "show" &&
                (editingShow ? "Edit Show" : "Add New Show")}
              {dialogType === "season" &&
                (editingSeason ? "Edit Season" : "Add New Season")}
              {dialogType === "episode" &&
                (editingEpisode ? "Edit Episode" : "Add New Episode")}
              {dialogType === "reel" &&
                (editingReel ? "Edit Reel" : "Add New Reel")}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable content area */}
          <div className='overflow-y-auto px-6 py-5 max-h-[calc(85vh-64px)]'>
            {dialogType === "show" && (
              <ShowForm
                initialData={editingShow}
                onSave={handleSave}
                onCancel={() => setIsDialogOpen(false)}
              />
            )}

            {dialogType === "season" && (
              <SeasonForm
                initialData={editingSeason}
                shows={allShows}
                onSave={handleSaveSeason}
                onCancel={() => setIsDialogOpen(false)}
              />
            )}

            {dialogType === "episode" && (
              <EpisodeForm
                initialData={editingEpisode}
                shows={allShows}
                seasons={allSeasons}
                onSave={handleSaveEpisode}
                onCancel={() => setIsDialogOpen(false)}
              />
            )}

            {dialogType === "reel" && (
              <ReelForm
                initialData={editingReel}
                shows={allShows}
                onSave={handleSaveReel}
                onCancel={() => setIsDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) resolveConfirm(false);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>{confirmDesc}</p>
          <div className='mt-6 flex justify-end gap-2'>
            <Button variant='outline' onClick={() => resolveConfirm(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={() => resolveConfirm(true)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* tiny helper */
function pick<T extends object, K extends keyof T>(
  obj: Partial<T>,
  keys: K[]
): Partial<T> {
  const out: Partial<T> = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) (out as any)[k] = obj[k];
  });
  return out;
}
