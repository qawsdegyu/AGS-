/**
 * AGS Technology - Main JavaScript
 * الملف الرئيسي للتفاعلية
 */

'use strict';

/* ==============================
   NAVBAR SCROLL EFFECT
   ============================== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    navbar?.classList.add('scrolled');
  } else {
    navbar?.classList.remove('scrolled');
  }
}, { passive: true });

/* ==============================
   MOBILE MENU – CSS off-canvas drawer
   ============================== */
function toggleMobileMenu() {
  const toggle   = document.getElementById('menuToggle');
  const navMenu  = document.getElementById('navMenu');
  const overlay  = document.getElementById('overlay');

  if (!navMenu) return;

  toggle?.classList.toggle('open');
  const isOpen = toggle?.classList.contains('open');

  // Use CSS-driven drawer (class-based, no inline styles)
  navMenu.classList.toggle('drawer-open', isOpen);
  navMenu.style.cssText = ''; // clear any legacy inline styles

  overlay?.classList.toggle('active', isOpen);
  toggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

  // Trap body scroll and add helper class for bottom bar hiding
  document.body.style.overflow = isOpen ? 'hidden' : '';
  document.body.classList.toggle('drawer-is-open', isOpen);
}

// Close drawer when any nav link inside it is clicked
document.addEventListener('DOMContentLoaded', () => {
  // ---- Move Horizontal Navigation to Side Drawer (for ALL sizes) ----
  const navMenu = document.getElementById('navMenu');
  if (navMenu) {
    // Do not move navMenu to body, keep it in the navbar for desktop!
    // document.body.appendChild(navMenu);

    // Removed Logo Injection at the top (Mobile Only)

    const desktopNav = document.getElementById('desktopNav');
    if (desktopNav) {
      // Move main links
      const desktopLinks = desktopNav.querySelectorAll('.nav-link');
      desktopLinks.forEach(link => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.appendChild(link);
        navMenu.appendChild(li);
      });
    }

    // 2. Add Settings / Auth (Mobile Only)
    const navSettings = document.getElementById('nav-settings');
    if (navSettings) {
      const authContainer = document.createElement('div');
      authContainer.className = 'nav-auth-container drawer-mobile-only'; // hide on desktop
      authContainer.style.cssText = 'margin-top: auto; padding-top: 16px; border-top: 1px solid var(--gray-100);';
      
      const updateAuthUI = (session) => {
        authContainer.innerHTML = ''; // clear
        
        if (session) {
          // 1. Account / Settings link
          const accountLi = document.createElement('li');
          accountLi.className = 'nav-item';
          const accountLink = document.createElement('a');
          accountLink.className = 'nav-link';
          accountLink.href = 'profile.html';
          accountLink.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-left: var(--space-3); color: var(--primary-600);">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span style="color: var(--primary-600); font-weight: 700;">الحساب والإعدادات</span>
          `;
          accountLi.appendChild(accountLink);
          authContainer.appendChild(accountLi);

          // 2. Logout link
          const logoutLi = document.createElement('li');
          logoutLi.className = 'nav-item';
          const logoutLink = document.createElement('a');
          logoutLink.className = 'nav-link';
          logoutLink.href = '#';
          logoutLink.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-left: var(--space-3); color: var(--danger);">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span style="color: var(--danger);">تسجيل الخروج</span>
          `;
          logoutLink.onclick = (e) => {
            e.preventDefault();
            if(window.supabaseClient) {
               window.supabaseClient.auth.signOut().then(() => window.location.reload());
            }
          };
          logoutLi.appendChild(logoutLink);
          authContainer.appendChild(logoutLi);
          
        } else {
          // Login link only
          const loginLi = document.createElement('li');
          loginLi.className = 'nav-item';
          const loginLink = document.createElement('a');
          loginLink.className = 'nav-link';
          loginLink.href = 'login.html';
          loginLink.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-left: var(--space-3);">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>تسجيل الدخول</span>
          `;
          loginLi.appendChild(loginLink);
          authContainer.appendChild(loginLi);
        }
      };

      // Set initial UI (assume logged out if no supabase yet)
      updateAuthUI(null);

      if (window.supabaseClient) {
        window.supabaseClient.auth.getSession().then(({ data: { session } }) => updateAuthUI(session));
        window.supabaseClient.auth.onAuthStateChange((event, session) => updateAuthUI(session));
      }

      navMenu.appendChild(authContainer);

      // Do NOT remove navSettings on desktop!
      // navSettings.remove();
    }
  }

  document.querySelectorAll('#navMenu .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const navMenu = document.getElementById('navMenu');
      const toggle  = document.getElementById('menuToggle');
      const overlay = document.getElementById('overlay');
      navMenu?.classList.remove('drawer-open');
      toggle?.classList.remove('open');
      overlay?.classList.remove('active');
      document.body.style.overflow = '';
      document.body.classList.remove('drawer-is-open');
    });
  });

  // ---- Footer accordion (mobile only) ----
  if (window.innerWidth <= 767) {
    document.querySelectorAll('.footer-col-title').forEach(heading => {
      const col = heading.parentElement;
      if (!col) return;

      heading.setAttribute('role', 'button');
      heading.setAttribute('tabindex', '0');

      const toggle = () => col.classList.toggle('accordion-open');
      heading.addEventListener('click', toggle);
      heading.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }
  // ---- Bottom tab bar – mark active page ----
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.mobile-bottom-bar a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && (currentPage === href || (currentPage === '' && href === 'index.html'))) {
      a.classList.add('active');
    }
  });

  // Sync bottom bar cart badge with main cart count
  const syncBarBadge = () => {
    const count = document.getElementById('cartCount')?.textContent;
    const badge = document.querySelector('.bar-cart-badge');
    if (badge && count !== undefined) badge.textContent = count;
  };
  // observe cart count changes
  const cartCountEl = document.getElementById('cartCount');
  if (cartCountEl) {
    new MutationObserver(syncBarBadge).observe(cartCountEl, { childList: true, subtree: true });
    syncBarBadge();
  }

  // ---- Swipe right → close drawer (touch gesture) ----
  let touchStartX = 0;
  document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const navMenu = document.getElementById('navMenu');
    // Swipe left (RTL: swipe left = close drawer on right side)
    if (deltaX < -60 && navMenu?.classList.contains('drawer-open')) {
      const toggle  = document.getElementById('menuToggle');
      const overlay = document.getElementById('overlay');
      navMenu.classList.remove('drawer-open');
      toggle?.classList.remove('open');
      overlay?.classList.remove('active');
      document.body.style.overflow = '';
      document.body.classList.remove('drawer-is-open');
    }
  }, { passive: true });
});

function toggleSearch() {
  const searchBar = document.getElementById('searchBar');
  if (searchBar) {
    const isVisible = searchBar.style.display === 'block';
    searchBar.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
    }
  }
}

function closeAll() {
  // Close mobile menu drawer
  const toggle  = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  toggle?.classList.remove('open');
  navMenu?.classList.remove('drawer-open');
  if (navMenu) navMenu.style.cssText = '';
  document.body.style.overflow = '';
  document.body.classList.remove('drawer-is-open');

  // Close cart
  const cartDrawer = document.getElementById('cartDrawer');
  if (cartDrawer) {
    cartDrawer.style.left = '-420px';
    document.body.classList.remove('cart-open');
  }

  // Close search
  const searchBar = document.getElementById('searchBar');
  if (searchBar) searchBar.style.display = 'none';

  // Close overlay
  document.getElementById('overlay')?.classList.remove('active');
}

/* ==============================
   CART
   ============================== */
let cartItems = [];
try {
  const savedCart = localStorage.getItem('checkoutCart');
  if (savedCart) {
    cartItems = JSON.parse(savedCart);
  }
} catch (e) {
  console.error("Error loading cart:", e);
}

function toggleCart() {
  const cartDrawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('overlay');
  if (cartDrawer) {
    const isOpen = cartDrawer.style.left === '0px';
    cartDrawer.style.left = isOpen ? '-420px' : '0px';
    document.body.classList.toggle('cart-open', !isOpen);
    // overlay?.classList.toggle('active', !isOpen);
  }
}

async function addToCart(productId, event) {
  let btn = null;
  let originalHtml = '';
  
  if (event && event.currentTarget) {
    btn = event.currentTarget;
    originalHtml = btn.innerHTML;
    btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> جاري الإضافة...';
    btn.disabled = true;
  }

  try {
    // Check Authentication First
    if (window.supabaseClient) {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (!session) {
        showToast('تنبيه', 'يرجى تسجيل الدخول أولاً لإضافة منتجات إلى السلة', 'warning');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
      }
    }

    // Fetch product from DB if available
    let product = null;
    if (window.supabaseClient) {
      const { data, error } = await window.supabaseClient.from('products').select('*').eq('id', productId).single();
      if (data) {
        if (window.applyProductDiscounts) window.applyProductDiscounts(data);
        product = data;
      }
      if (error) throw error;
    }

    if (!product) {
      showToast('خطأ', 'لم يتم العثور على المنتج', 'error');
      return;
    }

    const existing = cartItems.find(i => i.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      cartItems.push({ 
          id: product.id, 
          name: product.title, 
          brand: product.brand, 
          price: product.price || 0, 
          qty: 1,
          image: (product.images && product.images.length > 0) ? product.images[0] : ''
      });
    }

    updateCartCount();
    renderCartItems();
    localStorage.setItem('checkoutCart', JSON.stringify(cartItems));
    showToast('تمت الإضافة!', `تم إضافة "${product.title}" إلى السلة`, 'success');
  } catch (err) {
    showToast('خطأ', 'حدث خطأ أثناء إضافة المنتج. ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }
}

window.removeFromCart = function(productId) {
  cartItems = cartItems.filter(i => String(i.id) !== String(productId));
  updateCartCount();
  renderCartItems();
  localStorage.setItem('checkoutCart', JSON.stringify(cartItems));
};

function renderCartItems() {
  const cartContainer = document.getElementById('cartItemsContainer');
  if(!cartContainer) return;

  if (cartItems.length === 0) {
      cartContainer.innerHTML = '<div style="text-align:center;color:var(--gray-500);padding:var(--space-6); font-weight: 500;">لا يوجد منتجات بالسلة</div>';
      return;
  }

  cartContainer.innerHTML = cartItems.map(item => `
    <div style="display:flex;gap:var(--space-3);padding:var(--space-4);border:1px solid #E2E8F0;border-radius:var(--radius-xl);margin-bottom:var(--space-3);background:#F8F9FA;position:relative;">
      <a href="product-details.html?id=${item.id}#id=${item.id}" style="width:70px;height:70px;background:#E6F0FA;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">` : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0F2C59" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`}
      </a>
      <div style="flex:1;">
        <a href="product-details.html?id=${item.id}#id=${item.id}" style="text-decoration:none;">
          <div style="font-weight:700;font-size:var(--text-sm);color:#0F2C59;margin-bottom:4px;padding-left:24px;">${item.name}</div>
        </a>
        <div style="font-size:var(--text-xs);color:#718096;">${item.brand}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-2);">
          <span style="font-weight:800;color:#0F2C59;">${parseFloat(item.price).toLocaleString('en-US', {minimumFractionDigits: 2})} د.أ</span>
          <div style="display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #E2E8F0;border-radius:6px;padding:2px;">
            <button onclick="changeCartQty('${item.id}', 1)" style="border:none;background:#F8FAFC;border-radius:4px;color:#0F2C59;font-weight:bold;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">+</button>
            <span style="font-weight:700;color:#0F2C59;font-size:13px;min-width:24px;text-align:center;">${item.qty}</span>
            <button onclick="changeCartQty('${item.id}', -1)" style="border:none;background:#F8FAFC;border-radius:4px;color:#0F2C59;font-weight:bold;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">-</button>
          </div>
        </div>
      </div>
      <button onclick="removeFromCart('${item.id}')" title="حذف المنتج" style="position:absolute;top:var(--space-3);left:var(--space-3);background:none;border:none;cursor:pointer;color:#EF4444;padding:4px;display:flex;align-items:center;justify-content:center;transition:transform 0.2s;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
        </svg>
      </button>
    </div>
  `).join('');

  // Update total price element
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalEl = document.getElementById('cartDrawerTotal');
  if(totalEl) totalEl.textContent = total.toLocaleString('en-US', {minimumFractionDigits: 2}) + ' د.أ';
}

window.changeCartQty = function(productId, delta) {
  const item = cartItems.find(i => String(i.id) === String(productId));
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) {
      removeFromCart(productId);
      return;
    }
    updateCartCount();
    renderCartItems();
    localStorage.setItem('checkoutCart', JSON.stringify(cartItems));
  }
};

function updateCartCount() {
  const total = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const countEl = document.getElementById('cartCount');
  if (countEl) {
    countEl.textContent = total;
    countEl.style.animation = 'pulse 0.3s ease';
    setTimeout(() => { countEl.style.animation = ''; }, 300);
  }
  
  document.querySelectorAll('.bar-cart-badge').forEach(badge => {
    badge.textContent = total;
    badge.style.animation = 'pulse 0.3s ease';
    setTimeout(() => { badge.style.animation = ''; }, 300);
  });

  const titleEl = document.getElementById('cartDrawerTitle');
  if(titleEl) {
      titleEl.textContent = `سلة التسوق (${total})`;
  }
}

document.getElementById('cartBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  toggleCart();
});

// Intercept "Convert to Quote" buttons to pass from_cart parameter
document.addEventListener('click', e => {
  const target = e.target.closest('a');
  if (target && target.getAttribute('href') === 'rfq.html' && target.textContent.includes('تحويل لعرض سعر')) {
      e.preventDefault();
      // Only append if not empty
      if (cartItems.length > 0) {
          window.location.href = 'rfq.html?from_cart=1';
      } else {
          window.location.href = 'rfq.html';
      }
  }
});

async function checkoutCart(e) {
  e.preventDefault();
  
  if (cartItems.length === 0) {
      showToast('تنبيه', 'سلة التسوق فارغة', 'warning');
      return;
  }

  const btn = e.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ جاري المعالجة...';
  btn.disabled = true;

  try {
      if (window.supabaseClient) {
          const { data: { session } } = await window.supabaseClient.auth.getSession();
          if (session) {
              // User is logged in, save cart and proceed to checkout page
              localStorage.setItem('checkoutCart', JSON.stringify(cartItems));
              window.location.href = 'checkout.html';
          } else {
              // Not logged in, show Sana-style login modal
              openCheckoutLoginModal();
          }
      } else {
          showToast('تنبيه', 'النظام غير متصل بقاعدة البيانات', 'warning');
      }
  } catch (err) {
      console.error(err);
      showToast('خطأ', 'تعذر معالجة الطلب', 'error');
  } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
  }
}

// Sana-style Login Modal
function openCheckoutLoginModal() {
    let modal = document.getElementById('checkoutLoginModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'checkoutLoginModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '99999';
        
        modal.innerHTML = `
            <div style="background:var(--white);padding:3rem 2rem;border-radius:20px;width:90%;max-width:420px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.1);position:relative;animation:fadeInUp 0.3s ease;">
                <button onclick="document.getElementById('checkoutLoginModal').style.display='none'" style="position:absolute;top:15px;right:15px;background:#F1F5F9;border:none;width:32px;height:32px;border-radius:50%;font-size:1.2rem;cursor:pointer;color:var(--gray-600);display:flex;align-items:center;justify-content:center;">&times;</button>
                
                <div style="width:60px;height:60px;background:#E3F2FD;color:#1565C0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                
                <h3 style="font-size:1.5rem;font-weight:800;color:var(--dark-800);margin-bottom:0.5rem;font-family:'Almarai', sans-serif;">تسجيل الدخول للمتابعة</h3>
                <p style="color:var(--gray-500);font-size:0.9rem;margin-bottom:2rem;line-height:1.6;">لإتمام طلبك ومتابعة حالته، يرجى تسجيل الدخول بحسابك بخطوة واحدة بسيطة.</p>
                
                <button onclick="loginWithGoogle()" style="width:100%;padding:1rem;background:white;border:1px solid #E2E8F0;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:12px;font-weight:700;font-size:1rem;cursor:pointer;transition:all 0.3s ease;margin-bottom:1.5rem;box-shadow:0 2px 5px rgba(0,0,0,0.02);color:#333;" onmouseover="this.style.background='#F8FAFC';this.style.borderColor='#CBD5E1'" onmouseout="this.style.background='white';this.style.borderColor='#E2E8F0'">
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    متابعة باستخدام Google
                </button>
                
                <div style="display:flex;align-items:center;margin:1.5rem 0;">
                    <hr style="flex:1;border:none;border-top:1px solid #E2E8F0;"><span style="color:#94A3B8;font-size:0.8rem;padding:0 15px;">أو</span><hr style="flex:1;border:none;border-top:1px solid #E2E8F0;">
                </div>
                
                <button onclick="window.location.href='login.html'" style="width:100%;padding:1rem;background:var(--primary-600);color:white;border:none;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;transition:background 0.3s;box-shadow:0 4px 12px rgba(21,101,192,0.2);">
                    الدخول باستخدام الإيميل
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Save cart state before login so we can redirect to checkout later
    localStorage.setItem('checkoutCart', JSON.stringify(cartItems));
    
    modal.style.display = 'flex';
}

async function loginWithGoogle() {
    if(!window.supabaseClient) return showToast('خطأ', 'غير متصل بقاعدة البيانات', 'error');
    
    const btn = document.querySelector('#checkoutLoginModal button[onclick="loginWithGoogle()"]');
    if(btn) btn.innerHTML = '⏳ جاري التوجيه...';
    
    // Calculate redirect URL to come back directly to checkout page!
    const redirectToUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '') + 'checkout.html';
    
    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectToUrl
        }
    });
    
    if(error) {
        showToast('خطأ', error.message, 'error');
        if(btn) btn.innerHTML = 'متابعة باستخدام Google';
    }
}

