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

    const NOTION_VERSION = "2022-06-28";

    async function notionQueryAll(databaseId, filter) {
      let results = [];
      let start_cursor = undefined;

      while (true) {
        const r = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page_size: 100,
            start_cursor,
            ...(filter ? { filter } : {}),
          }),
        });

        const data = await r.json();
        if (!r.ok) {
          throw new Error(data?.message || `Notion API error (${r.status})`);
        }

        results = results.concat(data.results);

        if (!data.has_more) break;
        start_cursor = data.next_cursor;
      }

      return results;
    }

    function getNumberProp(page, propName) {
      const prop = page?.properties?.[propName];
      return prop?.type === "number" && typeof prop.number === "number" ? prop.number : 0;
    }

    // 1) Ejendomme: sum Antal lejemål + sum Købesum
    const ejendommePages = await notionQueryAll(EJENDOMME_DB_ID);

    const units = ejendommePages.reduce(
      (acc, p) => acc + getNumberProp(p, "Antal lejemål"),
      0
    );

    const assets = ejendommePages.reduce(
      (acc, p) => acc + getNumberProp(p, "Købesum"),
      0
    );

    // 2) Lejemål: rent = sum(Husleje (kr.) * 12) for Status = Aktiv
    const lejemalPages = await notionQueryAll(LEJEMAAL_DB_ID, {
      property: "Status",
      select: { equals: "Aktiv" },
    });

    const rent = lejemalPages.reduce((acc, p) => {
      const husleje = getNumberProp(p, "Husleje (kr.)");
      return acc + husleje * 12;
    }, 0);

    // Cache lidt for at skåne Notion API (valgfrit)
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json({ units, assets, rent });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
