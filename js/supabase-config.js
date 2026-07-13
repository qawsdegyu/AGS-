// Supabase Configuration
const SUPABASE_URL = 'https://uaujwluwfksbvtwolvsp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdWp3bHV3ZmtzYnZ0d29sdnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTU0ODMsImV4cCI6MjA5OTA5MTQ4M30.FezqZzBhe4u4QKTRi-TyFBwKnC9_GwH4dS9MztW3Z30';

// Initialize Supabase Client
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.applyProductDiscounts = function(data) {
    if (!data) return;
    const processItem = (p) => {
        if (p.discount_percentage && parseFloat(p.discount_percentage) > 0 && p.price) {
            p.old_price = p.price;
            p.price = (parseFloat(p.price) * (1 - parseFloat(p.discount_percentage) / 100)).toFixed(2);
        }
    };
    if (Array.isArray(data)) {
        data.forEach(processItem);
    } else {
        processItem(data);
    }
    return data;
};

// Fetch Products Function
async function fetchProducts(category = 'all') {
    const cacheKey = `products_cache_${category}`;
    const cachedItem = sessionStorage.getItem(cacheKey);
    
    // Use cache if less than 5 minutes old
    if (cachedItem) {
        const { timestamp, data } = JSON.parse(cachedItem);
        if (Date.now() - timestamp < 5 * 60 * 1000) {
            return data;
        }
    }

    try {
        let query = window.supabaseClient.from('products').select('*').order('created_at', { ascending: false });

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        window.applyProductDiscounts(data);

        // Save to cache
        sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));

        return data;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