/* ==============================
   TOAST NOTIFICATIONS
   ============================== */
function showToast(title, message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.success}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ==============================
   INTERSECTION OBSERVER (Reveal)
   ============================== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ==============================
   COUNT UP ANIMATION
   ============================== */
function animateCount(el, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      start = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(start).toLocaleString('ar');
  }, 16);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target || '0');
      animateCount(el, target);
      countObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.count-up').forEach(el => countObserver.observe(el));

// Hero stats animation
const heroStats = [
  { id: 'stat1', target: 500, suffix: '+' },
  { id: 'stat2', target: 750, suffix: '+' },
  { id: 'stat3', target: 15, suffix: '+' },
  { id: 'stat4', target: 98, suffix: '%' },
];

heroStats.forEach(stat => {
  const el = document.getElementById(stat.id);
  if (!el) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateCount(el, stat.target, 2500);
      observer.unobserve(el);
    }
  }, { threshold: 0.5 });
  observer.observe(el);
});

/* ==============================
   FEATURED PRODUCTS FILTER
   ============================== */
function filterFeatured(category, btn) {
  // Update active tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Filter products
  document.querySelectorAll('#productsGrid .product-card').forEach(card => {
    if (category === 'all' || card.dataset.cat === category) {
      card.style.display = '';
      card.style.animation = 'fadeInUp 0.4s ease';
    } else {
      card.style.display = 'none';
    }
  });
}

