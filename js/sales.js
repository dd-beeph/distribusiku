// Modul Sales Order
let soCustomers = [];
let soProducts = [];
let soUnits = [];
let editingSalesOrderId = null;
let editingSalesOrderNo = null;

function makeSoProductOptions() {
  return '<option value="">Pilih produk</option>' + soProducts.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('');
}

function renderSoProductOptions(searchText, row) {
  const box = row.querySelector('.so-product-suggestions');
  if (!box) return;
  const q = String(searchText || '').trim().toLocaleLowerCase('id-ID');
  const filtered = q ? soProducts.filter(p => String(p.name || '').toLocaleLowerCase('id-ID').includes(q) || String(p.product_code || '').toLocaleLowerCase('id-ID').includes(q)) : [];
  if (!q) { box.innerHTML = ''; box.style.display = 'none'; return; }
  if (!filtered.length) { box.innerHTML = '<div style="padding:12px;color:var(--muted)">Tidak ada produk yang cocok.</div>'; box.style.display = 'block'; return; }
  box.innerHTML = filtered.slice(0, 50).map(p => `<button type="button" class="so-product-option" role="option" data-product-id="${escHtml(p.id)}">${escHtml(p.name)}</button>`).join('');
  box.style.display = 'block';
  box.querySelectorAll('[data-product-id]').forEach(btn => btn.addEventListener('click', () => {
    const product = soProducts.find(p => String(p.id) === btn.dataset.productId); if (!product) return;
    const prodInp = row.querySelector('.so-product'); if (prodInp) prodInp.value = String(product.id);
    const searchInp = row.querySelector('.so-product-search'); if (searchInp) searchInp.value = product.name;
    const codeInp = row.querySelector('.so-product-code'); if (codeInp) codeInp.value = product.product_code || '';
    const unit = soUnits.find(u => String(u.id) === String(product.base_unit_id));
    const unitInp = row.querySelector('.so-product-unit'); if (unitInp) unitInp.value = unit ? (unit.name || unit.code || '') : '-';
    box.innerHTML = ''; box.style.display = 'none'; updateSoTotals();
  }));
}

function addSoItemRow() {
  const container = document.getElementById('soItemsContainer');
  if (!container) return;
  const row = document.createElement('div'); row.className = 'card so-item-row'; row.style.padding = '10px';
  row.innerHTML = `<div class="field"><label>Kode Produk</label><input class="so-product-code" readonly placeholder="Otomatis" aria-label="Kode Produk otomatis"></div><div class="field so-product-field"><label>Nama Produk *</label><input class="so-product-search" type="text" autocomplete="off" required placeholder="Ketik nama atau kode produk..."><div class="so-product-suggestions" style="display:none" role="listbox"></div><select class="so-product" aria-hidden="true" tabindex="-1" style="display:none">${makeSoProductOptions()}</select></div><div class="field"><label>Satuan</label><input class="so-product-unit" readonly placeholder="Otomatis" aria-label="Satuan otomatis dari data produk"></div><div class="field"><label>Jumlah *</label><input class="so-quantity" type="number" min="0.001" step="0.001" required placeholder="Jumlah"></div><div class="field"><label>Harga Satuan (Rp) *</label><input class="so-price" type="number" min="0" step="1" required placeholder="Harga manual"></div><div class="field"><label>Subtotal</label><input class="so-subtotal" readonly value="Rp 0" aria-label="Subtotal barang"></div><button type="button" class="linkbtn so-remove">Hapus</button>`;
  container.appendChild(row);
  const search = row.querySelector('.so-product-search');
  if (search) {
    search.addEventListener('input', () => { row.querySelector('.so-product').value = ''; row.querySelector('.so-product-code').value = ''; row.querySelector('.so-product-unit').value = ''; renderSoProductOptions(search.value, row); });
    search.addEventListener('focus', () => { if (search.value.trim() && !row.querySelector('.so-product').value) renderSoProductOptions(search.value, row); });
  }
  row.querySelector('.so-quantity')?.addEventListener('input', updateSoTotals);
  row.querySelector('.so-price')?.addEventListener('input', updateSoTotals);
  row.querySelector('.so-remove')?.addEventListener('click', () => { if (editingSalesOrderId && document.querySelectorAll('.so-item-row').length <= 1) { alert('Sales Order harus menyisakan minimal satu barang.'); return; } row.remove(); if (!document.querySelector('.so-item-row')) addSoItemRow(); updateSoTotals(); });
}

