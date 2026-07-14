// Dashboard Supabase Logic
window.supabase = window.supabaseClient;

// ─── Charts registry to avoid re-initialisation errors ────────────────────────
const _charts = {};
function getOrCreateChart(id, config) {
    if (_charts[id]) { _charts[id].destroy(); }
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return null;
    _charts[id] = new Chart(ctx, config);
    return _charts[id];
}

// ─── Auth & boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof supabase === 'undefined') {
            showPageError('فشل تحميل Supabase. تحقق من الاتصال بالإنترنت.');
            return;
        }
        const { data: { session }, error: authErr } = await supabase.auth.getSession();
        if (!session || authErr) { window.location.replace('login.html'); return; }

        const userEmail = session.user.email;
        const { data: adminData, error: adminErr } = await supabase
            .from('admin_users').select('email').eq('email', userEmail).single();
        if (adminErr || !adminData) {
            alert('عذراً، هذا الحساب ليس لديه صلاحية الدخول للوحة التحكم.');
            window.location.replace('index.html'); return;
        }

        document.getElementById('dashboard-body').style.display = 'block';
        
        // Dynamically update profile and greeting
        const userName = session.user.user_metadata?.full_name || userEmail.split('@')[0];
        
        const avatarEl = document.getElementById('adminAvatar');
        const nameEl = document.getElementById('adminNameDisplay');
        const emailEl = document.getElementById('adminEmailDisplay');
        const subtitle = document.getElementById('dashSubtitle');
        
        if (nameEl) nameEl.textContent = userName;
        if (emailEl) emailEl.textContent = userEmail;
        if (avatarEl) avatarEl.textContent = userName.charAt(0).toUpperCase();
        if (subtitle) subtitle.textContent = `مرحباً، ${userName}! هذا ما يحدث في متجرك اليوم.`;

        const headerName = document.querySelector('.dashboard-header-actions span');
        if (headerName && userEmail) headerName.textContent = userName;

        // ─── Setup Auto Logout (2 Hours Inactivity) ───
        let inactivityTimer;
        const resetInactivityTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(async () => {
                alert('انتهت الجلسة لعدم وجود نشاط لمدة ساعتين. سيتم تسجيل خروجك للأمان.');
                await supabase.auth.signOut();
                window.location.replace('login.html');
            }, 2 * 60 * 60 * 1000); // 2 hours
        };
        
        // Listen to user activity to reset timer
        ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, resetInactivityTimer, { passive: true });
        });
        resetInactivityTimer();
        // ──────────────────────────────────────────────

        // Setup default dates for filters (first of month to today)
        const todayStr = new Date().toISOString().split('T')[0];
        const firstOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        ['customers', 'payments', 'orders', 'rfqs'].forEach(prefix => {
            const fromEl = document.getElementById(`${prefix}-date-from`);
            const toEl = document.getElementById(`${prefix}-date-to`);
            if (fromEl && !fromEl.value) fromEl.value = firstOfMonthStr;
            if (toEl && !toEl.value) toEl.value = todayStr;
        });

        if (document.getElementById('section-products')) loadDashboardData();
    } catch (err) {
        showPageError('خطأ فادح: ' + err.message);
        console.error('Fatal Error:', err);
    }
});

function showPageError(msg) {
    document.body.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F1F5F9;';
    document.body.innerHTML = `
        <div style="text-align:center;padding:2rem;max-width:400px;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#F44336" stroke-width="1.5" style="margin-bottom:1rem"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h2 style="color:#F44336;margin-bottom:.5rem;font-family:Cairo,sans-serif;">حدث خطأ</h2>
            <p style="color:#666;margin-bottom:1.5rem;font-family:Cairo,sans-serif;">${msg}</p>
            <button onclick="location.reload()" style="background:#1565C0;color:#fff;border:none;padding:.75rem 2rem;border-radius:8px;cursor:pointer;font-size:1rem;font-family:Cairo,sans-serif;">إعادة المحاولة</button>
        </div>`;
}

// ─── Skeleton helper ───────────────────────────────────────────────────────────
function skeletonRows(cols, rows = 4) {
    return Array(rows).fill('').map(() =>
        `<tr>${Array(cols).fill('<td><div style="height:14px;background:#E2E8F0;border-radius:4px;animation:pulse 1.5s ease-in-out infinite"></div></td>').join('')}</tr>`
    ).join('');
}

// ─── Load all dashboard data ───────────────────────────────────────────────────
async function loadDashboardData() {
    await Promise.all([
        loadDashboardOverview(),
        loadDashboardProducts(),
        loadDashboardServices(),
        loadDashboardFeatures(),
        loadDashboardHomeFeatures(),
        loadDashboardOrders(),
        loadDashboardRFQs(),
        loadDashboardAnalytics(),
        loadDashboardCustomers(),
        loadDashboardInspections(),
        loadRegisteredUsers(),
        loadAdminAnnouncements()
    ]);
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
window._dashData = {};

async function loadDashboardOverview() {
    try {
        const periodFilterEl = document.getElementById('kpi-period-filter');
        const period = periodFilterEl ? periodFilterEl.value : 'all';

        ['kpi-orders-count','kpi-sales-amount','kpi-rfqs-count','kpi-products-count'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<span style="display:inline-block;width:60px;height:20px;background:#E2E8F0;border-radius:4px;animation:pulse 1.5s infinite"></span>';
        });

        let recentOrdersQuery = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
        let recentRfqsQuery = supabase.from('rfqs').select('*').order('created_at', { ascending: false }).limit(3);

        let startDate;
        if (period !== 'all') {
            const now = new Date();
            startDate = new Date();
            if (period === 'today') {
                startDate.setHours(0,0,0,0);
            } else if (period === 'week') {
                startDate.setDate(now.getDate() - now.getDay());
                startDate.setHours(0,0,0,0);
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (period === 'year') {
                startDate = new Date(now.getFullYear(), 0, 1);
            }
            recentOrdersQuery = recentOrdersQuery.gte('created_at', startDate.toISOString());
            recentRfqsQuery = recentRfqsQuery.gte('created_at', startDate.toISOString());
        }

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        let weeklyOrdersQuery = supabase.from('orders').select('created_at, total_amount').gte('created_at', weekAgo.toISOString());
        let weeklyRfqsQuery = supabase.from('rfqs').select('created_at').gte('created_at', weekAgo.toISOString());
        
        let periodOrdersQuery = supabase.from('orders').select('items, total_amount').neq('status', 'ملغى');
        if (startDate) {
            periodOrdersQuery = periodOrdersQuery.gte('created_at', startDate.toISOString());
        }
        let productsQuery = supabase.from('products').select('id, category');

        const [
            { data: stats },
            { data: monthlyRevData },
            { data: recentOrders },
            { data: recentRfqs },
            { data: salesByCategoryData },
            { count: pendingOrdersCount },
            { data: weeklyOrdersData },
            { data: weeklyRfqsData },
            { data: periodOrdersData },
            { data: allProductsData }
        ] = await Promise.all([
            supabase.rpc('get_dashboard_stats', { period_filter: period }),
            supabase.rpc('get_monthly_revenue'),
            recentOrdersQuery,
            recentRfqsQuery,
            supabase.rpc('get_sales_by_category', { period_filter: period }),
            supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['جديد', 'بانتظار التأكيد', 'قيد المراجعة']),
            weeklyOrdersQuery,
            weeklyRfqsQuery,
            periodOrdersQuery,
            productsQuery
        ]);

        if (!stats) return;

        const orders = recentOrders || [];
        const rfqs = recentRfqs || [];

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('kpi-orders-count', stats.orders_count || 0);
        set('kpi-sales-amount', (stats.sales_total || 0).toLocaleString('en-US'));

        // Load active announcement for dashboard banner
        try {
            const { data: ann } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const adContainer = document.querySelector('.dashboard-announcement');
            if (ann) {
                if (adContainer) adContainer.style.display = 'flex';
                const titleEl = document.getElementById('dash-ad-title');
                const descEl = document.getElementById('dash-ad-desc');
                const linkEl = document.getElementById('dash-ad-link');
                const imgEl = document.getElementById('dash-ad-img');
                
                if (titleEl) titleEl.textContent = ann.title;
                if (descEl) descEl.textContent = ann.description;
                if (linkEl) linkEl.href = ann.link_url;
                if (imgEl) imgEl.src = ann.image_url;
            } else {
                if (adContainer) adContainer.style.display = 'none';
            }
        } catch(e) {
            console.error('Error loading dynamic announcement', e);
        }
        set('kpi-rfqs-count', stats.pending_rfqs_count || 0);
        set('kpi-products-count', stats.products_count || 0);

        const validOrdersCount = pendingOrdersCount || 0;
        const navOB = document.getElementById('nav-badge-orders');
        if (navOB) { 
            let latestOrderDate = orders.length > 0 ? new Date(orders[0].created_at).getTime() : 0;
            let lastSeenOrderDate = parseInt(localStorage.getItem('last_seen_order_date') || '0');
            navOB.setAttribute('data-latest-date', latestOrderDate);
            
            if (validOrdersCount > 0 && latestOrderDate > lastSeenOrderDate) {
                navOB.textContent = validOrdersCount; 
                navOB.style.display = ''; 
            } else {
                navOB.style.display = 'none';
            }
        }
        
        const navRB = document.getElementById('nav-badge-rfqs');
        if (navRB) { 
            let latestRfqDate = rfqs.length > 0 ? new Date(rfqs[0].created_at).getTime() : 0;
            let lastSeenRfqDate = parseInt(localStorage.getItem('last_seen_rfq_date') || '0');
            navRB.setAttribute('data-latest-date', latestRfqDate);
            
            let validRfqsCount = stats.pending_rfqs_count || 0;
            if (validRfqsCount > 0 && latestRfqDate > lastSeenRfqDate) {
                navRB.textContent = validRfqsCount; 
                navRB.style.display = ''; 
            } else {
                navRB.style.display = 'none';
            }
        }

        // The top right bell badge is now handled by loadDashboardNotifications()


        const tbody = document.getElementById('recent-orders-list');
        if (tbody) {
            tbody.innerHTML = orders.length === 0
                ? emptyStateRow(6, 'لا توجد طلبات بعد')
                : orders.map(order => `
                    <tr>
                        <td style="font-weight:700;color:var(--primary-700);">#${order.id.split('-')[0]}</td>
                        <td>
                            <div style="font-weight:600;">${order.customer_company || order.customer_name || '-'}</div>
                            <div style="font-size:11px;color:var(--gray-400);">${order.customer_name || ''}</div>
                        </td>
                        <td>${Array.isArray(order.items) ? order.items.length : 0} منتج</td>
                        <td style="font-weight:700;color:var(--dark-800);">${(parseFloat(order.total_amount)||0).toLocaleString('en-US')} د.أ</td>
                        <td><span class="order-status ${statusClass(order.status)}">${order.status || '-'}</span></td>
                        <td><button class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 10px;" onclick="showSection('orders')">عرض</button></td>
                    </tr>`).join('');
        }

        const rfqsList = document.getElementById('recent-rfqs-list');
        if (rfqsList) {
            const monthsNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
            rfqsList.innerHTML = rfqs.length === 0
                ? emptyStateDiv('لا يوجد عروض أسعار بعد')
                : rfqs.map(rfq => {
                    const date = new Date(rfq.created_at);
                    return `
                    <div class="upcoming-event">
                        <div class="event-date-badge" style="background:#F0FDF4;color:#2E7D32;">
                            <div class="event-date-day">${date.getDate()}</div>
                            <div class="event-date-month">${monthsNames[date.getMonth()]}</div>
                        </div>
                        <div class="event-info">
                            <div class="event-info-title">${rfq.company_name || '-'}</div>
                            <div class="event-info-meta">${rfq.contact_person || ''} — ${rfq.phone || ''}</div>
                        </div>
                    </div>`;
                }).join('');
        }

        if (typeof Chart !== 'undefined') {
            const monthsNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
            let monthlySales = Array(12).fill(0);
            if (monthlyRevData) {
                monthlyRevData.forEach(m => { monthlySales[m.month_index] = parseFloat(m.revenue) || 0; });
            }
            
            let monthlyRfqs = Array(12).fill(0);
            rfqs.forEach(r => { const m = new Date(r.created_at).getMonth(); monthlyRfqs[m] += 1; });

            const cm = new Date().getMonth();
            window._dashData.monthly = {
                labels: monthsNames.slice(Math.max(0, cm - 6), cm + 1),
                sales: monthlySales.slice(Math.max(0, cm - 6), cm + 1),
                rfqs: monthlyRfqs.slice(Math.max(0, cm - 6), cm + 1).map(v => v * 500)
            };
            let weeklySales = Array(7).fill(0);
            let weeklyRfqs = Array(7).fill(0);
            const todayD = new Date();
            todayD.setHours(0,0,0,0);
            
            if (weeklyOrdersData) {
                weeklyOrdersData.forEach(o => {
                    const od = new Date(o.created_at);
                    od.setHours(0,0,0,0);
                    const diff = Math.floor((todayD - od) / (1000*3600*24));
                    if (diff >= 0 && diff < 7) {
                        weeklySales[6 - diff] += parseFloat(o.total_amount) || 0;
                    }
                });
            }
            if (weeklyRfqsData) {
                weeklyRfqsData.forEach(r => {
                    const rd = new Date(r.created_at);
                    rd.setHours(0,0,0,0);
                    const diff = Math.floor((todayD - rd) / (1000*3600*24));
                    if (diff >= 0 && diff < 7) {
                        weeklyRfqs[6 - diff] += 1;
                    }
                });
            }

            window._dashData.weekly = {
                labels: Array.from({length:7}, (_, i) => { const d = new Date(); d.setDate(d.getDate()-(6-i)); return d.toLocaleDateString('ar-JO',{weekday:'short'}); }),
                sales: weeklySales,
                rfqs: weeklyRfqs.map(v => v * 100) // Scale RFQs to make them visible on the same chart
            };

            renderSalesChart('monthly');

            const catSales = {};
            let totalSalesAmount = 0;
            if (salesByCategoryData && salesByCategoryData.length > 0) {
                salesByCategoryData.forEach(s => { 
                    if (s.category) {
                        catSales[s.category] = parseFloat(s.revenue) || 0; 
                        totalSalesAmount += catSales[s.category];
                    }
                });
            } else if (periodOrdersData && allProductsData) {
                const prodCatMap = {};
                allProductsData.forEach(p => { prodCatMap[p.id] = p.category; });
                
                periodOrdersData.forEach(order => {
                    if (Array.isArray(order.items)) {
                        order.items.forEach(item => {
                            const pid = item.productId || item.product_id;
                            const cat = prodCatMap[pid] || 'other';
                            const qty = parseInt(item.quantity) || 1;
                            const price = parseFloat(item.price) || 0;
                            catSales[cat] = (catSales[cat] || 0) + (qty * price);
                            totalSalesAmount += (qty * price);
                        });
                    }
                });
            }
            const catLabelsMap = { 'measurement':'أجهزة الفحص','safety':'السلامة','attendance':'تسجيل الدوام','monitoring':'المراقبة والتحكم','alarm':'أنظمة الإنذار','fire_other':'إطفاء الحريق', 'other':'أخرى', 'none': 'غير مصنف' };
            const catColors = ['#1565C0','#FF6B00','#F44336','#7C3AED','#00C853','#FFD600','#00ACC1','#8D6E63','#9E9E9E'];
            const catKeys = Object.keys(catSales);

            if (catKeys.length > 0 && totalSalesAmount > 0) {
                getOrCreateChart('categoryChart', {
                    type: 'doughnut',
                    data: {
                        labels: catKeys.map(k => catLabelsMap[k] || k),
                        datasets: [{ data: catKeys.map(k => catSales[k]), backgroundColor: catColors.slice(0, catKeys.length), borderWidth: 0 }]
                    },
                    options: {
                        responsive: true, cutout: '70%',
                        plugins: { legend: { display: true, position: 'bottom', labels: { font: { family:'Cairo', size: 11 }, padding: 12 } } }
                    }
                });
                const catStatsList = document.getElementById('category-stats-list');
                if (catStatsList) {
                    catStatsList.innerHTML = catKeys.map((k, idx) => {
                        const pct = Math.round((catSales[k] / totalSalesAmount) * 100);
                        return `
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="width:12px;height:12px;background:${catColors[idx]};border-radius:3px;display:inline-block;"></span>
                                <span style="font-size:var(--text-xs);color:var(--gray-600);">${catLabelsMap[k] || k}</span>
                            </div>
                            <span style="font-size:var(--text-xs);font-weight:700;color:var(--dark-800);">${pct}%</span>
                        </div>`;
                    }).join('');
                }
            } else {
                const el = document.getElementById('category-stats-list');
                if (el) el.innerHTML = emptyStateDiv('لا توجد مبيعات بعد');
            }

            const rfqStatusCounts = { 'انتظار': 0, 'أُرسل': 0, 'موافقة': 0, 'رفض': 0 };
            rfqs.forEach(r => { rfqStatusCounts[r.status] = (rfqStatusCounts[r.status] || 0) + 1; });
            getOrCreateChart('rfqChart', {
                type: 'bar',
                data: {
                    labels: Object.keys(rfqStatusCounts),
                    datasets: [{ data: Object.values(rfqStatusCounts), backgroundColor: ['#FFD600','#FF6B00','#00C853','#F44336'], borderRadius: 6 }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0, font:{family:'Cairo'} } },
                        x: { grid:{display:false}, ticks:{font:{family:'Cairo'}} }
                    }
                }
            });
        }

    } catch (err) {
        console.error('Error loading overview:', err);
        showSectionError('section-overview', err.message);
    }
}

