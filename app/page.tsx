import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  const res = await fetch(`${protocol}://${host}/api/workspace`, {
    method: "POST",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to create workspace");
  }

  const { id } = await res.json();
  redirect(`/ws/${id}`);
}