document.addEventListener('click', e => {
  document.querySelectorAll('.so-item-row').forEach(row => {
    const field = row.querySelector('.so-product-field');
    if (field && !field.contains(e.target)) {
      const box = row.querySelector('.so-product-suggestions');
      if (box) box.style.display = 'none';
    }
  });
});

function updateSoTotals() {
  let total = 0;
  document.querySelectorAll('.so-item-row').forEach(row => {
    const qty = Number(row.querySelector('.so-quantity')?.value || 0);
    const price = Number(row.querySelector('.so-price')?.value || 0);
    const sub = qty * price; total += sub;
    const subInput = row.querySelector('.so-subtotal');
    if (subInput) subInput.value = rupiah(sub);
  });
  const totalElem = document.getElementById('soTotal');
  if (totalElem) totalElem.textContent = rupiah(total);
}

function renderSoCustomerOptions(searchText) {
  const select = document.getElementById('soCustomer');
  const box = document.getElementById('soCustomerSuggestions');
  if (!select || !box) return;
  const q = String(searchText || '').trim().toLocaleLowerCase('id-ID');
  const filtered = q ? soCustomers.filter(c => String(c.customer_code || '').toLocaleLowerCase('id-ID').includes(q) || String(c.name || '').toLocaleLowerCase('id-ID').includes(q)) : [];
  select.innerHTML = '<option value="">Pilih pelanggan</option>' + soCustomers.map(c => `<option value="${escHtml(c.id)}">${escHtml(c.customer_code || '')} — ${escHtml(c.name)}</option>`).join('');
  if (!q) { box.innerHTML = ''; box.style.display = 'none'; return; }
  if (!filtered.length) { box.innerHTML = '<div style="padding:12px;color:var(--muted)">Tidak ada pelanggan yang cocok.</div>'; box.style.display = 'block'; return; }
  box.innerHTML = filtered.slice(0, 50).map(c => `<button type="button" class="so-customer-option" role="option" data-customer-id="${escHtml(c.id)}"><strong>${escHtml(c.name)}</strong><small>Kode: ${escHtml(c.customer_code || '-')}</small></button>`).join('');
  box.style.display = 'block';
  box.querySelectorAll('[data-customer-id]').forEach(btn => btn.addEventListener('click', () => {
    const customer = soCustomers.find(c => String(c.id) === btn.dataset.customerId); if (!customer) return;
    select.value = String(customer.id);
    const searchInput = document.getElementById('soCustomerSearch');
    if (searchInput) searchInput.value = customer.name;
    box.style.display = 'none'; box.innerHTML = '';
  }));
}

document.getElementById('soCustomerSearch')?.addEventListener('input', e => {
  const custSel = document.getElementById('soCustomer'); if (custSel) custSel.value = '';
  renderSoCustomerOptions(e.target.value);
});
document.getElementById('soCustomerSearch')?.addEventListener('focus', e => {
  if (e.target.value.trim()) renderSoCustomerOptions(e.target.value);
});
document.addEventListener('click', e => {
  const field = document.querySelector('.so-customer-field');
  if (field && !field.contains(e.target)) {
    const box = document.getElementById('soCustomerSuggestions');
    if (box) box.style.display = 'none';
  }
});

