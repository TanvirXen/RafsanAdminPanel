"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import apiList from "@/apiList";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "@/components/admin/forms/event-form";
import { Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Image from "next/image";

interface Brand {
  _id: string;
  brandName: string;
  imageLink?: string;
  externalLink?: string;
}

interface Event {
  _id: string;
  title: string;
  date: string[]; // ISO strings
  venue: string;
  type: "Free" | "Free_with_approval" | "Paid" | "Paid_with_approval";
  description: string;
  imageLinkBg?: string;
  imageLinkOverlay?: string;
  // Can be ObjectIds or populated objects depending on the API response
  brands?: Array<
    string | { _id: string; brandName: string; imageLink?: string }
  >;
  customFields?: any[];
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // brands master list from API
  const [brands, setBrands] = useState<Brand[]>([]);

  // ---------- confirm dialog state ----------
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

  // ---------- load ----------
  useEffect(() => {
    (async () => {
      try {
        const [evRes, brRes] = await Promise.all([
          fetch(apiList.events.list, { credentials: "include" }),
          fetch(apiList.brands.list, { credentials: "include" }),
        ]);
        const evJson = await evRes.json();
        const brJson = await brRes.json();
        setEvents(evJson.events || evJson.data || []);
        setBrands(brJson.brands || []);
      } catch {
        toast.error("Failed to load events/brands");
      }
    })();
  }, []);

  // Resolve associated brand objects for the currently edited event
  const editingEventBrands: Brand[] = useMemo(() => {
    if (!editingEvent?.brands?.length) return [];
    return editingEvent.brands
      .map((b) => {
        if (typeof b === "string") {
          return brands.find((x) => x._id === b);
        }
        // populated object
        const fromId = brands.find((x) => x._id === (b as any)._id);
        return (
          fromId ||
          ({
            _id: (b as any)._id,
            brandName: (b as any).brandName,
            imageLink: (b as any).imageLink,
          } as Brand)
        );
      })
      .filter(Boolean) as Brand[];
  }, [editingEvent, brands]);

  // ---------- CRUD ----------
  const handleAdd = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDelete = async (event: Event) => {
    const ok = await askConfirm(
      "Delete Event",
      `Are you sure you want to delete "${event.title}"?`
    );
    if (!ok) return;

    const res = await fetch(apiList.events.delete(event._id), {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e._id !== event._id));
      toast.success("Event deleted");
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error(j.message || "Failed to delete event");
    }
  };

  const handleSave = async (data: Partial<Event>) => {
    const payload = {
      ...data,
      date: (data.date || []).map((d) => new Date(d as string).toISOString()),
    };

    if (editingEvent) {
      const res = await fetch(apiList.events.update(editingEvent._id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e._id === editingEvent._id ? j.event : e))
        );
        toast.success("Event updated");
        setIsDialogOpen(false);
      } else {
        toast.error(j.message || "Failed to update event");
      }
    } else {
      const res = await fetch(apiList.events.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setEvents((prev) => [j.event, ...prev]);
        toast.success("Event created");
        setIsDialogOpen(false);
      } else {
        toast.error(j.message || "Failed to create event");
      }
    }
  };

  // ---------- UI helpers ----------
  const getTypeColor = (
    type: Event["type"]
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "Free":
        return "default";
      case "Free_with_approval":
        return "secondary";
      case "Paid":
        return "destructive";
      case "Paid_with_approval":
        return "outline";
      default:
        return "default";
    }
  };

  const columns = [
    {
      key: "title",
      label: "Event Title",
      render: (event: Event) => (
        <div className='space-y-1'>
          <div className='font-medium'>{event.title}</div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <MapPin className='h-3 w-3' />
            {event.venue}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date(s)",
      render: (event: Event) => (
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          <span className='text-sm'>
            {event.date?.length > 1
              ? `${event.date.length} dates`
              : event.date?.[0]
              ? new Date(event.date[0]).toLocaleDateString()
              : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (event: Event) => (
        <Badge variant={getTypeColor(event.type)}>
          {event.type.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "brands",
      label: "Brands",
      render: (event: Event) => (event.brands ? event.brands.length : 0),
    },
    {
      key: "customFields",
      label: "Form Fields",
      render: (event: Event) =>
        event.customFields ? event.customFields.length : 0,
    },
    {
      key: "description",
      label: "Description",
      render: (event: Event) => (
        <span className='line-clamp-1'>{event.description}</span>
      ),
    },
  ];

  return (
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <PageHeader
        title='Events'
        description='Manage events, registrations, and attendees'
      />

      <DataTable
        data={events}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder='Search events...'
      />

      {/* Form dialog (scrollable) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto p-0'>
          <DialogHeader className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4'>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Add New Event"}
            </DialogTitle>
          </DialogHeader>

          <div className='px-6 pt-5 pb-2'>
            {/* Associated brands preview (read-only) */}
            {/* <div className='mb-4'>
              <div className='text-sm font-medium mb-2'>Associated brands</div>
              {editingEventBrands.length ? (
                <div className='flex flex-wrap gap-2'>
                  {editingEventBrands.map((b) => (
                    <span
                      key={b._id}
                      className='inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs'
                      title={b.brandName}
                    >
                      {b.imageLink ? (
                        <Image
                          src={b.imageLink}
                          alt={b.brandName}
                          width={16}
                          height={16}
                          className='rounded'
                        />
                      ) : null}
                      {b.brandName}
                    </span>
                  ))}
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>
                  No brands linked yet.
                </div>
              )}
            </div> */}

            {/* The actual form */}
            <EventForm
              initialData={editingEvent || undefined}
              brands={brands} // ⬅️ provide master brand list
              onBrandsChange={(
                ids // ⬅️ keep preview in sync while editing
              ) =>
                setEditingEvent((prev) =>
                  prev ? { ...prev, brands: ids } : prev
                )
              }
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
