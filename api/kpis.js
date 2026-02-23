export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DB_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_KEY || !DB_ID) {
    return res.status(500).json({ error: "Missing env vars" });
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

      if (!response.ok) {
        return res.status(response.status).json({ error: "Notion API error" });
      }

      const data = await response.json();
      const page = data.results?.[0];

      if (!page) {
        return res.json({ units: 0, assets: 0, rent: 0 });
      }

      return res.json({
        units: page.properties["Antal lejemål"]?.number || 0,
        assets: page.properties["Samlet aktiver"]?.number || 0,
        rent: page.properties["Årlig husleje"]?.number || 0,
      });
    }

    if (req.method === "POST") {
      const { units, assets, rent } = req.body;

      const queryRes = await fetch(
        `https://api.notion.com/v1/databases/${DB_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_KEY}`,
            "Notion-Version": "2022-06-28",
          },
        }
      );

      const queryData = await queryRes.json();
      const page = queryData.results?.[0];

      if (page) {
        await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
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
      } else {
        await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parent: { database_id: DB_ID },
            properties: {
              "Antal lejemål": { number: units },
              "Samlet aktiver": { number: assets },
              "Årlig husleje": { number: rent },
            },
          }),
        });
      }

      return res.json({ units, assets, rent, success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