// Generate HTML for a single product card
function createProductCardHTML(product) {
    const badgesHtml = (product.badges || []).map(badge => {
        let colorClass = 'badge-primary';
        if (badge === 'جديد' || badge === 'عرض خاص') colorClass = 'badge-accent';
        else if (badge === 'الأكثر مبيعاً' || badge === 'معتمد') colorClass = 'badge-success';
        else if (badge.includes('خصم')) colorClass = 'badge-accent';
        return `<span class="badge ${colorClass}">${badge}</span>`;
    }).join('');

    const specsHtml = (product.specs || []).map(spec => `<span class="product-spec-tag">${spec}</span>`).join('');

    let priceHtml = '';
    if (product.is_rfq || !product.price) {
        priceHtml = `
            <div class="product-price"><div class="product-price-rfq">اطلب عرض سعر</div></div>
            <a href="rfq.html" class="btn btn-accent btn-sm">عرض سعر</a>
        `;
    } else {
        const formattedPrice = parseFloat(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const formattedOldPrice = product.old_price ? parseFloat(product.old_price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : null;
        
        let stockHtml = '';
        const stock = product.stock ?? 0;
        if (stock > 0) {
            stockHtml = `<div style="font-size:12px; color:var(--green-600); font-weight:700;">متوفر: ${stock}</div>`;
        } else {
            stockHtml = `<div style="font-size:12px; color:var(--danger); font-weight:700;">سوف يتم توفيره قريباً</div>`;
        }

        priceHtml = `
            <div style="width:100%; display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                <div class="product-price">
                  <div class="product-price-value">${formattedPrice} د.أ</div>
                  ${formattedOldPrice ? `<div class="product-price-old">${formattedOldPrice} د.أ</div>` : ''}
                </div>
                ${stockHtml}
              </div>
              <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}')" style="width:100%; justify-content:center; ${stock <= 0 ? 'background:var(--gray-400);border-color:var(--gray-400);cursor:not-allowed;' : ''}" ${stock <= 0 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                أضف للسلة
              </button>
            </div>
        `;
    }

    let bgGradient = '';
    let iconSvg = '';

    // Simple visual differentiation based on image_type
    switch (product.image_type) {
        case 'gas':
            bgGradient = 'linear-gradient(135deg,#E3F2FD,#BBDEFB)';
            iconSvg = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#1565C0" stroke-width="1"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';
            break;
        case 'noise':
            bgGradient = 'linear-gradient(135deg,#F3E5F5,#E1BEE7)';
            iconSvg = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#6A1B9A" stroke-width="1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
            break;
        case 'light':
            bgGradient = 'linear-gradient(135deg,#FFF3E0,#FFE0B2)';
            iconSvg = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#E65100" stroke-width="1"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
            break;
        case 'ppe':
            bgGradient = 'linear-gradient(135deg,#E8F5E9,#C8E6C9)';
            iconSvg = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" stroke-width="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
            break;
        case 'fire':
            bgGradient = 'linear-gradient(135deg,#FCE4EC,#F48FB1,#FF80AB)';
            iconSvg = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#880E4F" stroke-width="1"><path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/></svg>';
            break;
        default:
            bgGradient = 'linear-gradient(135deg,#F5F5F5,#E0E0E0)';
            iconSvg = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>';
    }

    return `
        <div class="product-card" data-type="${product.category || 'other'}" data-brand="${(product.brand || '').toLowerCase()}">
          <a href="product-details.html?id=${product.id || ''}#id=${product.id || ''}" style="text-decoration:none; color:inherit; display:block;">
            <div class="product-card-image">
              <div style="width:100%;height:100%;background:${product.images && product.images.length > 0 ? '#ffffff' : bgGradient};display:flex;align-items:center;justify-content:center;">
                ${product.images && product.images.length > 0 ? `<img src="${product.images[0]}" alt="${product.title}" style="width:100%;height:100%;object-fit:contain;">` : iconSvg}
              </div>
              <div class="product-card-badges">${badgesHtml}</div>
            </div>
          </a>
          <div class="product-card-body">
            <div class="product-card-brand">${product.brand || 'غير محدد'}</div>
            <a href="product-details.html?id=${product.id || ''}#id=${product.id || ''}" style="text-decoration:none; color:inherit;"><h3 class="product-card-title">${product.title || 'منتج غير مسمى'}</h3></a>
            <div class="product-card-specs">${specsHtml}</div>
            <div class="product-card-footer">
              ${priceHtml}
            </div>
          </div>
        </div>
    `;
}

// Function to render products
async function loadAndRenderProducts(category = 'all') {
    const grid = document.getElementById('mainProductsGrid');
    if (!grid) return; // Not on the products page

    // Show loading
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; font-size: 1.2rem; color: var(--gray-500);">جاري تحميل المنتجات من قاعدة البيانات...</div>';

    // Fetch all products so local filters work correctly across categories
    const products = await fetchProducts('all');

    window.allFetchedProducts = products;

    if (typeof runFilters === 'function') {
        // Update the current category if specified via URL
        if (typeof currentCategory !== 'undefined') {
            currentCategory = category;

            // Check the corresponding radio button if it exists
            const radios = document.getElementsByName('category');
            if (radios) {
                for (let r of radios) {
                    if (r.value === category) r.checked = true;
                }
            }
        }
        runFilters();
    } else {
        if (products.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; font-size: 1.2rem; color: var(--gray-500);">لا توجد منتجات حالياً. (يرجى التأكد من إدخال الـ URL والـ Key بشكل صحيح في supabase-config.js)</div>';
            return;
        }
        grid.innerHTML = products.map(createProductCardHTML).join('');
    }
}

// Function to render featured products (Index page)
async function loadAndRenderFeaturedProducts(category = 'all') {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; font-size: 1.2rem; color: var(--gray-500);">جاري تحميل المنتجات...</div>';

    let products = await fetchProducts(category);
    // Limit to top 4 for homepage
    products = products.slice(0, 4);

    if (products.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; font-size: 1.2rem; color: var(--gray-500);">لا توجد منتجات مميزة.</div>';
        return;
    }

    grid.innerHTML = products.map(createProductCardHTML).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Determine initial category from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('cat') || 'all';
    const q = urlParams.get('q') || '';

    // Only fetch automatically if we are on the products page with #mainProductsGrid
    if (document.getElementById('mainProductsGrid')) {
        if (q) {
            const sInput = document.getElementById('searchInput');
            const navSInput = document.getElementById('navbarSearchInput');
            if (sInput) sInput.value = q;
            if (navSInput) {
                navSInput.value = q;
                navSInput.focus(); // Focus navbar search so they can keep typing
            }
        }
        loadAndRenderProducts(cat);

        // Update quick tabs logic to fetch from DB instead of local hiding
        window.quickFilter = function (category, btn) {
            document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            loadAndRenderProducts(category);
        };
    }

    // For index.html
    if (document.getElementById('productsGrid')) {
        loadAndRenderFeaturedProducts('all');

        // Update tabs logic for index
        window.filterFeatured = function (category, btn) {
            document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            loadAndRenderFeaturedProducts(category);
        };
    }
    
    // Load Dynamic Announcement Ad
    loadDynamicAnnouncement();
});

// Fetch active announcement from DB
let activeAnnouncements = [];
let currentAdIndex = 0;
let adInterval = null;

async function loadDynamicAnnouncement() {
    if (!window.supabaseClient) return;
    const adContainer = document.getElementById('dynamic-ad-container');
    
    let announcementData = null;

    try {
        const { data, error } = await window.supabaseClient
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading announcement:', error);
            return;
        }
        announcementData = data;
    } catch (e) {
        console.error(e);
        return;
    }

    if (!announcementData || announcementData.length === 0) {
        if (adContainer) adContainer.style.display = 'none';
        return;
    }
    
    activeAnnouncements = announcementData;
    currentAdIndex = 0;
        
        if (adContainer) adContainer.style.display = 'flex'; // Make sure it's visible
        
        const prevBtn = document.getElementById('ad-prev-btn');
        const nextBtn = document.getElementById('ad-next-btn');
        
        if (activeAnnouncements.length > 1) {
            if (prevBtn) {
                prevBtn.style.display = 'flex';
                prevBtn.onclick = () => { prevAd(); resetAdInterval(); };
            }
            if (nextBtn) {
                nextBtn.style.display = 'flex';
                nextBtn.onclick = () => { nextAd(); resetAdInterval(); };
            }
            
            const dotsContainer = document.getElementById('ad-dots-container');
            if (dotsContainer) {
                dotsContainer.innerHTML = activeAnnouncements.map((_, i) => 
                    `<div class="ad-dot" data-index="${i}" style="width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.8);cursor:pointer;transition:all 0.3s ease;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>`
                ).join('');
                
                dotsContainer.querySelectorAll('.ad-dot').forEach(dot => {
                    dot.onclick = () => {
                        currentAdIndex = parseInt(dot.getAttribute('data-index'));
                        renderCurrentAd();
                        resetAdInterval();
                    };
                });
            }
            resetAdInterval();
        } else {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (adInterval) clearInterval(adInterval);
        }
        
        renderCurrentAd();
}


