// Node 18+ has global fetch
async function verifyDashboardLinks() {
  const creatorId = "test_creator_dash_" + Date.now();

  console.log(`\n--- Getting token for ${creatorId} ---`);
  const tokenRes = await fetch(`http://localhost:4000/dev/token/${creatorId}`);
  const { token } = await tokenRes.json();

  // 1. Create 15 links (since old limit was 10)
  console.log(`\n--- Creating 15 links for ${creatorId} ---`);
  for (let i = 1; i <= 15; i++) {
    await fetch("http://localhost:4000/links/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ originalUrl: `https://plumgoodness.com/products/test-product-${i}` })
    });
  }

  // 2. Query GraphQL me { links }
  console.log(`\n--- Querying GraphQL for links ---`);
  const query = `
    query {
      me {
        name
        links(limit: 100) {
          shortCode
          createdAt
        }
      }
    }
  `;

  const gqlRes = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ query })
  });

  const data = await gqlRes.json();
  const links = data.data?.me?.links || [];
  console.log(`Retrieved ${links.length} links.`);

  if (links.length === 15) {
    console.log("✅ Success: Dashboard now shows all 15 links (exceeding old limit of 10).");
  } else {
    console.error(`❌ Error: Expected 15 links, got ${links.length}.`);
  }

  // 3. Verify sorting (newest first)
  if (links.length > 1) {
    const d1 = new Date(links[0].createdAt);
    const d2 = new Date(links[1].createdAt);
    if (d1 >= d2) {
      console.log("✅ Success: Newest link is at the top.");
    } else {
      console.error("❌ Error: Links are NOT sorted newest-first.");
    }
  }

  console.log("\n--- Verification Complete ---");
}

verifyDashboardLinks().catch(console.error);
