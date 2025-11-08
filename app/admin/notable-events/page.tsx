"use client";

import { useEffect, useRef, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotableEventForm } from "@/components/admin/forms/notable-event-form";
import { Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

interface NotableEvent {
  _id: string;
  date: string; // ISO or yyyy-mm-dd
  imageLink: string;
  description: string;
  title: string;
  featured: boolean;
}

export default function NotableEventsPage() {
  const [events, setEvents] = useState<NotableEvent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<NotableEvent | null>(null);

  // --- confirmation modal (promise-based, no alert) ---
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

  // --- load ---
  useEffect(() => {
    (async () => {
      try {
        const j = await apiFetch<{ events: NotableEvent[] }>(
          apiList.notableEvents.list
        );
        setEvents(j.events || []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load notable events");
      }
    })();
  }, []);

  // --- CRUD handlers ---
  const handleAdd = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (event: NotableEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDelete = async (event: NotableEvent) => {
    const ok = await askConfirm(
      "Delete Notable Event",
      `Are you sure you want to delete "${event.title}"?`
    );
    if (!ok) return;

    try {
      await apiFetch(apiList.notableEvents.delete(event._id), {
        method: "DELETE",
      });
      setEvents((prev) => prev.filter((e) => e._id !== event._id));
      toast.success("Notable event deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete notable event");
    }
  };

  const handleSave = async (data: Partial<NotableEvent>) => {
    // Ensure date is an ISO 8601 string for the backend validator
    const payload = {
      ...data,
      date: data.date ? new Date(data.date).toISOString() : undefined,
    };

    try {
      if (editingEvent) {
        // update
        const j = await apiFetch<{ event: NotableEvent }>(
          apiList.notableEvents.update(editingEvent._id),
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        setEvents((prev) =>
          prev.map((e) => (e._id === editingEvent._id ? j.event : e))
        );
        toast.success("Notable event updated");
        setIsDialogOpen(false);
      } else {
        // create
        const j = await apiFetch<{ event: NotableEvent }>(
          apiList.notableEvents.create,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        setEvents((prev) => [j.event, ...prev]);
        toast.success("Notable event created");
        setIsDialogOpen(false);
      }
    } catch (e: any) {
      toast.error(
        e?.message ||
          (editingEvent
            ? "Failed to update notable event"
            : "Failed to create notable event")
      );
    }
  };

  // --- Table columns ---
  const columns = [
    {
      key: "title",
      label: "Title",
      render: (event: NotableEvent) => (
        <div className='space-y-1'>
          <div className='flex items-center gap-2 font-medium'>
            {event.featured && (
              <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
            )}
            {event.title}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (event: NotableEvent) => (
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          {new Date(event.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (event: NotableEvent) => (
        <span className='line-clamp-2'>{event.description}</span>
      ),
    },
    {
      key: "featured",
      label: "Status",
      render: (event: NotableEvent) =>
        event.featured ? (
          <Badge>Featured</Badge>
        ) : (
          <Badge variant='outline'>Regular</Badge>
        ),
    },
  ];

  return (
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <PageHeader
        title='Notable Events'
        description='Highlight important achievements and milestones'
      />

      <DataTable
        data={events}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder='Search notable events...'
      />

      {/* Form dialog (scrollable) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='w-[95vw] sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden'>
          <DialogHeader className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4'>
            <DialogTitle>
              {editingEvent ? "Edit Notable Event" : "Add Notable Event"}
            </DialogTitle>
          </DialogHeader>
          <div className='overflow-y-auto px-6 py-5 max-h-[calc(85vh-64px)]'>
            <NotableEventForm
              initialData={editingEvent || undefined}
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
