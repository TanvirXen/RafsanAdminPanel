"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShowForm } from "@/components/admin/forms/show-form"
import { SeasonForm } from "@/components/admin/forms/season-form"
import { EpisodeForm } from "@/components/admin/forms/episode-form"
import { ReelForm } from "@/components/admin/forms/reel-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Film, List, Grid3x3 } from "lucide-react"

interface Show {
  _id: string
  title: string
  seasons?: number
  reels?: number
  featured: boolean
  description: string
  episodeId?: string
  reelsId?: string
}

interface Season {
  _id: string
  title: string
  showId: string
  showTitle?: string
  episodeId?: string
  description: string
}

interface Episode {
  _id: string
  title: string
  showId: string
  showTitle?: string
  seasonId: string
  seasonTitle?: string
  thumbnail: string
  link: string
}

interface Reel {
  _id: string
  title: string
  showId: string
  showTitle?: string
  description: string
  thumbnail: string
  link: string
}

const mockShows: Show[] = [
  {
    _id: "1",
    title: "Breaking Boundaries",
    seasons: 3,
    reels: 12,
    featured: true,
    description: "A groundbreaking series exploring innovation",
  },
  {
    _id: "2",
    title: "Tech Talks",
    seasons: 2,
    reels: 8,
    featured: false,
    description: "Conversations with industry leaders",
  },
  {
    _id: "3",
    title: "Future Forward",
    seasons: 1,
    reels: 5,
    featured: true,
    description: "Looking ahead at emerging technologies",
  },
]

const mockSeasons: Season[] = [
  {
    _id: "s1",
    title: "Season 1",
    showId: "1",
    showTitle: "Breaking Boundaries",
    description: "The beginning of an incredible journey",
  },
  {
    _id: "s2",
    title: "Season 2",
    showId: "1",
    showTitle: "Breaking Boundaries",
    description: "Continuing the adventure",
  },
  {
    _id: "s3",
    title: "Season 1",
    showId: "2",
    showTitle: "Tech Talks",
    description: "First season of tech conversations",
  },
]

const mockEpisodes: Episode[] = [
  {
    _id: "e1",
    title: "Pilot Episode",
    showId: "1",
    showTitle: "Breaking Boundaries",
    seasonId: "s1",
    seasonTitle: "Season 1",
    thumbnail: "/placeholder.svg?height=200&width=300",
    link: "https://example.com/episode1",
  },
  {
    _id: "e2",
    title: "The Innovation",
    showId: "1",
    showTitle: "Breaking Boundaries",
    seasonId: "s1",
    seasonTitle: "Season 1",
    thumbnail: "/placeholder.svg?height=200&width=300",
    link: "https://example.com/episode2",
  },
  {
    _id: "e3",
    title: "New Beginnings",
    showId: "2",
    showTitle: "Tech Talks",
    seasonId: "s3",
    seasonTitle: "Season 1",
    thumbnail: "/placeholder.svg?height=200&width=300",
    link: "https://example.com/episode3",
  },
]

