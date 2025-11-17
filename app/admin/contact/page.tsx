"use client";

import type React from "react";
import { useEffect, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-toastify";

type ContactMessage = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

type ApiResponse = {
  items: ContactMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function AdminContactPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMessages = async (pageToLoad = 1) => {
    try {
      setLoading(true);

      const url = apiList.contact.list({
        page: pageToLoad,
        limit: 20,
        status: statusFilter || undefined,
        search: search || undefined,
      });

      // Use shared helper (handles base URL, auth, etc.)
      const data = await apiFetch<ApiResponse>(url);

      setMessages(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      console.error("Error loading contact messages", e);
      toast.error(e?.message || "Failed to load contact messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleStatusChange = async (
    id: string,
    status: ContactMessage["status"]
  ) => {
    try {
      await apiFetch(apiList.contact.updateStatus(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      toast.success("Status updated");
      await fetchMessages(page);
    } catch (e: any) {
      console.error("Error updating status", e);
      toast.error(e?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;

    try {
      await apiFetch(apiList.contact.delete(id), { method: "DELETE" });
      toast.success("Message deleted");
      await fetchMessages(page);
    } catch (e: any) {
      console.error("Error deleting message", e);
      toast.error(e?.message || "Failed to delete message");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(1);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    fetchMessages(nextPage);
  };

  return (
    <div className='p-6 flex flex-col gap-6'>
      <PageHeader
        title='Contact Messages'
        description='View and manage messages submitted from the public contact form'
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter messages by status or search by name, email, or subject
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <form
            onSubmit={handleSearchSubmit}
            className='mb-4 flex flex-wrap items-center gap-3'
          >
            {/* Native select instead of Radix Select to avoid context errors */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className='h-9 rounded-md border border-input bg-background px-2 py-1 text-sm'
              >
                <option value=''>All statuses</option>
                <option value='new'>New</option>
                <option value='read'>Read</option>
                <option value='archived'>Archived</option>
              </select>
            </div>

            <div className='flex-1 min-w-[200px] max-w-xs'>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search name, email, subject...'
              />
            </div>

            <Button type='submit' variant='default' size='sm'>
              Search
            </Button>
          </form>

          <Separator className='my-4' />

          {loading && <p className='text-sm text-muted-foreground'>Loading…</p>}

          {!loading && messages.length === 0 && (
            <p className='text-sm text-muted-foreground'>No messages found.</p>
          )}

          {!loading && messages.length > 0 && (
            <div className='overflow-x-auto rounded border border-gray-200 bg-white'>
              <table className='min-w-full text-left text-sm'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-3 py-2'>Name</th>
                    <th className='px-3 py-2'>Email</th>
                    <th className='px-3 py-2'>Phone</th>
                    <th className='px-3 py-2'>Subject</th>
                    <th className='px-3 py-2'>Message</th>
                    <th className='px-3 py-2'>Status</th>
                    <th className='px-3 py-2'>Created</th>
                    <th className='px-3 py-2 text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m._id} className='border-t'>
                      <td className='px-3 py-2'>{m.name}</td>
                      <td className='px-3 py-2'>{m.email}</td>
                      <td className='px-3 py-2'>{m.phone || "—"}</td>
                      <td className='px-3 py-2'>{m.subject || "—"}</td>
                      <td className='px-3 py-2 max-w-xs truncate'>
                        {m.message}
                      </td>
                      <td className='px-3 py-2 capitalize'>{m.status}</td>
                      <td className='px-3 py-2'>
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className='px-3 py-2 text-right space-x-2'>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => handleStatusChange(m._id, "read")}
                        >
                          Mark Read
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => handleStatusChange(m._id, "archived")}
                        >
                          Archive
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant='destructive'
                          onClick={() => handleDelete(m._id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className='mt-4 flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Prev
              </Button>
              <span className='text-sm'>
                Page {page} of {totalPages}
              </span>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
