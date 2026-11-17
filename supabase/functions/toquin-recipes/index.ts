// Supabase Edge Function deployed in the JUAN BELTRAN project.
// Configure this function with JWT verification disabled; it validates the TOQUIN token itself.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOQUIN_URL = "https://ldlmdpojrsedhtcnnxbu.supabase.co";
const TOQUIN_KEY = "sb_publishable_MLuke0Zhzx1NJ7a4CgvwGA_sS1X7rxU";
const JB_OWNER_ID = "666dc926-8f38-4d13-b76f-88a1e7f0791d";
const JB_DOC_KEY = "r_toquin";
const ALLOWED_ORIGINS = new Set(["https://jsbv05-ops.github.io"]);

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://jsbv05-ops.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: corsHeaders(origin) });
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "Origin no autorizado" }, 403, origin);
  }
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405, origin);

  try {
    const authorization = req.headers.get("authorization") || "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: "Falta el token de TOQUIN" }, 401, origin);

    // Authenticate against the TOQUIN Supabase project; never trust caller-supplied user IDs/roles.
    const authResponse = await fetch(TOQUIN_URL + "/auth/v1/user", {
      headers: { apikey: TOQUIN_KEY, Authorization: "Bearer " + token },
    });
    if (!authResponse.ok) return json({ error: "Sesión de TOQUIN inválida o vencida" }, 401, origin);
    const toquinUser = await authResponse.json();
    const profileUrl = new URL(TOQUIN_URL + "/rest/v1/profiles");
    profileUrl.searchParams.set("id", "eq." + toquinUser.id);
    profileUrl.searchParams.set("select", "role");
    const profileResponse = await fetch(profileUrl, {
      headers: { apikey: TOQUIN_KEY, Authorization: "Bearer " + token },
    });
    if (!profileResponse.ok) return json({ error: "No se pudo validar el perfil de TOQUIN" }, 403, origin);
    const profiles = await profileResponse.json();
    const role = profiles?.[0]?.role;
    if (!["toquijefa", "admin"].includes(role)) {
      return json({ error: "No tienes permiso para acceder a Recetas" }, 403, origin);
    }

    const jbUrl = Deno.env.get("SUPABASE_URL") || "https://sopvoedhxwuwbmvkysua.supabase.co";
    const jbServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!jbUrl || !jbServiceKey) {
      console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el proyecto Juan Beltran");
      return json({ error: "La función no está configurada en el proyecto de recetas" }, 500, origin);
    }
    const jb = createClient(jbUrl, jbServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400, origin); }
    const action = body?.action;

    if (action === "get") {
      // Return only the recipe payload fields requested by TOQUIN.
      const { data: row, error } = await jb.from("docs")
        .select("data")
        .eq("user_id", JB_OWNER_ID)
        .eq("k", JB_DOC_KEY)
        .maybeSingle();
      if (error) throw error;
      if (!row?.data) return json({ error: "No existe el documento r_toquin" }, 404, origin);
      const source = row.data as Record<string, unknown>;
      return json({
        recipes: Array.isArray(source.recipes) ? source.recipes : [],
        ingredients: Array.isArray(source.ingredients) ? source.ingredients : [],
        categories: Array.isArray(source.categories) ? source.categories : [],
        settings: source.settings && typeof source.settings === "object" ? source.settings : {},
      }, 200, origin);
    }

    if (action === "set_qty") {
      // Reject extra properties so only a quantity edit can be requested.
      const allowed = new Set(["action", "recipe_id", "ing_id", "qty"]);
      if (Object.keys(body).some(k => !allowed.has(k))) {
        return json({ error: "La solicitud contiene campos no permitidos" }, 400, origin);
      }
      const recipeId = typeof body.recipe_id === "string" ? body.recipe_id.trim() : "";
      const ingId = typeof body.ing_id === "string" ? body.ing_id.trim() : "";
      const qty = body.qty;
      if (!recipeId || !ingId || !isFiniteNonNegative(qty)) {
        return json({ error: "recipe_id, ing_id y qty numérica >= 0 son obligatorios" }, 400, origin);
      }

      // Serialize updates on this single document to avoid overwriting concurrent edits.
      const { data: row, error: readError } = await jb.from("docs")
        .select("data")
        .eq("user_id", JB_OWNER_ID)
        .eq("k", JB_DOC_KEY)
        .maybeSingle();
      if (readError) throw readError;
      if (!row?.data) return json({ error: "No existe el documento r_toquin" }, 404, origin);
      const doc = structuredClone(row.data) as Record<string, unknown>;
      const recipes = Array.isArray(doc.recipes) ? doc.recipes as Record<string, unknown>[] : [];
      const recipe = recipes.find(r => r?.id === recipeId);
      if (!recipe) return json({ error: "Receta no encontrada" }, 404, origin);
      if (!Array.isArray(recipe.items)) return json({ error: "La receta no tiene ingredientes válidos" }, 409, origin);
      const item = (recipe.items as Record<string, unknown>[]).find(i => i?.ing === ingId);
      if (!item) return json({ error: "Ingrediente no encontrado en la receta" }, 404, origin);

      // This is the only property modified anywhere in the document.
      item.qty = qty;
      const { error: updateError } = await jb.from("docs")
        .update({ data: doc, updated_at: new Date().toISOString() })
        .eq("user_id", JB_OWNER_ID)
        .eq("k", JB_DOC_KEY);
      if (updateError) throw updateError;
      return json({ ok: true, recipe_id: recipeId, ing_id: ingId, qty }, 200, origin);
    }

    return json({ error: "Acción no válida" }, 400, origin);
  } catch (error) {
    console.error("toquin-recipes error:", error);
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500, origin);
  }
});
