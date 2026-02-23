const NOTION_VERSION = "2022-06-28";
const NOTION_API_URL = "https://api.notion.com/v1/databases";
const ACTIVE_STATUS_FILTER = {
  property: "Status",
  select: { equals: "Aktiv" },
};

function getNumberProp(page, propName) {
  const prop = page?.properties?.[propName];
  return prop?.type === "number" && typeof prop.number === "number" ? prop.number : 0;
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS (så din statiske index.html kan kalde endpointet)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const EJENDOMME_DB_ID = process.env.EJENDOMME_DB_ID;
    const LEJEMAAL_DB_ID = process.env.LEJEMAAL_DB_ID;

    if (!NOTION_TOKEN) throw new Error("Missing env var: NOTION_TOKEN");
    if (!EJENDOMME_DB_ID) throw new Error("Missing env var: EJENDOMME_DB_ID");
    if (!LEJEMAAL_DB_ID) throw new Error("Missing env var: LEJEMAAL_DB_ID");

    if (typeof fetch !== "function") {
      throw new Error("fetch is not available in this runtime");
    }

    async function notionQueryAll(databaseId, filter) {
      const results = [];
      let startCursor;

      while (true) {
        const body = {
          page_size: 100,
          ...(filter ? { filter } : {}),
          ...(startCursor ? { start_cursor: startCursor } : {}),
        };

        const response = await fetch(`${NOTION_API_URL}/${databaseId}/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const data = await safeParseJson(response);

        if (!response.ok) {
          throw new Error(data?.message || `Notion API error (${response.status})`);
        }

        if (!Array.isArray(data?.results)) {
          throw new Error("Invalid Notion response format: expected results array");
        }

        results.push(...data.results);

        if (!data.has_more) break;
        startCursor = data.next_cursor;
      }

      return results;
    }

    // 1) Ejendomme: sum Antal lejemål + sum Købesum
    const [ejendommePages, lejemalPages] = await Promise.all([
      notionQueryAll(EJENDOMME_DB_ID),
      notionQueryAll(LEJEMAAL_DB_ID, ACTIVE_STATUS_FILTER),
    ]);

    const { units, assets } = ejendommePages.reduce(
      (acc, page) => {
        acc.units += getNumberProp(page, "Antal lejemål");
        acc.assets += getNumberProp(page, "Købesum");
        return acc;
      },
      { units: 0, assets: 0 }
    );

    const rent = lejemalPages.reduce((acc, page) => {
      const husleje = getNumberProp(page, "Husleje (kr.)");
      return acc + husleje * 12;
    }, 0);

    // Cache lidt for at skåne Notion API (valgfrit)
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json({ units, assets, rent });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