/* ==============================
   QUICK VIEW MODAL
   ============================== */
function quickView(productId) {
  showToast('جاري التحميل...', 'يتم فتح معاينة المنتج', 'success');
  // In a real app, this would open a modal with product details
}

/* ==============================
   LANGUAGE TOGGLE
   ============================== */
function toggleLanguage() {
  const html = document.documentElement;
  const isAr = html.lang === 'ar';
  const btn = document.getElementById('langBtn');

  if (isAr) {
    html.lang = 'en';
    html.dir = 'ltr';
    if (btn) btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
      عر
    `;
    showToast('Language Changed', 'Switched to English mode', 'success');
  } else {
    html.lang = 'ar';
    html.dir = 'rtl';
    if (btn) btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
      EN
    `;
    showToast('تم تغيير اللغة', 'تم التبديل إلى العربية', 'success');
  }
}

/* ==============================
   SMOOTH SCROLL
   ============================== */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeAll();
    }
  });
});

/* ==============================
   SEARCH FUNCTIONALITY
   ============================== */
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (query.length > 2) {
    // In a real app, this would query an API
    console.log('Searching for:', query);
  }
});

document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (query) {
      window.location.href = `products.html?q=${encodeURIComponent(query)}`;
    }
  }
  if (e.key === 'Escape') toggleSearch();
});