async function loadSoChoices() {
  const [customersRes, productsRes, unitsRes] = await Promise.all([
    supabaseClient.from('customers').select('id,customer_code,name,is_active').eq('is_active', true).order('name'),
    supabaseClient.from('products').select('id,product_code,name,base_unit_id,is_active').eq('is_active', true).order('name'),
    supabaseClient.from('units').select('id,code,name').order('name')
  ]);
  const err = [customersRes, productsRes, unitsRes].find(r => r.error);
  if (err) throw new Error(err.error.message);
  soCustomers = customersRes.data || []; soProducts = productsRes.data || []; soUnits = unitsRes.data || [];
  const searchInp = document.getElementById('soCustomerSearch'); if (searchInp) searchInp.value = '';
  const custInp = document.getElementById('soCustomer'); if (custInp) custInp.value = '';
  const box = document.getElementById('soCustomerSuggestions'); if (box) box.style.display = 'none';
  renderSoCustomerOptions('');
}

async function loadSalesOrders() {
  const message = document.getElementById('salesOrderListMessage');
  const body = document.getElementById('salesOrdersBody');
  if (!body) return;
  if (message) { message.style.color = 'var(--muted)'; message.textContent = 'Mengambil Sales Order dari Supabase...'; }
  body.innerHTML = '<tr><td colspan="7">Memuat data...</td></tr>';
  try {
    const [ordersRes, customersRes, productsRes, itemsRes] = await Promise.all([
      supabaseClient.from('sales_orders').select('id,order_no,order_date,customer_id,status,notes,created_at').order('created_at', { ascending: false }),
      supabaseClient.from('customers').select('id,name'),
      supabaseClient.from('products').select('id,name,product_code'),
      supabaseClient.from('sales_order_items').select('sales_order_id,product_id,quantity,unit_price,discount_amount')
    ]);
    const err = [ordersRes, customersRes, productsRes, itemsRes].find(r => r.error);
    if (err) throw new Error(err.error.message);
    const orders = ordersRes.data || [], customers = customersRes.data || [], items = itemsRes.data || [];
    const customerMap = new Map(customers.map(x => [String(x.id), x.name]));
    const totals = new Map();
    for (const it of items) {
      const old = totals.get(String(it.sales_order_id)) || { total: 0, count: 0 };
      old.total += Number(it.quantity || 0) * Number(it.unit_price || 0) - Number(it.discount_amount || 0);
      old.count += 1;
      totals.set(String(it.sales_order_id), old);
    }
    if (!orders.length) { body.innerHTML = '<tr><td colspan="7" class="empty">Belum ada Sales Order tersimpan.</td></tr>'; }
    else body.innerHTML = orders.map(o => {
      const summary = totals.get(String(o.id)) || { total: 0, count: 0 };
      const statusLabel = ({ confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan', completed: 'Selesai' })[o.status] || (o.status === 'draft' ? 'Perlu pembaruan status' : o.status);
      const canEdit = o.status === 'confirmed';
      return `<tr>
        <td>${escHtml(o.order_no)}</td>
        <td>${escHtml(o.order_date || '-')}</td>
        <td>${escHtml(customerMap.get(String(o.customer_id)) || 'Pelanggan tidak ditemukan')}</td>
        <td>${summary.count} jenis</td>
        <td>${rupiah(summary.total)}</td>
        <td><span class="status ${o.status === 'confirmed' ? 'green' : o.status === 'cancelled' ? 'red' : ''}">${escHtml(statusLabel)}</span></td>
        <td>
          <div class="so-actions">
            <button type="button" class="so-action-btn" data-so-action="view" data-so-id="${escHtml(o.id)}" title="Lihat Detail">⌕</button>
            <button type="button" class="so-action-btn" data-so-action="deliver" data-so-id="${escHtml(o.id)}" title="Gudang Eksekusi Kirim" ${canEdit ? '' : 'disabled'}>▞</button>
            <button type="button" class="so-action-btn" data-so-action="edit" data-so-id="${escHtml(o.id)}" title="Edit" ${canEdit ? '' : 'disabled'}>✎</button>
            <button type="button" class="so-action-btn danger" data-so-action="cancel" data-so-id="${escHtml(o.id)}" title="Batalkan" ${canEdit ? '' : 'disabled'}>⊗</button>
          </div>
        </td>
      </tr>`;
    }).join('');
    const countElem = document.getElementById('salesOrderCount');
    if (countElem) countElem.textContent = `${orders.length} Sales Order tersimpan`;
    if (message) { message.textContent = 'Data ditampilkan langsung dari Supabase. Klik ikon ▞ untuk mengeksekusi pengiriman.'; message.style.color = 'var(--green)'; }
  } catch (error) {
    body.innerHTML = '<tr><td colspan="7">Data belum dapat ditampilkan.</td></tr>';
    if (message) { message.style.color = 'var(--red)'; message.textContent = 'Gagal memuat Sales Order: ' + error.message; }
    const countElem = document.getElementById('salesOrderCount');
    if (countElem) countElem.textContent = 'Gagal memuat';
  }
}

const salesOrderForm = document.getElementById('salesOrderForm');

function resetSalesOrderForm() {
  editingSalesOrderId = null; editingSalesOrderNo = null;
  if (salesOrderForm) salesOrderForm.reset();
  const container = document.getElementById('soItemsContainer'); if (container) container.innerHTML = '';
  const modal = document.getElementById('salesFormModal'); if (modal) modal.style.display = 'none';
  const title = document.getElementById('salesFormTitle'); if (title) title.textContent = 'Buat Sales Order';
  const saveBtn = document.getElementById('saveSalesOrderBtn'); if (saveBtn) saveBtn.textContent = 'Simpan Sales Order';
  const msg = document.getElementById('salesOrderMessage'); if (msg) msg.textContent = '';

  const searchInp = document.getElementById('soCustomerSearch'); if (searchInp) searchInp.readOnly = false;
  const dateInp = document.getElementById('soDate'); if (dateInp) dateInp.readOnly = false;
  const notesInp = document.getElementById('soNotes'); if (notesInp) notesInp.readOnly = false;
  const addBtn = document.getElementById('addSoItemBtn'); if (addBtn) addBtn.style.display = 'inline-block';
}

document.getElementById('showSalesFormBtn')?.addEventListener('click', async () => {
  resetSalesOrderForm();
  const salesOrderMessage = document.getElementById('salesOrderMessage');
  if (!supabaseClient) { if (salesOrderMessage) { salesOrderMessage.style.color = 'var(--red)'; salesOrderMessage.textContent = 'Koneksi Supabase belum siap.'; } return; }
  const modal = document.getElementById('salesFormModal'); if (modal) modal.style.display = 'flex';
  if (salesOrderMessage) { salesOrderMessage.textContent = 'Memuat data...'; salesOrderMessage.style.color = 'var(--muted)'; }
  try {
    await loadSoChoices();
    const dateInp = document.getElementById('soDate'); if (dateInp) dateInp.value = todayLocal();
    const container = document.getElementById('soItemsContainer'); if (container) container.innerHTML = '';
    addSoItemRow();
    if (salesOrderMessage) salesOrderMessage.textContent = '';
  } catch (error) {
    if (salesOrderMessage) { salesOrderMessage.style.color = 'var(--red)'; salesOrderMessage.textContent = 'Gagal memuat pilihan data: ' + error.message; }
  }
});

document.getElementById('closeSalesFormBtn')?.addEventListener('click', resetSalesOrderForm);
document.getElementById('cancelSalesOrderBtn')?.addEventListener('click', resetSalesOrderForm);
document.getElementById('addSoItemBtn')?.addEventListener('click', addSoItemRow);
document.getElementById('refreshSalesOrdersBtn')?.addEventListener('click', loadSalesOrders);
document.getElementById('refreshSoStockBtn')?.addEventListener('click', loadSoStockSummary);

salesOrderForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const salesOrderMessage = document.getElementById('salesOrderMessage');
  if (!supabaseClient) { if (salesOrderMessage) { salesOrderMessage.style.color = 'var(--red)'; salesOrderMessage.textContent = 'Koneksi Supabase belum siap.'; } return; }
  const customerId = document.getElementById('soCustomer')?.value;
  const orderDate = document.getElementById('soDate')?.value;
  const notes = document.getElementById('soNotes')?.value.trim() || null;
  const rows = [...document.querySelectorAll('.so-item-row')];
  if (!customerId) { if (salesOrderMessage) { salesOrderMessage.style.color = 'var(--red)'; salesOrderMessage.textContent = 'Pilih pelanggan terlebih dahulu.'; } return; }
  if (!rows.length) { if (salesOrderMessage) { salesOrderMessage.style.color = 'var(--red)'; salesOrderMessage.textContent = 'Tambahkan minimal satu barang.'; } return; }
  const orderItems = [];
  for (const row of rows) {
    const productId = row.querySelector('.so-product')?.value;
    const quantity = Number(row.querySelector('.so-quantity')?.value);
    const unitPrice = Number(row.querySelector('.so-price')?.value);
    const product = soProducts.find(p => String(p.id) === String(productId));
    if (!product || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      if (salesOrderMessage) { salesOrderMessage.style.color = 'var(--red)'; salesOrderMessage.textContent = 'Periksa produk, jumlah, dan harga pada setiap baris.'; } return;
    }
    orderItems.push({ product_id: product.id, unit_id: product.base_unit_id, quantity, conversion_factor: 1, unit_price: unitPrice, discount_amount: 0, notes: null });
  }
  const saveBtn = document.getElementById('saveSalesOrderBtn');
  if (saveBtn) saveBtn.disabled = true;
  if (salesOrderMessage) { salesOrderMessage.style.color = 'var(--muted)'; salesOrderMessage.textContent = 'Menyimpan...'; }
  try {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(); if (userError) throw userError;
    if (editingSalesOrderId) {
      const id = editingSalesOrderId;
      const currentRows = [...document.querySelectorAll('.so-item-row')];
      const { data: existingItems, error: existingError } = await supabaseClient.from('sales_order_items').select('id').eq('sales_order_id', id);
      if (existingError) throw existingError;
      const existingIds = new Set((existingItems || []).map(x => String(x.id)));
      const keptIds = new Set();
      for (const row of currentRows) {
        const itemId = row.dataset.soItemId;
        const qty = Number(row.querySelector('.so-quantity')?.value);
        if (!itemId || !existingIds.has(String(itemId))) throw new Error('Detail barang tidak valid.');
        const { error } = await supabaseClient.from('sales_order_items').update({ quantity: qty }).eq('id', itemId).eq('sales_order_id', id);
        if (error) throw error;
        keptIds.add(String(itemId));
      }
      const removedIds = [...existingIds].filter(itemId => !keptIds.has(itemId));
      if (removedIds.length) {
        const { error } = await supabaseClient.from('sales_order_items').delete().eq('sales_order_id', id).in('id', removedIds);
        if (error) throw error;
      }
      const { error: updateError } = await supabaseClient.from('sales_orders').update({ updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'confirmed');
      if (updateError) throw updateError;
      const orderNo = editingSalesOrderNo; resetSalesOrderForm(); await loadSalesOrders(); await loadSoStockSummary();
      const msg = document.getElementById('salesOrderListMessage'); if (msg) { msg.style.color = 'var(--green)'; msg.textContent = `Sales Order ${orderNo} berhasil diperbarui.`; }
    } else {
      const now = new Date(); const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase(); const orderNo = `SO-${stamp}-${randomPart}`;
      const { data: order, error: orderError } = await supabaseClient.from('sales_orders').insert({ order_no: orderNo, order_date: orderDate, customer_id: Number(customerId), warehouse_id: null, status: 'confirmed', notes, created_by: userData.user?.id || null }).select('id,order_no').single();
      if (orderError) throw orderError;
      const { error: itemsError } = await supabaseClient.from('sales_order_items').insert(orderItems.map(item => ({ ...item, sales_order_id: order.id })));
      if (itemsError) { await supabaseClient.from('sales_orders').delete().eq('id', order.id); throw new Error('Detail barang gagal disimpan: ' + itemsError.message); }
      resetSalesOrderForm(); await loadSalesOrders(); await loadSoStockSummary();
      const msg = document.getElementById('salesOrderListMessage'); if (msg) { msg.style.color = 'var(--green)'; msg.textContent = `Sales Order ${order.order_no} berhasil disimpan. Tim Gudang sudah dapat mengeksekusi pengiriman.`; }
    }
  } catch (error) { if (salesOrderMessage) { salesOrderMessage.style.color = 'var(--red)'; salesOrderMessage.textContent = 'Gagal menyimpan Sales Order: ' + (error.message || String(error)); } }
  finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = editingSalesOrderId ? 'Simpan Perubahan' : 'Simpan Sales Order'; } }
});