// ─── Sales chart renderer (monthly / weekly) ──────────────────────────────────
function renderSalesChart(period) {
    const d = window._dashData[period];
    if (!d || typeof Chart === 'undefined') return;
    getOrCreateChart('salesChart', {
        type: 'line',
        data: {
            labels: d.labels,
            datasets: [{
                label: 'المبيعات (د.أ)',
                data: d.sales,
                fill: true, borderColor: '#1565C0', backgroundColor: 'rgba(21,101,192,0.08)',
                tension: 0.4, pointBackgroundColor: '#1565C0', pointRadius: 5, borderWidth: 2.5
            }, {
                label: 'عروض الأسعار (مؤشر)',
                data: d.rfqs,
                fill: false, borderColor: '#FF6B00', borderDash: [5,5],
                tension: 0.4, pointBackgroundColor: '#FF6B00', pointRadius: 4, borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true, position: 'top', labels: { font:{family:'Cairo'}, padding: 16 } } },
            scales: {
                y: { beginAtZero: true, ticks: { font:{family:'Cairo'}, callback: v => v.toLocaleString('en-US') } },
                x: { grid:{display:false}, ticks:{font:{family:'Cairo'}} }
            }
        }
    });
}

// Wire filter buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.chart-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.chart-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderSalesChart(this.dataset.period);
        });
    });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusClass(status) {
    if (!status) return 'pending';
    if (status === 'تم الشحن') return 'shipped';
    if (status === 'تم التسليم') return 'delivered';
    if (status === 'معالجة') return 'processing';
    return 'pending';
}

function emptyStateRow(cols, msg) {
    return `<tr><td colspan="${cols}">
        <div style="text-align:center;padding:2rem;color:var(--gray-400);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-bottom:.75rem;opacity:.4"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            <div style="font-weight:600;color:var(--gray-500);font-size:14px;">${msg}</div>
        </div>
    </td></tr>`;
}

function emptyStateDiv(msg) {
    return `<div style="text-align:center;padding:1.5rem;color:var(--gray-400);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-bottom:.5rem;opacity:.4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <div style="font-size:13px;font-weight:600;color:var(--gray-500);">${msg}</div>
    </div>`;
}

function showSectionError(sectionId, errMsg) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'background:#FFEBEE;border:1px solid #FFCDD2;border-radius:8px;padding:1rem;margin:1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;';
    errDiv.innerHTML = `
        <div style="display:flex;align-items:center;gap:.75rem;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C62828" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style="color:#C62828;font-weight:600;font-size:13px;">فشل تحميل البيانات: ${errMsg}</span>
        </div>
        <button onclick="loadDashboardData()" style="background:#C62828;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px;font-family:Cairo,sans-serif;">إعادة المحاولة</button>`;
    section.prepend(errDiv);
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
async function loadDashboardProducts() {
    const tbody = document.getElementById('products-list');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(6);
    try {
        const { data: products, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const catLabelsMap = { 'measurement':'أجهزة الفحص والقياس','safety':'أدوات السلامة العامة','attendance':'أجهزة تسجيل دوام الموظفين','monitoring':'أجهزة المراقبة والتحكم','alarm':'اجهزة انذار السرقة و إنذار الحريق','fire_other':'أجهزة إطفاء الحريق', 'other':'أخرى' };
        if (!products || products.length === 0) { tbody.innerHTML = emptyStateRow(6, 'لا توجد منتجات مسجلة'); return; }
        tbody.innerHTML = products.map(p => `
            <tr>
                <td><div style="font-weight:600;">${p.title || '-'}</div><div style="font-size:11px;color:var(--gray-400);">${p.brand || ''}</div></td>
                <td><span class="badge badge-primary">${catLabelsMap[p.category] || p.category || '-'}</span></td>
                <td style="font-weight:700;">
                    ${p.price ? Number(p.price).toLocaleString('en-US') + ' د.أ' : 'طلب سعر'}
                    ${p.discount_percentage > 0 ? `<br><small style="color:var(--danger);font-size:10px;">(خصم ${p.discount_percentage}%)</small>` : ''}
                </td>
                <td><span style="font-weight:600; color:${(p.stock ?? 0) <= 0 ? 'var(--danger)' : 'inherit'};">${p.stock ?? 0} حبة</span></td>
                <td><span class="badge badge-success">نشط</span></td>
                <td>
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-outline btn-sm" style="font-size:11px;" onclick="editProduct('${p.id}')">تعديل</button>
                        <button class="btn btn-sm" style="font-size:11px;background:#FFEBEE;color:#C62828;" onclick="deleteProduct('${p.id}')">حذف</button>
                    </div>
                </td>
            </tr>`).join('');
    } catch (err) {
        console.error('Error loading products:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:1rem;">${err.message} <button onclick="loadDashboardProducts()" style="cursor:pointer;margin-right:8px;">إعادة المحاولة</button></td></tr>`;
    }
}

async function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', 'تم حذف المنتج بنجاح', 'success');
        loadDashboardProducts(); loadDashboardOverview();
    } catch (err) { showToast('خطأ', 'تعذر الحذف: ' + err.message, 'error'); }
}

// --- Global Discount ---
window.openGlobalDiscountModal = function() {
    document.getElementById('globalDiscountValue').value = '';
    document.getElementById('globalDiscountModal').style.display = 'flex';
};

window.closeGlobalDiscountModal = function() {
    document.getElementById('globalDiscountModal').style.display = 'none';
};

window.applyGlobalDiscount = async function() {
    const val = document.getElementById('globalDiscountValue').value;
    if (val === '') {
        showToast('تنبيه', 'يرجى إدخال نسبة الخصم', 'warning');
        return;
    }
    const discount = parseFloat(val);
    if (discount < 0 || discount > 100) {
        showToast('تنبيه', 'نسبة الخصم يجب أن تكون بين 0 و 100', 'warning');
        return;
    }
    if (!confirm(`هل أنت متأكد من تطبيق خصم بقيمة ${discount}% على جميع المنتجات في المتجر؟`)) return;
    
    try {
        const btn = document.getElementById('btnGlobalDiscountSave');
        btn.innerHTML = 'جاري التطبيق... <span class="spinner" style="width:12px;height:12px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 1s linear infinite;"></span>';
        btn.disabled = true;

        const { error } = await supabase.from('products').update({ discount_percentage: discount }).not('id', 'is', null);
        
        if (error) throw error;
        
        showToast('تم بنجاح', `تم تطبيق خصم ${discount}% على جميع المنتجات`, 'success');
        closeGlobalDiscountModal();
        loadDashboardProducts();
    } catch (err) {
        showToast('خطأ', 'تعذر تطبيق الخصم: ' + err.message, 'error');
    } finally {
        const btn = document.getElementById('btnGlobalDiscountSave');
        btn.innerHTML = 'تطبيق الخصم';
        btn.disabled = false;
    }
};

function openProductModal() {
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('prodStock').value = '10'; // Default stock for new products
    document.getElementById('prodDocumentsContainer').innerHTML = ''; // Clear documents
    document.getElementById('productModal').style.display = 'flex';
}
function closeProductModal() { document.getElementById('productModal').style.display = 'none'; }

async function editProduct(id) {
    try {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('prodId').value = data.id;
        document.getElementById('prodTitle').value = data.title;
        document.getElementById('prodBrand').value = data.brand;
        document.getElementById('prodCat').value = data.category;
        document.getElementById('prodPrice').value = data.price || '';
        document.getElementById('prodDiscount').value = data.discount_percentage || '0';
        document.getElementById('prodStock').value = data.stock ?? '0';
        document.getElementById('prodRfq').value = data.is_rfq.toString();
        document.getElementById('prodBadges').value = (data.badges || []).join(', ');
        document.getElementById('prodSpecs').value = (data.specs || []).join(', ');
        document.getElementById('prodDesc').value = data.description || '';
        
        // Save existing media URLs to hidden fields
        document.getElementById('existingImages').value = JSON.stringify(data.images || []);
        document.getElementById('existingVideos').value = JSON.stringify(data.videos || []);
        
        // Load existing documents into dynamic rows
        document.getElementById('prodDocumentsContainer').innerHTML = '';
        if (data.documents && Array.isArray(data.documents)) {
            data.documents.forEach(doc => addDocumentRow(doc.title, doc.url));
        }
        
        document.getElementById('productModalTitle').textContent = 'تعديل المنتج';
        document.getElementById('productModal').style.display = 'flex';
    } catch (err) { showToast('خطأ', 'تعذر جلب تفاصيل المنتج', 'error'); }
}

function addDocumentRow(title = '', url = '') {
    const container = document.getElementById('prodDocumentsContainer');
    const row = document.createElement('div');
    row.className = 'doc-row grid grid-2';
    row.style.gap = 'var(--space-2)';
    row.style.marginBottom = 'var(--space-2)';
    row.style.alignItems = 'end';
    row.innerHTML = `
        <div>
            <label style="font-size:11px;color:var(--gray-600);margin-bottom:4px;display:block;">اسم الملف (مثال: دليل المستخدم)</label>
            <input type="text" class="form-control doc-title" value="${title}" placeholder="اسم الملف" required />
        </div>
        <div style="display:flex;gap:var(--space-2);">
            <div style="flex:1;">
                <label style="font-size:11px;color:var(--gray-600);margin-bottom:4px;display:block;">رفع الملف</label>
                <input type="hidden" class="doc-existing-url" value="${url}" />
                ${url ? `<div style="font-size:11px; margin-bottom:4px;"><a href="${url}" target="_blank" style="color:var(--primary-600);text-decoration:underline;">الملف الحالي (للتغيير اختر ملفاً جديداً)</a></div>` : ''}
                <input type="file" class="form-control doc-file" ${url ? '' : 'required'} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
            </div>
            <button type="button" class="btn btn-outline" style="color:var(--danger);border-color:var(--danger);padding:0 var(--space-3);height:44px;" onclick="this.closest('.doc-row').remove()" title="حذف">×</button>
        </div>
    `;
    container.appendChild(row);
}

async function uploadMediaFiles(files) {
    const urls = [];
    for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-media').upload(fileName, file);
        if (uploadError) {
            console.error("Upload error details:", uploadError);
            throw new Error('فشل في رفع الملف: ' + file.name + ' - السبب: ' + uploadError.message);
        }
        const { data } = supabase.storage.from('product-media').getPublicUrl(fileName);
        urls.push(data.publicUrl);
    }
    return urls;
}

