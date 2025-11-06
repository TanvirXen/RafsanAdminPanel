"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type SafeUser = {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "editor";
};

const stats = [
  { name: "Total Shows", value: "24", icon: Film, change: "+3 this month" },
  { name: "Active Events", value: "12", icon: Calendar, change: "5 upcoming" },
  {
    name: "Registrations",
    value: "1,429",
    icon: Users,
    change: "+12% from last month",
  },
  {
    name: "Revenue",
    value: "$45,231",
    icon: CreditCard,
    change: "+8% from last month",
  },
] as const;

const recentActivity = [
  {
    action: "New show added",
    item: "Breaking Boundaries",
    time: "2 hours ago",
    type: "show",
  },
  {
    action: "Event published",
    item: "Summer Festival 2025",
    time: "5 hours ago",
    type: "event",
  },
  {
    action: "Registration received",
    item: "Tech Conference",
    time: "1 day ago",
    type: "registration",
  },
  {
    action: "Payment processed",
    item: "$299.00",
    time: "1 day ago",
    type: "payment",
  },
] as const;

export default function AdminDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Require auth (cookie-based)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(apiList.auth.me, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("unauthorized");
        const data = await res.json();
        if (alive) setMe(data.user as SafeUser);
      } catch {
        router.replace("/login");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(apiList.auth.logout, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("adminUser");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className='p-8'>
        <div className='mb-2 h-6 w-40 animate-pulse rounded bg-muted' />
        <div className='h-4 w-64 animate-pulse rounded bg-muted' />
        <div className='mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-28 rounded-lg bg-muted animate-pulse' />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-semibold tracking-tight'>Dashboard</h1>
          <p className='text-muted-foreground'>
            Welcome back{me?.name ? `, ${me.name}` : ""}! Here's what's
            happening today.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className='inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted'
          title='Logout'
        >
          <LogOut className='h-4 w-4' />
          Logout
        </button>
      </div>

      {/* Stats Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>{stat.name}</CardTitle>
              <stat.icon className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{stat.value}</div>
              <p className='text-xs text-muted-foreground'>{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity & Quick Stats */}
      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your CMS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {recentActivity.map((activity, index) => (
                <div key={index} className='flex items-start gap-4'>
                  <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-muted'>
                    <Activity className='h-4 w-4' />
                  </div>
                  <div className='flex-1 space-y-1'>
                    <p className='text-sm font-medium leading-none'>
                      {activity.action}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {activity.item}
                    </p>
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Content overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Film className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>Total Episodes</span>
                </div>
                <span className='text-sm font-semibold'>156</span>
              </div>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <TrendingUp className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>Total Reels</span>
                </div>
                <span className='text-sm font-semibold'>89</span>
              </div>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Award className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>Notable Events</span>
                </div>
                <span className='text-sm font-semibold'>34</span>
              </div>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Database className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>Brands</span>
                </div>
                <span className='text-sm font-semibold'>18</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