async function loadSoStockSummary() {
  const body = document.getElementById('soStockBody');
  const message = document.getElementById('soStockMessage');
  if (!body) return;
  if (!supabaseClient) { if (message) message.textContent = 'Koneksi Supabase belum siap.'; return; }
  body.innerHTML = '<tr><td colspan="4">Memuat data...</td></tr>';
  if (message) message.textContent = 'Menghitung kebutuhan pesanan...';
  try {
    const [ordersRes, itemsRes, productsRes, deliveryItemsRes] = await Promise.all([
      supabaseClient.from('sales_orders').select('id,status').eq('status', 'confirmed'),
      supabaseClient.from('sales_order_items').select('id,sales_order_id,product_id,quantity'),
      supabaseClient.from('products').select('id,product_code,name,is_active'),
      supabaseClient.from('delivery_items').select('sales_order_item_id,quantity_shipped')
    ]);
    const err = [ordersRes, itemsRes, productsRes, deliveryItemsRes].find(r => r.error); if (err) throw err.error;
    const activeOrderIds = new Set((ordersRes.data || []).map(o => String(o.id)));
    const itemMap = new Map((itemsRes.data || []).filter(i => activeOrderIds.has(String(i.sales_order_id))).map(i => [String(i.id), i]));
    const shipped = new Map();
    for (const di of deliveryItemsRes.data || []) shipped.set(String(di.sales_order_item_id), (shipped.get(String(di.sales_order_item_id)) || 0) + Number(di.quantity_shipped || 0));
    const needed = new Map();
    for (const item of itemMap.values()) {
      const outstanding = Math.max(0, Number(item.quantity || 0) - (shipped.get(String(item.id)) || 0));
      if (outstanding > 0) needed.set(String(item.product_id), (needed.get(String(item.product_id)) || 0) + outstanding);
    }
    const products = (productsRes.data || []).filter(p => needed.has(String(p.id)));
    if (!products.length) { body.innerHTML = '<tr><td colspan="4" class="empty">Tidak ada kebutuhan stok dari Sales Order aktif.</td></tr>'; }
    else body.innerHTML = products.map(p => `<tr><td>${escHtml(p.product_code || '-')}</td><td>${escHtml(p.name || '-')}</td><td>${Number(needed.get(String(p.id)) || 0).toLocaleString('id-ID')}</td><td><span class="status">Menunggu tabel stok</span></td></tr>`).join('');
    if (message) message.textContent = 'Kebutuhan dihitung dari SO aktif dikurangi jumlah yang sudah diproses Surat Jalan oleh Gudang.';
  } catch (error) { body.innerHTML = '<tr><td colspan="4">Gagal memuat kebutuhan stok.</td></tr>'; if (message) message.textContent = 'Gagal menghitung kebutuhan stok: ' + error.message; }
}