async function saveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('prodSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الرفع والحفظ...';
    try {
        const id = document.getElementById('prodId').value;
        const priceVal = document.getElementById('prodPrice').value;
        const discountVal = document.getElementById('prodDiscount').value;
        const badgesStr = document.getElementById('prodBadges').value;
        const specsStr = document.getElementById('prodSpecs').value;
        
        // Upload new files if selected
        const imgFiles = document.getElementById('prodImagesFile').files;
        const vidFiles = document.getElementById('prodVideosFile').files;
        const newImages = imgFiles.length > 0 ? await uploadMediaFiles(imgFiles) : [];
        const newVideos = vidFiles.length > 0 ? await uploadMediaFiles(vidFiles) : [];
        
        // Combine with existing files
        const existingImages = JSON.parse(document.getElementById('existingImages').value || '[]');
        const existingVideos = JSON.parse(document.getElementById('existingVideos').value || '[]');
        
        // Gather documents
        const docRows = document.querySelectorAll('#prodDocumentsContainer .doc-row');
        const documents = [];
        for (const row of docRows) {
            const title = row.querySelector('.doc-title').value.trim();
            const existingUrl = row.querySelector('.doc-existing-url') ? row.querySelector('.doc-existing-url').value : '';
            const fileInput = row.querySelector('.doc-file');
            
            if (!title) continue;
            
            let docUrl = existingUrl;
            if (fileInput && fileInput.files.length > 0) {
                const urls = await uploadMediaFiles(fileInput.files);
                if (urls && urls.length > 0) {
                    docUrl = urls[0];
                }
            }
            
            if (docUrl) {
                documents.push({ title, url: docUrl });
            }
        }
        
        const payload = {
            title: document.getElementById('prodTitle').value,
            brand: document.getElementById('prodBrand').value,
            category: document.getElementById('prodCat').value,
            price: priceVal ? parseFloat(priceVal) : null,
            discount_percentage: discountVal ? parseFloat(discountVal) : 0,
            stock: document.getElementById('prodStock').value ? parseInt(document.getElementById('prodStock').value) : 0,
            is_rfq: document.getElementById('prodRfq').value === 'true',
            description: document.getElementById('prodDesc').value,
            badges: badgesStr ? badgesStr.split(',').map(s => s.trim()).filter(Boolean) : [],
            specs: specsStr ? specsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
            images: [...existingImages, ...newImages],
            videos: [...existingVideos, ...newVideos],
            documents: documents,
            image_type: document.getElementById('prodCat').value
        };
        const res = id
            ? await supabase.from('products').update(payload).eq('id', id)
            : await supabase.from('products').insert([payload]);
        if (res.error) throw res.error;
        showToast('تم بنجاح', 'تم حفظ المنتج بنجاح', 'success');
        closeProductModal();
        loadDashboardProducts();
        loadDashboardOverview();
    } catch (err) {
        showToast('خطأ', err.message || 'تعذر حفظ المنتج', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ المنتج';
    }
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────
async function loadDashboardServices() {
    const tbody = document.getElementById('services-manage-list');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(6);
    try {
        const { data: services, error } = await supabase.from('services').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!services || services.length === 0) { tbody.innerHTML = emptyStateRow(6, 'لا توجد خدمات حتى الآن'); return; }
        
        tbody.innerHTML = services.map(s => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${s.icon_url ? `<img src="${s.icon_url}" style="width:24px;height:24px;object-fit:contain;border-radius:4px;border:1px solid var(--gray-200);" />` : ''}
                        <span style="font-weight:700;color:var(--dark-800);">${s.title}</span>
                    </div>
                </td>
                <td style="color:var(--primary-600);">${s.category || 'فحوصات بيئة العمل'}</td>
                <td style="color:var(--gray-600);">${s.title_en || '-'}</td>
                <td style="font-weight:700;">${s.price_starts_at ? (s.discount_percentage > 0 ? `<span style="text-decoration:line-through;color:var(--gray-500);font-size:0.9em;margin-left:4px;">${s.price_starts_at} د.أ</span><br><span style="color:var(--primary-600);">${(s.price_starts_at * (1 - s.discount_percentage/100)).toFixed(2)} د.أ</span> <span style="font-size:10px;color:white;background:var(--red-500);padding:2px 4px;border-radius:4px;">-${s.discount_percentage}%</span>` : s.price_starts_at + ' د.أ') : '-'}</td>
                <td><span style="display:inline-block;padding:2px 8px;border-radius:12px;background:var(--gray-100);font-size:11px;">${s.theme_color || 'yellow'}</span></td>
                <td>${new Date(s.created_at).toLocaleDateString('ar-JO')}</td>
                <td>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="editService('${s.id}')" style="font-size:11px;">تعديل</button>
                        <button class="btn btn-outline btn-sm" onclick="deleteService('${s.id}')" style="font-size:11px;color:red;border-color:red;">حذف</button>
                    </div>
                </td>
            </tr>`).join('');
    } catch (err) {
        tbody.innerHTML = emptyStateRow(6, 'حدث خطأ في تحميل الخدمات');
        console.error(err);
    }
}

async function deleteService(id) {
    if(!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    try {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', 'تم حذف الخدمة بنجاح', 'success');
        loadDashboardServices();
    } catch (err) { console.error(err); showToast('خطأ', 'تعذر الحذف', 'error'); }
}

function openServiceModal() {
    document.getElementById('serviceForm').reset();
    document.getElementById('srvId').value = '';
    document.getElementById('srvExistingIconUrl').value = '';
    document.getElementById('srvIconFile').value = '';
    document.getElementById('srvIconPreviewContainer').style.display = 'none';
    document.getElementById('srvIconPreview').src = '';
    document.getElementById('serviceModalTitle').textContent = 'إضافة خدمة جديدة';
    document.getElementById('serviceModal').style.display = 'flex';
}
function closeServiceModal() { document.getElementById('serviceModal').style.display = 'none'; }

async function editService(id) {
    try {
        const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('srvId').value = data.id;
        document.getElementById('srvCategory').value = data.category || 'فحوصات بيئة العمل';
        document.getElementById('srvTitle').value = data.title;
        document.getElementById('srvTitleEn').value = data.title_en || '';
        document.getElementById('srvPrice').value = data.price_starts_at || '';
        document.getElementById('srvDiscount').value = data.discount_percentage || 0;
        document.getElementById('srvColor').value = data.theme_color || 'yellow';
        document.getElementById('srvDesc').value = data.description || '';
        document.getElementById('srvFeatures').value = (data.features || []).join(', ');
        
        document.getElementById('srvExistingIconUrl').value = data.icon_url || '';
        document.getElementById('srvIconFile').value = '';
        if (data.icon_url) {
            document.getElementById('srvIconPreview').src = data.icon_url;
            document.getElementById('srvIconPreviewContainer').style.display = 'flex';
        } else {
            document.getElementById('srvIconPreview').src = '';
            document.getElementById('srvIconPreviewContainer').style.display = 'none';
        }
        
        document.getElementById('serviceModalTitle').textContent = 'تعديل الخدمة';
        document.getElementById('serviceModal').style.display = 'flex';
    } catch (err) { showToast('خطأ', 'تعذر جلب تفاصيل الخدمة', 'error'); }
}

async function saveService(e) {
    e.preventDefault();
    const btn = document.getElementById('srvSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الحفظ...';
    try {
        const id = document.getElementById('srvId').value;
        const priceVal = document.getElementById('srvPrice').value;
        const featuresStr = document.getElementById('srvFeatures').value;
        
        const fileInput = document.getElementById('srvIconFile');
        const existingIconUrl = document.getElementById('srvExistingIconUrl').value;
        
        let finalIconUrl = existingIconUrl;
        
        if (fileInput.files && fileInput.files.length > 0) {
            const urls = await uploadMediaFiles(fileInput.files);
            if (urls && urls.length > 0) {
                finalIconUrl = urls[0];
            }
        }
        
        const payload = {
            category: document.getElementById('srvCategory').value,
            title: document.getElementById('srvTitle').value,
            title_en: document.getElementById('srvTitleEn').value,
            description: document.getElementById('srvDesc').value,
            price_starts_at: priceVal ? parseFloat(priceVal) : null,
            discount_percentage: parseFloat(document.getElementById('srvDiscount').value) || 0,
            theme_color: document.getElementById('srvColor').value,
            features: featuresStr ? featuresStr.split(',').map(s => s.trim()).filter(Boolean) : [],
            icon_url: finalIconUrl ? finalIconUrl : null
        };
        
        const res = id
            ? await supabase.from('services').update(payload).eq('id', id)
            : await supabase.from('services').insert([payload]);
        if (res.error) throw res.error;
        showToast('تم بنجاح', 'تم حفظ الخدمة بنجاح', 'success');
        closeServiceModal();
        loadDashboardServices();
    } catch (err) {
        showToast('خطأ', err.message || 'تعذر حفظ الخدمة', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ الخدمة';
    }
}
// ─── FEATURES (COMPANY FEATURES) ──────────────────────────────────────────────────────────
async function loadDashboardFeatures() {
    const tbody = document.getElementById('features-list');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(5);
    try {
        const { data: features, error } = await supabase.from('company_features').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        if (!features || features.length === 0) { tbody.innerHTML = emptyStateRow(5, 'لا توجد مميزات مضافة بعد'); return; }
        
        tbody.innerHTML = features.map(f => `
            <tr>
                <td style="font-size:24px;">${f.icon}</td>
                <td style="font-weight:700;color:var(--dark-800);">${f.title}</td>
                <td style="color:var(--gray-600); max-width: 300px; white-space: normal;">${f.description}</td>
                <td><span style="display:inline-block;padding:2px 8px;border-radius:12px;background:var(--gray-100);font-size:11px;">${f.theme_color || 'blue'}</span></td>
                <td>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="editFeature('${f.id}')" style="font-size:11px;">تعديل</button>
                        <button class="btn btn-outline btn-sm" onclick="deleteFeature('${f.id}')" style="font-size:11px;color:red;border-color:red;">حذف</button>
                    </div>
                </td>
            </tr>`).join('');
    } catch (err) {
        tbody.innerHTML = emptyStateRow(5, 'حدث خطأ في تحميل المميزات');
        console.error('Error loading features:', err);
    }
    
    loadPartners();
    loadCertificates();
}

async function deleteFeature(id) {
    if(!confirm('هل أنت متأكد من حذف هذه الميزة؟')) return;
    try {
        const { error } = await supabase.from('company_features').delete().eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', 'تم الحذف بنجاح', 'success');
        loadDashboardFeatures();
    } catch (err) { console.error(err); showToast('خطأ', 'تعذر الحذف', 'error'); }
}

function openFeatureModal() {
    document.getElementById('featureForm').reset();
    document.getElementById('featId').value = '';
    document.getElementById('featureModalTitle').textContent = 'إضافة ميزة جديدة';
    document.getElementById('featureModal').style.display = 'flex';
}
function closeFeatureModal() { document.getElementById('featureModal').style.display = 'none'; }

async function editFeature(id) {
    try {
        const { data, error } = await supabase.from('company_features').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('featId').value = data.id;
        document.getElementById('featIcon').value = data.icon || '';
        document.getElementById('featTitle').value = data.title || '';
        document.getElementById('featDesc').value = data.description || '';
        document.getElementById('featColor').value = data.theme_color || 'blue';
        
        document.getElementById('featureModalTitle').textContent = 'تعديل الميزة';
        document.getElementById('featureModal').style.display = 'flex';
    } catch (err) { showToast('خطأ', 'تعذر جلب تفاصيل الميزة', 'error'); }
}

async function saveFeature(e) {
    e.preventDefault();
    const btn = document.getElementById('featSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الحفظ...';
    try {
        const id = document.getElementById('featId').value;
        const payload = {
            icon: document.getElementById('featIcon').value,
            title: document.getElementById('featTitle').value,
            description: document.getElementById('featDesc').value,
            theme_color: document.getElementById('featColor').value
        };
        
        const res = id
            ? await supabase.from('company_features').update(payload).eq('id', id)
            : await supabase.from('company_features').insert([payload]);
        if (res.error) throw res.error;
        showToast('تم بنجاح', 'تم حفظ الميزة بنجاح', 'success');
        closeFeatureModal();
        loadDashboardFeatures();
    } catch (err) {
        showToast('خطأ', err.message || 'تعذر حفظ الميزة', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ الميزة';
    }
}

// ─── PARTNERS ────────────────────────────────────────────────────────────────
async function loadPartners() {
    const tbody = document.getElementById('partners-list');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(4);
    try {
        const { data, error } = await supabase.from('company_partners').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) { tbody.innerHTML = emptyStateRow(4, 'لا يوجد شركاء مضافين بعد'); return; }
        
        tbody.innerHTML = data.map(p => `
            <tr>
                <td><img src="${p.logo_url}" alt="Logo" style="max-height:40px;border-radius:4px;background:#fff;padding:2px;"></td>
                <td style="font-weight:700;color:var(--dark-800);">${p.name}</td>
                <td>${p.display_order}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="deletePartner('${p.id}')" style="font-size:11px;color:red;border-color:red;">حذف</button>
                </td>
            </tr>`).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = emptyStateRow(4, 'حدث خطأ في التحميل');
    }
}

window.openPartnerModal = function() {
    document.getElementById('partnerModalTitle').textContent = 'إضافة شريك جديد';
    document.getElementById('partner-id').value = '';
    document.getElementById('partner-name').value = '';
    document.getElementById('partner-logo').value = '';
    document.getElementById('partner-logo').required = true;
    document.getElementById('partner-logo-preview').style.display = 'none';
    document.getElementById('partner-order').value = '0';
    document.getElementById('partnerModal').style.display = 'flex';
};

window.savePartner = async function() {
    const id = document.getElementById('partner-id').value;
    const name = document.getElementById('partner-name').value;
    const order = document.getElementById('partner-order').value || 0;
    const fileInput = document.getElementById('partner-logo');
    
    if (!name) { showToast('تنبيه', 'يرجى إدخال اسم الشريك', 'error'); return; }
    if (!id && (!fileInput.files || fileInput.files.length === 0)) { showToast('تنبيه', 'يرجى اختيار صورة الشعار', 'error'); return; }
    
    const btn = document.getElementById('btn-save-partner');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    
    try {
        let logo_url = null;
        if (fileInput.files && fileInput.files.length > 0) {
            const urls = await uploadMediaFiles([fileInput.files[0]]);
            if (urls && urls.length > 0) logo_url = urls[0];
        }
        
        const payload = { name, display_order: parseInt(order) };
        if (logo_url) payload.logo_url = logo_url;
        
        const res = id ? await supabase.from('company_partners').update(payload).eq('id', id) : await supabase.from('company_partners').insert([payload]);
        if (res.error) throw res.error;
        
        showToast('تم', 'تم حفظ الشريك بنجاح', 'success');
        document.getElementById('partnerModal').style.display = 'none';
        loadPartners();
    } catch (err) {
        showToast('خطأ', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ';
    }
};

window.deletePartner = async function(id) {
    if(!confirm('هل أنت متأكد من حذف هذا الشريك؟')) return;
    try {
        const { error } = await supabase.from('company_partners').delete().eq('id', id);
        if (error) throw error;
        showToast('تم', 'تم الحذف بنجاح', 'success');
        loadPartners();
    } catch(err) { showToast('خطأ', err.message, 'error'); }
};

// ─── CERTIFICATES ────────────────────────────────────────────────────────────
async function loadCertificates() {
    const tbody = document.getElementById('certificates-list');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(4);
    try {
        const { data, error } = await supabase.from('company_certificates').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) { tbody.innerHTML = emptyStateRow(4, 'لا يوجد شهادات مضافة بعد'); return; }
        
        tbody.innerHTML = data.map(c => `
            <tr>
                <td><img src="${c.image_url}" alt="Certificate" style="max-height:50px;border-radius:4px;border:1px solid #ddd;padding:2px;"></td>
                <td style="font-weight:700;color:var(--dark-800);">${c.title}</td>
                <td>${c.display_order}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="deleteCertificate('${c.id}')" style="font-size:11px;color:red;border-color:red;">حذف</button>
                </td>
            </tr>`).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = emptyStateRow(4, 'حدث خطأ في التحميل');
    }
}

window.openCertificateModal = function() {
    document.getElementById('certificateModalTitle').textContent = 'إضافة شهادة جديدة';
    document.getElementById('certificate-id').value = '';
    document.getElementById('certificate-title').value = '';
    document.getElementById('certificate-image').value = '';
    document.getElementById('certificate-image').required = true;
    document.getElementById('certificate-image-preview').style.display = 'none';
    document.getElementById('certificate-order').value = '0';
    document.getElementById('certificateModal').style.display = 'flex';
};

window.saveCertificate = async function() {
    const id = document.getElementById('certificate-id').value;
    const title = document.getElementById('certificate-title').value;
    const order = document.getElementById('certificate-order').value || 0;
    const fileInput = document.getElementById('certificate-image');
    
    if (!title) { showToast('تنبيه', 'يرجى إدخال عنوان الشهادة', 'error'); return; }
    if (!id && (!fileInput.files || fileInput.files.length === 0)) { showToast('تنبيه', 'يرجى اختيار صورة الشهادة', 'error'); return; }
    
    const btn = document.getElementById('btn-save-certificate');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    
    try {
        let image_url = null;
        if (fileInput.files && fileInput.files.length > 0) {
            const urls = await uploadMediaFiles([fileInput.files[0]]);
            if (urls && urls.length > 0) image_url = urls[0];
        }
        
        const payload = { title, display_order: parseInt(order) };
        if (image_url) payload.image_url = image_url;
        
        const res = id ? await supabase.from('company_certificates').update(payload).eq('id', id) : await supabase.from('company_certificates').insert([payload]);
        if (res.error) throw res.error;
        
        showToast('تم', 'تم حفظ الشهادة بنجاح', 'success');
        document.getElementById('certificateModal').style.display = 'none';
        loadCertificates();
    } catch (err) {
        showToast('خطأ', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ';
    }
};

window.deleteCertificate = async function(id) {
    if(!confirm('هل أنت متأكد من حذف هذه الشهادة؟')) return;
    try {
        const { error } = await supabase.from('company_certificates').delete().eq('id', id);
        if (error) throw error;
        showToast('تم', 'تم الحذف بنجاح', 'success');
        loadCertificates();
    } catch(err) { showToast('خطأ', err.message, 'error'); }
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
async function loadDashboardOrders() {
    const tbody = document.querySelector('#section-orders .data-table tbody');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(8);
    try {
        const { data: ordersData, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!ordersData || ordersData.length === 0) { tbody.innerHTML = emptyStateRow(8, 'لا توجد طلبات حتى الآن'); return; }
        
        window._ordersList = ordersData || [];
        filterAndSortOrders();
    } catch (err) {
        console.error('Error loading orders:', err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;padding:1rem;">${err.message} <button onclick="loadDashboardOrders()" style="cursor:pointer;">إعادة المحاولة</button></td></tr>`;
    }
}

window.filterAndSortOrders = function() {
    if (!window._ordersList) return;
    let filtered = [...window._ordersList];
    
    // Filter by status
    const statusFilter = document.getElementById('orders-status-filter') ? document.getElementById('orders-status-filter').value : 'all';
    if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === statusFilter || (statusFilter === 'قيد المراجعة' && o.status === 'بانتظار التأكيد') || (statusFilter === 'تم التسليم' && o.status === 'مكتمل'));
    }
    
    // Date Filter
    const fromDate = document.getElementById('orders-date-from') ? document.getElementById('orders-date-from').value : '';
    const toDate = document.getElementById('orders-date-to') ? document.getElementById('orders-date-to').value : '';
    if (fromDate) {
        filtered = filtered.filter(o => new Date(o.created_at) >= new Date(fromDate));
    }
    if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => new Date(o.created_at) <= toD);
    }
    
    // Sort
    const sortVal = document.getElementById('orders-sort') ? document.getElementById('orders-sort').value : 'newest';
    if (sortVal === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'oldest') {
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'total_desc') {
        filtered.sort((a, b) => (parseFloat(b.total_amount) || 0) - (parseFloat(a.total_amount) || 0));
    } else if (sortVal === 'total_asc') {
        filtered.sort((a, b) => (parseFloat(a.total_amount) || 0) - (parseFloat(b.total_amount) || 0));
    }
    
    // Push completed to bottom if sorting by date (or in general)
    if (sortVal === 'newest' || sortVal === 'oldest') {
        filtered.sort((a, b) => (a.status === 'مكتمل' || a.status === 'تم التوصيل' || a.status === 'تم التسليم' ? 1 : 0) - (b.status === 'مكتمل' || b.status === 'تم التوصيل' || b.status === 'تم التسليم' ? 1 : 0));
    }

    renderOrders(filtered);
};