/* ==============================
   KEYBOARD SHORTCUTS
   ============================== */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAll();
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    toggleSearch();
  }
});

/* ==============================
   LOADING COMPLETE
   ============================== */
window.addEventListener('load', () => {
  document.body.style.opacity = '1';

  // Trigger initial animations for elements in viewport
  setTimeout(() => {
    document.querySelectorAll('.reveal').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add('visible');
      }
    });
  }, 100);
});

// Update Navbar Authentication State
document.addEventListener('DOMContentLoaded', async () => {
  if (window.supabaseClient) {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    const navAccount = document.getElementById('nav-account');
    const navSettings = document.getElementById('nav-settings');
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navLogoutBtn = document.getElementById('nav-logout-btn');
    
    if (session) {
      if (navAccount) navAccount.style.display = 'flex';
      if (navSettings) navSettings.style.display = 'inline-flex';
      if (navLoginBtn) navLoginBtn.style.display = 'none';
      if (navLogoutBtn) navLogoutBtn.style.display = 'flex';

      // Admin check for dashboard link
      const { data: adminData } = await window.supabaseClient
        .from('admin_users')
        .select('email')
        .eq('email', session.user.email)
        .single();
        
      if (adminData) {
        const adminLink = document.getElementById('admin-dashboard-link');
        const adminDivider = document.getElementById('admin-divider');
        if (adminLink) adminLink.style.display = 'flex';
        if (adminDivider) adminDivider.style.display = 'block';
      }
    } else {
      if (navAccount) navAccount.style.display = 'none';
      if (navSettings) navSettings.style.display = 'inline-flex';
      if (navLoginBtn) navLoginBtn.style.display = 'flex';
      if (navLogoutBtn) navLogoutBtn.style.display = 'none';
    }
  }
});

