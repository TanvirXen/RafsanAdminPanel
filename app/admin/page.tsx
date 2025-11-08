// app/admin/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Film,
  Calendar,
  Users,
  CreditCard,
  TrendingUp,
  Award,
  Database,
  Activity,
  LogOut,
} from "lucide-react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch"; // uses your auth token automatically

type DashboardSummary = {
  totals: {
    shows: number;
    events: number;
    registrations: number;
    revenue: number;
    upcomingEvents?: number;
  };
  recent: Array<{
    action: string;
    item: string;
    time: string; // already humanized from server
    type: "show" | "event" | "registration" | "payment";
  }>;
};

export default function AdminDashboard() {
  const { user: me, isLoading, logout } = useAuth({ redirectOnUnauthed: true });

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const j = await apiFetch<DashboardSummary>(apiList.dashboard.summary);
        setSummary(j);
      } catch (e) {
        // non-fatal for the page; just keep the placeholders
      } finally {
        setLoadingSummary(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const t = summary?.totals;
    return [
      {
        name: "Total Shows",
        value: t ? String(t.shows) : "—",
        icon: Film,
        change: t ? "" : "",
      },
      {
        name: "Active Events",
        value: t ? String(t.events) : "—",
        icon: Calendar,
        change: t?.upcomingEvents ? `${t.upcomingEvents} upcoming` : "",
      },
      {
        name: "Registrations",
        value: t ? String(t.registrations) : "—",
        icon: Users,
        change: "",
      },
      {
        name: "Revenue",
        value: t
          ? (t.revenue || 0).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            })
          : "—",
        icon: CreditCard,
        change: "",
      },
    ] as const;
  }, [summary]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-2 h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{me?.name ? `, ${me.name}` : ""}! Here's what's
            happening today.
          </p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {loadingSummary ? "…" : stat.value}
              </div>
              {stat.change ? (
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity & Quick Stats */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your CMS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(summary?.recent || []).map((activity, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.item}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
              {!summary?.recent?.length && (
                <div className="text-sm text-muted-foreground">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Content overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Total Episodes</span>
                </div>
                <span className="text-sm font-semibold">—</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Total Reels</span>
                </div>
                <span className="text-sm font-semibold">—</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Notable Events</span>
                </div>
                <span className="text-sm font-semibold">—</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Brands</span>
                </div>
                <span className="text-sm font-semibold">—</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
