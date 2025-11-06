"use client";

import { useEffect, useRef, useState } from "react";
import apiList from "@/apiList";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimelineForm } from "@/components/admin/forms/timeline-form";
import { Calendar, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

interface TimelineItem {
  _id: string;
  date: string;         // ISO string
  imageLink: string;
  description: string;
  cardUrl?: string;
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);

  // --- confirmation modal (promise-based) ---
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmResolveRef = useRef<((v: boolean) => void) | undefined>(undefined);

  const askConfirm = (title: string, desc: string) =>
    new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmTitle(title);
      setConfirmDesc(desc);
      setConfirmOpen(true);
    });

  const resolveConfirm = (v: boolean) => {
    setConfirmOpen(false);
    confirmResolveRef.current?.(v);
    confirmResolveRef.current = undefined;
  };

  // --- load from API ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiList.timeline.list, { credentials: "include" });
        const j = await res.json();
        setTimeline(j.items || []);
      } catch {
        toast.error("Failed to load timeline");
      }
    })();
  }, []);

  // --- CRUD handlers ---
  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: TimelineItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: TimelineItem) => {
    const ok = await askConfirm("Delete Timeline Item", "Are you sure you want to delete this timeline item?");
    if (!ok) return;

    const res = await fetch(apiList.timeline.delete(item._id), {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setTimeline((prev) => prev.filter((t) => t._id !== item._id));
      toast.success("Timeline item deleted");
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error(j.message || "Failed to delete timeline item");
    }
  };

  const handleSave = async (data: Partial<TimelineItem>) => {
    // Ensure backend validation passes (expects ISO8601 date)
    const payload = {
      ...data,
      date: data.date ? new Date(data.date).toISOString() : undefined,
    };

    if (editingItem) {
      // update
      const res = await fetch(apiList.timeline.update(editingItem._id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setTimeline((prev) => prev.map((t) => (t._id === editingItem._id ? j.item : t)));
        toast.success("Timeline item updated");
        setIsDialogOpen(false);
      } else {
        toast.error(j.message || "Failed to update timeline item");
      }
    } else {
      // create
      const res = await fetch(apiList.timeline.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setTimeline((prev) => [j.item, ...prev]);
        toast.success("Timeline item created");
        setIsDialogOpen(false);
      } else {
        toast.error(j.message || "Failed to create timeline item");
      }
    }
  };

  // --- table columns ---
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
      render: () => (
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
  ];

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

      {/* Form dialog (scrollable) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
            <DialogTitle>{editingItem ? "Edit Timeline Item" : "Add Timeline Item"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-5 max-h-[calc(85vh-64px)]">
            <TimelineForm
              initialData={editingItem || undefined}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmDesc}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => resolveConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => resolveConfirm(true)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
