"use client";

import { useEffect, useMemo, useState } from "react";
import apiList, { withQuery } from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { runBulkDelete } from "@/lib/bulk-actions";
import { resolvePagination } from "@/lib/pagination";
import { useAuth } from "@/hooks/use-auth";
import { broadcastAdminSync, useAdminSync } from "@/hooks/use-admin-sync";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import {
  DollarSign,
  Calendar,
  CreditCard,
  User,
  FileSpreadsheet,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { downloadFile } from "@/lib/api-fetch";

type Payment = {
  _id: string;
  fields?: Record<string, any>;
  eventId: string;
  eventTitle?: string;
  processedAt: string; // <-- from API
  amount: number;
  currency?: string;
  registrationId: string;
};

type ApiListResponse = {
  payments: Payment[];
  pagination?: { total: number; page: number; pages: number; limit: number };
};

export default function PaymentsPage() {
  const { isLoading: authLoading } = useAuth({ redirectOnUnauthed: true });

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // simple pagination (optional)
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(50);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const load = async (opts?: { page?: number }) => {
    try {
      setIsLoading(true);
      const url = withQuery(apiList.payments.list, {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page: opts?.page ?? page,
        limit,
      });
      const j = await apiFetch<ApiListResponse>(url);
      const pagination = resolvePagination(j, limit);
      setPayments(j.payments || []);
      setTotal(pagination.total);
      setPage(pagination.page);
      setTotalPages(pagination.pages);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]); // initial after auth is known

  useAdminSync(["payments", "registrations", "events"], () => {
    if (authLoading) return;
    void load();
  });

  const applyFilters = () => {
    setPage(1);
    load({ page: 1 });
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setTimeout(() => {
      void load({ page: 1 });
    }, 0);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadFile(
        withQuery(apiList.payments.export, {
          from: dateFrom || undefined,
          to: dateTo || undefined,
        }),
        {},
        { fallbackFilename: "payments.csv" }
      );
      toast.success("Payments export downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export payments");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (payment: Payment) => {
    const confirmed = confirm(`Delete payment "${payment._id}"?`);
    if (!confirmed) return;

    try {
      await apiFetch(apiList.payments.delete(payment._id), {
        method: "DELETE",
      });
      await load();
      broadcastAdminSync("payments");
      toast.success("Payment deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete payment");
    }
  };

  const handleBulkDelete = async (selectedPayments: Payment[]) => {
    const confirmed = confirm(
      `Delete ${selectedPayments.length} selected payment${
        selectedPayments.length === 1 ? "" : "s"
      }?`
    );
    if (!confirmed) return false;

    const { successCount, failureCount, errors } = await runBulkDelete(
      selectedPayments,
      (payment) =>
        apiFetch(apiList.payments.delete(payment._id), {
          method: "DELETE",
        })
    );

    await load();
    broadcastAdminSync("payments");

    if (successCount > 0) {
      toast.success(
        `${successCount} payment${successCount === 1 ? "" : "s"} deleted`
      );
    }

    if (failureCount > 0) {
      toast.error(errors[0] || `Failed to delete ${failureCount} payment(s)`);
    }
  };

  const totalRevenue = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments]
  );
  const avg = payments.length ? totalRevenue / payments.length : 0;

  const columns = [
    {
      key: "_id",
      label: "Payment ID",
      render: (p: Payment) => (
        <div className='flex items-center gap-2 font-mono text-sm'>
          <CreditCard className='h-4 w-4 text-muted-foreground' />
          {p._id}
        </div>
      ),
    },
    {
      key: "fields.name",
      label: "Customer",
      render: (p: Payment) => {
        const name = p.fields?.name || p.fields?.Name || "—";
        const email =
          p.fields?.email || p.fields?.Email || p.fields?.contact || "";
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-2 font-medium'>
              <User className='h-4 w-4 text-muted-foreground' />
              {name}
            </div>
            {email ? (
              <div className='text-xs text-muted-foreground'>{email}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "eventTitle",
      label: "Event",
      render: (p: Payment) => p.eventTitle || p.eventId,
    },
    {
      key: "processedAt",
      label: "Processed At",
      render: (p: Payment) => (
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          {new Date(p.processedAt).toLocaleString()}
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (p: Payment) => (
        <div className='flex items-center gap-1 font-semibold'>
          <DollarSign className='h-4 w-4' />
          {p.amount.toFixed(2)}{" "}
          <span className='ml-1 text-xs text-muted-foreground'>
            {p.currency || "USD"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <PageHeader
        title='Payments'
        description='Track and manage payment transactions'
        actions={
          <Button
            variant='outline'
            className='gap-2'
            onClick={handleExport}
            disabled={isLoading || isExporting}
          >
            <FileSpreadsheet className='h-4 w-4' />
            {isExporting ? "Exporting..." : "Export to Excel"}
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
        <div className='flex gap-2'>
          <Button onClick={applyFilters} disabled={isLoading}>
            Apply
          </Button>
          {(dateFrom || dateTo) && (
            <Button
              variant='outline'
              onClick={clearFilters}
              disabled={isLoading}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className='grid gap-4 md:grid-cols-3'>
        <div className='rounded-lg border bg-card p-6'>
          <div className='flex items-center justify-between'>
            <div className='text-sm font-medium text-muted-foreground'>
              Total Revenue
            </div>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </div>
          <div className='mt-2 text-3xl font-semibold'>
            ${totalRevenue.toFixed(2)}
          </div>
        </div>

        <div className='rounded-lg border bg-card p-6'>
          <div className='flex items-center justify-between'>
            <div className='text-sm font-medium text-muted-foreground'>
              Total Transactions
            </div>
            <CreditCard className='h-4 w-4 text-muted-foreground' />
          </div>
          <div className='mt-2 text-3xl font-semibold'>{total}</div>
        </div>

        <div className='rounded-lg border bg-card p-6'>
          <div className='flex items-center justify-between'>
            <div className='text-sm font-medium text-muted-foreground'>
              Average Transaction
            </div>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </div>
          <div className='mt-2 text-3xl font-semibold'>${avg.toFixed(2)}</div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={payments}
        columns={columns}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        searchPlaceholder='Search payments...'
        page={page}
        totalPages={totalPages}
        totalItems={total}
        paginationLabel='payments'
        onPageChange={(nextPage) => void load({ page: nextPage })}
        isPageLoading={isLoading}
      />
    </div>
  );
}