async function getSalesOrderDetail(id) {
  const { data: order, error: orderError } = await supabaseClient.from('sales_orders').select('id,order_no,order_date,customer_id,status,notes,created_at').eq('id', id).single(); if (orderError) throw orderError;
  const [customerRes, itemsRes, productsRes, unitsRes] = await Promise.all([
    supabaseClient.from('customers').select('id,customer_code,name,address,phone').eq('id', order.customer_id).maybeSingle(),
    supabaseClient.from('sales_order_items').select('id,sales_order_id,product_id,unit_id,quantity,conversion_factor,unit_price,discount_amount,notes').eq('sales_order_id', id),
    supabaseClient.from('products').select('id,product_code,name,base_unit_id').order('name'),
    supabaseClient.from('units').select('id,code,name')
  ]);
  const err = [customerRes, itemsRes, productsRes, unitsRes].find(r => r.error); if (err) throw err.error;
  const products = new Map((productsRes.data || []).map(p => [String(p.id), p])); const units = new Map((unitsRes.data || []).map(u => [String(u.id), u]));
  const items = (itemsRes.data || []).map(i => ({ ...i, product: products.get(String(i.product_id)) || { name: 'Produk tidak ditemukan', product_code: '-' }, unit: units.get(String(i.unit_id)) || { name: '-' } }));
  return { order, customer: customerRes.data || { name: 'Pelanggan tidak ditemukan' }, items };
}