const mockReels: Reel[] = [
  {
    _id: "r1",
    title: "Behind the Scenes",
    showId: "1",
    showTitle: "Breaking Boundaries",
    description: "Quick look at our production",
    thumbnail: "/placeholder.svg?height=400&width=300",
    link: "https://example.com/reel1",
  },
  {
    _id: "r2",
    title: "Highlights Reel",
    showId: "1",
    showTitle: "Breaking Boundaries",
    description: "Best moments compilation",
    thumbnail: "/placeholder.svg?height=400&width=300",
    link: "https://example.com/reel2",
  },
  {
    _id: "r3",
    title: "Tech Tips",
    showId: "2",
    showTitle: "Tech Talks",
    description: "Quick tech insights",
    thumbnail: "/placeholder.svg?height=400&width=300",
    link: "https://example.com/reel3",
  },
]

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>(mockShows)
  const [seasons, setSeasons] = useState<Season[]>(mockSeasons)
  const [episodes, setEpisodes] = useState<Episode[]>(mockEpisodes)
  const [reels, setReels] = useState<Reel[]>(mockReels)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShow, setEditingShow] = useState<Show | null>(null)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null)
  const [editingReel, setEditingReel] = useState<Reel | null>(null)
  const [dialogType, setDialogType] = useState<"show" | "season" | "episode" | "reel">("show")

  const [viewMode, setViewMode] = useState<"table" | "grid">("table")

  const [seasonFilter, setSeasonFilter] = useState<string>("all")
  const [episodeFilter, setEpisodeFilter] = useState<string>("all")
  const [reelFilter, setReelFilter] = useState<string>("all")

  const filteredSeasons = seasonFilter === "all" ? seasons : seasons.filter((s) => s.showId === seasonFilter)
  const filteredEpisodes = episodeFilter === "all" ? episodes : episodes.filter((e) => e.showId === episodeFilter)
  const filteredReels = reelFilter === "all" ? reels : reels.filter((r) => r.showId === reelFilter)

  const handleAdd = () => {
    setEditingShow(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (show: Show) => {
    setEditingShow(show)
    setIsDialogOpen(true)
  }

  const handleDelete = (show: Show) => {
    if (confirm(`Are you sure you want to delete "${show.title}"?`)) {
      setShows(shows.filter((s) => s._id !== show._id))
    }
  }

  const handleSave = (data: Partial<Show>) => {
    if (editingShow) {
      setShows(shows.map((s) => (s._id === editingShow._id ? { ...s, ...data } : s)))
    } else {
      setShows([...shows, { _id: Date.now().toString(), ...data } as Show])
    }
    setIsDialogOpen(false)
  }

  const handleAddSeason = () => {
    setEditingSeason(null)
    setDialogType("season")
    setIsDialogOpen(true)
  }

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season)
    setDialogType("season")
    setIsDialogOpen(true)
  }

  const handleDeleteSeason = (season: Season) => {
    if (confirm(`Are you sure you want to delete "${season.title}"?`)) {
      setSeasons(seasons.filter((s) => s._id !== season._id))
    }
  }

  const handleSaveSeason = (data: Partial<Season>) => {
    if (editingSeason) {
      setSeasons(seasons.map((s) => (s._id === editingSeason._id ? { ...s, ...data } : s)))
    } else {
      const show = shows.find((sh) => sh._id === data.showId)
      setSeasons([...seasons, { _id: Date.now().toString(), showTitle: show?.title, ...data } as Season])
    }
    setIsDialogOpen(false)
  }

  const handleAddEpisode = () => {
    setEditingEpisode(null)
    setDialogType("episode")
    setIsDialogOpen(true)
  }

  const handleEditEpisode = (episode: Episode) => {
    setEditingEpisode(episode)
    setDialogType("episode")
    setIsDialogOpen(true)
  }

  const handleDeleteEpisode = (episode: Episode) => {
    if (confirm(`Are you sure you want to delete "${episode.title}"?`)) {
      setEpisodes(episodes.filter((e) => e._id !== episode._id))
    }
  }

  const handleSaveEpisode = (data: Partial<Episode>) => {
    if (editingEpisode) {
      setEpisodes(episodes.map((e) => (e._id === editingEpisode._id ? { ...e, ...data } : e)))
    } else {
      const show = shows.find((sh) => sh._id === data.showId)
      const season = seasons.find((s) => s._id === data.seasonId)
      setEpisodes([
        ...episodes,
        { _id: Date.now().toString(), showTitle: show?.title, seasonTitle: season?.title, ...data } as Episode,
      ])
    }
    setIsDialogOpen(false)
  }

  const handleAddReel = () => {
    setEditingReel(null)
    setDialogType("reel")
    setIsDialogOpen(true)
  }

  const handleEditReel = (reel: Reel) => {
    setEditingReel(reel)
    setDialogType("reel")
    setIsDialogOpen(true)
  }

  const handleDeleteReel = (reel: Reel) => {
    if (confirm(`Are you sure you want to delete "${reel.title}"?`)) {
      setReels(reels.filter((r) => r._id !== reel._id))
    }
  }

  const handleSaveReel = (data: Partial<Reel>) => {
    if (editingReel) {
      setReels(reels.map((r) => (r._id === editingReel._id ? { ...r, ...data } : r)))
    } else {
      const show = shows.find((sh) => sh._id === data.showId)
      setReels([...reels, { _id: Date.now().toString(), showTitle: show?.title, ...data } as Reel])
    }
    setIsDialogOpen(false)
  }

  const columns = [
    { key: "title", label: "Title" },
    {
      key: "seasons",
      label: "Seasons",
      render: (show: Show) => show.seasons || "-",
    },
    {
      key: "reels",
      label: "Reels",
      render: (show: Show) => show.reels || "-",
    },
    {
      key: "featured",
      label: "Featured",
      render: (show: Show) => (show.featured ? <Badge>Featured</Badge> : <Badge variant="outline">Regular</Badge>),
    },
    {
      key: "description",
      label: "Description",
      render: (show: Show) => <span className="line-clamp-1">{show.description}</span>,
    },
  ]

  const seasonColumns = [
    { key: "title", label: "Title" },
    { key: "showTitle", label: "Show" },
    {
      key: "description",
      label: "Description",
      render: (season: Season) => <span className="line-clamp-1">{season.description}</span>,
    },
  ]

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
          className="h-10 w-16 rounded object-cover"
        />
      ),
    },
  ]

  const reelColumns = [
    { key: "title", label: "Title" },
    { key: "showTitle", label: "Show" },
    {
      key: "thumbnail",
      label: "Thumbnail",
      render: (reel: Reel) => (
        <img src={reel.thumbnail || "/placeholder.svg"} alt={reel.title} className="h-16 w-12 rounded object-cover" />
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (reel: Reel) => <span className="line-clamp-1">{reel.description}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <PageHeader title="Shows" description="Manage your shows, seasons, episodes, and reels" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewMode("table")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setViewMode("grid")}>
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="shows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shows">Shows</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="reels">Reels</TabsTrigger>
        </TabsList>

        <TabsContent value="shows" className="space-y-4">
          {viewMode === "table" ? (
            <DataTable
              data={shows}
              columns={columns}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchPlaceholder="Search shows..."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shows.map((show) => (
                <Card key={show._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{show.title}</CardTitle>
                      {show.featured && <Badge>Featured</Badge>}
                    </div>
                    <CardDescription className="line-clamp-2">{show.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{show.seasons || 0} Seasons</span>
                      <span>{show.reels || 0} Reels</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(show)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(show)}>
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="flex items-center justify-center border-dashed">
                <Button variant="ghost" onClick={handleAdd}>
                  <Film className="mr-2 h-4 w-4" />
                  Add New Show
                </Button>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="seasons" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by show:</span>
              <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All shows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All shows</SelectItem>
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
            searchPlaceholder="Search seasons..."
          />
        </TabsContent>

        <TabsContent value="episodes" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by show:</span>
              <Select value={episodeFilter} onValueChange={setEpisodeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All shows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All shows</SelectItem>
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
            searchPlaceholder="Search episodes..."
          />
        </TabsContent>

        <TabsContent value="reels" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by show:</span>
              <Select value={reelFilter} onValueChange={setReelFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All shows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All shows</SelectItem>
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
            searchPlaceholder="Search reels..."
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "show" && (editingShow ? "Edit Show" : "Add New Show")}
              {dialogType === "season" && (editingSeason ? "Edit Season" : "Add New Season")}
              {dialogType === "episode" && (editingEpisode ? "Edit Episode" : "Add New Episode")}
              {dialogType === "reel" && (editingReel ? "Edit Reel" : "Add New Reel")}
            </DialogTitle>
          </DialogHeader>
          {dialogType === "show" && (
            <ShowForm initialData={editingShow} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} />
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
