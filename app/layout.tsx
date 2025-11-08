import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css"; // <-- add this
import ToastMount from "./ToastMount"; // <-- add this

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Admin Panel for Rafsan's Portfolio Website",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='en'>
      <body
        className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}
      >
        {children}
        <Analytics />
        <ToastMount /> {/* <-- mount container once at the root */}
      </body>
    </html>
  );
}
