require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), override: true });
const admitadService = require('../src/services/affiliate/admitad.service');
const cuelinksService = require('../src/services/affiliate/cuelinks.service');
const fs = require('fs');
const path = require('path');

async function discover() {
  try {
    console.log('Fetching ALL campaigns from Admitad API (this may take a few seconds)...');
    const admitadCampaigns = await admitadService.getCampaigns(false); // false = don't filter by active only
    console.log(`Found ${admitadCampaigns.length} total campaigns in Admitad catalog for your website.`);

    console.log('Fetching ALL campaigns from Cuelinks API (this may take a few seconds)...');
    const cuelinksCampaigns = await cuelinksService.getCampaigns();
    console.log(`Found ${cuelinksCampaigns.length} total campaigns in Cuelinks catalog.`);

    const admitadMapped = admitadCampaigns.map(item => {
      // Logic for commission rate formatting
      let commissionRate = "N/A";
      if (item.actions && item.actions.length > 0) {
        const rates = item.actions
          .filter(a => a.payment_size !== null && a.payment_size !== undefined)
          .map(a => {
            const type = a.payment_type === 'percentage' ? '%' : (a.currency || 'RUB');
            return {
              size: parseFloat(a.payment_size),
              type: type
            };
          });

        const validRates = rates.filter(r => !isNaN(r.size));
        const types = [...new Set(validRates.map(r => r.type))];
        
        const formattedRates = types.map(t => {
          const tRates = validRates.filter(r => r.type === t).map(r => r.size);
          const min = Math.min(...tRates);
          const max = Math.max(...tRates);
          
          if (min === max) {
            return `${min.toFixed(2)}${t}`;
          } else {
            return `${min.toFixed(2)}-${max.toFixed(2)}${t}`;
          }
        });

        if (formattedRates.length > 0) {
          commissionRate = formattedRates.join(', ');
        }
      }

      return {
        network: "admitad",
        id: item.id,
        storeName: item.name || "",
        logo: item.image || "",
        storeUrl: item.site_url || "",
        category: item.categories && item.categories[0] ? item.categories[0].name : "N/A",
        commissionRate: commissionRate,
        isConnectedToWebsite: item.connection_status === "active" ? "Yes" : "No"
      };
    });

    const cuelinksMapped = cuelinksCampaigns.map(item => {
      // commission rate formatting for Cuelinks
      let rate = "N/A";
      if (item.payout_categories && item.payout_categories.length > 0) {
         rate = item.payout_categories.map(c => `${c.payout}${c.payout_type === 'Percentage' ? '%' : ''}`).join(', ');
      } else if (item.payout) {
         rate = `${item.payout}${item.payout_type === 'Percentage' ? '%' : ''}`;
      }

      return {
        network: "cuelinks",
        id: item.id,
        storeName: item.name || "",
        logo: item.image || "", 
        storeUrl: item.url || item.domain || "",
        category: item.categories && item.categories[0] ? item.categories[0].name : "N/A",
        commissionRate: rate,
        isConnectedToWebsite: "Yes" 
      };
    });

    const allMappedData = [...admitadMapped, ...cuelinksMapped];

    const finalOutput = {
      success: true,
      totalAdmitad: admitadMapped.length,
      totalCuelinks: cuelinksMapped.length,
      data: allMappedData
    };

    const outputPath = path.join(__dirname, 'campaigns_output.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
    
    console.log('\nSuccess!');
    console.log(`Mapped ${allMappedData.length} brands in total.`);
    console.log(`Full data saved to: ${outputPath}`);
    
    // Print first 5 as a preview
    console.log('\nPreview (First 5 Admitad):');
    console.log(JSON.stringify(admitadMapped.slice(0, 5), null, 2));

    console.log('\nPreview (First 5 Cuelinks):');
    console.log(JSON.stringify(cuelinksMapped.slice(0, 5), null, 2));

  } catch (err) {
    console.error('Discovery failed:', err.message);
    process.exit(1);
  }
}

discover();
