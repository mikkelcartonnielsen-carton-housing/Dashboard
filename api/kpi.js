export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const NOTION_KEY = process.env.NOTION_API_KEY;

  if (!NOTION_KEY) {
    return res.status(500).json({ error: "Missing NOTION_API_KEY" });
  }

  try {
    if (req.method === "GET") {
      const DB_ID = "30837e55cb6c804f8d4fe2ffb2aa54ee";

      const res_notion = await fetch(
        `https://api.notion.com/v1/databases/${DB_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_KEY}`,
            "Notion-Version": "2022-06-28",
          },
        }
      );

      const data = await res_notion.json();
      
      let totalKøbesum = 0;
      let totalÅrligLejeindtægt = 0;
      let totalAntalLejemål = 0;

      if (data.results && data.results.length > 0) {
        data.results.forEach((page) => {
          totalKøbesum += page.properties["Købesum"]?.number || 0;
          totalÅrligLejeindtægt += page.properties["Årlig lejeindtægt"]?.number || 0;
          totalAntalLejemål += page.properties["Antal lejemål"]?.number || 0;
        });
      }

      return res.json({
        units: totalAntalLejemål,
        assets: totalKøbesum,
        rent: totalÅrligLejeindtægt,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
