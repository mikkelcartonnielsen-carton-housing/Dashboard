async function fetchNotionData() {
    const headers = {
        "Authorization": `Bearer YOUR_NOTION_INTEGRATION_TOKEN`,
        "Content-Type": "application/json",
    };

    // Query Ejendomme database to sum Købesum
    const ejendommeResponse = await fetch(`https://api.notion.com/v1/databases/30837e55cb6c804f8d4fe2ffb2aa54ee/query`, {
        method: 'POST',
        headers: {
            ...headers,
            "Notion-Version": "2021-05-13"
        },
    });
    const ejendommeData = await ejendommeResponse.json();
    const totalKobesum = ejendommeData.results.reduce((sum, row) => {
        return sum + (row.properties["Købesum"].number || 0);
    }, 0);

    // Query Lejemål database to count units and sum Årlig lejeindtægt
    const lejemalResponse = await fetch(`https://api.notion.com/v1/databases/35a0fc12a7ee4119aabc491d90d73de5/query`, {
        method: 'POST',
        headers: {
            ...headers,
            "Notion-Version": "2021-05-13"
        },
    });
    const lejemalData = await lejemalResponse.json();
    const units = lejemalData.results.length;
    const totalRent = lejemalData.results.reduce((sum, row) => {
        return sum + (row.properties["Årlig lejeindtægt"].number || 0);
    }, 0);

    return {
        units,
        assets: totalKobesum,
        rent: totalRent,
    };
}

// Example usage
fetchNotionData().then(console.log);
