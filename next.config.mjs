/** @type {import('next').NextConfig} */

// Try to infer the API host (protocol/hostname/port) from NEXT_PUBLIC_API_BASE
// Example: NEXT_PUBLIC_API_BASE="https://api.example.com/api"
const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
let prodPatterns = [];
try {
  const u = new URL(apiBase); // may throw if empty/invalid
  // Allow uploads from that same host
  const basePattern = {
    protocol: u.protocol.replace(":", ""), // "https" | "http"
    hostname: u.hostname,                  // "api.example.com"
    port: u.port || undefined,             // "" -> undefined
    pathname: "/uploads/**",
  };
  prodPatterns = [basePattern];

  // If you sometimes serve over the other protocol in different envs, add both:
  if (basePattern.protocol === "https") {
    prodPatterns.push({ ...basePattern, protocol: "http" });
  } else {
    prodPatterns.push({ ...basePattern, protocol: "https" });
  }
} catch {
  // no NEXT_PUBLIC_API_BASE set or invalid -> skip dynamic prod patterns
}

const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true,
    remotePatterns: [
      // local dev API
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
      // dynamically inferred production host(s)
      ...prodPatterns,
      // If you want to hardcode an extra host, add here:
      // { protocol: "https", hostname: "api.yourdomain.com", pathname: "/uploads/**" },
    ],
    // If you preview SVG uploads with <Image>, uncomment:
    // dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
