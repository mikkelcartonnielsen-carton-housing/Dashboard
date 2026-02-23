const fetch = require('node-fetch');

const notionToken = 'YOUR_NOTION_INTEGRATION_TOKEN';
const notionURL = 'https://api.notion.com/v1/databases';

// Function to fetch KPI data from Notion databases
async function fetchKPIData() {
    const properties = [];

    // Fetch Ejendomme data
    const ejendommeResponse = await fetch(`${notionURL}/Ejendomme`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28',
        },
    });
    const ejendommeData = await ejendommeResponse.json();
    properties.push(...ejendommeData.results);

    // Fetch Lejemål data
    const lejemalResponse = await fetch(`${notionURL}/Lejemål`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28',
        },
    });
    const lejemalData = await lejemalResponse.json();
    properties.push(...lejemalData.results);

    // Process the fetched data
    const unitCount = properties.length;
    const totalAssets = properties.reduce((sum, property) => sum + (property.properties.købesum.number || 0), 0);
    const annualRent = properties.reduce((sum, property) => sum + (property.properties.årlig_husleje.number || 0), 0);

    return { unitCount, totalAssets, annualRent };
}

// Export the serverless function
module.exports = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const kpiData = await fetchKPIData();
            res.status(200).json(kpiData);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching KPI data' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
