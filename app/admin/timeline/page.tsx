"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable } from "@/components/admin/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TimelineForm } from "@/components/admin/forms/timeline-form"
import { Calendar, ImageIcon } from "lucide-react"

interface TimelineItem {
  _id: string
  date: string
  imageLink: string
  description: string
  cardUrl?: string
}

const mockTimeline: TimelineItem[] = [
  {
    _id: "1",
    date: "2025-01-15",
    imageLink: "/placeholder.svg?height=200&width=400",
    description: "Company founded with a vision to revolutionize the industry",
    cardUrl: "/timeline/founding",
  },
  {
    _id: "2",
    date: "2025-03-20",
    imageLink: "/placeholder.svg?height=200&width=400",
    description: "Launched our first product to critical acclaim",
    cardUrl: "/timeline/first-product",
  },
  {
    _id: "3",
    date: "2025-06-10",
    imageLink: "/placeholder.svg?height=200&width=400",
    description: "Reached 10,000 users milestone",
  },
]

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineItem[]>(mockTimeline)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null)

  const handleAdd = () => {
    setEditingItem(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (item: TimelineItem) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }

  const handleDelete = (item: TimelineItem) => {
    if (confirm("Are you sure you want to delete this timeline item?")) {
      setTimeline(timeline.filter((t) => t._id !== item._id))
    }
  }

  const handleSave = (data: Partial<TimelineItem>) => {
    if (editingItem) {
      setTimeline(timeline.map((t) => (t._id === editingItem._id ? { ...t, ...data } : t)))
    } else {
      setTimeline([...timeline, { _id: Date.now().toString(), ...data } as TimelineItem])
    }
    setIsDialogOpen(false)
  }

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (item: TimelineItem) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {new Date(item.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (item: TimelineItem) => <span className="line-clamp-2">{item.description}</span>,
    },
    {
      key: "imageLink",
      label: "Image",
      render: (item: TimelineItem) => (
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Image attached</span>
        </div>
      ),
    },
    {
      key: "cardUrl",
      label: "Card URL",
      render: (item: TimelineItem) => (item.cardUrl ? <span className="text-xs">{item.cardUrl}</span> : "-"),
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader title="Journey Timeline" description="Manage your company's journey and milestones" />

      <DataTable
        data={timeline}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Search timeline..."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Timeline Item" : "Add Timeline Item"}</DialogTitle>
          </DialogHeader>
          <TimelineForm initialData={editingItem} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
