// Supabase Edge Function: admin-users
// Deploy with: supabase functions deploy admin-users
// Required function secret: SUPABASE_SERVICE_ROLE_KEY (never expose in frontend).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autenticado" }, 401);

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) return json({ error: "Sesión inválida" }, 401);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await admin
      .from("profiles").select("role").eq("id", callerData.user.id).single();
    if (profileError || profile?.role !== "admin") return json({ error: "Solo JuanChef puede administrar usuarios" }, 403);

    const body = await req.json();
    const action = String(body.action || "");
    if (action === "create") {
      const username = String(body.username || "").trim().toLowerCase();
      const displayName = String(body.display_name || "").trim();
      const password = String(body.password || "");
      const role = String(body.role || "");
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) return json({ error: "Usuario inválido (3-32 caracteres: letras, números, punto, guion)" }, 400);
      if (password.length < 10) return json({ error: "La contraseña debe tener al menos 10 caracteres" }, 400);
      if (!["admin", "toquijefa", "toquijefe", "tachu"].includes(role)) return json({ error: "Rol inválido" }, 400);
      const email = username + "@toquin.app";
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { username, display_name: displayName || username },
      });
      if (error || !data.user) return json({ error: error?.message || "No se pudo crear el usuario" }, 400);
      const { error: updateError } = await admin.from("profiles")
        .update({ username, display_name: displayName || username, role }).eq("id", data.user.id);
      if (updateError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json({ error: updateError.message }, 400);
      }
      return json({ ok: true, username, role, user_id: data.user.id });
    }

    if (action === "reset") {
      const userId = String(body.user_id || "");
      const password = String(body.password || "");
      if (!userId) return json({ error: "Falta user_id" }, 400);
      if (password.length < 10) return json({ error: "La contraseña debe tener al menos 10 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, message: "Contraseña restablecida. Entrégala al usuario por un canal privado." });
    }

    if (action === "delete") {
      const userId = String(body.user_id || "");
      if (!userId || userId === callerData.user.id) return json({ error: "No puedes eliminar tu propia cuenta" }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Acción no soportada" }, 400);
  } catch (err) {
    console.error("admin-users error", err);
    return json({ error: "Error interno" }, 500);
  }
});
