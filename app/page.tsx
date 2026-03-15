import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { getEnv } from "@/lib/get-env";
import { createWorkspace } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const env = await getEnv();
  const id = nanoid();
  await createWorkspace(env.DB, id);
  redirect(`/ws/${id}`);
}
