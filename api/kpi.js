export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const NOTION_KEY = process.env.NOTION_API_KEY;
  if (!NOTION_KEY) return res.status(500).json({ error: "Missing NOTION_API_KEY" });

  const DB_ID = "30837e55cb6c804f8d4fe2ffb2aa54ee";

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return res.status(notionRes.status).json({
        error: "Notion API error",
        notion: data,
      });
    }

    let totalKøbesum = 0;
    let totalÅrligLejeindtægt = 0;
    let totalAntalLejemål = 0;

    for (const page of data.results ?? []) {
      totalKøbesum += page?.properties?.["Købesum"]?.number ?? 0;
      totalÅrligLejeindtægt += page?.properties?.["Årlig lejeindtægt"]?.number ?? 0;
      totalAntalLejemål += page?.properties?.["Antal lejemål"]?.number ?? 0;
    }

    return res.json({
      units: totalAntalLejemål,
      assets: totalKøbesum,
      rent: totalÅrligLejeindtægt,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: String(error?.message ?? error) });
  }
}