function renderOrders(orders) {
    const tbody = document.querySelector('#section-orders .data-table tbody');
    if (!tbody) return;
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1rem;">لا توجد طلبات مطابقة</td></tr>`;
        return;
    }
    
    tbody.innerHTML = orders.map(order => {
        let receiptBtn = '';
        const urlMatch = order.payment_status?.match(/(https?:\/\/[^\s)]+)/);
        if (urlMatch) {
            receiptBtn = `<div style="margin-top:4px;"><a href="${urlMatch[1]}" target="_blank" style="display:inline-block;background:#0F172A;color:white;padding:2px 8px;border-radius:4px;font-size:10px;text-decoration:none;">عرض الإيصال</a></div>`;
        }
        
        return `
        <tr style="${order.status === 'مكتمل' || order.status === 'تم التوصيل' || order.status === 'تم التسليم' ? 'opacity:0.6;background:var(--gray-50);' : ''}">
            <td style="font-weight:700;color:var(--primary-700);">#${order.id.split('-')[0]}</td>
            <td>${order.customer_name || '-'}</td>
            <td>${Array.isArray(order.items) ? order.items.length : 0} منتج</td>
            <td>${(parseFloat(order.total_amount)||0).toLocaleString('en-US')} د.أ</td>
            <td>
                <select onchange="changePaymentStatus('${order.id}', this.value)" style="padding:4px;border:1px solid var(--gray-200);border-radius:4px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:bold;background:${order.payment_status === 'مدفوع' ? '#dcfce7' : '#e0f2fe'};color:${order.payment_status === 'مدفوع' ? '#166534' : '#075985'};">
                    <option value="غير مدفوع" ${order.payment_status !== 'مدفوع' ? 'selected' : ''}>غير مدفوع / بانتظار تأكيد</option>
                    <option value="مدفوع" ${order.payment_status === 'مدفوع' ? 'selected' : ''}>مدفوع</option>
                </select>
                ${receiptBtn}
            </td>
            <td>
                <select onchange="changeOrderStatus('${order.id}', this.value, '${order.status}')" style="padding:4px;border:1px solid var(--gray-200);border-radius:4px;font-family:'Cairo',sans-serif;font-size:12px;background:white;">
                    <option value="بانتظار التأكيد" ${order.status === 'بانتظار التأكيد' || order.status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option>
                    <option value="قيد المعالجة" ${order.status === 'قيد المعالجة' ? 'selected' : ''}>قيد المعالجة</option>
                    <option value="تم الشحن" ${order.status === 'تم الشحن' ? 'selected' : ''}>تم الشحن</option>
                    <option value="تم التسليم" ${order.status === 'تم التسليم' || order.status === 'مكتمل' ? 'selected' : ''}>تم التسليم</option>
                    <option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
                </select>
            </td>
            <td>${new Date(order.created_at).toLocaleDateString('en-US')}</td>
            <td class="no-print">
                <div style="display:flex;gap:4px;align-items:center;">
                    <button class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 8px;" onclick="showOrderDetails('${order.id}')">تفاصيل</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.printOrders = function() {
    if (!window._ordersList || window._ordersList.length === 0) {
        showToast('تنبيه', 'لا يوجد طلبات للطباعة', 'info');
        return;
    }
    
    let filtered = [...window._ordersList];
    const statusFilter = document.getElementById('orders-status-filter') ? document.getElementById('orders-status-filter').value : 'all';
    if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === statusFilter || (statusFilter === 'قيد المراجعة' && o.status === 'بانتظار التأكيد') || (statusFilter === 'تم التسليم' && o.status === 'مكتمل'));
    }
    
    const fromDate = document.getElementById('orders-date-from') ? document.getElementById('orders-date-from').value : '';
    const toDate = document.getElementById('orders-date-to') ? document.getElementById('orders-date-to').value : '';
    if (fromDate) {
        filtered = filtered.filter(o => new Date(o.created_at) >= new Date(fromDate));
    }
    if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => new Date(o.created_at) <= toD);
    }
    
    const sortVal = document.getElementById('orders-sort') ? document.getElementById('orders-sort').value : 'newest';
    if (sortVal === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'oldest') {
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'total_desc') {
        filtered.sort((a, b) => (parseFloat(b.total_amount) || 0) - (parseFloat(a.total_amount) || 0));
    } else if (sortVal === 'total_asc') {
        filtered.sort((a, b) => (parseFloat(a.total_amount) || 0) - (parseFloat(b.total_amount) || 0));
    }

    let html = `
        <html dir="rtl">
        <head>
            <title>كشف إدارة الطلبات</title>
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; color: #333; }
                h2 { text-align: center; color: #0F2C59; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 14px; }
                th { background-color: #f8f9fa; color: #0F2C59; }
                .status { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
                .status-success { background-color: #dcfce7; color: #166534; }
                .status-pending { background-color: #e0f2fe; color: #075985; }
                .status-shipped { background-color: #fef08a; color: #854d0e; }
                .status-cancelled { background-color: #fee2e2; color: #991b1b; }
                @media print {
                    @page { margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h2>كشف جميع الطلبات</h2>
            <div style="text-align:left; font-size:12px; color:#666; margin-bottom:10px;">تاريخ الطباعة: ${new Date().toLocaleDateString('en-US')}</div>
            <table>
                <thead>
                    <tr>
                        <th>رقم الطلب</th>
                        <th>العميل</th>
                        <th>عدد المنتجات</th>
                        <th>الإجمالي</th>
                        <th>حالة الدفع</th>
                        <th>حالة الطلب</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filtered.forEach(order => {
        let payClass = order.payment_status === 'مدفوع' ? 'status status-success' : 'status status-pending';
        let ordClass = (order.status === 'مكتمل' || order.status === 'تم التسليم') ? 'status status-success' : 
                       order.status === 'ملغي' ? 'status status-cancelled' : 
                       order.status === 'تم الشحن' ? 'status status-shipped' : 'status status-pending';
        html += `
            <tr>
                <td style="font-weight:bold;">#${order.id.split('-')[0]}</td>
                <td>${order.customer_name || '-'}</td>
                <td>${Array.isArray(order.items) ? order.items.length : 0}</td>
                <td>${(parseFloat(order.total_amount)||0).toLocaleString('en-US')} د.أ</td>
                <td><span class="${payClass}">${order.payment_status === 'مدفوع' ? 'مدفوع' : 'غير مدفوع'}</span></td>
                <td><span class="${ordClass}">${order.status || 'قيد المراجعة'}</span></td>
                <td>${new Date(order.created_at).toLocaleDateString('en-US')}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </body>
        </html>
    `;

    const printWin = window.open('', '_blank');
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    
    setTimeout(() => {
        printWin.print();
        printWin.close();
    }, 250);
}

window.showOrderDetails = async function(orderId) {
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    const idSpan = document.getElementById('modalOrderId');
    if (!modal || !content || !idSpan) return;

    idSpan.textContent = '#' + orderId.split('-')[0];
    content.innerHTML = '<div style="text-align:center;padding:2rem;">جاري التحميل...</div>';
    modal.style.display = 'flex';

    try {
        const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (error) throw error;
        
        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            itemsHtml = `<table class="data-table" style="margin-top:1rem;width:100%;">
                <thead><tr><th style="text-align:right">المنتج</th><th style="text-align:center">الكمية</th><th style="text-align:left">السعر</th></tr></thead><tbody>` + 
                order.items.map(item => `<tr><td style="text-align:right">${item.title}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:left" dir="ltr">${(parseFloat(item.price)||0).toLocaleString('en-US')} د.أ</td></tr>`).join('') +
                `</tbody></table>`;
        } else {
            itemsHtml = '<p style="color:var(--gray-500);text-align:center;margin-top:1rem;">لا توجد تفاصيل منتجات</p>';
        }

        content.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;background:var(--gray-50);padding:1rem;border-radius:var(--radius-md);">
                <div><strong>العميل:</strong> ${order.customer_name || '-'}</div>
                <div><strong>الهاتف:</strong> <a href="tel:${order.customer_phone}" dir="ltr" style="display:inline-block">${order.customer_phone || '-'}</a></div>
                <div><strong>المدينة:</strong> ${order.delivery_city || '-'}</div>
                <div><strong>العنوان:</strong> ${order.delivery_address || '-'}</div>
                <div><strong>التاريخ:</strong> <span dir="ltr">${new Date(order.created_at).toLocaleString('en-GB')}</span></div>
                <div><strong>الإجمالي:</strong> ${(parseFloat(order.total_amount)||0).toLocaleString('en-US')} د.أ</div>
                <div style="grid-column:1/-1;"><strong>ملاحظات:</strong> ${order.notes || '-'}</div>
            </div>
            <h4 style="font-weight:700;margin-bottom:0.5rem;color:var(--dark-800);">المنتجات المطلوبة</h4>
            ${itemsHtml}
        `;
    } catch (err) {
        content.innerHTML = `<div style="text-align:center;padding:2rem;color:red;">تعذر تحميل تفاصيل الطلب: ${err.message}</div>`;
    }
};

// ─── RFQs ─────────────────────────────────────────────────────────────────────
async function loadDashboardRFQs() {
    const tbody = document.querySelector('#section-rfqs .data-table tbody');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(7);
    try {
        const { data: rfqsData, error } = await supabase.from('rfqs').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!rfqsData || rfqsData.length === 0) { tbody.innerHTML = emptyStateRow(7, 'لا توجد عروض أسعار حتى الآن'); return; }

        window._rfqsList = rfqsData || [];
        sortRfqs();
    } catch (err) {
        console.error('Error loading RFQs:', err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;padding:1rem;">${err.message} <button onclick="loadDashboardRFQs()" style="cursor:pointer;">إعادة المحاولة</button></td></tr>`;
    }
}

window.sortRfqs = function() {
    if (!window._rfqsList) return;
    let filtered = [...window._rfqsList];
    
    const fromDate = document.getElementById('rfqs-date-from') ? document.getElementById('rfqs-date-from').value : '';
    const toDate = document.getElementById('rfqs-date-to') ? document.getElementById('rfqs-date-to').value : '';
    if (fromDate) {
        filtered = filtered.filter(o => new Date(o.created_at) >= new Date(fromDate));
    }
    if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => new Date(o.created_at) <= toD);
    }
    
    const sortVal = document.getElementById('rfq-sort') ? document.getElementById('rfq-sort').value : 'newest';
    if (sortVal === 'newest') {
        filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'oldest') {
        filtered.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'company_asc') {
        filtered.sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ar'));
    } else if (sortVal === 'company_desc') {
        filtered.sort((a,b) => (b.company_name||'').localeCompare(a.company_name||'', 'ar'));
    }

    if (sortVal === 'newest' || sortVal === 'oldest') {
        filtered.sort((a, b) => (a.status === 'مكتمل' ? 1 : 0) - (b.status === 'مكتمل' ? 1 : 0));
    }
    
    renderRfqs(filtered);
};

function renderRfqs(rfqs) {
    const tbody = document.querySelector('#section-rfqs .data-table tbody');
    if (!tbody) return;
    if (!rfqs || rfqs.length === 0) {
        tbody.innerHTML = emptyStateRow(7, 'لا توجد عروض أسعار مطابقة');
        return;
    }
    tbody.innerHTML = rfqs.map((rfq, index) => `
        <tr style="${rfq.status === 'مكتمل' ? 'opacity:0.6;background:var(--gray-50);' : ''}">
            <td style="font-weight:700;color:var(--accent-600);">#${rfq.id.split('-')[0]}</td>
            <td>${rfq.company_name || '-'}</td>
            <td>${rfq.contact_person || '-'}</td>
            <td dir="ltr" style="text-align:right;">${rfq.phone || '-'}</td>
            <td>
                <select onchange="changeRFQStatus('${rfq.id}', this.value)" style="padding:4px;border:1px solid var(--gray-200);border-radius:4px;font-family:'Cairo',sans-serif;font-size:12px;background:white;">
                    <option value="انتظار" ${rfq.status === 'انتظار' || !rfq.status ? 'selected' : ''}>انتظار</option>
                    <option value="غير مكتمل" ${rfq.status === 'غير مكتمل' ? 'selected' : ''}>غير مكتمل</option>
                    <option value="مكتمل" ${rfq.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                </select>
            </td>
            <td>${new Date(rfq.created_at).toLocaleDateString('en-US')}</td>
            <td class="no-print">
                <div style="display:flex;gap:4px;align-items:center;">
                    <!-- Original logic was using array index of original list, so we might need to find the real index or just use the id in showRFQModal, but unfortunately showRFQModal uses index. Let's pass the real index by searching window._rfqsList -->
                    <button class="btn btn-accent btn-sm" style="font-size:11px;padding:4px 8px;" onclick="showRFQModal(window._rfqsList.findIndex(r => r.id === '${rfq.id}'))">تفاصيل</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.printRfqs = function() {
    if (!window._rfqsList || window._rfqsList.length === 0) {
        showToast('تنبيه', 'لا يوجد عروض أسعار للطباعة', 'info');
        return;
    }
    
    let filtered = [...window._rfqsList];
    const fromDate = document.getElementById('rfqs-date-from') ? document.getElementById('rfqs-date-from').value : '';
    const toDate = document.getElementById('rfqs-date-to') ? document.getElementById('rfqs-date-to').value : '';
    if (fromDate) {
        filtered = filtered.filter(o => new Date(o.created_at) >= new Date(fromDate));
    }
    if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => new Date(o.created_at) <= toD);
    }
    
    const sortVal = document.getElementById('rfq-sort') ? document.getElementById('rfq-sort').value : 'newest';
    if (sortVal === 'newest') {
        filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'oldest') {
        filtered.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'company_asc') {
        filtered.sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ar'));
    } else if (sortVal === 'company_desc') {
        filtered.sort((a,b) => (b.company_name||'').localeCompare(a.company_name||'', 'ar'));
    }

    if (sortVal === 'newest' || sortVal === 'oldest') {
        filtered.sort((a, b) => (a.status === 'مكتمل' ? 1 : 0) - (b.status === 'مكتمل' ? 1 : 0));
    }

    let html = `
        <html dir="rtl">
        <head>
            <title>كشف عروض الأسعار (RFQ)</title>
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; color: #333; }
                h2 { text-align: center; color: #0F2C59; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 14px; }
                th { background-color: #f8f9fa; color: #0F2C59; }
                .status-pending { color: #854d0e; font-weight: bold; }
                .status-success { color: #166534; font-weight: bold; }
                .status-failed { color: #991b1b; font-weight: bold; }
                @media print {
                    @page { margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h2>كشف عروض الأسعار (RFQ)</h2>
            <div style="text-align:left; font-size:12px; color:#666; margin-bottom:10px;">تاريخ الطباعة: ${new Date().toLocaleDateString('en-US')} - عدد العروض: ${filtered.length}</div>
            <table>
                <thead>
                    <tr>
                        <th>رقم العرض</th>
                        <th>الشركة</th>
                        <th>شخص الاتصال</th>
                        <th>الهاتف</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filtered.forEach(rfq => {
        let statClass = rfq.status === 'مكتمل' ? 'status-success' : rfq.status === 'غير مكتمل' ? 'status-failed' : 'status-pending';
        html += `
            <tr>
                <td style="font-weight:bold;">#${rfq.id.split('-')[0]}</td>
                <td>${rfq.company_name || '-'}</td>
                <td>${rfq.contact_person || '-'}</td>
                <td dir="ltr" style="text-align:right;">${rfq.phone || '-'}</td>
                <td><span class="${statClass}">${rfq.status || 'انتظار'}</span></td>
                <td>${new Date(rfq.created_at).toLocaleDateString('en-US')}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </body>
        </html>
    `;

    const printWin = window.open('', '_blank');
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 250);
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
async function logoutAdmin() {
    await supabase.auth.signOut();
    window.location.replace('login.html');
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
async function loadDashboardAnalytics() {
    try {
        const analyticsFrom = document.getElementById('analytics-date-from') ? document.getElementById('analytics-date-from').value : '';
        const analyticsTo = document.getElementById('analytics-date-to') ? document.getElementById('analytics-date-to').value : '';

        let ordersQuery = supabase.from('orders').select('items, total_amount, created_at').neq('status', 'ملغى');
        if (analyticsFrom) ordersQuery = ordersQuery.gte('created_at', analyticsFrom);
        if (analyticsTo) {
            const toD = new Date(analyticsTo);
            toD.setHours(23, 59, 59, 999);
            ordersQuery = ordersQuery.lte('created_at', toD.toISOString());
        }

        const [
            { data: ordersData, error: err1 },
            { data: productsData, error: err2 }
        ] = await Promise.all([
            ordersQuery,
            supabase.from('products').select('id, name, category, title')
        ]);

        if (err1 || err2) {
            console.error('Error fetching analytics data:', err1 || err2);
            return;
        }

        const prodMap = {};
        if (productsData) {
            productsData.forEach(p => prodMap[p.id] = p);
        }

        const productSales = {};
        const catSalesMap = {};
        let monthlyRev = Array(12).fill(0);

        if (ordersData) {
            ordersData.forEach(order => {
                const mIdx = new Date(order.created_at).getMonth();
                monthlyRev[mIdx] += parseFloat(order.total_amount) || 0;

                if (Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const pid = item.productId || item.product_id;
                        const p = prodMap[pid];
                        if (p) {
                            const cat = p.category || 'other';
                            const qty = parseInt(item.quantity) || 1;
                            const price = parseFloat(item.price) || 0;
                            const rev = qty * price;
                            
                            catSalesMap[cat] = (catSalesMap[cat] || 0) + rev;

                            if (!productSales[pid]) {
                                productSales[pid] = { name: p.name || p.title, category: cat, qty: 0, revenue: 0 };
                            }
                            productSales[pid].qty += qty;
                            productSales[pid].revenue += rev;
                        }
                    });
                }
            });
        }

        const topProductsList = Object.values(productSales).sort((a,b) => b.qty - a.qty).slice(0, 5);
        const categorySales = Object.keys(catSalesMap).map(k => ({ category: k, revenue: catSalesMap[k] }));

        const topTbody = document.getElementById('analytics-top-products');
        if (topTbody) {
            topTbody.innerHTML = topProductsList.length === 0
                ? emptyStateRow(4, 'لا توجد بيانات مبيعات كافية')
                : topProductsList.map(p => `
                    <tr>
                        <td style="font-weight:600;">${p.name || 'منتج غير معروف'}</td>
                        <td><span class="badge" style="background:#FFF3E0;color:#E65100;">${p.category}</span></td>
                        <td>${p.qty} وحدة</td>
                        <td style="font-weight:700;color:var(--primary-700);">${(p.revenue || 0).toLocaleString('en-US')} د.أ</td>
                    </tr>`).join('');
        }

        if (typeof Chart !== 'undefined') {
            const monthsNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
            const cm = new Date().getMonth();

            getOrCreateChart('analyticsRevenueChart', {
                type: 'bar',
                data: {
                    labels: monthsNames.slice(Math.max(0, cm - 5), cm + 1),
                    datasets: [{ label: 'الإيرادات (د.أ)', data: monthlyRev.slice(Math.max(0, cm - 5), cm + 1), backgroundColor: '#1565C0', borderRadius: 4 }]
                },
                options: {
                    responsive: true,
                    plugins: { legend:{display:false} },
                    scales: {
                        y: { beginAtZero: true, ticks: { font:{family:'Cairo'}, callback: v => v.toLocaleString('en-US') } },
                        x: { grid:{display:false}, ticks:{font:{family:'Cairo'}} }
                    }
                }
            });

            const catLabelsMap = { 'measurement':'أجهزة الفحص','safety':'السلامة','attendance':'تسجيل الدوام','monitoring':'المراقبة والتحكم','alarm':'أنظمة الإنذار','fire_other':'إطفاء الحريق', 'other':'أخرى' };
            if (categorySales && categorySales.length > 0) {
                getOrCreateChart('analyticsCategoryChart', {
                    type: 'doughnut',
                    data: {
                        labels: categorySales.map(c => catLabelsMap[c.category] || c.category),
                        datasets: [{ data: categorySales.map(c => c.revenue), backgroundColor: ['#1565C0','#FF6B00','#F44336','#00C853','#FFD600', '#9C27B0'], borderWidth: 0 }]
                    },
                    options: {
                        responsive: true, cutout: '65%',
                        plugins: { legend: { display: true, position: 'bottom', labels: { font:{family:'Cairo'}, padding: 12 } } }
                    }
                });
            } else {
                // Empty state for doughnut if needed
                const ctx = document.getElementById('analyticsCategoryChart');
                if (ctx) {
                    const parent = ctx.parentElement;
                    parent.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#888;">لا توجد بيانات</div>';
                }
            }
            // Fetch page_views for tracking charts
            let pvQuery = supabase.from('page_views').select('*');
            const analyticsFrom = document.getElementById('analytics-date-from') ? document.getElementById('analytics-date-from').value : '';
            const analyticsTo = document.getElementById('analytics-date-to') ? document.getElementById('analytics-date-to').value : '';
            if (analyticsFrom) {
                pvQuery = pvQuery.gte('created_at', analyticsFrom);
            }
            if (analyticsTo) {
                const toD = new Date(analyticsTo);
                toD.setHours(23, 59, 59, 999);
                pvQuery = pvQuery.lte('created_at', toD.toISOString());
            }
            const { data: pageViewsData, error: pvError } = await pvQuery;
            if (!pvError && pageViewsData) {
                // 1. Visitors by Date
                const visitorsByDate = {};
                // Pre-fill last 7 days with 0 to ensure the chart always has an x-axis
                for(let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    visitorsByDate[d.toLocaleDateString('en-GB')] = 0;
                }

                pageViewsData.forEach(pv => {
                    const date = new Date(pv.created_at).toLocaleDateString('en-GB');
                    visitorsByDate[date] = (visitorsByDate[date] || 0) + 1;
                });
                const sortedDates = Object.keys(visitorsByDate).sort((a,b) => {
                    const [da,ma,ya] = a.split('/'); const [db,mb,yb] = b.split('/');
                    return new Date(ya,ma-1,da) - new Date(yb,mb-1,db);
                }).slice(-14);
                const visitorsCount = sortedDates.map(d => visitorsByDate[d]);

                getOrCreateChart('analyticsVisitorsChart', {
                    type: 'line',
                    data: {
                        labels: sortedDates,
                        datasets: [{ label: 'الزيارات', data: visitorsCount, borderColor: '#1565C0', backgroundColor: 'rgba(21, 101, 192, 0.1)', fill: true, tension: 0.4 }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend:{display:false} },
                        scales: { y: { beginAtZero: true, ticks: { font:{family:'Cairo'} } }, x: { ticks:{font:{family:'Cairo'}} } }
                    }
                });

                // 2. Traffic Sources
                const sources = {};
                pageViewsData.forEach(pv => {
                    const s = pv.source || 'Direct';
                    sources[s] = (sources[s] || 0) + 1;
                });
                if (Object.keys(sources).length > 0) {
                    const sourceLabels = Object.keys(sources).map(key => `${key} (${sources[key]} زائر)`);
                    getOrCreateChart('analyticsSourceChart', {
                        type: 'doughnut',
                        data: {
                            labels: sourceLabels,
                            datasets: [{ data: Object.values(sources), backgroundColor: ['#1565C0','#FF6B00','#F44336','#00C853','#FFD600', '#9C27B0'], borderWidth: 0 }]
                        },
                        options: { responsive: true, cutout: '65%', plugins: { legend: { display: true, position: 'bottom', labels: { font:{family:'Cairo'}, padding: 12 } } } }
                    });
                } else {
                    const ctx = document.getElementById('analyticsSourceChart');
                    if (ctx) {
                        const parent = ctx.parentElement;
                        parent.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#888;">لا توجد بيانات</div>';
                    }
                }

                // 3. Top Viewed Products
                const productViews = {};
                pageViewsData.forEach(pv => {
                    if (pv.product_id) {
                        productViews[pv.product_id] = (productViews[pv.product_id] || 0) + 1;
                    }
                });
                const sortedProductIds = Object.keys(productViews).sort((a,b) => productViews[b] - productViews[a]).slice(0, 10);
                
                const topViewedTbody = document.getElementById('analytics-top-viewed-products');
                if (topViewedTbody) {
                    if (sortedProductIds.length === 0) {
                        topViewedTbody.innerHTML = emptyStateRow(2, 'لا توجد مشاهدات منتجات بعد');
                    } else {
                        const { data: productsData } = await supabase.from('products').select('id, name').in('id', sortedProductIds);
                        const productNames = {};
                        if (productsData) productsData.forEach(p => productNames[p.id] = p.name);
                        
                        topViewedTbody.innerHTML = sortedProductIds.map(pid => `
                            <tr>
                                <td style="font-weight:600;">${productNames[pid] || 'منتج غير معروف'}</td>
                                <td><span class="badge" style="background:#E3F2FD;color:#1565C0;">${productViews[pid]} مشاهدة</span></td>
                            </tr>`).join('');
                    }
                }
            }
        }
    } catch (err) { console.error('Error loading analytics:', err); }
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
window.allCustomers = [];

async function loadDashboardCustomers() {
    const listBody = document.getElementById('customers-list');
    if (!listBody) return;
    listBody.innerHTML = skeletonRows(5);
    try {
        const { data: customers, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        window.allCustomers = customers || [];
        renderCustomers();
    } catch (err) {
        console.error('Error loading customers:', err);
        listBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;padding:1rem;">${err.message} <button onclick="loadDashboardCustomers()" style="cursor:pointer;border:none;background:#fee2e2;color:#dc2626;border-radius:4px;padding:4px 8px;">إعادة المحاولة</button></td></tr>`;
    }
}

function renderCustomers() {
    const listBody = document.getElementById('customers-list');
    if (!listBody) return;
    if (!window.allCustomers || window.allCustomers.length === 0) {
        listBody.innerHTML = emptyStateRow(5, 'لا يوجد عملاء مسجلين بعد');
        return;
    }
    
    const sortSelect = document.getElementById('customers-sort-select');
    const sortVal = sortSelect ? sortSelect.value : 'date-desc';
    
    let sorted = [...window.allCustomers];

    const nameFilter = document.getElementById('customers-name-filter') ? document.getElementById('customers-name-filter').value.toLowerCase() : '';
    const fromDate = document.getElementById('customers-date-from') ? document.getElementById('customers-date-from').value : '';
    const toDate = document.getElementById('customers-date-to') ? document.getElementById('customers-date-to').value : '';

    if (nameFilter) {
        sorted = sorted.filter(c => 
            (c.company_name && c.company_name.toLowerCase().includes(nameFilter)) || 
            (c.contact_person && c.contact_person.toLowerCase().includes(nameFilter))
        );
    }
    if (fromDate) {
        sorted = sorted.filter(c => new Date(c.created_at) >= new Date(fromDate));
    }
    if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        sorted = sorted.filter(c => new Date(c.created_at) <= toD);
    }

    if (sorted.length === 0) {
        listBody.innerHTML = emptyStateRow(5, 'لا يوجد عملاء مطابقين للبحث');
        window._filteredCustomersCount = 0;
        return;
    }
    
    window._filteredCustomersCount = sorted.length;

    if (sortVal === 'date-desc') {
        sorted.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'date-asc') {
        sorted.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'name-asc') {
        sorted.sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ar'));
    } else if (sortVal === 'name-desc') {
        sorted.sort((a,b) => (b.company_name||'').localeCompare(a.company_name||'', 'ar'));
    }

    listBody.innerHTML = sorted.map(c => `
        <tr>
            <td style="font-weight:600;color:var(--dark-800);">${c.company_name || '-'}</td>
            <td>${c.contact_person || '-'}</td>
            <td>${c.email || '-'}</td>
            <td><span style="font-family:monospace;background:#F1F5F9;padding:2px 6px;border-radius:4px;direction:ltr;display:inline-block;">${c.phone || '-'}</span></td>
            <td>${new Date(c.created_at).toLocaleDateString('en-US')}</td>
        </tr>`).join('');
}

window.sortCustomers = function() {
    renderCustomers();
};

window.printCustomers = function() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head>
            <title>كشف العملاء</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                body { font-family: 'Cairo', sans-serif; padding: 20px; color: #111827; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th, td { border: 1px solid #e5e7eb; padding: 12px 16px; text-align: right; }
                th { background-color: #f9fafb; font-weight: 700; color: #374151; }
                h2 { text-align: center; color: #111827; margin-bottom: 5px; }
                .meta { text-align: center; color: #6b7280; font-size: 13px; margin-bottom: 30px; }
                @media print {
                    @page { margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h2>كشف بيانات العملاء المسجلين</h2>
            <div class="meta">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - عدد العملاء: ${window._filteredCustomersCount || window.allCustomers.length}</div>
            <table>
                <thead>
                    <tr>
                        <th>اسم العميل / الشركة</th>
                        <th>جهة الاتصال</th>
                        <th>البريد الإلكتروني</th>
                        <th>الهاتف</th>
                        <th>تاريخ التسجيل</th>
                    </tr>
                </thead>
                <tbody>
                    ${document.getElementById('customers-list').innerHTML}
                </tbody>
            </table>
            <script>
                window.onload = function() { 
                    setTimeout(() => {
                        window.print(); 
                        window.close(); 
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

// ─── INSPECTIONS ──────────────────────────────────────────────────────────────
async function loadDashboardInspections() {
    const listBody = document.getElementById('inspections-list');
    if (!listBody) return;
    listBody.innerHTML = skeletonRows(6);
    try {
        const { data: inspections, error } = await supabase.from('inspections').select('*').order('inspection_date', { ascending: false });
        if (error) throw error;
        if (!inspections || inspections.length === 0) { listBody.innerHTML = emptyStateRow(7, 'لا توجد مواعيد فحص مسجلة'); return; }
        
        // Sort: completed items at the bottom
        inspections.sort((a, b) => {
            if (a.status === 'مكتمل' && b.status !== 'مكتمل') return 1;
            if (a.status !== 'مكتمل' && b.status === 'مكتمل') return -1;
            return 0; // maintain original date-based order
        });
        window._inspectionsList = inspections;

        listBody.innerHTML = inspections.map((i, index) => {
            let statusHtml;
            if (i.status === 'قيد المراجعة') statusHtml = '<span class="badge badge-warning">قيد المراجعة</span>';
            else if (i.status === 'مؤكد') statusHtml = '<span class="badge badge-primary">مؤكد</span>';
            else if (i.status === 'مكتمل') statusHtml = '<span class="badge badge-success">مكتمل</span>';
            else statusHtml = `<span class="badge badge-danger">${i.status || '-'}</span>`;
            const emailStr = (i.notes || '').split('\\n').find(l => l.startsWith('البريد: '))?.replace('البريد: ','') || '-';
            return `
            <tr style="${i.status === 'مكتمل' ? 'opacity: 0.6; background: var(--gray-50);' : ''}">
                <td style="font-weight:700;color:var(--primary-600);">${new Date(i.inspection_date).toLocaleDateString('en-US')}</td>
                <td><div style="font-weight:600;">${i.customer_name || '-'}</div><div style="font-size:11px;color:var(--gray-500);">${i.company_name || ''}</div></td>
                <td><span class="badge" style="background:#F3E5F5;color:#6A1B9A;">${i.inspection_type || '-'}</span></td>
                <td dir="ltr" style="text-align:right;">${i.phone || '-'}</td>
                <td><a href="mailto:${emailStr}" style="color:var(--primary-500);">${emailStr}</a></td>
                <td>${statusHtml}</td>
                <td>
                  <div style="display:flex;gap:var(--space-2);align-items:center;">
                    <button class="btn btn-outline btn-sm" style="font-size:11px;" onclick="showInspectionModal(${index})">التفاصيل</button>
                    ${i.status !== 'مكتمل' ? `<button class="btn btn-success btn-sm" style="font-size:11px;padding:4px 8px;" onclick="markInspectionCompleted('${i.id}')">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>` : ''}
                  </div>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('Error loading inspections:', err);
        listBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:1rem;">${err.message} <button onclick="loadDashboardInspections()" style="cursor:pointer;">إعادة المحاولة</button></td></tr>`;
    }
}

window.markInspectionCompleted = async function(id) {
    if (!confirm('هل أنت متأكد من تغيير حالة الطلب إلى "مكتمل"؟')) return;
    try {
        const { error } = await supabase.from('inspections').update({ status: 'مكتمل' }).eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', 'تم تغيير حالة الطلب إلى مكتمل', 'success');
        loadDashboardInspections();
    } catch (err) {
        console.error(err);
        showToast('خطأ', 'حدث خطأ أثناء التحديث', 'error');
    }
}

// ─── DYNAMIC CALENDAR ─────────────────────────────────────────────────────────
const _cal = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-indexed
    inspections: [] // cache for the currently loaded inspections
};

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

async function initCalendar() {
    await fetchAndRenderCalendar(_cal.year, _cal.month);
}

async function calendarNavMonth(dir) {
    _cal.month += dir;
    if (_cal.month > 11) { _cal.month = 0; _cal.year++; }
    if (_cal.month < 0)  { _cal.month = 11; _cal.year--; }
    await fetchAndRenderCalendar(_cal.year, _cal.month);
}

async function fetchAndRenderCalendar(year, month) {
    const label = document.getElementById('calendarMonthLabel');
    const grid  = document.getElementById('calendarGrid');
    if (!label || !grid) return;

    label.textContent = `${ARABIC_MONTHS[month]} ${year}`;

    // Show loading placeholder
    const dayNames = ['س','ح','ن','ث','ر','خ','ج'];
    grid.innerHTML = dayNames.map(d => `<div class="calendar-day-name">${d}</div>`).join('') +
        '<div style="grid-column:1/-1;text-align:center;padding:.75rem;color:var(--gray-400);font-size:12px;">جاري تحميل المواعيد...</div>';

    // Fetch inspections for this month from Supabase
    try {
        const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
        const lastDay   = new Date(year, month+1, 0).getDate();
        const endDate   = `${year}-${String(month+1).padStart(2,'0')}-${lastDay}`;

        const { data, error } = await supabase
            .from('inspections')
            .select('id, customer_name, company_name, phone, inspection_type, inspection_date, status, notes')
            .gte('inspection_date', startDate)
            .lte('inspection_date', endDate)
            .order('inspection_date', { ascending: true });

        _cal.inspections = error ? [] : (data || []);
    } catch(e) {
        _cal.inspections = [];
    }

    renderCalendarGrid(year, month);
}

function renderCalendarGrid(year, month) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    const dayNames = ['س','ح','ن','ث','ر','خ','ج'];
    const today = new Date();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    // We use Saturday as first column (index 6=Sat → column 1)
    // Reorder so Saturday (6) = col 1, Sunday (0) = col 2 ... Friday (5) = col 7
    const colOffset = (firstDay === 6) ? 0 : (firstDay + 1); // Sat-based offset

    const daysInMonth = new Date(year, month+1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Build a set of dates that have inspections, keyed by day number
    const eventDays = {};
    _cal.inspections.forEach(insp => {
        const d = new Date(insp.inspection_date);
        const dayNum = d.getDate();
        if (!eventDays[dayNum]) eventDays[dayNum] = [];
        eventDays[dayNum].push(insp);
    });

    let html = dayNames.map(d => `<div class="calendar-day-name">${d}</div>`).join('');

    // Prev month trailing days
    for (let i = colOffset - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">${daysInPrevMonth - i}</div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
        const hasEvent = !!eventDays[day];
        const eventCount = hasEvent ? eventDays[day].length : 0;
        const classes = ['calendar-day', isToday ? 'today' : '', hasEvent ? 'has-event' : ''].filter(Boolean).join(' ');
        const clickAttr = hasEvent ? `onclick="showInspectionsForDay(${day}, ${month}, ${year})" style="cursor:pointer;"` : '';
        html += `<div class="${classes}" ${clickAttr}>
            ${day}
            ${hasEvent ? `<span style="display:block;width:6px;height:6px;background:${eventCount > 1 ? '#FF6B00':'#1565C0'};border-radius:50%;margin:1px auto 0;"></span>` : ''}
        </div>`;
    }

    // Next month leading days
    const totalCells = colOffset + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }

    grid.innerHTML = html;
}

function showInspectionsForDay(day, month, year) {
    const modal = document.getElementById('calendarInspectionModal');
    const title = document.getElementById('inspModalTitle');
    const body  = document.getElementById('inspModalBody');
    if (!modal || !title || !body) return;

    const dayLabel = `${day} ${ARABIC_MONTHS[month]} ${year}`;
    title.textContent = `مواعيد الفحص — ${dayLabel}`;

    const dayInspections = _cal.inspections.filter(i => {
        const d = new Date(i.inspection_date);
        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

    const statusColors = {
        'قيد المراجعة': { bg: '#FFF9C4', color: '#F9A825' },
        'مؤكد':          { bg: '#E8F5E9', color: '#2E7D32' },
        'مكتمل':         { bg: '#E3F2FD', color: '#1565C0' },
        'ملغى':          { bg: '#FFEBEE', color: '#C62828' }
    };

    body.innerHTML = dayInspections.map(insp => {
        const sc = statusColors[insp.status] || { bg: '#F5F5F5', color: '#666' };
        return `
        <div style="border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:var(--space-4);margin-bottom:var(--space-3);background:var(--gray-50);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
                <div style="font-weight:800;color:var(--dark-800);font-size:var(--text-sm);">${insp.customer_name || '-'}</div>
                <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:${sc.bg};color:${sc.color};">${insp.status || '-'}</span>
            </div>
            ${insp.company_name ? `<div style="font-size:12px;color:var(--gray-500);margin-bottom:var(--space-2);">🏢 ${insp.company_name}</div>` : ''}
            <div style="font-size:12px;color:var(--gray-600);display:flex;gap:var(--space-4);flex-wrap:wrap;">
                <span>📞 ${insp.phone || '-'}</span>
                <span>🔬 ${insp.inspection_type || '-'}</span>
            </div>
            ${insp.notes ? `<div style="margin-top:var(--space-2);font-size:12px;color:var(--gray-500);border-top:1px solid var(--gray-200);padding-top:var(--space-2);">${insp.notes}</div>` : ''}
        </div>`;
    }).join('');

    modal.style.display = 'flex';
}

function closeInspectionModal() {
    const modal = document.getElementById('calendarInspectionModal');
    if (modal) modal.style.display = 'none';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('calendarInspectionModal');
    if (modal && e.target === modal) closeInspectionModal();
});

// Auto-initialize calendar when overview loads
// Hook into existing loadDashboardOverview completion by appending to loadDashboardData
const _origLoadDashboardData = loadDashboardData;
window.loadDashboardData = async function() {
    await _origLoadDashboardData();
    initCalendar();
    loadDashboardNotifications();
    loadDashboardCustomers();
    loadDashboardInvoices();
};

// ─── MARK COMPLETED / CHANGE STATUS ──────────────────────────────────────────────
window.changePaymentStatus = async function(id, newStatus) {
    if(!confirm(`هل أنت متأكد من تغيير حالة الدفع إلى "${newStatus}"؟`)) {
        loadDashboardOrders(); // Revert back
        return;
    }
    try {
        const { error } = await supabase.from('orders').update({ payment_status: newStatus }).eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', `تم تحديث حالة الدفع إلى ${newStatus}`, 'success');
        loadDashboardOrders();
        loadDashboardData(); 
    } catch(err) {
        showToast('خطأ', err.message, 'error');
        loadDashboardOrders();
    }
};

window.changeOrderStatus = async function(id, newStatus, oldStatus) {
    if(!confirm(`هل أنت متأكد من تغيير حالة الطلب إلى "${newStatus}"؟`)) {
        loadDashboardOrders(); // Revert back
        return;
    }
    try {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', `تم تحديث حالة الطلب إلى ${newStatus}`, 'success');
        loadDashboardOrders();
        loadDashboardData(); 
    } catch(err) {
        showToast('خطأ', err.message, 'error');
        loadDashboardOrders();
    }
};

window.markOrderCompleted = async function(id) {

    if(!confirm('هل أنت متأكد من تغيير حالة الطلب إلى "مكتمل"؟')) return;
    try {
        const { error } = await supabase.from('orders').update({ status: 'مكتمل' }).eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', 'تم تحديث حالة الطلب', 'success');
        loadDashboardOrders();
        loadDashboardData(); // Refresh overview lists
    } catch(err) {
        showToast('خطأ', err.message, 'error');
    }
};

window.changeRFQStatus = async function(id, newStatus) {
    if(!confirm(`هل أنت متأكد من تغيير حالة عرض السعر إلى "${newStatus}"؟`)) {
        loadDashboardRFQs(); // Revert back
        return;
    }
    try {
        const { error } = await supabase.from('rfqs').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', `تم تحديث حالة عرض السعر إلى ${newStatus}`, 'success');
        loadDashboardRFQs();
        loadDashboardData(); // Refresh overview lists
    } catch(err) {
        showToast('خطأ', err.message, 'error');
        loadDashboardRFQs();
    }
};

window.markRFQCompleted = async function(id) {
    if(!confirm('هل أنت متأكد من تغيير حالة عرض السعر إلى "مكتمل"؟')) return;
    try {
        const { error } = await supabase.from('rfqs').update({ status: 'مكتمل' }).eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', 'تم تحديث حالة عرض السعر', 'success');
        loadDashboardRFQs();
        loadDashboardData(); // Refresh overview lists
    } catch(err) {
        showToast('خطأ', err.message, 'error');
    }
};

// ─── DYNAMIC NOTIFICATIONS ────────────────────────────────────────────────────
async function loadDashboardNotifications() {
    const list = document.getElementById('notifList');
    const badge = document.getElementById('notif-count-badge');
    if(!list) return;

    try {
        const [ordersRes, rfqsRes] = await Promise.all([
            supabase.from('orders').select('id, customer_name, total_amount, created_at').in('status', ['جديد', 'بانتظار التأكيد', 'قيد المراجعة']).order('created_at', { ascending: false }).limit(5),
            supabase.from('rfqs').select('id, company_name, created_at').eq('status', 'انتظار').order('created_at', { ascending: false }).limit(5)
        ]);

        let notifs = [];
        if(!ordersRes.error && ordersRes.data) {
            notifs.push(...ordersRes.data.map(o => ({
                id: 'order-' + o.id,
                type: 'order',
                title: `طلب جديد #${o.id.split('-')[0]}`,
                desc: `${o.customer_name || 'عميل'} · ${(parseFloat(o.total_amount)||0).toLocaleString('en-US')} د.أ`,
                date: new Date(o.created_at),
                color: 'var(--primary-500)'
            })));
        }
        if(!rfqsRes.error && rfqsRes.data) {
            notifs.push(...rfqsRes.data.map(r => ({
                id: 'rfq-' + r.id,
                type: 'rfq',
                title: `عرض سعر جديد RFQ`,
                desc: `${r.company_name || 'شركة'}`,
                date: new Date(r.created_at),
                color: 'var(--accent-500)'
            })));
        }

        notifs.sort((a,b) => b.date - a.date);
        
        let seenNotifs = JSON.parse(localStorage.getItem('seen_notifs') || '[]');
        notifs = notifs.filter(n => !seenNotifs.includes(n.id));
        window._currentNotifs = notifs.map(n => n.id);
        
        if (notifs.length > 0) {
            list.innerHTML = notifs.slice(0, 8).map(n => {
                const diffMins = Math.floor((new Date() - n.date) / 60000);
                const timeStr = diffMins < 60 ? `منذ ${diffMins} دقائق` : (diffMins < 1440 ? `منذ ${Math.floor(diffMins/60)} ساعة` : `منذ ${Math.floor(diffMins/1440)} يوم`);
                return `
                <div onclick="handleNotificationClick('${n.type}')" style="padding:var(--space-3);border-radius:var(--radius-lg);cursor:pointer;border-right:3px solid ${n.color};margin-bottom:4px;" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''">
                    <div style="font-weight:700;font-size:var(--text-sm);color:var(--dark-800);">${n.title}</div>
                    <div style="font-size:var(--text-xs);color:var(--gray-500);">${n.desc} · ${timeStr}</div>
                </div>`;
            }).join('');
            if(badge) {
                badge.textContent = notifs.length;
                badge.style.display = 'flex';
            }
        } else {
            list.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--gray-400);font-size:13px;">لا توجد إشعارات حالياً</div>';
            if(badge) badge.style.display = 'none';
        }

    } catch (err) {
        console.error('Error loading notifications:', err);
    }
}

window.handleNotificationClick = function(type) {
    const navLinks = document.querySelectorAll('.dash-nav-link');
    if (type === 'order') {
        const link = Array.from(navLinks).find(el => el.textContent.includes('إدارة الطلبات'));
        if (link) showSection('orders', link);
    } else if (type === 'rfq') {
        const link = Array.from(navLinks).find(el => el.textContent.includes('عروض الأسعار RFQ'));
        if (link) showSection('rfqs', link);
    }
    const panel = document.getElementById('notifPanel');
    if (panel) panel.style.display = 'none';
};

window.showDetailsModal = function(title, text) {
    document.getElementById('detailsModalTitle').textContent = title;
    
    let htmlContent = text;
    
    // 1. Find URLs and convert them to nice download buttons FIRST (before replacing colons or newlines)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    htmlContent = htmlContent.replace(urlRegex, function(url) {
        return `<div style="margin-top:15px;margin-bottom:5px;">
            <a href="${url}" target="_blank" class="btn btn-primary" style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;font-size:13px;border-radius:6px;background:var(--primary-600);color:white;text-decoration:none;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg> 
                تحميل المرفق / عرض الملف
            </a>
        </div>`;
    });
    
    // 2. Bold labels at the beginning of lines (e.g. "الاسم:", "البريد:") without breaking URLs
    // Using multiline flag to only match at start of lines, avoiding "https:"
    htmlContent = htmlContent.replace(/^([^:\n<]+):/gm, '<strong>$1:</strong>');
    
    // 3. Convert newlines to breaks
    htmlContent = htmlContent.replace(/\n/g, '<br>');
    
    document.getElementById('detailsModalBody').innerHTML = htmlContent;
    document.getElementById('detailsModal').style.display = 'flex';
};

window.showRFQModal = function(index) {
    const rfq = window._rfqsList[index];
    const text = `الاسم: ${rfq.contact_person || '-'}
الشركة: ${rfq.company_name || '-'}
الهاتف: ${rfq.phone || '-'}
البريد الإلكتروني: ${rfq.email || '-'}
طريقة الدفع: ${rfq.payment_method || '-'}
الجدول الزمني: ${rfq.delivery_time || '-'}
يحتاج فاتورة ضريبية: ${rfq.needs_invoice || '-'}

تفاصيل الطلب:
${rfq.details || ''}`;
    showDetailsModal('تفاصيل عرض السعر', text);
};

window.showInspectionModal = function(index) {
    const i = window._inspectionsList[index];
    const text = `تاريخ الفحص: ${new Date(i.inspection_date).toLocaleDateString('en-US')}
نوع الفحص: ${i.inspection_type || '-'}
الاسم: ${i.customer_name || '-'}
الشركة: ${i.company_name || '-'}
الهاتف: ${i.phone || '-'}

الملاحظات:
${i.notes || ''}`;
    showDetailsModal('تفاصيل الموعد', text);
};


// ─── CUSTOMERS (Derived from Orders) ──────────────────────────────────────────
async function loadDashboardCustomers() {
    const tbody = document.getElementById('customers-list');
    if (!tbody) return;
    try {
        const { data: orders, error } = await supabase.from('orders').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        
        let customersMap = new Map();
        for (let order of orders) {
            let key = order.customer_phone || order.customer_name;
            if(!key) continue;
            if(!customersMap.has(key)) {
                customersMap.set(key, {
                    name: order.customer_name,
                    company: order.customer_company,
                    phone: order.customer_phone,
                    email: order.customer_email || order.user_email || '-',
                    city: order.delivery_city,
                    date: order.created_at
                });
            }
        }
        
        let customers = Array.from(customersMap.values()).reverse();
        if(customers.length === 0) {
            tbody.innerHTML = emptyStateRow(5, 'لا يوجد عملاء مسجلين بعد');
            return;
        }
        
        tbody.innerHTML = customers.map(c => `
            <tr>
                <td style="font-weight:700;">${c.name || '-'}${c.company ? `<br><span style="font-size:11px;color:var(--gray-500);">${c.company}</span>` : ''}</td>
                <td>${c.city || '-'}</td>
                <td>${c.email || '-'}</td>
                <td dir="ltr" style="text-align:right;">${c.phone || '-'}</td>
                <td>${new Date(c.date).toLocaleDateString('en-US')}</td>
            </tr>
        `).join('');
    } catch(err) {
        console.error('Error loading customers:', err);
    }
}

// ─── INVOICES & PAYMENTS ──────────────────────────────────────────────────────
window.allInvoices = [];

async function loadDashboardInvoices() {
    const tbody = document.getElementById('invoices-list');
    if (!tbody) return;
    try {
        const { data: orders, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        window.allInvoices = orders || [];
        renderInvoices();
    } catch(err) {
        console.error('Error loading invoices:', err);
    }
}

function renderInvoices() {
    const tbody = document.getElementById('invoices-list');
    if (!tbody) return;
    
    if (!window.allInvoices || window.allInvoices.length === 0) {
        tbody.innerHTML = emptyStateRow(6, 'لا توجد فواتير حتى الآن');
        return;
    }
    
    const sortSelect = document.getElementById('payments-sort-select');
    const sortVal = sortSelect ? sortSelect.value : 'date-desc';
    
    let sorted = [...window.allInvoices];

    const nameFilter = document.getElementById('payments-name-filter') ? document.getElementById('payments-name-filter').value.toLowerCase() : '';
    const fromDate = document.getElementById('payments-date-from') ? document.getElementById('payments-date-from').value : '';
    const toDate = document.getElementById('payments-date-to') ? document.getElementById('payments-date-to').value : '';

    if (nameFilter) {
        sorted = sorted.filter(o => o.customer_name && o.customer_name.toLowerCase().includes(nameFilter));
    }
    if (fromDate) {
        sorted = sorted.filter(o => new Date(o.created_at) >= new Date(fromDate));
    }
    if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        sorted = sorted.filter(o => new Date(o.created_at) <= toD);
    }

    if (sorted.length === 0) {
        tbody.innerHTML = emptyStateRow(6, 'لا توجد فواتير مطابقة للبحث');
        window._filteredInvoicesCount = 0;
        return;
    }

    window._filteredInvoicesCount = sorted.length;

    if (sortVal === 'date-desc') {
        sorted.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'date-asc') {
        sorted.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'name-asc') {
        sorted.sort((a,b) => (a.customer_name||'').localeCompare(b.customer_name||'', 'ar'));
    } else if (sortVal === 'name-desc') {
        sorted.sort((a,b) => (b.customer_name||'').localeCompare(a.customer_name||'', 'ar'));
    }

    tbody.innerHTML = sorted.map(order => `
        <tr>
            <td style="font-weight:700;color:var(--primary-700);">${(order.id||'').includes('-') ? '#' + order.id.split('-')[0] : order.id}</td>
            <td>${order.customer_name || '-'}</td>
            <td style="font-weight:bold;">${(parseFloat(order.total_amount)||0).toLocaleString('en-US')} د.أ</td>
            <td>${new Date(order.created_at).toLocaleDateString('en-US')}</td>
            <td style="max-width:250px;word-break:break-all;font-size:12px;white-space:pre-wrap;line-height:1.4;">${order.payment_status || '-'}</td>
            <td class="print-btn-col">
                <button class="btn btn-primary btn-sm" style="font-size:11px;padding:4px 8px;display:flex;align-items:center;gap:4px;" onclick="printInvoice('${order.id}')" title="طباعة الفاتورة">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    طباعة
                </button>
            </td>
        </tr>
    `).join('');
}

window.sortPayments = function() {
    renderInvoices();
};

window.printPayments = function() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head>
            <title>كشف المدفوعات والفواتير</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                body { font-family: 'Cairo', sans-serif; padding: 20px; color: #111827; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th, td { border: 1px solid #e5e7eb; padding: 12px 16px; text-align: right; }
                th { background-color: #f9fafb; font-weight: 700; color: #374151; }
                h2 { text-align: center; color: #111827; margin-bottom: 5px; }
                .meta { text-align: center; color: #6b7280; font-size: 13px; margin-bottom: 30px; }
                .print-btn-col { display: none !important; }
                @media print {
                    @page { margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h2>كشف المدفوعات والفواتير</h2>
            <div class="meta">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - عدد الحركات: ${window._filteredInvoicesCount || window.allInvoices.length}</div>
            <table>
                <thead>
                    <tr>
                        <th>رقم الطلب</th>
                        <th>العميل / الشركة</th>
                        <th>المبلغ</th>
                        <th>تاريخ الطلب</th>
                        <th>حالة الدفع</th>
                    </tr>
                </thead>
                <tbody>
                    ${document.getElementById('invoices-list').innerHTML}
                </tbody>
            </table>
            <script>
                window.onload = function() { 
                    setTimeout(() => {
                        window.print(); 
                        window.close(); 
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.printInvoice = async function(orderId) {
    try {
        const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (error) throw error;
        
        const invoiceHtml = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة رقم #${order.id.split('-')[0]}</title>
                <style>
                    body { font-family: 'Tahoma', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1565C0; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: bold; color: #1565C0; }
                    .invoice-title { font-size: 32px; font-weight: bold; color: #555; }
                    .details-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .box { background: #f9fafb; padding: 15px; border-radius: 8px; width: 45%; border: 1px solid #e5e7eb; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th, td { padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb; }
                    th { background: #1565C0; color: white; }
                    .total { font-size: 20px; font-weight: bold; text-align: left; margin-top: 20px; color: #1565C0; }
                    .footer { text-align: center; margin-top: 50px; font-size: 14px; color: #777; border-top: 1px solid #ddd; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">AGS Technology<br><span style="font-size:12px;color:#666;">Safety & Measurement Solutions</span></div>
                    <div class="invoice-title">فاتورة ضريبية / INVOICE</div>
                </div>
                
                <div class="details-grid">
                    <div class="box">
                        <strong>بيانات العميل:</strong><br>
                        الاسم: ${order.customer_name || 'غير متوفر'}<br>
                        الشركة: ${order.customer_company || '-'}<br>
                        الهاتف: <span dir="ltr">${order.customer_phone || 'غير متوفر'}</span><br>
                        العنوان: ${order.delivery_city || ''} - ${order.delivery_address || ''}
                    </div>
                    <div class="box">
                        <strong>بيانات الفاتورة:</strong><br>
                        رقم الفاتورة: #${order.id.split('-')[0]}<br>
                        تاريخ الطلب: ${new Date(order.created_at).toLocaleDateString('ar-JO')}<br>
                        حالة الدفع: <strong>${order.payment_status || 'غير مدفوع'}</strong><br>
                        طريقة الدفع: ${
                            order.payment_method === 'COD' ? 'الدفع عند الاستلام' : 
                            order.payment_method === 'CLIQ' ? 'كليك (CliQ)' :
                            order.payment_method === 'BANK_TRANSFER' ? 'تحويل بنكي' :
                            order.payment_method === 'READY_CHECK' ? 'شيك جاهز للصرف' :
                            order.payment_method || 'غير محدد'
                        }
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>المنتج</th>
                            <th>الكمية</th>
                            <th>السعر الإفرادي</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.isArray(order.items) ? order.items.map(item => `
                            <tr>
                                <td>${item.title}</td>
                                <td>${item.qty}</td>
                                <td>${item.price} د.أ</td>
                                <td>${(item.qty * item.price).toFixed(2)} د.أ</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4">لا توجد تفاصيل للمنتجات</td></tr>'}
                        <tr>
                            <td colspan="3">رسوم التوصيل</td>
                            <td>${(parseFloat(order.delivery_fee) || 0).toFixed(2)} د.أ</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="total">الإجمالي النهائي: ${(parseFloat(order.total_amount) || 0).toLocaleString('en-US')} د.أ</div>
                
                <div class="footer">
                    نشكركم على تسوقكم من متجر AGS Technology<br>
                    للتواصل: 0786776057 | 0791852909 | عين الباشا، شارع السلط، خلف كازية توتال
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();
        
    } catch(err) {
        showToast('خطأ', 'تعذر جلب بيانات الفاتورة', 'error');
        console.error(err);
    }
};

// ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────

window.adminAnnouncementsData = [];

async function loadAdminAnnouncements() {
    const list = document.getElementById('announcements-list');
    if (!list) return;

    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        window.adminAnnouncementsData = data || [];

        if (!data || data.length === 0) {
            list.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;">لا توجد إعلانات</td></tr>';
            return;
        }

        list.innerHTML = data.map(ann => `
            <tr>
                <td><img src="${ann.image_url}" alt="الإعلان" style="width:60px;height:40px;object-fit:cover;border-radius:4px;background:#f0f0f0;"></td>
                <td style="font-weight:600;color:var(--dark-800);">${ann.title}</td>
                <td style="direction:ltr;text-align:right;"><a href="${ann.link_url}" target="_blank" style="color:var(--primary-600);font-size:12px;">${ann.link_url}</a></td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" onchange="toggleAnnouncementStatus('${ann.id}', this.checked)" ${ann.is_active ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td style="font-size:12px;color:var(--gray-500);">${new Date(ann.created_at).toLocaleDateString('en-US')}</td>
                <td>
                    <div style="display:flex;gap:8px;">
                        <button class="action-btn" onclick="openAnnouncementModal('${ann.id}')" title="تعديل" style="color:var(--primary-600);background:rgba(21,101,192,0.1);border-radius:4px;border:none;padding:6px;cursor:pointer;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button class="action-btn" onclick="deleteAnnouncement('${ann.id}')" title="حذف" style="color:var(--danger);background:rgba(239,68,68,0.1);border-radius:4px;border:none;padding:6px;cursor:pointer;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        showToast('خطأ', 'فشل تحميل الإعلانات', 'error');
        console.error(err);
    }
}

window.openAnnouncementModal = function(id = null) {
    document.getElementById('announcementForm').reset();
    document.getElementById('announcementModalTitle').textContent = id ? 'تعديل الإعلان' : 'إضافة إعلان جديد';
    
    if (id) {
        const ann = window.adminAnnouncementsData.find(a => a.id === id);
        if (ann) {
            document.getElementById('annId').value = ann.id;
            document.getElementById('annTitle').value = ann.title;
            document.getElementById('annDesc').value = ann.description;
            document.getElementById('annImageUrl').value = ann.image_url;
            document.getElementById('annLink').value = ann.link_url;
            document.getElementById('annActive').checked = ann.is_active;

            if (ann.image_url) {
                const preview = document.getElementById('annImagePreview');
                preview.src = ann.image_url;
                preview.style.display = 'block';
            }
        }
    } else {
        document.getElementById('annId').value = '';
        document.getElementById('annImageUrl').value = '';
        document.getElementById('annActive').checked = true; // Default to active for new
        document.getElementById('annImagePreview').style.display = 'none';
    }
    
    document.getElementById('announcementModal').style.display = 'flex';
};

window.closeAnnouncementModal = function() {
    document.getElementById('announcementModal').style.display = 'none';
};

window.saveAnnouncement = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('annSaveBtn');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    const id = document.getElementById('annId').value;
    const fileInput = document.getElementById('annImageFile');
    let imageUrl = document.getElementById('annImageUrl').value;

    try {
        // Handle file upload if a new file is selected
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `announcement-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('product-media').upload(fileName, file);
            if (uploadError) throw new Error('فشل رفع الصورة: ' + uploadError.message);

            const { data: publicUrlData } = supabase.storage.from('product-media').getPublicUrl(fileName);
            imageUrl = publicUrlData.publicUrl;
        }

        if (!imageUrl) {
            throw new Error('يرجى اختيار صورة للإعلان');
        }

        const annData = {
            title: document.getElementById('annTitle').value,
            description: document.getElementById('annDesc').value,
            image_url: imageUrl,
            link_url: document.getElementById('annLink').value,
            is_active: document.getElementById('annActive').checked
        };

        let error;
        if (id) {
            const res = await supabase.from('announcements').update(annData).eq('id', id);
            error = res.error;
        } else {
            const res = await supabase.from('announcements').insert([annData]);
            error = res.error;
        }

        if (error) throw error;
        
        showToast('نجاح', id ? 'تم تعديل الإعلان بنجاح' : 'تمت إضافة الإعلان بنجاح');
        closeAnnouncementModal();
        loadAdminAnnouncements();

    } catch(err) {
        showToast('خطأ', err.message || 'فشل حفظ الإعلان', 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ الإعلان';
    }
};

window.deleteAnnouncement = async function(id) {
    if(!confirm('هل أنت متأكد من حذف هذا الإعلان نهائياً؟')) return;
    try {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) throw error;
        showToast('نجاح', 'تم حذف الإعلان بنجاح');
        loadAdminAnnouncements();
    } catch(err) {
        showToast('خطأ', 'فشل الحذف', 'error');
    }
};

window.toggleAnnouncementStatus = async function(id, is_active) {
    try {
        const { error } = await supabase.from('announcements').update({ is_active }).eq('id', id);
        if (error) throw error;
        showToast('نجاح', 'تم تحديث حالة الإعلان');
    } catch(err) {
        showToast('خطأ', 'فشل التحديث', 'error');
        // revert visual toggle if failed
        loadAdminAnnouncements(); 
    }
};

// ==========================================
// Registered Users Management
// ==========================================
window.registeredUserEmails = [];

async function loadRegisteredUsers() {
    const tbody = document.getElementById('registered-users-list');
    if (!tbody) return;

    if (!window.supabase) return;
    
    try {
        const { data, error } = await supabase.rpc('get_registered_users');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            window.registeredUserEmails = [];
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--gray-500);">لا توجد حسابات مسجلة بعد</td></tr>';
            return;
        }
        
        window.registeredUserEmails = data.map(u => u.email).filter(e => e);
        
        tbody.innerHTML = data.map(user => {
            const date = new Date(user.created_at).toLocaleDateString('ar-EG');
            return `
                <tr>
                    <td style="font-weight:600;color:var(--dark-800);">${user.name || 'غير محدد'}</td>
                    <td dir="ltr" style="text-align:right;">${user.email}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-sm" style="background:#FEE2E2;color:#DC2626;padding:4px 8px;font-size:11px;border:none;cursor:pointer;border-radius:4px;" onclick="deleteRegisteredUser('${user.id}')">حذف</button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch(err) {
        console.error('Error loading registered users:', err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;padding:1rem;">${err.message} <button onclick="loadRegisteredUsers()" style="cursor:pointer;margin-right:8px;">إعادة المحاولة</button></td></tr>`;
    }
}

window.deleteRegisteredUser = async function(id) {
    if(!confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟')) return;
    try {
        const { error } = await supabase.rpc('delete_registered_user', { user_id: id });
        if(error) throw error;
        showToast('نجاح', 'تم حذف الحساب بنجاح');
        loadRegisteredUsers();
    } catch(err) {
        console.error('Error deleting user:', err);
        showToast('خطأ', err.message, 'error');
    }
};

window.showAddUserModal = function() {
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-email').value = '';
    document.getElementById('new-user-password').value = '';
    document.getElementById('addUserModal').style.display = 'flex';
};

window.submitNewUser = async function() {
    const name = document.getElementById('new-user-name').value.trim();
    const phone = document.getElementById('new-user-phone') ? document.getElementById('new-user-phone').value.trim() : '';
    const email = document.getElementById('new-user-email').value.trim();
    const password = document.getElementById('new-user-password').value;
    
    if(!name || !email || !password) {
        showToast('خطأ', 'يرجى تعبئة جميع الحقول', 'error');
        return;
    }
    if(password.length < 6) {
        showToast('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    const btn = document.getElementById('btn-submit-new-user');
    const originalText = btn.textContent;
    btn.textContent = 'جاري الإضافة...';
    btn.disabled = true;
    
    try {
        const { data, error } = await supabase.rpc('create_registered_user', {
            user_email: email,
            user_password: password,
            user_name: name,
            user_phone: phone
        });
        
        if(error) throw error;
        
        showToast('نجاح', 'تم إضافة الحساب بنجاح');
        document.getElementById('addUserModal').style.display = 'none';
        loadRegisteredUsers();
    } catch(err) {
        console.error('Error adding user:', err);
        showToast('خطأ', err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

window.sendBulkEmail = function() {
    if (!window.registeredUserEmails || window.registeredUserEmails.length === 0) {
        showToast('تنبيه', 'لا يوجد مستخدمين مسجلين لإرسال رسالة لهم', 'error');
        return;
    }
    
    // Create a BCC string of all emails
    const bccList = window.registeredUserEmails.join(',');
    
    // Open Gmail compose window in a new tab with BCC pre-filled
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bccList)}`;
    window.open(gmailUrl, '_blank');
    
    showToast('نجاح', 'تم فتح نافذة Gmail لتأليف الرسالة. تم إدراج الإيميلات في الحقل المخفي (BCC) لحماية خصوصية المستخدمين.');
};

// ==========================================
// HOME FEATURES STRIP (الرئيسية)
// ==========================================

async function loadDashboardHomeFeatures() {
    const tbody = document.getElementById('home-features-list');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(6);
    try {
        const { data: features, error } = await supabase.from('home_features_strip').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        if (!features || features.length === 0) {
            tbody.innerHTML = emptyStateRow(6, 'لا توجد ميزات حالياً');
            return;
        }

        tbody.innerHTML = features.map(feat => {
            const hex = feat.theme_color_hex || '#1565C0';
            let iconHtml = feat.icon || '';
            if (iconHtml.includes('currentColor')) {
                 iconHtml = iconHtml.replace(/currentColor/g, hex);
            }

            return `
            <tr>
                <td style="font-weight:700; color:var(--dark-800);">${feat.display_order}</td>
                <td>
                    <div style="width:40px;height:40px;border-radius:8px;background:rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;">
                        ${iconHtml}
                    </div>
                </td>
                <td style="font-weight:700;">${feat.title}</td>
                <td>${feat.subtitle}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="width:16px;height:16px;border-radius:50%;background:${hex};display:inline-block;"></span>
                        <span dir="ltr">${hex}</span>
                    </div>
                </td>
                <td>
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-outline btn-sm" onclick="editHomeFeature('${feat.id}')">تعديل</button>
                        <button class="btn btn-sm" style="background:var(--danger);color:white;border-color:var(--danger);" onclick="deleteHomeFeature('${feat.id}')">حذف</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('Error loading home features:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:1rem;">${err.message}</td></tr>`;
    }
}

function openHomeFeatureModal() {
    document.getElementById('homeFeatureForm').reset();
    document.getElementById('homeFeatId').value = '';
    document.getElementById('homeFeatureModalTitle').textContent = 'إضافة ميزة رئيسية جديدة';
    document.getElementById('homeFeatureModal').style.display = 'flex';
}

function closeHomeFeatureModal() {
    document.getElementById('homeFeatureModal').style.display = 'none';
}

async function editHomeFeature(id) {
    try {
        const { data, error } = await supabase.from('home_features_strip').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('homeFeatId').value = data.id;
        document.getElementById('homeFeatOrder').value = data.display_order || 0;
        document.getElementById('homeFeatTitle').value = data.title || '';
        document.getElementById('homeFeatSubtitle').value = data.subtitle || '';
        document.getElementById('homeFeatIcon').value = data.icon || '';
        document.getElementById('homeFeatColor').value = data.theme_color_hex || '#1565C0';
        document.getElementById('homeFeatLink').value = data.link_url || '';
        
        document.getElementById('homeFeatureModalTitle').textContent = 'تعديل ميزة الرئيسية';
        document.getElementById('homeFeatureModal').style.display = 'flex';
    } catch (err) {
        showToast('خطأ', 'تعذر جلب تفاصيل الميزة', 'error');
    }
}

async function saveHomeFeature(e) {
    e.preventDefault();
    const btn = document.getElementById('homeFeatSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الحفظ...';
    try {
        const id = document.getElementById('homeFeatId').value;
        const payload = {
            display_order: parseInt(document.getElementById('homeFeatOrder').value) || 0,
            title: document.getElementById('homeFeatTitle').value,
            subtitle: document.getElementById('homeFeatSubtitle').value,
            icon: document.getElementById('homeFeatIcon').value,
            theme_color_hex: document.getElementById('homeFeatColor').value,
            link_url: document.getElementById('homeFeatLink').value || null
        };
        
        const res = id
            ? await supabase.from('home_features_strip').update(payload).eq('id', id)
            : await supabase.from('home_features_strip').insert([payload]);
            
        if (res.error) throw res.error;
        
        showToast('تم بنجاح', 'تم حفظ الميزة بنجاح', 'success');
        closeHomeFeatureModal();
        loadDashboardHomeFeatures();
    } catch (err) {
        showToast('خطأ', err.message || 'تعذر حفظ الميزة', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ الميزة';
    }
}

async function deleteHomeFeature(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الميزة من الصفحة الرئيسية؟')) return;
    try {
        const { error } = await supabase.from('home_features_strip').delete().eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', 'تم الحذف بنجاح', 'success');
        loadDashboardHomeFeatures();
    } catch (err) {
        console.error(err);
        showToast('خطأ', 'تعذر الحذف', 'error');
    }
}

// --- Store Settings ---
window.loadStoreSettings = async function() {
    try {
        const { data, error } = await supabase.from('store_settings').select('*');
        if (error) throw error;
        
        let discount = 0;
        let navbarLogoUrl = '';
        let footerLogoUrl = '';
        let faviconLogoUrl = '';

        if (data) {
            const setting = data.find(s => s.key === 'first_order_discount');
            if (setting) discount = setting.value;

            const navSetting = data.find(s => s.key === 'navbar_logo');
            if (navSetting && navSetting.text_value) navbarLogoUrl = navSetting.text_value;

            const footerSetting = data.find(s => s.key === 'footer_logo');
            if (footerSetting && footerSetting.text_value) footerLogoUrl = footerSetting.text_value;

            const faviconSetting = data.find(s => s.key === 'favicon_logo');
            if (faviconSetting && faviconSetting.text_value) faviconLogoUrl = faviconSetting.text_value;
        }
        
        const inputField = document.getElementById('settingFirstOrderDiscount');
        if (inputField) inputField.value = discount;

        if (navbarLogoUrl) {
            const previewNav = document.getElementById('previewNavbarLogo');
            if (previewNav) previewNav.src = navbarLogoUrl;
        }

        if (footerLogoUrl) {
            const previewFoot = document.getElementById('previewFooterLogo');
            if (previewFoot) previewFoot.src = footerLogoUrl;
        }

        if (faviconLogoUrl) {
            const previewFav = document.getElementById('previewFaviconLogo');
            if (previewFav) previewFav.src = faviconLogoUrl;
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
};

window.saveStoreSettings = async function() {
    const btn = document.getElementById('btnSaveSettings');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الحفظ...';
    try {
        const discountVal = parseFloat(document.getElementById('settingFirstOrderDiscount').value) || 0;
        
        const updates = [
            { key: 'first_order_discount', value: discountVal }
        ];

        // Handle image uploads
        const navFile = document.getElementById('settingNavbarLogoFile')?.files[0];
        const footerFile = document.getElementById('settingFooterLogoFile')?.files[0];
        const faviconFile = document.getElementById('settingFaviconLogoFile')?.files[0];

        if (navFile) {
            const urls = await uploadMediaFiles([navFile]);
            if (urls && urls.length > 0) {
                updates.push({ key: 'navbar_logo', text_value: urls[0] });
                document.getElementById('previewNavbarLogo').src = urls[0];
            }
        }

        if (footerFile) {
            const urls = await uploadMediaFiles([footerFile]);
            if (urls && urls.length > 0) {
                updates.push({ key: 'footer_logo', text_value: urls[0] });
                document.getElementById('previewFooterLogo').src = urls[0];
            }
        }

        if (faviconFile) {
            const urls = await uploadMediaFiles([faviconFile]);
            if (urls && urls.length > 0) {
                updates.push({ key: 'favicon_logo', text_value: urls[0] });
                document.getElementById('previewFaviconLogo').src = urls[0];
            }
        }
        
        for (const update of updates) {
            const { error } = await supabase.from('store_settings').upsert(update, { onConflict: 'key' });
            if (error) throw error;
        }
        
        showToast('تم بنجاح', 'تم حفظ الإعدادات بنجاح. قد تحتاج لتحديث الصفحة لرؤية الشعارات الجديدة.', 'success');
    } catch (err) {
        console.error(err);
        showToast('خطأ', 'تعذر حفظ الإعدادات: ' + err.message, 'error');
        alert('تعذر حفظ الإعدادات بسبب الخطأ التالي:\n' + err.message + '\n\nيرجى التأكد من تشغيل ملف setup_site_settings.sql في Supabase!');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ الإعدادات';
        
        // Clear file inputs after successful save
        if(document.getElementById('settingNavbarLogoFile')) document.getElementById('settingNavbarLogoFile').value = '';
        if(document.getElementById('settingFooterLogoFile')) document.getElementById('settingFooterLogoFile').value = '';
    }
};
// --- INSPECTIONS -------------------------------------------------------------
window._inspectionsList = [];

async function loadDashboardInspections() {
    const tbody = document.getElementById('inspections-list');
    if (!tbody) return;
    tbody.innerHTML = emptyStateRow(7, 'جاري التحميل...');
    try {
        const { data: inspections, error } = await supabase.from('inspections').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        window._inspectionsList = inspections || [];
        sortInspections();

        const badge = document.getElementById('nav-badge-inspections');
        const pendingCount = inspections.filter(i => i.status === 'قيد المراجعة').length;
        if (badge) {
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }
    } catch (err) {
        console.error('Error loading inspections:', err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;padding:1rem;">${err.message}</td></tr>`;
    }
}

window.sortInspections = function() {
    if (!window._inspectionsList) return;
    let filtered = [...window._inspectionsList];
    
    const fromDate = document.getElementById('inspections-date-from') ? document.getElementById('inspections-date-from').value : '';
    const toDate = document.getElementById('inspections-date-to') ? document.getElementById('inspections-date-to').value : '';
    if (fromDate) {
        filtered = filtered.filter(o => new Date(o.created_at) >= new Date(fromDate));
    }
    if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => new Date(o.created_at) <= toD);
    }
    
    const sortVal = document.getElementById('inspections-sort-select') ? document.getElementById('inspections-sort-select').value : 'date-desc';
    if (sortVal === 'date-desc') {
        filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'date-asc') {
        filtered.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'name-asc') {
        filtered.sort((a,b) => (a.customer_name||'').localeCompare(b.customer_name||'', 'ar'));
    } else if (sortVal === 'name-desc') {
        filtered.sort((a,b) => (b.customer_name||'').localeCompare(a.customer_name||'', 'ar'));
    }
    
    renderInspections(filtered);
};

function renderInspections(inspections) {
    const tbody = document.getElementById('inspections-list');
    if (!tbody) return;
    
    if (!inspections || inspections.length === 0) {
        tbody.innerHTML = emptyStateRow(7, 'لا يوجد مواعيد فحص مطابقة');
        return;
    }

    tbody.innerHTML = inspections.map((ins, idx) => {
        let statusColor = 'var(--gray-500)';
        if (ins.status === 'تم التأكيد') statusColor = 'var(--success)';
        if (ins.status === 'قيد المراجعة') statusColor = 'var(--warning)';
        if (ins.status === 'مكتمل') statusColor = 'var(--primary-600)';

        return `
        <tr>
            <td>
                <div style="font-weight:700;color:var(--dark-800);">${ins.customer_name || '-'}</div>
                <div style="font-size:12px;color:var(--gray-500);">${ins.company_name || '-'}</div>
            </td>
            <td style="color:var(--primary-600);font-weight:600;" dir="ltr">${ins.phone || '-'}</td>
            <td style="font-weight:700;">${ins.inspection_date || '-'}</td>
            <td style="color:var(--gray-600);">${ins.inspection_type || '-'}</td>
            <td>
                <span style="display:inline-block;padding:2px 8px;border-radius:12px;background:${statusColor}20;color:${statusColor};font-size:11px;font-weight:700;">
                    ${ins.status || 'قيد المراجعة'}
                </span>
            </td>
            <td>${new Date(ins.created_at).toLocaleDateString('ar-JO')}</td>
            <td class="no-print">
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-outline btn-sm" onclick="showInspectionDetails(window._inspectionsList.findIndex(i => i.id === '${ins.id}'))" style="font-size:11px;">تفاصيل</button>
                    <select onchange="updateInspectionStatus('${ins.id}', this.value)" style="padding:4px; border-radius:4px; border:1px solid var(--gray-300); font-size:11px;">
                        <option value="قيد المراجعة" ${ins.status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option>
                        <option value="تم التأكيد" ${ins.status === 'تم التأكيد' ? 'selected' : ''}>تأكيد</option>
                        <option value="مكتمل" ${ins.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                        <option value="ملغي" ${ins.status === 'ملغي' ? 'selected' : ''}>إلغاء</option>
                    </select>
                    <button class="btn btn-outline btn-sm" onclick="deleteInspection('${ins.id}')" style="font-size:11px;color:red;border-color:red;">حذف</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.printInspections = function() {
    if (!window._inspectionsList || window._inspectionsList.length === 0) {
        showToast('تنبيه', 'لا يوجد مواعيد للطباعة', 'info');
        return;
    }
    
    let filtered = [...window._inspectionsList];
    const fromDate = document.getElementById('inspections-date-from') ? document.getElementById('inspections-date-from').value : '';
    const toDate = document.getElementById('inspections-date-to') ? document.getElementById('inspections-date-to').value : '';
    if (fromDate) {
        filtered = filtered.filter(o => new Date(o.created_at) >= new Date(fromDate));
    }
    if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => new Date(o.created_at) <= toD);
    }
    
    const sortVal = document.getElementById('inspections-sort-select') ? document.getElementById('inspections-sort-select').value : 'date-desc';
    if (sortVal === 'date-desc') {
        filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'date-asc') {
        filtered.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'name-asc') {
        filtered.sort((a,b) => (a.customer_name||'').localeCompare(b.customer_name||'', 'ar'));
    } else if (sortVal === 'name-desc') {
        filtered.sort((a,b) => (b.customer_name||'').localeCompare(a.customer_name||'', 'ar'));
    }

    let html = `
        <html dir="rtl">
        <head>
            <title>كشف مواعيد الفحص البيئي</title>
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; color: #333; }
                h2 { text-align: center; color: #0F2C59; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 14px; }
                th { background-color: #f8f9fa; color: #0F2C59; }
                @media print {
                    @page { margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h2>كشف مواعيد الفحص البيئي</h2>
            <div style="text-align:left; font-size:12px; color:#666; margin-bottom:10px;">تاريخ الطباعة: ${new Date().toLocaleDateString('en-US')} - عدد المواعيد: ${filtered.length}</div>
            <table>
                <thead>
                    <tr>
                        <th>تاريخ الطلب</th>
                        <th>العميل</th>
                        <th>الشركة</th>
                        <th>الهاتف</th>
                        <th>تاريخ الفحص (المطلوب)</th>
                        <th>نوع الفحص</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filtered.forEach(ins => {
        html += `
            <tr>
                <td>${new Date(ins.created_at).toLocaleDateString('en-US')}</td>
                <td>${ins.customer_name || '-'}</td>
                <td>${ins.company_name || '-'}</td>
                <td dir="ltr" style="text-align:right;">${ins.phone || '-'}</td>
                <td>${ins.inspection_date || '-'}</td>
                <td>${ins.inspection_type || '-'}</td>
                <td>${ins.status || 'قيد المراجعة'}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </body>
        </html>
    `;

    const printWin = window.open('', '_blank');
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 250);
}

window.showInspectionDetails = function(index) {
    const ins = window._inspectionsList[index];
    const text = `
العميل: ${ins.customer_name || '-'}
الشركة: ${ins.company_name || '-'}
الهاتف: ${ins.phone || '-'}
تاريخ الفحص: ${ins.inspection_date || '-'}
نوع الفحص: ${ins.inspection_type || '-'}

الملاحظات:
${ins.notes || '-'}
    `;
    showDetailsModal("تفاصيل موعد الفحص", text);
};

window.updateInspectionStatus = async function(id, newStatus) {
    try {
        const { error } = await supabase.from('inspections').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', 'تم تحديث حالة الموعد', 'success');
        loadDashboardInspections();
    } catch (err) {
        console.error(err);
        showToast('خطأ', 'تعذر تحديث الحالة', 'error');
    }
};

window.deleteInspection = async function(id) {
    if(!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
    try {
        const { error } = await supabase.from('inspections').delete().eq('id', id);
        if (error) throw error;
        showToast('تم بنجاح', 'تم حذف الموعد', 'success');
        loadDashboardInspections();
    } catch (err) {
        console.error(err);
        showToast('خطأ', 'تعذر حذف الموعد', 'error');
    }
};

// Add load call to the global init
setTimeout(loadDashboardInspections, 1500);

function setDefaultDates() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const fromStr = `${yyyy}-${mm}-01`;
    
    const dateInputs = [
        'analytics-date-from', 'analytics-date-to',
        'orders-date-from', 'orders-date-to',
        'rfqs-date-from', 'rfqs-date-to',
        'payments-date-from', 'payments-date-to',
        'inspections-date-from', 'inspections-date-to',
        'customers-date-from', 'customers-date-to'
    ];
    
    dateInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.endsWith('-from') && !el.value) {
                el.value = fromStr;
            } else if (id.endsWith('-to') && !el.value) {
                el.value = todayStr;
            }
        }
    });
}
document.addEventListener('DOMContentLoaded', setDefaultDates);
setTimeout(setDefaultDates, 500);