console.log('🛡️ AGS Technology - Loaded Successfully');

/* ==============================
   POWERED BY OPERIX GLOBAL FOOTER
   ============================== */
document.addEventListener('DOMContentLoaded', () => {
  const operixDiv = document.createElement('div');
  operixDiv.setAttribute('dir', 'ltr');
  operixDiv.style.cssText = 'text-align: center; padding: 16px 0 24px 0; border-top: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); font-size: 13px; font-family: "Cairo", sans-serif; width: 100%; margin-top: 10px; display: flex; justify-content: center; align-items: center; gap: 6px;';
  
  operixDiv.innerHTML = `
    Powered by 
    <a href="https://www.instagram.com/operixsys?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" style="text-decoration: none; color: white; background: #1e3a8a; padding: 2px 10px; border-radius: 6px; font-weight: 800; font-size: 14px; letter-spacing: 0.5px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(30, 58, 138, 0.4); transition: transform 0.2s ease, background 0.2s ease;">
      Operix
    </a>
  `;
  
  const link = operixDiv.querySelector('a');
  if (link) {
    link.addEventListener('mouseenter', () => { link.style.transform = 'scale(1.05)'; link.style.background = '#2563eb'; });
    link.addEventListener('mouseleave', () => { link.style.transform = 'scale(1)'; link.style.background = '#1e3a8a'; });
  }

  const footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom) {
    footerBottom.insertAdjacentElement('afterend', operixDiv);
  } else {
    operixDiv.style.background = '#0b1120';
    operixDiv.style.paddingBottom = '80px';
    document.body.appendChild(operixDiv);
  }
});

