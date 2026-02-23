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
      const EJENDOMME_DB = "30837e55cb6c804f8d4fe2ffb2aa54ee";
      const LEJEMÅL_DB = "35a0fc12a7ee4119aabc491d90d73de5";

      // Fetch Ejendomme
      const ejendommeRes = await fetch(
        `https://api.notion.com/v1/databases/${EJENDOMME_DB}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_KEY}`,
            "Notion-Version": "2022-06-28",
          },
        }
      );

      const ejendommeData = await ejendommeRes.json();
      let totalAssets = 0;

      if (ejendommeData.results) {
        ejendommeData.results.forEach((page) => {
          const købesum = page.properties["Købesum"]?.number || 0;
          totalAssets += købesum;
        });
      }

      // Fetch Lejemål
      const lejemålRes = await fetch(
        `https://api.notion.com/v1/databases/${LEJEMÅL_DB}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_KEY}`,
            "Notion-Version": "2022-06-28",
          },
        }
      );

      const lejemålData = await lejemålRes.json();
      let units = 0;
      let totalRent = 0;

      if (lejemålData.results) {
        units = lejemålData.results.length;
        lejemålData.results.forEach((page) => {
          const rent = page.properties["Årlig lejeidtægt"]?.number || 0;
          totalRent += rent;
        });
      }

      return res.json({
        units,
        assets: totalAssets,
        rent: totalRent,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
