// /api/kpi.js (Vercel Serverless Function)

const NOTION_VERSION = "2022-06-28";

// Data sources i dit Notion setup
const DS_EJENDOMME = "collection://30837e55-cb6c-80c0-99d3-000b3188ce62"; // Ejendomme
const DS_LEJEMAAL = "collection://d9983889-b876-4b83-85b1-8f0ab6931004";  // Lejemål

async function notionQueryAll({ apiKey, databaseId, body }) {
  const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  let results = [];
  let has_more = true;
  let start_cursor = undefined;

  while (has_more) {
    const payload = {
      page_size: 100,
      ...body,
      ...(start_cursor ? { start_cursor } : {}),
    };

    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const json = await r.json();
    if (!r.ok) {
      const err = new Error("Notion API error");
      err.status = r.status;
      err.notion = json;
      throw err;
    }

    results = results.concat(json.results || []);
    has_more = !!json.has_more;
    start_cursor = json.next_cursor || undefined;
  }

  return results;
}

function getNumberProp(page, propName) {
  return page?.properties?.[propName]?.number ?? 0;
}

export default async function handler(req, res) {
  try {
    const NOTION_API_KEY = process.env.NOTION_API_KEY;
    if (!NOTION_API_KEY) {
      return res.status(500).json({ error: "Missing NOTION_API_KEY" });
    }

    // 1) assets: sum(Købesum) fra Ejendomme
    const properties = await notionQueryAll({
      apiKey: NOTION_API_KEY,
      databaseId: DS_EJENDOMME,
      body: {}, // ingen filter
    });

    const assets = properties.reduce((sum, p) => sum + getNumberProp(p, "Købesum"), 0);

    // 2) aktive lejemål: Status = Aktiv
    const activeLeases = await notionQueryAll({
      apiKey: NOTION_API_KEY,
      databaseId: DS_LEJEMAAL,
      body: {
        filter: {
          property: "Status",
          select: { equals: "Aktiv" },
        },
      },
    });

    const units = activeLeases.length;

    const monthlyRent = activeLeases.reduce(
      (sum, p) => sum + getNumberProp(p, "Husleje (kr.)"),
      0
    );

    const rent = monthlyRent * 12;

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ units, assets, rent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message || "Server error",
      notion: err.notion,
      status: err.status,
    });
  }
}
