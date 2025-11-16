"use client";

import type React from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Film,
  Calendar,
  Users,
  TrendingUp,
  Award,
  CreditCard,
  Menu,
  Settings as SettingsIcon,
  LogOut,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Shows", href: "/admin/shows", icon: Film },
  { name: "Events", href: "/admin/events", icon: Calendar },
  { name: "Registrations", href: "/admin/registrations", icon: Users },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Timeline", href: "/admin/timeline", icon: TrendingUp },
  { name: "Notable Events", href: "/admin/notable-events", icon: Award },
  { name: "Brands", href: "/admin/brands", icon: Award },
  { name: "Shots", href: "/admin/shots", icon: ImageIcon },
  { name: "Settings", href: "/admin/settings", icon: SettingsIcon },
  { name: "Newsletter", href: "/admin/newsletter", icon: Users },
];

function Sidebar({
  onLogout,
  currentPath,
}: {
  onLogout: () => void;
  currentPath: string;
}) {
  return (
    <div className='flex h-full flex-col gap-2'>
      <div className='flex h-14 items-center border-b px-4 lg:h-16 lg:px-6'>
        <Link href='/admin' className='flex items-center gap-2 font-semibold'>
          <LayoutDashboard className='h-6 w-6' />
          <span className='text-lg'>Admin CMS</span>
        </Link>
      </div>

      <nav className='flex-1 space-y-1 px-3 py-4'>
        {navigation.map((item) => {
          // ✅ Only mark Dashboard active on EXACT "/admin"
          const active =
            item.href === "/admin"
              ? currentPath === "/admin"
              : currentPath === item.href ||
                currentPath.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              ].join(" ")}
            >
              <item.icon className='h-4 w-4' />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className='border-t px-3 py-4'>
        <Button
          variant='outline'
          className='w-full justify-start bg-transparent'
          onClick={onLogout}
        >
          <LogOut className='mr-2 h-4 w-4' />
          Logout
        </Button>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // redirect unauthenticated users automatically
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthed: true });
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-screen'>
      {/* Desktop Sidebar */}
      <aside className='hidden w-64 border-r bg-background lg:block'>
        <Sidebar onLogout={logout} currentPath={pathname} />
      </aside>

      {/* Mobile Header + Drawer */}
      <div className='flex flex-1 flex-col'>
        <header className='flex h-14 items-center justify-between gap-4 border-b bg-background px-4 lg:hidden'>
          <div className='flex items-center gap-2'>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant='ghost' size='icon' aria-label='Open menu'>
                  <Menu className='h-5 w-5' />
                </Button>
              </SheetTrigger>
              <SheetContent side='left' className='w-64 p-0'>
                <Sidebar onLogout={logout} currentPath={pathname} />
              </SheetContent>
            </Sheet>
            <Link
              href='/admin'
              className='flex items-center gap-2 font-semibold'
            >
              <LayoutDashboard className='h-5 w-5' />
              <span>Admin CMS</span>
            </Link>
          </div>
          <Button
            variant='ghost'
            size='icon'
            onClick={logout}
            aria-label='Logout'
            title='Logout'
          >
            <LogOut className='h-5 w-5' />
          </Button>
        </header>

        {/* Main Content */}
        <main className='flex-1 overflow-auto bg-muted/10'>{children}</main>
      </div>
    </div>
  );
}
