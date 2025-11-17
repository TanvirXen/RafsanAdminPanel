"use client";

import { useEffect, useState } from "react";
import apiList from "../../../apiList";

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

      const res = await fetch(url, {
        credentials: "include", // if your admin uses cookies
      });

      if (!res.ok) {
        console.error("Failed to fetch contact messages", res.status);
        return;
      }

      const data = (await res.json()) as ApiResponse;
      setMessages(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (e) {
      console.error("Error loading contact messages", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleStatusChange = async (id: string, status: ContactMessage["status"]) => {
    try {
      const res = await fetch(apiList.contact.updateStatus(id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        console.error("Failed to update status");
        return;
      }

      await fetchMessages(page);
    } catch (e) {
      console.error("Error updating status", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;

    try {
      const res = await fetch(apiList.contact.delete(id), {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Failed to delete message");
        return;
      }

      await fetchMessages(page);
    } catch (e) {
      console.error("Error deleting message", e);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(1);
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Contact Messages</h1>

      {/* Filters */}
      <form
        onSubmit={handleSearchSubmit}
        className="mb-4 flex flex-wrap items-center gap-3"
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="archived">Archived</option>
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, subject..."
          className="w-64 rounded border border-gray-300 px-2 py-1 text-sm"
        />

        <button
          type="submit"
          className="rounded bg-black px-3 py-1 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && messages.length === 0 && (
        <p className="text-sm text-gray-500">No messages found.</p>
      )}

      {!loading && messages.length > 0 && (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m._id} className="border-t">
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2">{m.email}</td>
                  <td className="px-3 py-2">{m.subject}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{m.message}</td>
                  <td className="px-3 py-2">{m.status}</td>
                  <td className="px-3 py-2">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(m._id, "read")}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
                    >
                      Mark Read
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(m._id, "archived")}
                      className="rounded bg-gray-600 px-2 py-1 text-xs text-white"
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m._id)}
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => fetchMessages(page - 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => fetchMessages(page + 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
