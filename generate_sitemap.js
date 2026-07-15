const fs = require('fs');

const SUPABASE_URL = 'https://uaujwluwfksbvtwolvsp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdWp3bHV3ZmtzYnZ0d29sdnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTU0ODMsImV4cCI6MjA5OTA5MTQ4M30.FezqZzBhe4u4QKTRi-TyFBwKnC9_GwH4dS9MztW3Z30';

async function generateSitemap() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,updated_at`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const products = await res.json();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.agsco.shop/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.agsco.shop/products.html</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.agsco.shop/services.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.agsco.shop/about.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.agsco.shop/contact.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.agsco.shop/rfq.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.agsco.shop/faq.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;

    // Add dynamic products
    products.forEach(p => {
      // Use updated_at if available, else current date
      const date = p.updated_at ? p.updated_at.split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `  <url>
    <loc>https://www.agsco.shop/product-details.html?id=${p.id}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    });

    xml += `</urlset>`;

    fs.writeFileSync('sitemap.xml', xml);
    console.log(`✅ Sitemap successfully generated with ${products.length} dynamic products!`);
    
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }
}

generateSitemap();
