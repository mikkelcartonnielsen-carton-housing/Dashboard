export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DB_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_KEY || !DB_ID) {
    return res.status(500).json({ error: "Missing env" });
  }

  try {
    if (req.method === "GET") {
      const response = await fetch(
        `https://api.notion.com/v1/databases/${DB_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_KEY}`,
            "Notion-Version": "2022-06-28",
          },
        }
      );

      const data = await response.json();
      const page = data.results?.[0];

      if (!page) {
        return res.json({ units: 0, assets: 0, rent: 0 });
      }

      const props = page.properties;
      return res.json({
        units: props["Antal lejemål"]?.number || 0,
        assets: props["Samlet aktiver"]?.number || 0,
        rent: props["Årlig husleje"]?.number || 0,
      });
    }

    if (req.method === "POST") {
      const { units, assets, rent } = req.body;

      const qRes = await fetch(
        `https://api.notion.com/v1/databases/${DB_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_KEY}`,
            "Notion-Version": "2022-06-28",
          },
        }
      );

      const qData = await qRes.json();
      const page = qData.results?.[0];
      const pageId = page?.id;

      if (pageId) {
        await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${NOTION_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              "Antal lejemål": { number: units },
              "Samlet aktiver": { number: assets },
              "Årlig husleje": { number: rent },
            },
          }),
        });
      }

      return res.json({ units, assets, rent });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}