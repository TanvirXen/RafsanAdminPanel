"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable } from "@/components/admin/data-table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EventForm } from "@/components/admin/forms/event-form"
import { Calendar, MapPin } from "lucide-react"

interface Event {
  _id: string
  title: string
  date: string[]
  venue: string
  type: string
  description: string
  imageLinkBg?: string
  imageLinkOverlay?: string
  brands?: string[]
  customFields?: any[]
}

const mockEvents: Event[] = [
  {
    _id: "1",
    title: "Summer Tech Festival 2025",
    date: ["2025-07-15", "2025-07-16", "2025-07-17"],
    venue: "Convention Center",
    type: "Free_with_approval",
    description: "Annual technology festival featuring the latest innovations",
    brands: ["TechCorp", "InnovateLabs"],
    customFields: [
      { id: "1", name: "full_name", type: "text", label: "Full Name", required: true },
      { id: "2", name: "email", type: "email", label: "Email Address", required: true },
      { id: "3", name: "company", type: "text", label: "Company", required: false },
    ],
  },
  {
    _id: "2",
    title: "Developer Conference",
    date: ["2025-09-20"],
    venue: "Tech Hub Downtown",
    type: "Paid",
    description: "Conference for developers and tech enthusiasts",
    brands: ["DevTools Inc"],
    customFields: [
      { id: "1", name: "full_name", type: "text", label: "Full Name", required: true },
      { id: "2", name: "email", type: "email", label: "Email Address", required: true },
    ],
  },
  {
    _id: "3",
    title: "AI Workshop Series",
    date: ["2025-10-05", "2025-10-12", "2025-10-19"],
    venue: "Innovation Lab",
    type: "Paid_with_approval",
    description: "Hands-on workshops exploring AI and machine learning",
    customFields: [],
  },
]

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  const handleAdd = () => {
    setEditingEvent(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setIsDialogOpen(true)
  }

  const handleDelete = (event: Event) => {
    if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
      setEvents(events.filter((e) => e._id !== event._id))
    }
  }

  const handleSave = (data: Partial<Event>) => {
    if (editingEvent) {
      setEvents(events.map((e) => (e._id === editingEvent._id ? { ...e, ...data } : e)))
    } else {
      setEvents([...events, { _id: Date.now().toString(), ...data } as Event])
    }
    setIsDialogOpen(false)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Free":
        return "default"
      case "Free_with_approval":
        return "secondary"
      case "Paid":
        return "destructive"
      case "Paid_with_approval":
        return "outline"
      default:
        return "default"
    }
  }

  const columns = [
    {
      key: "title",
      label: "Event Title",
      render: (event: Event) => (
        <div className="space-y-1">
          <div className="font-medium">{event.title}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {event.venue}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date(s)",
      render: (event: Event) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {event.date.length > 1 ? `${event.date.length} dates` : new Date(event.date[0]).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (event: Event) => <Badge variant={getTypeColor(event.type)}>{event.type.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "brands",
      label: "Brands",
      render: (event: Event) => (event.brands ? event.brands.length : 0),
    },
    {
      key: "customFields",
      label: "Form Fields",
      render: (event: Event) => (event.customFields ? event.customFields.length : 0),
    },
    {
      key: "description",
      label: "Description",
      render: (event: Event) => <span className="line-clamp-1">{event.description}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader title="Events" description="Manage events, registrations, and attendees" />

      <DataTable
        data={events}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Search events..."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
          </DialogHeader>
          <EventForm initialData={editingEvent} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