async function viewSalesOrder(id) { const modal = ensureSoModal(); modal.style.display = 'flex'; modal.querySelector('#soModalTitle').textContent = 'Detail Sales Order'; modal.querySelector('#soModalMessage').textContent = 'Memuat detail...'; modal.querySelector('#soModalContent').innerHTML = ''; try { const d = await getSalesOrderDetail(id); const total = d.items.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_price || 0) - Number(i.discount_amount || 0), 0); modal.querySelector('#soModalTitle').textContent = d.order.order_no; modal.querySelector('#soModalMessage').textContent = 'Detail Sales Order'; modal.querySelector('#soModalContent').innerHTML = `<div class="so-modal-grid"><div class="so-modal-info"><small>Tanggal</small><strong>${escHtml(d.order.order_date || '-')}</strong></div><div class="so-modal-info"><small>Status</small><strong>${escHtml(statusText(d.order.status))}</strong></div><div class="so-modal-info"><small>Pelanggan</small><strong>${escHtml(d.customer.name || '-')}</strong></div><div class="so-modal-info"><small>Catatan</small><strong>${escHtml(d.order.notes || '-')}</strong></div></div><div class="tablewrap"><table><thead><tr><th>Kode</th><th>Produk</th><th>Satuan</th><th>Jumlah</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${d.items.map(i => `<tr><td>${escHtml(i.product.product_code \vert{}\vert{} '-')}</td><td>${escHtml(i.product.name)}</td><td>${escHtml(i.unit.name \vert{}\vert{} i.unit.code \vert{}\vert{} '-')}</td><td>${escHtml(i.quantity)}</td><td>${rupiah(i.unit_price)}</td><td>${rupiah(Number(i.quantity) * Number(i.unit_price) - Number(i.discount_amount || 0))}</td></tr>`).join('')}</tbody></table></div><div class="so-modal-total">Total: ${rupiah(total)}</div>`; } catch (error) { modal.querySelector('#soModalMessage').textContent = 'Gagal memuat detail: ' + error.message; } }