function renderCurrentAd() {
    const data = activeAnnouncements[currentAdIndex];
    if (!data) return;
    
    const updateAdElements = (prefix) => {
        const title = document.getElementById(`${prefix}-title`);
        const desc = document.getElementById(`${prefix}-desc`);
        const img = document.getElementById(`${prefix}-img`);
        const link = document.getElementById(`${prefix}-link`);
        
        if (title) title.textContent = data.title;
        if (desc) desc.textContent = data.description;
        if (img && data.image_url) img.src = data.image_url;
        if (link && data.link_url) link.href = data.link_url;
        
        // Update dots
        const dots = document.querySelectorAll('.ad-dot');
        dots.forEach((dot, i) => {
            if (i === currentAdIndex) {
                dot.style.background = 'var(--primary-600)';
                dot.style.width = '16px';
                dot.style.borderRadius = '4px';
            } else {
                dot.style.background = 'rgba(255,255,255,0.8)';
                dot.style.width = '8px';
                dot.style.borderRadius = '50%';
            }
        });
    };

    const adContainer = document.getElementById('dynamic-ad-container');
    if (adContainer) {
        adContainer.style.opacity = '0'; // Fade out
        setTimeout(() => {
            updateAdElements('dynamic-ad');
            adContainer.style.opacity = '1'; // Fade in
        }, 200);
    } else {
        updateAdElements('dynamic-ad');
    }
}

function nextAd() {
    currentAdIndex = (currentAdIndex + 1) % activeAnnouncements.length;
    renderCurrentAd();
}

function prevAd() {
    currentAdIndex = (currentAdIndex - 1 + activeAnnouncements.length) % activeAnnouncements.length;
    renderCurrentAd();
}

function resetAdInterval() {
    if (adInterval) clearInterval(adInterval);
    adInterval = setInterval(nextAd, 5000); // Change every 5 seconds
}

async function loadDynamicLogos() {
    if (!window.supabaseClient) return;
    try {
        const { data, error } = await window.supabaseClient.from('store_settings').select('*').in('key', ['navbar_logo', 'footer_logo', 'favicon_logo']);
        if (error) throw error;
        if (!data || data.length === 0) return;

        const navLogo = data.find(s => s.key === 'navbar_logo')?.text_value;
        const footerLogo = data.find(s => s.key === 'footer_logo')?.text_value;
        const faviconLogo = data.find(s => s.key === 'favicon_logo')?.text_value;

        if (navLogo) {
            document.querySelectorAll('img').forEach(img => {
                if (img.src && img.src.includes('logo.png')) {
                    img.src = navLogo;
                }
            });
        }

        if (footerLogo) {
            document.querySelectorAll('img').forEach(img => {
                if (img.src && img.src.includes('logof.png')) {
                    img.src = footerLogo;
                }
            });
        }

        if (faviconLogo) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = faviconLogo;
        }
    } catch (err) {
        console.error('Error loading dynamic logos:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadDynamicLogos();
});
