const fs = require('fs');
const path = require('path');
const SUPABASE_URL = 'https://uaujwluwfksbvtwolvsp.supabase.co';
const configText = fs.readFileSync(path.resolve('js/supabase-config.js'), 'utf8');
const SUPABASE_ANON_KEY = configText.match(/const SUPABASE_ANON_KEY = '([^']+)'/)?.[1];
if (!SUPABASE_ANON_KEY) throw new Error('Supabase key not found in js/supabase-config.js');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const plain = (v) => String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc&limit=1000`, {headers: {apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`} });
  if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
  const products = await res.json();
  const base = path.resolve('product');
  fs.mkdirSync(base, {recursive:true});
  for (const p of products) {
    const id = String(p.id);
    const title = plain(p.title) || 'منتج AGS';
    const description = (plain(p.description) || `تفاصيل ومواصفات ${title} من شركة الدقة للسلامة العامة AGS Technology.`).slice(0, 160);
    const image = Array.isArray(p.images) && p.images[0] ? p.images[0] : 'https://www.agsco.shop/logo.png?v=5';
    const url = `https://www.agsco.shop/product/${encodeURIComponent(id)}/`;
    const schema = {'@context':'https://schema.org','@type':'Product','name':title,'description':description,'image':Array.isArray(p.images)&&p.images.length?p.images:[image],'url':url,'sku':p.sku || id};
    if (p.brand) schema.brand = {'@type':'Brand','name':plain(p.brand)};
    if (p.price && !p.is_rfq) schema.offers = {'@type':'Offer','url':url,'priceCurrency':'JOD','price':Number(p.price),'availability':Number(p.stock||0)>0?'https://schema.org/InStock':'https://schema.org/OutOfStock','seller':{'@type':'Organization','name':'شركة الدقة للسلامة العامة - AGS Technology'}};
    const specs = Array.isArray(p.specs) ? p.specs : [];
    const dir = path.join(base, id); fs.mkdirSync(dir, {recursive:true});
    fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | AGS Technology</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${url}"><meta property="og:type" content="product"><meta property="og:title" content="${esc(title)} | AGS Technology"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${esc(image)}"><script type="application/ld+json">${json(schema)}</script><script src="/js/analytics.js" defer></script><link rel="icon" href="/favicon.png?v=4"><link rel="stylesheet" href="/css/main.css"><link rel="stylesheet" href="/css/components.css?v=13"><link rel="stylesheet" href="/css/pages.css?v=2"></head><body><nav class="navbar"><div class="container-fluid"><div class="navbar-inner"><a href="/" class="logo"><img src="/logo.png?v=5" alt="AGS Technology" style="max-height:45px;max-width:160px;width:auto"></a><ul class="nav-menu" style="display:flex;gap:8px;list-style:none"><li><a href="/" class="nav-link">الرئيسية</a></li><li><a href="/products.html" class="nav-link">المنتجات</a></li><li><a href="/services.html" class="nav-link">الخدمات</a></li><li><a href="/contact.html" class="nav-link">تواصل</a></li></ul></div></div></nav><main><section class="page-header"><div class="container"><div class="breadcrumb"><a href="/">الرئيسية</a><span class="breadcrumb-sep">›</span><a href="/products.html">المنتجات</a><span class="breadcrumb-sep">›</span><span>${esc(title)}</span></div><h1 class="page-header-title">${esc(title)}</h1></div></section><article class="section"><div class="container" style="max-width:1000px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;align-items:start"><div style="min-height:320px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e2e8f0;border-radius:16px"><img src="${esc(image)}" alt="${esc(title)}" style="max-width:100%;max-height:420px;object-fit:contain"></div><div><p style="color:#64748b;font-weight:700">${esc(plain(p.brand) || 'AGS Technology')}</p><h2>${esc(title)}</h2>${p.price && !p.is_rfq ? `<p style="font-size:1.7rem;font-weight:800;color:#0f2c59">${esc(Number(p.price).toFixed(2))} د.أ</p>` : '<p style="font-size:1.3rem;font-weight:800;color:#0f2c59">اطلب عرض سعر</p>'}<p style="line-height:1.9;color:#475569">${esc(description)}</p>${specs.length ? `<h3>المواصفات الرئيسية</h3><ul>${specs.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>` : ''}<a class="btn btn-accent" href="/rfq.html">طلب عرض سعر</a></div></div></div></article></main><footer class="footer"><div class="container"><p class="footer-desc">AGS Technology — حلول معدات السلامة والفحص والقياس وأنظمة إنذار الحريق في الأردن.</p><div class="footer-links"><a class="footer-link" href="/products.html">كل المنتجات</a><a class="footer-link" href="/contact.html">تواصل معنا</a></div></div></footer></body></html>`, 'utf8');
  }
  console.log(`Generated ${products.length} static product pages`);
}
run().catch(err => { console.error(err); process.exit(1); });
