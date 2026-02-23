export default async function handler(req, res) {
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const response = await fetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      const results = data.results || [];

      if (results.length === 0) {
        return res.status(200).json({
          units: 0,
          assets: 0,
          rent: 0,
        });
      }

      const page = results[0];
      const props = page.properties;

      return res.status(200).json({
        units: props["Antal lejemål"]?.number || 0,
        assets: props["Samlet aktiver"]?.number || 0,
        rent: props["Årlig husleje"]?.number || 0,
      });
    } catch (error) {
      console.error("GET error:", error);
      return res.status(500).json({ error: "Fejl ved læsning fra Notion" });
    }
  }

  if (req.method === "POST") {
    try {
      const { units, assets, rent } = req.body;

      const response = await fetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      const results = data.results || [];

      if (results.length === 0) {
        await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parent: { database_id: DATABASE_ID },
            properties: {
              "Antal lejemål": { number: units },
              "Samlet aktiver": { number: assets },
              "Årlig husleje": { number: rent },
            },
          }),
        });
      } else {
        const pageId = results[0].id;
        await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
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

      return res.status(200).json({
        units,
        assets,
        rent,
        message: "Gemt i Notion!",
      });
    } catch (error) {
      console.error("POST error:", error);
      return res.status(500).json({ error: "Fejl ved gemning til Notion" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
