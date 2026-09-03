"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import apiList, { withQuery } from "@/apiList";
import { apiFetch, getToken } from "@/lib/api-fetch";
import { runBulkDelete } from "@/lib/bulk-actions";
import { resolvePagination } from "@/lib/pagination";
import { useAuth } from "@/hooks/use-auth";
import { broadcastAdminSync, useAdminSync } from "@/hooks/use-admin-sync";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Archive,
  UserX,
} from "lucide-react";
import { toast } from "react-toastify";
import { downloadFile } from "@/lib/api-fetch";

type RegStatus = "pending" | "approved" | "rejected";

type EventOption = { _id: string; title: string };
type BlacklistEntry = { _id: string; email: string; createdAt?: string };

type Registration = {
  _id: string;
  fields: Record<string, any>;
  eventId: string;
  eventTitle: string;
  eventType: string; // Free / Paid / *_with_approval
  eventDate?: string;
  createdAt?: string;
  paid: boolean;
  amount?: number;
  paymentId?: string;
  status: RegStatus;
  notes?: string;
  imageFields?: string[];
};

type ApiListResponse = {
  registrations: Registration[];
  pagination?: { total: number; page: number; pages: number; limit: number };
};

function prettyLabel(key: string) {
  // Preserve familiar keys, otherwise prettify: full_name -> Full Name
  const known: Record<string, string> = {
    name: "Name",
    Name: "Name",
    email: "Email",
    Email: "Email",
    phone: "Phone",
    Phone: "Phone",
  };
  if (known[key]) return known[key];
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
}

function renderValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function PrivateRegistrationImage({ imageId }: { imageId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const token = getToken();
        const response = await fetch(apiList.registrationImages.get(imageId), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) throw new Error("Image unavailable");
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (active) setSrc(objectUrl);
      } catch {
        if (active) setFailed(true);
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (failed) return <span className='text-muted-foreground'>Image unavailable</span>;
  if (!src) return <span className='text-muted-foreground'>Loading image...</span>;
  return <img src={src} alt='Private registration upload' className='mt-2 max-h-64 max-w-full rounded-md border object-contain' />;
}

export default function RegistrationsPage() {
  const { isLoading: authLoading } = useAuth({ redirectOnUnauthed: true });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const PAGE_SIZE = 20;

  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RegStatus>("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [blacklistEmail, setBlacklistEmail] = useState("");
  const [blacklistLoading, setBlacklistLoading] = useState(false);

  // selection
  const [selected, setSelected] = useState<Registration | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const load = async (pageToLoad = page) => {
    try {
      setLoading(true);
      const url = withQuery(apiList.registrations.list, {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        eventId: eventFilter === "all" ? undefined : eventFilter,
        page: pageToLoad,
        limit: PAGE_SIZE,
      });
      const j = await apiFetch<ApiListResponse>(url);
      const pagination = resolvePagination(j, PAGE_SIZE);
      setRows(j.registrations || []);
      setPage(pagination.page);
      setTotalPages(pagination.pages);
      setTotalRows(pagination.total);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    void Promise.all([
      apiFetch<{ events?: EventOption[] }>(
        withQuery(apiList.events.list, { page: 1, limit: 100 })
      ),
      apiFetch<{ entries?: BlacklistEntry[] }>(apiList.registrations.blacklist),
    ])
      .then(([eventResponse, blacklistResponse]) => {
        setEvents(eventResponse.events || []);
        setBlacklist(blacklistResponse.entries || []);
      })
      .catch((e: any) => toast.error(e?.message || "Failed to load registration settings"));
  }, [authLoading]);

  useAdminSync("registrations", () => {
    if (authLoading) return;
    void load();
  });

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setEventFilter("all");
    setTimeout(() => {
      void load(1);
    }, 0);
  };

  const archive = async (reg: Registration) => {
    if (!confirm("Archive this registration? It will be removed from the active list.")) return;
    try {
      await apiFetch(apiList.registrations.archive(reg._id), { method: "POST" });
      setIsDialogOpen(false);
      await load();
      broadcastAdminSync("registrations");
      toast.success("Registration archived");
    } catch (e: any) {
      toast.error(e?.message || "Failed to archive registration");
    }
  };

  const addToBlacklist = async (e: FormEvent) => {
    e.preventDefault();
    const email = blacklistEmail.trim().toLowerCase();
    if (!email) return;
    try {
      setBlacklistLoading(true);
      const response = await apiFetch<{ entry: BlacklistEntry }>(
        apiList.registrations.blacklist,
        { method: "POST", body: JSON.stringify({ email }) }
      );
      setBlacklist((prev) => [response.entry, ...prev.filter((item) => item.email !== response.entry.email)]);
      setBlacklistEmail("");
      toast.success("Email blacklisted for all events");
    } catch (e: any) {
      toast.error(e?.message || "Failed to blacklist email");
    } finally {
      setBlacklistLoading(false);
    }
  };

  const removeFromBlacklist = async (email: string) => {
    try {
      setBlacklistLoading(true);
      await apiFetch(apiList.registrations.blacklist, {
        method: "DELETE",
        body: JSON.stringify({ email }),
      });
      setBlacklist((prev) => prev.filter((item) => item.email !== email));
      toast.success("Email removed from blacklist");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove blacklisted email");
    } finally {
      setBlacklistLoading(false);
    }
  };

  const approve = async (id: string) => {
    try {
      const j = await apiFetch<{ registration: Registration }>(
        apiList.registrations.update(id),
        {
          method: "PATCH",
          body: JSON.stringify({ status: "approved" }),
        }
      );
      setRows((prev) => prev.map((r) => (r._id === id ? j.registration : r)));
      setSelected((prev) => (prev && prev._id === id ? j.registration : prev));
      await load();
      broadcastAdminSync("registrations");
      toast.success("Registration approved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve");
    }
  };

  const reject = async (id: string) => {
    try {
      const j = await apiFetch<{ registration: Registration }>(
        apiList.registrations.update(id),
        {
          method: "PATCH",
          body: JSON.stringify({ status: "rejected" }),
        }
      );
      setRows((prev) => prev.map((r) => (r._id === id ? j.registration : r)));
      setSelected((prev) => (prev && prev._id === id ? j.registration : prev));
      await load();
      broadcastAdminSync("registrations");
      toast.success("Registration rejected");
    } catch (e: any) {
      toast.error(e?.message || "Failed to reject");
    }
  };

  const remove = async (reg: Registration) => {
    if (
      !confirm(
        `Delete registration for "${
          reg.fields?.name || reg.fields?.Name || "attendee"
        }"?`
      )
    )
      return;
    try {
      await apiFetch(apiList.registrations.delete(reg._id), {
        method: "DELETE",
      });
      await load();
      broadcastAdminSync("registrations");
      toast.success("Registration deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await downloadFile(
        withQuery(apiList.registrations.export, {
          from: dateFrom || undefined,
          to: dateTo || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          eventId: eventFilter === "all" ? undefined : eventFilter,
        }),
        {},
        { fallbackFilename: "registrations.csv" }
      );
      toast.success("Registrations export downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export registrations");
    } finally {
      setExporting(false);
    }
  };

  const handleBulkDelete = async (selectedRegistrations: Registration[]) => {
    const confirmed = confirm(
      `Delete ${selectedRegistrations.length} selected registration${
        selectedRegistrations.length === 1 ? "" : "s"
      }?`
    );
    if (!confirmed) return false;

    const { successCount, failureCount, errors } = await runBulkDelete(
      selectedRegistrations,
      (registration) =>
        apiFetch(apiList.registrations.delete(registration._id), {
          method: "DELETE",
        })
    );

    await load();
    broadcastAdminSync("registrations");

    if (successCount > 0) {
      toast.success(
        `${successCount} registration${
          successCount === 1 ? "" : "s"
        } deleted`
      );
    }

    if (failureCount > 0) {
      toast.error(
        errors[0] || `Failed to delete ${failureCount} registration(s)`
      );
    }
  };

  const columns = [
    {
      key: "fields.name",
      label: "Attendee",
      render: (reg: Registration) => {
        const name = reg.fields?.name || reg.fields?.Name || "—";
        const email = reg.fields?.email || reg.fields?.Email || "";
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-2 font-medium'>
              <User className='h-4 w-4 text-muted-foreground' />
              {name}
            </div>
            {email ? (
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <Mail className='h-3 w-3' />
                {email}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "eventTitle",
      label: "Event",
      render: (reg: Registration) => (
        <div className='space-y-1'>
          <div className='font-medium'>{reg.eventTitle}</div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Calendar className='h-3 w-3' />
            {new Date(
              reg.eventDate || reg.createdAt || Date.now()
            ).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (reg: Registration) => {
        const color =
          reg.status === "approved"
            ? "default"
            : reg.status === "rejected"
            ? "destructive"
            : "secondary";
        return <Badge variant={color as any}>{reg.status}</Badge>;
      },
    },
    {
      key: "paid",
      label: "Payment",
      render: (reg: Registration) => (
        <div className='space-y-1'>
          <Badge variant={reg.paid ? "default" : "secondary"}>
            {reg.paid ? "Paid" : "Free"}
          </Badge>
          {reg.amount ? (
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <DollarSign className='h-3 w-3' />
              {reg.amount}
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  // Build dynamic field list for the dialog
  const attendeeDetails = useMemo(() => {
    if (!selected?.fields) return [];
    const f = selected.fields;

    // Normalize "primary" fields
    const primary: Array<[string, any]> = [];
    if (f.name ?? f.Name) primary.push(["name", f.name ?? f.Name]);
    if (f.email ?? f.Email) primary.push(["email", f.email ?? f.Email]);
    if (f.phone ?? f.Phone) primary.push(["phone", f.phone ?? f.Phone]);

    // Remaining custom fields (excluding primary aliases)
    const skip = new Set(["name", "Name", "email", "Email", "phone", "Phone"]);
    const rest = Object.entries(f)
      .filter(([k]) => !skip.has(k))
      // stable order by label
      .sort(([a], [b]) => prettyLabel(a).localeCompare(prettyLabel(b)));

    return [...primary, ...rest];
  }, [selected]);

  const isImageField = (key: string) =>
    (selected?.imageFields || []).some(
      (fieldName) => String(fieldName).toLowerCase() === key.toLowerCase()
    );

  return (
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <PageHeader
        title='Registrations'
        description='Manage event registrations and attendees'
        actions={
          <Button
            variant='outline'
            className='gap-2'
            onClick={handleExport}
            disabled={loading || exporting}
          >
            <FileSpreadsheet className='h-4 w-4' />
            {exporting ? "Exporting..." : "Export to Excel"}
          </Button>
        }
      />

      {/* Filters */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end'>
        <div className='flex-1 space-y-2'>
          <Label htmlFor='date-from'>From Date</Label>
          <Input
            id='date-from'
            type='date'
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className='flex-1 space-y-2'>
          <Label htmlFor='date-to'>To Date</Label>
          <Input
            id='date-to'
            type='date'
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className='flex-1 space-y-2'>
          <Label htmlFor='status-filter'>Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v: any) => setStatusFilter(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder='All statuses' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All</SelectItem>
              <SelectItem value='pending'>Pending</SelectItem>
              <SelectItem value='approved'>Approved</SelectItem>
              <SelectItem value='rejected'>Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='flex-1 space-y-2'>
          <Label htmlFor='event-filter'>Event</Label>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger id='event-filter'>
              <SelectValue placeholder='All events' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event._id} value={event._id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex gap-2'>
          <Button onClick={() => void load(1)} disabled={loading}>
            Apply
          </Button>
          {(dateFrom || dateTo || statusFilter !== "all" || eventFilter !== "all") && (
            <Button variant='outline' onClick={clearFilters} disabled={loading}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className='rounded-xl border bg-card p-4 shadow-xs'>
        <div className='mb-3 flex items-center gap-2'>
          <UserX className='h-5 w-5' />
          <div>
            <h2 className='font-semibold'>Registration blacklist</h2>
            <p className='text-sm text-muted-foreground'>Blocked emails cannot register for any event.</p>
          </div>
        </div>
        <form onSubmit={addToBlacklist} className='flex flex-col gap-2 sm:flex-row'>
          <Input
            type='email'
            value={blacklistEmail}
            onChange={(e) => setBlacklistEmail(e.target.value)}
            placeholder='email@example.com'
            className='sm:max-w-sm'
            required
          />
          <Button type='submit' disabled={blacklistLoading}>
            {blacklistLoading ? "Saving..." : "Blacklist email"}
          </Button>
        </form>
        {blacklist.length > 0 && (
          <div className='mt-3 flex flex-wrap gap-2'>
            {blacklist.map((entry) => (
              <div key={entry._id} className='flex items-center gap-2 rounded-full border px-3 py-1 text-sm'>
                <span>{entry.email}</span>
                <button type='button' className='text-muted-foreground hover:text-foreground' onClick={() => void removeFromBlacklist(entry.email)} disabled={blacklistLoading} aria-label={`Remove ${entry.email} from blacklist`}>
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <DataTable
        data={rows}
        columns={columns}
        onEdit={(r: Registration) => {
          setSelected(r);
          setIsDialogOpen(true);
        }}
        onDelete={remove}
        onArchive={archive}
        onBulkDelete={handleBulkDelete}
        searchPlaceholder='Search registrations...'
        page={page}
        totalPages={totalPages}
        totalItems={totalRows}
        paginationLabel='registrations'
        onPageChange={(nextPage) => void load(nextPage)}
        isPageLoading={loading}
      />

      {/* Details / Approve / Reject */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className='space-y-6'>
              {/* Attendee */}
              <div className='space-y-2'>
                <h3 className='font-semibold'>Attendee</h3>
                <div className='space-y-1 text-sm'>
                  {attendeeDetails.length === 0 ? (
                    <div className='text-muted-foreground'>No fields.</div>
                  ) : (
                    attendeeDetails.map(([k, v]) => (
                      <div key={k} className='flex items-start gap-2'>
                        {/* show nice icon for known keys */}
                        {k.toLowerCase() === "name" && (
                          <User className='mt-0.5 h-4 w-4 text-muted-foreground' />
                        )}
                        {k.toLowerCase() === "email" && (
                          <Mail className='mt-0.5 h-4 w-4 text-muted-foreground' />
                        )}
                        {k.toLowerCase() === "phone" && (
                          <Phone className='mt-0.5 h-4 w-4 text-muted-foreground' />
                        )}
                        {/* label + value */}
                        <div>
                          <span className='text-muted-foreground'>
                            {prettyLabel(k)}:
                          </span>{" "}
                          {isImageField(k) && typeof v === "string" ? (
                            <PrivateRegistrationImage imageId={v} />
                          ) : (
                            <span>{renderValue(v)}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Event */}
              <div className='space-y-2'>
                <h3 className='font-semibold'>Event</h3>
                <div className='space-y-1 text-sm'>
                  <div>
                    <span className='text-muted-foreground'>Event:</span>{" "}
                    {selected.eventTitle}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Date:</span>{" "}
                    {new Date(
                      selected.eventDate || selected.createdAt || Date.now()
                    ).toLocaleDateString()}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Type:</span>{" "}
                    {selected.eventType.replace(/_/g, " ")}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selected.status === "pending" && (
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    className='flex-1 bg-transparent'
                    onClick={() => approve(selected._id)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant='destructive'
                    className='flex-1'
                    onClick={() => reject(selected._id)}
                  >
                    Reject
                  </Button>
                </div>
              )}

              {/* Payment */}
              {selected.paid && (
                <div className='space-y-2'>
                  <h3 className='font-semibold'>Payment</h3>
                  <div className='space-y-1 text-sm'>
                    <div>
                      <span className='text-muted-foreground'>Amount:</span> $
                      {selected.amount}
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Payment ID:</span>{" "}
                      {selected.paymentId}
                    </div>
                  </div>
                </div>
              )}

              <div className='flex justify-end'>
                <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