async function editSalesOrder(id) {
  try {
    const detail = await getSalesOrderDetail(id); if (detail.order.status !== 'confirmed') { alert('Hanya Sales Order berstatus Dikonfirmasi yang dapat diedit.'); return; }
    await loadSoChoices();
    if (!soCustomers.some(c => String(c.id) === String(detail.customer.id)) && detail.customer.id) soCustomers.push({ ...detail.customer, is_active: false });
    detail.items.forEach(i => { if (i.product && i.product.id && !soProducts.some(p => String(p.id) === String(i.product.id))) soProducts.push(i.product); });
    editingSalesOrderId = detail.order.id; editingSalesOrderNo = detail.order.order_no;
    const modal = document.getElementById('salesFormModal'); if (modal) modal.style.display = 'flex';
    const title = document.getElementById('salesFormTitle'); if (title) title.textContent = 'Edit Sales Order ' + detail.order.order_no;
    const saveBtn = document.getElementById('saveSalesOrderBtn'); if (saveBtn) saveBtn.textContent = 'Simpan Perubahan';
    const customerSel = document.getElementById('soCustomer');
    if (customerSel) {
      customerSel.innerHTML = '<option value="">Pilih pelanggan</option>' + soCustomers.map(c => `<option value="${escHtml(c.id)}">${escHtml(c.customer_code || '')} — ${escHtml(c.name)}</option>`).join('');
      customerSel.value = String(detail.order.customer_id);
    }
    const searchInp = document.getElementById('soCustomerSearch'); if (searchInp) searchInp.value = detail.customer.name || '';
    const dateInp = document.getElementById('soDate'); if (dateInp) dateInp.value = detail.order.order_date || todayLocal();
    const notesInp = document.getElementById('soNotes'); if (notesInp) notesInp.value = detail.order.notes || '';
    if (searchInp) searchInp.readOnly = true; if (dateInp) dateInp.readOnly = true; if (notesInp) notesInp.readOnly = true;
    const addBtn = document.getElementById('addSoItemBtn'); if (addBtn) addBtn.style.display = 'none';
    const container = document.getElementById('soItemsContainer'); if (container) container.innerHTML = '';
    for (const item of detail.items) {
      addSoItemRow();
      const rows = document.querySelectorAll('.so-item-row');
      const row = rows[rows.length - 1];
      if (row) {
        const prodSel = row.querySelector('.so-product'); if (prodSel) prodSel.value = String(item.product_id);
        const pSearch = row.querySelector('.so-product-search'); if (pSearch) { pSearch.value = item.product.name || ''; pSearch.readOnly = true; }
        const pCode = row.querySelector('.so-product-code'); if (pCode) pCode.value = item.product.product_code || '';
        const pUnit = row.querySelector('.so-product-unit'); if (pUnit) pUnit.value = item.unit.name || item.unit.code || '';
        const pQty = row.querySelector('.so-quantity'); if (pQty) pQty.value = item.quantity;
        const pPrice = row.querySelector('.so-price'); if (pPrice) { pPrice.value = item.unit_price; pPrice.readOnly = true; }
        row.dataset.soItemId = String(item.id);
      }
    }
    updateSoTotals();
    const salesOrderMessage = document.getElementById('salesOrderMessage'); if (salesOrderMessage) salesOrderMessage.textContent = '';
  } catch (error) { alert('Gagal membuka Sales Order untuk diedit: ' + error.message); }
}

