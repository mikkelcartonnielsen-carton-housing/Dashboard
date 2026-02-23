// Import necessary libraries
const { Client } = require('@notionhq/client');

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function queryNotionData() {
    try {
        // Query Købesum from the first Notion database
        const købesumResponse = await notion.databases.query({
            database_id: '30837e55cb6c804f8d4fe2ffb2aa54ee',
            filter: { 
                property: 'Købesum',
                number: { 
                    is_not_empty: true
                } 
            }
        });
        const købesum = købesumResponse.results.map(result => result.properties['Købesum'].number);

        // Query Antal lejemål and Årlig lejeidtægt from the second Notion database
        const lejemålResponse = await notion.databases.query({
            database_id: '35a0fc12a7ee4119aabc491d90d73de5',
            filter: { 
                property: 'Antal lejemål',
                number: { 
                    is_not_empty: true
                }
            }
        });
        const antalLejemål = lejemålResponse.results.map(result => result.properties['Antal lejemål'].number);
        const årligLejeindtægt = lejemålResponse.results.map(result => result.properties['Årlig lejeidtægt'].number);

        return { købesum, antalLejemål, årligLejeindtægt };
    } catch (error) {
        console.error('Error querying Notion:', error);
    }
}

module.exports = queryNotionData;