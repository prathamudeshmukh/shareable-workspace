import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getEnv } from "@/lib/get-env";
import { createWorkspace } from "@/lib/db";

export default async function Home() {
  const env = await getEnv();
  const id = uuidv4();
  await createWorkspace(env.DB, id);
  redirect(`/ws/${id}`);
}