/* ==============================
   HOME FEATURES STRIP DYNAMIC LOAD
   ============================== */
async function loadHomeFeaturesStrip() {
  const container = document.getElementById('homeFeaturesContainer');
  if (!container) return; // Only execute on the homepage

  try {
    // Basic Skeleton (4 items)
    container.innerHTML = Array(4).fill(`
      <div class="feature-item" style="opacity: 0.5;">
        <div class="feature-item-icon" style="background:#E2E8F0;"></div>
        <div class="feature-item-text">
          <strong style="width:100px;height:14px;background:#E2E8F0;border-radius:4px;display:block;margin-bottom:4px;"></strong>
          <span style="width:140px;height:12px;background:#E2E8F0;border-radius:4px;display:block;"></span>
        </div>
      </div>
    `).join('<div style="width:1px;height:40px;background:var(--gray-200);flex-shrink:0;"></div>');

    if (!window.supabaseClient) {
      console.error('Supabase client not initialized');
      return;
    }

    const { data: features, error } = await window.supabaseClient
      .from('home_features_strip')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    if (!features || features.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = features.map((feat, index) => {
      const hex = feat.theme_color_hex || '#1565C0';
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      const bg = `rgba(${r},${g},${b},0.1)`;

      let iconHtml = feat.icon;
      if (iconHtml.includes('currentColor')) {
         iconHtml = iconHtml.replace(/currentColor/g, hex);
      }

      const contentHtml = `
          <div class="feature-item-icon" style="background:${bg};">
            ${iconHtml}
          </div>
          <div class="feature-item-text">
            <strong>${feat.title}</strong>
            <span>${feat.subtitle}</span>
          </div>
      `;
      return feat.link_url 
        ? `<a href="${feat.link_url}" class="feature-item" style="text-decoration:none;color:inherit;cursor:pointer;">${contentHtml}</a>`
        : `<div class="feature-item">${contentHtml}</div>`;
    }).join('<div style="width:1px;height:40px;background:var(--gray-200);flex-shrink:0;"></div>');

  } catch (error) {
    console.error('Error loading home features strip:', error);
    container.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  loadHomeFeaturesStrip();
  updateCartCount();
  renderCartItems();

  /* ==============================
     ANALYTICS TRACKING
     ============================== */
  if (typeof sc !== 'undefined') {
      try {
          let sessionId = sessionStorage.getItem('visitor_session_id');
          if (!sessionId) {
              sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
              sessionStorage.setItem('visitor_session_id', sessionId);
          }

          let source = 'Direct';
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has('utm_source')) {
              source = urlParams.get('utm_source');
          } else if (document.referrer) {
              const referrerUrl = new URL(document.referrer);
              if (referrerUrl.hostname.includes('facebook.com')) source = 'Facebook';
              else if (referrerUrl.hostname.includes('google.com')) source = 'Google';
              else if (referrerUrl.hostname.includes('instagram.com')) source = 'Instagram';
              else if (referrerUrl.hostname.includes('twitter.com') || referrerUrl.hostname.includes('x.com')) source = 'Twitter';
              else if (!referrerUrl.hostname.includes(window.location.hostname)) source = referrerUrl.hostname;
          }

          let productId = null;
          if (window.location.pathname.includes('product-details.html')) {
              productId = urlParams.get('id');
          }

          const { error } = await sc.from('page_views').insert([{
              page_url: window.location.pathname || '/',
              product_id: productId,
              source: source,
              session_id: sessionId
          }]);

          if (error) console.error('Error logging page view:', error);
      } catch (e) {
          console.error('Analytics tracking error:', e);
      }
  }
});
