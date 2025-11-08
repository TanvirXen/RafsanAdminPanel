// app/your-route/page.tsx
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin"); // instant, no flash
}
