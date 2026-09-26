import { getStore } from "@netlify/blobs";

const STORE = "papers-that-captures-dreams";
const KEY = "stock-status";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "";
const DEFAULTS = {
  "Blush Bloom": true,
  "Dear Future Me": true,
  "Study Darling": true,
  "Rose Notes": true,
  "Custom Notebook": true,
  "Lavender Butterfly Dreams": true
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

async function getStock() {
  const store = getStore(STORE);
  const saved = await store.get(KEY, { type: "json", consistency: "strong" });
  if (!saved || typeof saved !== "object") return { ...DEFAULTS };
  return { ...DEFAULTS, ...saved };
}

export default async (req) => {
  try {
    const method = req.method.toUpperCase();

    if (method === "GET") {
      return json({ ok: true, stock: await getStock() });
    }

    if (method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => ({}));
    if (body.password !== OWNER_PASSWORD) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const store = getStore(STORE);
    let stock = await getStock();

    if (body.action === "set" && typeof body.product === "string" && typeof body.available === "boolean") {
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS, body.product)) {
        return json({ ok: false, error: "Unknown product" }, 400);
      }
      stock[body.product] = body.available;
      await store.setJSON(KEY, stock);
      return json({ ok: true, stock });
    }

    if (body.action === "reset") {
      stock = { ...DEFAULTS };
      await store.setJSON(KEY, stock);
      return json({ ok: true, stock });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Stock service error" }, 500);
  }
};
