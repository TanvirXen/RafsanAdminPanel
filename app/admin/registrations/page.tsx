"use client";

import { useEffect, useMemo, useState } from "react";
import apiList, { withQuery } from "@/apiList";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Calendar, DollarSign } from "lucide-react";
import { toast } from "react-toastify";

type RegStatus = "pending" | "approved" | "rejected";

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
};

type ApiListResponse = {
  registrations: Registration[];
  pagination?: { total: number; page: number; pages: number; limit: number };
};

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RegStatus>("all");

  // selection
  const [selected, setSelected] = useState<Registration | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const url = withQuery(apiList.registrations.list, {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 100,
      });
      const res = await fetch(url, {  });
      const j: ApiListResponse = await res.json();
      if (!res.ok) throw new Error((j as any)?.message || "Failed to load registrations");
      setRows(j.registrations || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setTimeout(load, 0);
  };

  const approve = async (id: string) => {
    const res = await fetch(apiList.registrations.update(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      
      body: JSON.stringify({ status: "approved" }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r._id === id ? j.registration : r)));
      setSelected((prev) => (prev && prev._id === id ? j.registration : prev));
      toast.success("Registration approved");
    } else toast.error(j.message || "Failed to approve");
  };

  const reject = async (id: string) => {
    const res = await fetch(apiList.registrations.update(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      
      body: JSON.stringify({ status: "rejected" }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r._id === id ? j.registration : r)));
      setSelected((prev) => (prev && prev._id === id ? j.registration : prev));
      toast.success("Registration rejected");
    } else toast.error(j.message || "Failed to reject");
  };

  const remove = async (reg: Registration) => {
    if (!confirm(`Delete registration for "${reg.fields?.name || reg.fields?.Name || "attendee"}"?`)) return;
    const res = await fetch(apiList.registrations.delete(reg._id), {
      method: "DELETE",
      
    });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r._id !== reg._id));
      toast.success("Registration deleted");
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error(j.message || "Failed to delete");
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
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              {name}
            </div>
            {email ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
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
        <div className="space-y-1">
          <div className="font-medium">{reg.eventTitle}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(reg.eventDate || reg.createdAt || Date.now()).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (reg: Registration) => {
        const color =
          reg.status === "approved" ? "default" : reg.status === "rejected" ? "destructive" : "secondary";
        return <Badge variant={color as any}>{reg.status}</Badge>;
      },
    },
    {
      key: "paid",
      label: "Payment",
      render: (reg: Registration) => (
        <div className="space-y-1">
          <Badge variant={reg.paid ? "default" : "secondary"}>{reg.paid ? "Paid" : "Free"}</Badge>
          {reg.amount ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              {reg.amount}
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader title="Registrations" description="Manage event registrations and attendees" />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="date-from">From Date</Label>
          <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="date-to">To Date</Label>
          <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} disabled={loading}>Apply</Button>
          {(dateFrom || dateTo || statusFilter !== "all") && (
            <Button variant="outline" onClick={clearFilters} disabled={loading}>Clear</Button>
          )}
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        onEdit={(r: Registration) => {
          setSelected(r);
          setIsDialogOpen(true);
        }}
        onDelete={remove}
        searchPlaceholder="Search registrations..."
      />

      {/* Details / Approve / Reject */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Attendee</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.fields?.name || selected.fields?.Name || "—"}</span>
                  </div>
                  {selected.fields?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selected.fields.email}</span>
                    </div>
                  )}
                  {selected.fields?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selected.fields.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Event</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="text-muted-foreground">Event:</span> {selected.eventTitle}</div>
                  <div><span className="text-muted-foreground">Date:</span> {new Date(selected.eventDate || selected.createdAt || Date.now()).toLocaleDateString()}</div>
                  <div><span className="text-muted-foreground">Type:</span> {selected.eventType.replace(/_/g, " ")}</div>
                </div>
              </div>

              {selected.status === "pending" && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => approve(selected._id)}>
                    Approve
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => reject(selected._id)}>
                    Reject
                  </Button>
                </div>
              )}

              {selected.paid && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Payment</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-muted-foreground">Amount:</span> ${selected.amount}</div>
                    <div><span className="text-muted-foreground">Payment ID:</span> {selected.paymentId}</div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
