const fs = require('fs');

const path = 'js/dashboard-supabase.js';
let content = fs.readFileSync(path, 'utf8');

const startIndex = content.indexOf('async function loadDashboardOverview() {');
const endMarker = '\n// ─── Sales chart renderer';
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const newFunc = `async function loadDashboardOverview() {
    try {
        ['kpi-orders-count','kpi-sales-amount','kpi-rfqs-count','kpi-products-count'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<span style="display:inline-block;width:60px;height:20px;background:#E2E8F0;border-radius:4px;animation:pulse 1.5s infinite"></span>';
        });

        const [
            { data: stats },
            { data: monthlyRevData },
            { data: recentOrders },
            { data: recentRfqs },
            { data: products }
        ] = await Promise.all([
            supabase.rpc('get_dashboard_stats'),
            supabase.rpc('get_monthly_revenue'),
            supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
            supabase.from('rfqs').select('*').order('created_at', { ascending: false }),
            supabase.from('products').select('category')
        ]);

        if (!stats) return;

        const orders = recentOrders || [];
        const rfqs = recentRfqs || [];

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('kpi-orders-count', stats.orders_count || 0);
        set('kpi-sales-amount', (stats.sales_total || 0).toLocaleString('en-US'));
        set('kpi-rfqs-count', stats.pending_rfqs_count || 0);
        set('kpi-products-count', stats.products_count || 0);

        const navOB = document.getElementById('nav-badge-orders');
        if (navOB) { navOB.textContent = stats.orders_count || 0; navOB.style.display = stats.orders_count > 0 ? '' : 'none'; }
        const navRB = document.getElementById('nav-badge-rfqs');
        if (navRB) { navRB.textContent = stats.pending_rfqs_count || 0; navRB.style.display = stats.pending_rfqs_count > 0 ? '' : 'none'; }

        const notifBadge = document.getElementById('notif-count-badge');
        const newAlerts = (stats.pending_rfqs_count || 0) + (stats.new_orders_count || 0);
        if (notifBadge) notifBadge.textContent = newAlerts;

        const tbody = document.getElementById('recent-orders-list');
        if (tbody) {
            tbody.innerHTML = orders.length === 0
                ? emptyStateRow(6, 'لا توجد طلبات بعد')
                : orders.map(order => \`
                    <tr>
                        <td style="font-weight:700;color:var(--primary-700);">#\${order.id.split('-')[0]}</td>
                        <td>
                            <div style="font-weight:600;">\${order.customer_company || order.customer_name || '-'}</div>
                            <div style="font-size:11px;color:var(--gray-400);">\${order.customer_name || ''}</div>
                        </td>
                        <td>\${Array.isArray(order.items) ? order.items.length : 0} منتج</td>
                        <td style="font-weight:700;color:var(--dark-800);">\${(parseFloat(order.total_amount)||0).toLocaleString('en-US')} د.أ</td>
                        <td><span class="order-status \${statusClass(order.status)}">\${order.status || '-'}</span></td>
                        <td><button class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 10px;" onclick="showSection('orders')">عرض</button></td>
                    </tr>\`).join('');
        }

        const rfqsList = document.getElementById('recent-rfqs-list');
        if (rfqsList) {
            const monthsNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
            rfqsList.innerHTML = rfqs.slice(0, 3).length === 0
                ? emptyStateDiv('لا يوجد عروض أسعار بعد')
                : rfqs.slice(0, 3).map(rfq => {
                    const date = new Date(rfq.created_at);
                    return \`
                    <div class="upcoming-event">
                        <div class="event-date-badge" style="background:#F0FDF4;color:#2E7D32;">
                            <div class="event-date-day">\${date.getDate()}</div>
                            <div class="event-date-month">\${monthsNames[date.getMonth()]}</div>
                        </div>
                        <div class="event-info">
                            <div class="event-info-title">\${rfq.company_name || '-'}</div>
                            <div class="event-info-meta">\${rfq.contact_person || ''} — \${rfq.phone || ''}</div>
                        </div>
                    </div>\`;
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

            window._dashData.weekly = {
                labels: Array.from({length:7}, (_, i) => { const d = new Date(); d.setDate(d.getDate()-(6-i)); return d.toLocaleDateString('ar-JO',{weekday:'short'}); }),
                sales: Array(7).fill(0),
                rfqs: Array(7).fill(0)
            };

            renderSalesChart('monthly');

            const catCounts = {};
            if (products) {
                products.forEach(p => { if (p.category) catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
            }
            const catLabelsMap = { 'measurement':'أجهزة الفحص','safety':'السلامة','attendance':'تسجيل الدوام','monitoring':'المراقبة والتحكم','alarm':'أنظمة الإنذار','fire_other':'إطفاء الحريق','other':'أخرى' };
            const catColors = ['#1565C0','#FF6B00','#F44336','#7C3AED','#00C853','#FFD600'];
            const catKeys = Object.keys(catCounts);

            if (catKeys.length > 0) {
                getOrCreateChart('categoryChart', {
                    type: 'doughnut',
                    data: {
                        labels: catKeys.map(k => catLabelsMap[k] || k),
                        datasets: [{ data: catKeys.map(k => catCounts[k]), backgroundColor: catColors.slice(0, catKeys.length), borderWidth: 0 }]
                    },
                    options: {
                        responsive: true, cutout: '70%',
                        plugins: { legend: { display: true, position: 'bottom', labels: { font: { family:'Cairo', size: 11 }, padding: 12 } } }
                    }
                });
                const catStatsList = document.getElementById('category-stats-list');
                if (catStatsList) {
                    const total = products.length || 1;
                    catStatsList.innerHTML = catKeys.map((k, idx) => {
                        const pct = Math.round((catCounts[k] / total) * 100);
                        return \`
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="width:12px;height:12px;background:\${catColors[idx]};border-radius:3px;display:inline-block;"></span>
                                <span style="font-size:var(--text-xs);color:var(--gray-600);">\${catLabelsMap[k] || k}</span>
                            </div>
                            <span style="font-size:var(--text-xs);font-weight:700;color:var(--dark-800);">\${pct}%</span>
                        </div>\`;
                    }).join('');
                }
            } else {
                const el = document.getElementById('category-stats-list');
                if (el) el.innerHTML = emptyStateDiv('لا توجد منتجات بعد');
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
}`;
    
    content = content.substring(0, startIndex) + newFunc + content.substring(endIndex);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully refactored loadDashboardOverview!');
} else {
    console.log('Could not find function bounds.');
}
