import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuAdmin } from "@/components/admin/menu-admin";

export const metadata = { title: "Admin" };

/** La console di admin: la vede solo chi è amministratore (per gli altri la pagina non esiste). */
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("e_admin");
  if (!admin) notFound();
  return (
    <div className="flex min-h-dvh flex-col bg-superficie-2 lg:flex-row">
      <MenuAdmin />
      <main className="min-w-0 flex-1 px-5 py-6 md:px-8 lg:py-8">{children}</main>
    </div>
  );
}
