// Node 18+ has global fetch
async function verify() {
  const creatorId = "test_creator_prod_" + Date.now();
  
  // 1. Myntra Product (Admitad)
  const myntraUrl = "https://www.myntra.com/shoes/nike/nike-men-black-air-zoom-pegasus-38-running-shoes/13840134/buy";
  
  // 2. Plum product (Cuelinks)
  const plumUrl = "https://plumgoodness.com/products/green-tea-pore-cleansing-face-wash";

  console.log(`\n--- Getting token for ${creatorId} ---`);
  const tokenRes = await fetch(`http://localhost:4000/dev/token/${creatorId}`);
  const { token } = await tokenRes.json();

  const testCases = [
    { name: "Myntra First", url: myntraUrl },
    { name: "Myntra Duplicate (with slash)", url: myntraUrl + "/" },
    { name: "Plum First", url: plumUrl },
    { name: "Plum Duplicate (with tracking)", url: plumUrl + "?utm_campaign=test" },
  ];

  const results = {};

  for (const tc of testCases) {
    console.log(`\n--- ${tc.name}: ${tc.url} ---`);
    const res = await fetch("http://localhost:4000/links/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ originalUrl: tc.url })
    });
    const data = await res.json();
    console.log(`Response: Code=${data.shortCode}, Platform=${data.platform}, Msg=${data.message}`);
    
    if (tc.name.includes("First")) {
      results[tc.name.split(" ")[0]] = data.shortCode;
    } else {
      const baseName = tc.name.split(" ")[0];
      if (data.shortCode === results[baseName]) {
        console.log(`✅ Success: ${baseName} de-duplication worked.`);
      } else {
        console.error(`❌ Error: ${baseName} de-duplication FAILED.`);
      }
    }
  }

  console.log("\n--- Verification Complete ---");
}

verify().catch(console.error);
