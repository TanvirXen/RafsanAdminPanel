"use client";

import { useEffect, useRef, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimelineForm } from "@/components/admin/forms/timeline-form";
import { Calendar, ImageIcon, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

export interface TimelineItem {
  _id: string;
  date: string; // ISO string
  imageLink: string;
  description: string;
  cardUrl?: string;
  slotKey?: string; // NEW
  section?: "journey" | "setback"; // 👈 NEW
}

const SLOT_LABELS: Record<string, string> = {
  journeyHero: "Journey • Hero card",
  journey1Left: "Journey 1 • Left",
  journey1Right: "Journey 1 • Right",
  journey2Left: "Journey 2 • Left",
  journey2Right: "Journey 2 • Right",
  journey3Left: "Journey 3 • Left",
  journey3TopRight: "Journey 3 • Top Right",
  journey3BottomRight: "Journey 3 • Bottom Right",
  setbackMainLeft: "Setback • Main Left",
  setbackMainRight: "Setback • Main Right",
  setbackMosaicLeft: "Setback Mosaic • Left",
  setbackMosaicTopRight: "Setback Mosaic • Top Right",
  setbackMosaicBottomRight: "Setback Mosaic • Bottom Right",
};

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);

  // --- confirmation modal (promise-based) ---
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmResolveRef = useRef<((v: boolean) => void) | undefined>(
    undefined
  );

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
        const j = await apiFetch<{ items: TimelineItem[] }>(
          apiList.timeline.list
        );
        setTimeline(j.items || []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load timeline");
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
    const ok = await askConfirm(
      "Delete Timeline Item",
      "Are you sure you want to delete this timeline item?"
    );
    if (!ok) return;

    try {
      await apiFetch(apiList.timeline.delete(item._id), { method: "DELETE" });
      setTimeline((prev) => prev.filter((t) => t._id !== item._id));
      toast.success("Timeline item deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete timeline item");
    }
  };

  const handleSave = async (data: Partial<TimelineItem>) => {
    // Ensure backend validation passes (expects ISO8601 date)
    const payload: Partial<TimelineItem> = {
      ...data,
      date: data.date ? new Date(data.date).toISOString() : undefined,
      slotKey: data.slotKey || undefined,
      cardUrl: data.cardUrl || undefined,
      section: (data.section as any) || undefined, // 👈 NEW
    };

    try {
      if (editingItem) {
        const j = await apiFetch<{ item: TimelineItem }>(
          apiList.timeline.update(editingItem._id),
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        setTimeline((prev) =>
          prev.map((t) => (t._id === editingItem._id ? j.item : t))
        );
        toast.success("Timeline item updated");
        setIsDialogOpen(false);
      } else {
        const j = await apiFetch<{ item: TimelineItem }>(
          apiList.timeline.create,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        setTimeline((prev) => [j.item, ...prev]);
        toast.success("Timeline item created");
        setIsDialogOpen(false);
      }
    } catch (e: any) {
      toast.error(
        e?.message ||
          (editingItem
            ? "Failed to update timeline item"
            : "Failed to create timeline item")
      );
    }
  };

  // --- table columns ---
  const columns = [
    {
      key: "date",
      label: "Date",
      render: (item: TimelineItem) => (
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          {new Date(item.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (item: TimelineItem) => (
        <span className='line-clamp-2'>{item.description}</span>
      ),
    },
    {
      key: "imageLink",
      label: "Image",
      render: () => (
        <div className='flex items-center gap-2'>
          <ImageIcon className='h-4 w-4 text-muted-foreground' />
          <span className='text-xs text-muted-foreground'>Image attached</span>
        </div>
      ),
    },
    {
      key: "slotKey",
      label: "Slot",
      render: (item: TimelineItem) =>
        item.slotKey ? (
          <div className='flex items-center gap-1 text-xs'>
            <Tag className='h-3 w-3 text-muted-foreground' />
            <span>{SLOT_LABELS[item.slotKey] ?? item.slotKey}</span>
          </div>
        ) : (
          <span className='text-xs text-muted-foreground'>—</span>
        ),
    },
    // 👇 NEW column
    {
      key: "section",
      label: "Section",
      render: (item: TimelineItem) =>
        item.section ? (
          <span className='text-xs capitalize'>{item.section}</span>
        ) : (
          <span className='text-xs text-muted-foreground'>—</span>
        ),
    },

    {
      key: "cardUrl",
      label: "Card URL",
      render: (item: TimelineItem) =>
        item.cardUrl ? (
          <span className='text-xs text-blue-500 underline'>
            {item.cardUrl}
          </span>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <PageHeader
        title='Journey Timeline'
        description='Manage your journey & setback cards from a single source'
      />

      <DataTable
        data={timeline}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder='Search timeline...'
      />

      {/* Form dialog (scrollable) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='w-[95vw] sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden'>
          <DialogHeader className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4'>
            <DialogTitle>
              {editingItem ? "Edit Timeline Item" : "Add Timeline Item"}
            </DialogTitle>
          </DialogHeader>
          <div className='overflow-y-auto px-6 py-5 max-h-[calc(85vh-64px)]'>
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
