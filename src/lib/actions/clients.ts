// src/lib/actions/clients.ts

"use server";

import { db, clients, filingPeriods } from "@/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { NewClient } from "@/db/schema";
import { validateGSTIN } from "@/lib/validators";

export async function createClient(formData: FormData) {
  const raw = {
    name:             formData.get("name") as string,
    gstin:            (formData.get("gstin") as string).toUpperCase().trim(),
    tradeName:        (formData.get("tradeName") as string) || null,
    email:            (formData.get("email") as string) || null,
    whatsappNumber:   (formData.get("whatsappNumber") as string) || null,
    phone:            (formData.get("phone") as string) || null,
    address:          (formData.get("address") as string) || null,
    registrationType: (formData.get("registrationType") as string) || "regular",
    notes:            (formData.get("notes") as string) || null,
    stateCode:        null as string | null,
  };

  if (!raw.name || !raw.gstin) return { error: "Name and GSTIN are required" };
  if (!validateGSTIN(raw.gstin)) return { error: "Invalid GSTIN format" };

  raw.stateCode = raw.gstin.substring(0, 2);

  try {
    const [client] = await db.insert(clients).values(raw as NewClient).returning();
    revalidatePath("/clients");
    redirect(`/clients/${client.id}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "NEXT_REDIRECT") throw err;
    if (msg.includes("unique") && msg.includes("gstin"))
      return { error: "A client with this GSTIN already exists" };
    return { error: "Failed to create client. Please try again." };
  }
}

export async function getAllClients() {
  return db.query.clients.findMany({
    where: eq(clients.isActive, true),
    orderBy: [desc(clients.createdAt)],
    with: {
      filingPeriods: {
        orderBy: [desc(filingPeriods.year), desc(filingPeriods.month)],
        limit: 1,
      },
    },
  });
}

export async function getClientById(id: string) {
  return db.query.clients.findFirst({
    where: eq(clients.id, id),
    with: {
      filingPeriods: {
        orderBy: [desc(filingPeriods.year), desc(filingPeriods.month)],
      },
    },
  });
}

export async function createFilingPeriod(clientId: string, month: number, year: number) {
  const [period] = await db
    .insert(filingPeriods)
    .values({ clientId, month, year })
    .returning();
  revalidatePath(`/clients/${clientId}`);
  return period;
}

export async function updateClient(id: string, data: Partial<NewClient>) {
  await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id));
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
}