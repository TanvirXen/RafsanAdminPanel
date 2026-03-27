"use client";

import { useEffect, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { UserForm, type UserFormShape } from "@/components/admin/forms/user-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert, ShieldCheck, UserCog, Users } from "lucide-react";
import { toast } from "react-toastify";

type AdminUser = {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "editor";
  createdAt: string;
  updatedAt: string;
};

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

export default function UsersPage() {
  const { user: me, isLoading: authLoading, refetch } = useAuth({
    redirectOnUnauthed: true,
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (me?.role !== "admin") {
      setLoadingUsers(false);
      setUsers([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingUsers(true);
      try {
        const data = await apiFetch<{ users: AdminUser[] }>(apiList.adminUsers.list);
        if (!cancelled) {
          setUsers(data.users || []);
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error?.message || "Failed to load users");
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, me?.role]);

  const stats = {
    total: users.length,
    admins: users.filter((user) => user.role === "admin").length,
    editors: users.filter((user) => user.role === "editor").length,
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleSave = async (payload: UserFormShape) => {
    const body = {
      name: payload.name || undefined,
      email: payload.email,
      role: payload.role,
      ...(payload.password ? { password: payload.password } : {}),
    };

    try {
      if (editingUser) {
        const response = await apiFetch<{ user: AdminUser }>(
          apiList.adminUsers.update(editingUser.id),
          {
            method: "PATCH",
            body: JSON.stringify(body),
          }
        );

        setUsers((prev) =>
          prev.map((user) => (user.id === editingUser.id ? response.user : user))
        );

        if (response.user.id === me?.id) {
          localStorage.setItem("adminUser", JSON.stringify(response.user));
          await refetch();
        }

        toast.success("User updated");
      } else {
        const response = await apiFetch<{ user: AdminUser }>(apiList.adminUsers.create, {
          method: "POST",
          body: JSON.stringify(body),
        });

        setUsers((prev) => [response.user, ...prev]);
        toast.success("User created");
      }

      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      toast.error(
        error?.message || (editingUser ? "Failed to update user" : "Failed to create user")
      );
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      await apiFetch(apiList.adminUsers.delete(deletingUser.id), {
        method: "DELETE",
      });
      setUsers((prev) => prev.filter((user) => user.id !== deletingUser.id));
      toast.success("User deleted");
      setDeletingUser(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete user");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (user: AdminUser) => (
        <div className="space-y-1">
          <div className="font-medium">{user.name?.trim() || "Unnamed user"}</div>
          {user.id === me?.id && (
            <span className="text-xs text-muted-foreground">Current account</span>
          )}
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (user: AdminUser) => <span className="font-mono text-sm">{user.email}</span>,
    },
    {
      key: "role",
      label: "Role",
      render: (user: AdminUser) => (
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          {user.role}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (user: AdminUser) => (
        <span className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</span>
      ),
    },
  ];

  if (authLoading || loadingUsers) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }

  if (me?.role !== "admin") {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-3 text-destructive">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Admin access required</CardTitle>
                <CardDescription>
                  User management is restricted to admin accounts.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your account currently has the <strong>{me?.role || "unknown"}</strong> role.
              Ask an admin if you need access to manage other users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Users"
          description="Create, edit, and remove admin panel accounts."
        />
        <Button onClick={openCreateDialog}>
          <UserCog className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All admin panel accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">Full access accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Editors</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.editors}</div>
            <p className="text-xs text-muted-foreground">Limited content managers</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={users}
        columns={columns}
        onEdit={openEditDialog}
        onDelete={(user) => setDeletingUser(user)}
        searchPlaceholder="Search users..."
      />

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingUser(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="border-b bg-background/95 px-6 py-4 backdrop-blur">
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(85vh-64px)] overflow-y-auto px-6 py-5">
            <UserForm
              initialData={editingUser || undefined}
              currentUserId={me?.id}
              onSave={handleSave}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingUser(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingUser(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser
                ? `Delete ${deletingUser.email}? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
