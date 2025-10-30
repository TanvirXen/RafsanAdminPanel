"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable } from "@/components/admin/data-table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NotableEventForm } from "@/components/admin/forms/notable-event-form"
import { Calendar, Star } from "lucide-react"

interface NotableEvent {
  _id: string
  date: string
  imageLink: string
  description: string
  title: string
  featured: boolean
}

const mockNotableEvents: NotableEvent[] = [
  {
    _id: "1",
    date: "2025-02-14",
    imageLink: "/placeholder.svg?height=200&width=400",
    title: "Product Launch Event",
    description: "Successfully launched our flagship product with over 500 attendees",
    featured: true,
  },
  {
    _id: "2",
    date: "2025-04-22",
    imageLink: "/placeholder.svg?height=200&width=400",
    title: "Industry Award Win",
    description: "Received Best Innovation Award at Tech Summit 2025",
    featured: true,
  },
  {
    _id: "3",
    date: "2025-07-01",
    imageLink: "/placeholder.svg?height=200&width=400",
    title: "Partnership Announcement",
    description: "Strategic partnership with leading tech companies",
    featured: false,
  },
]

export default function NotableEventsPage() {
  const [events, setEvents] = useState<NotableEvent[]>(mockNotableEvents)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<NotableEvent | null>(null)

  const handleAdd = () => {
    setEditingEvent(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (event: NotableEvent) => {
    setEditingEvent(event)
    setIsDialogOpen(true)
  }

  const handleDelete = (event: NotableEvent) => {
    if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
      setEvents(events.filter((e) => e._id !== event._id))
    }
  }

  const handleSave = (data: Partial<NotableEvent>) => {
    if (editingEvent) {
      setEvents(events.map((e) => (e._id === editingEvent._id ? { ...e, ...data } : e)))
    } else {
      setEvents([...events, { _id: Date.now().toString(), ...data } as NotableEvent])
    }
    setIsDialogOpen(false)
  }

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (event: NotableEvent) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-medium">
            {event.featured && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
            {event.title}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (event: NotableEvent) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {new Date(event.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (event: NotableEvent) => <span className="line-clamp-2">{event.description}</span>,
    },
    {
      key: "featured",
      label: "Status",
      render: (event: NotableEvent) =>
        event.featured ? <Badge>Featured</Badge> : <Badge variant="outline">Regular</Badge>,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader title="Notable Events" description="Highlight important achievements and milestones" />

      <DataTable
        data={events}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Search notable events..."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Notable Event" : "Add Notable Event"}</DialogTitle>
          </DialogHeader>
          <NotableEventForm initialData={editingEvent} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