async function cancelSalesOrder(id) {
  try {
    const detail = await getSalesOrderDetail(id); if (detail.order.status !== 'confirmed') { alert('Hanya Sales Order berstatus Dikonfirmasi yang dapat dibatalkan.'); return; }
    if (!confirm(`Batalkan ${detail.order.order_no}? Pesanan akan tetap tersimpan dengan status Dibatalkan.`)) return;
    const { error } = await supabaseClient.from('sales_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'confirmed');
    if (error) throw error;
    await loadSalesOrders(); await loadSoStockSummary();
    const m = document.getElementById('salesOrderListMessage'); if (m) { m.style.color = 'var(--green)'; m.textContent = `Sales Order ${detail.order.order_no} dibatalkan.`; }
  } catch (error) { alert('Gagal membatalkan Sales Order: ' + error.message); }
}

document.getElementById('salesOrdersBody')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-so-action]');
  if (!btn) return;
  const id = btn.dataset.soId;
  const action = btn.dataset.soAction;
  if (action === 'view') viewSalesOrder(id);
  else if (action === 'deliver') { if (typeof openWhDeliverForm === 'function') openWhDeliverForm(id); }
  else if (action === 'edit') editSalesOrder(id);
  else if (action === 'cancel') cancelSalesOrder(id);
});

// Daftarkan fungsi ke scope global window
window.loadSalesOrders = loadSalesOrders;
window.loadSoStockSummary = loadSoStockSummary;
window.viewSalesOrder = viewSalesOrder;
window.editSalesOrder = editSalesOrder;
window.cancelSalesOrder = cancelSalesOrder;
