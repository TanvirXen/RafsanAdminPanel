"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { useAuth } from "@/hooks/use-auth";

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

export default function ShowsPage() {
  // Enforce auth + redirect to /login if unauthenticated
  const { isLoading: authLoading } = useAuth({ redirectOnUnauthed: true });

  const [shows, setShows] = useState<Show[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);

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
    shows.forEach((s) => m.set(s._id, s));
    return m;
  }, [shows]);

  const seasonMap = useMemo(() => {
    const m = new Map<string, Season>();
    seasons.forEach((s) => m.set(s._id, s));
    return m;
  }, [seasons]);

  /* ------------------------------ load data ------------------------------ */
  useEffect(() => {
    // Wait for auth check to settle first to avoid unnecessary requests
    if (authLoading) return;

    (async () => {
      try {
        // shows
        const sJson = await apiFetch<{ shows: Show[] }>(apiList.shows.list);
        const showsArr = sJson.shows || [];
        setShows(showsArr);

        // seasons
        const seasonJson = await apiFetch<{ seasons: Season[] }>(
          apiList.shows.seasons
        );
        const seasonsWithTitle: Season[] = (seasonJson.seasons || []).map(
          (se: Season) => ({
            ...se,
            showTitle: showsArr.find((x) => x._id === se.showId)?.title,
          })
        );
        setSeasons(seasonsWithTitle);

        // episodes
        const epJson = await apiFetch<{ episodes: Episode[] }>(
          apiList.shows.episodes
        );
        const episodesWithTitles: Episode[] = (epJson.episodes || []).map(
          (e: Episode) => ({
            ...e,
            showTitle: showsArr.find((x) => x._id === e.showId)?.title,
            seasonTitle: seasonsWithTitle.find((x) => x._id === e.seasonId)
              ?.title,
          })
        );
        setEpisodes(episodesWithTitles);

        // reels
        const rJson = await apiFetch<{ reels: Reel[] }>(apiList.shows.reels);
        const reelsWithTitle: Reel[] = (rJson.reels || []).map((r: Reel) => ({
          ...r,
          showTitle: showsArr.find((x) => x._id === r.showId)?.title,
        }));
        setReels(reelsWithTitle);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load data");
      }
    })();
  }, [authLoading]);

  /* ------------------------------ filters ------------------------------ */
  const filteredSeasons =
    seasonFilter === "all"
      ? seasons
      : seasons.filter((s) => s.showId === seasonFilter);

  const filteredEpisodes =
    episodeFilter === "all"
      ? episodes
      : episodes.filter((e) => e.showId === episodeFilter);

  const filteredReels =
    reelFilter === "all" ? reels : reels.filter((r) => r.showId === reelFilter);

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
      toast.success("Show deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete show");
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
      toast.success("Season deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete season");
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
      toast.success("Episode deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete episode");
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
      toast.success("Reel deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete reel");
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
      key: "description",
      label: "Description",
      render: (show: Show) => (
        <span className='line-clamp-1'>{show.description}</span>
      ),
    },
  ];

  const seasonColumns = [
    { key: "title", label: "Title" },
    { key: "showTitle", label: "Show" },
    {
      key: "description",
      label: "Description",
      render: (season: Season) => (
        <span className='line-clamp-1'>{season.description}</span>
      ),
    },
  ];

  const episodeColumns = [
    { key: "title", label: "Title" },
    { key: "showTitle", label: "Show" },
    { key: "seasonTitle", label: "Season" },
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
    { key: "showTitle", label: "Show" },
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
        <span className='line-clamp-1'>{reel.description}</span>
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
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <div className='flex items-center justify-between'>
        <PageHeader
          title='Shows'
          description='Manage your shows, seasons, episodes, and reels'
        />
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setViewMode("table")}
          >
            <List className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className='h-4 w-4' />
          </Button>
        </div>
      </div>

      <Tabs defaultValue='shows' className='space-y-4'>
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
              searchPlaceholder='Search shows...'
            />
          ) : (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {shows.map((show) => (
                <Card key={show._id}>
                  <CardHeader>
                    <div className='flex items-start justify-between'>
                      <CardTitle className='text-lg'>{show.title}</CardTitle>
                      {show.featured && <Badge>Featured</Badge>}
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
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                Filter by show:
              </span>
              <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                <SelectTrigger className='w-[200px]'>
                  <SelectValue placeholder='All shows' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All shows</SelectItem>
                  {shows.map((show) => (
                    <SelectItem key={show._id} value={show._id}>
                      {show.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            data={filteredSeasons}
            columns={seasonColumns}
            onAdd={handleAddSeason}
            onEdit={handleEditSeason}
            onDelete={handleDeleteSeason}
            searchPlaceholder='Search seasons...'
          />
        </TabsContent>

        <TabsContent value='episodes' className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                Filter by show:
              </span>
              <Select value={episodeFilter} onValueChange={setEpisodeFilter}>
                <SelectTrigger className='w-[200px]'>
                  <SelectValue placeholder='All shows' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All shows</SelectItem>
                  {shows.map((show) => (
                    <SelectItem key={show._id} value={show._id}>
                      {show.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            data={filteredEpisodes}
            columns={episodeColumns}
            onAdd={handleAddEpisode}
            onEdit={handleEditEpisode}
            onDelete={handleDeleteEpisode}
            searchPlaceholder='Search episodes...'
          />
        </TabsContent>

        <TabsContent value='reels' className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                Filter by show:
              </span>
              <Select value={reelFilter} onValueChange={setReelFilter}>
                <SelectTrigger className='w-[200px]'>
                  <SelectValue placeholder='All shows' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All shows</SelectItem>
                  {shows.map((show) => (
                    <SelectItem key={show._id} value={show._id}>
                      {show.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            data={filteredReels}
            columns={reelColumns}
            onAdd={handleAddReel}
            onEdit={handleEditReel}
            onDelete={handleDeleteReel}
            searchPlaceholder='Search reels...'
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
                shows={shows}
                onSave={handleSaveSeason}
                onCancel={() => setIsDialogOpen(false)}
              />
            )}

            {dialogType === "episode" && (
              <EpisodeForm
                initialData={editingEpisode}
                shows={shows}
                seasons={seasons}
                onSave={handleSaveEpisode}
                onCancel={() => setIsDialogOpen(false)}
              />
            )}

            {dialogType === "reel" && (
              <ReelForm
                initialData={editingReel}
                shows={shows}
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
