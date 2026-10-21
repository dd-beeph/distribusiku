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
  if (!q) {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }
  if (!filtered.length) {
    box.innerHTML = '<div style="padding:12px;color:var(--muted)">Tidak ada produk yang cocok.</div>';
    box.style.display = 'block';
    return;
  }
  box.innerHTML = filtered.slice(0, 50).map(p => `<button type="button" class="so-product-option" role="option" data-product-id="${escHtml(p.id)}">${escHtml(p.name)}</button>`).join('');
  box.style.display = 'block';
  box.querySelectorAll('[data-product-id]').forEach(btn => btn.addEventListener('click', () => {
    const product = soProducts.find(p => String(p.id) === btn.dataset.productId);
    if (!product) return;
    const prodInp = row.querySelector('.so-product');
    if (prodInp) prodInp.value = String(product.id);
    const searchInp = row.querySelector('.so-product-search');
    if (searchInp) searchInp.value = product.name;
    const codeInp = row.querySelector('.so-product-code');
    if (codeInp) codeInp.value = product.product_code || '';
    const unit = soUnits.find(u => String(u.id) === String(product.base_unit_id));
    const unitInp = row.querySelector('.so-product-unit');
    if (unitInp) unitInp.value = unit ? (unit.name || unit.code || '') : '-';
    box.innerHTML = '';
    box.style.display = 'none';
    updateSoTotals();
  }));
}

function addSoItemRow() {
  const container = document.getElementById('soItemsContainer');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'card so-item-row';
  row.style.padding = '10px';
  row.innerHTML = [
    '<div class="field"><label>Kode Produk</label><input class="so-product-code" readonly placeholder="Otomatis"></div>',
    '<div class="field so-product-field"><label>Nama Produk *</label><input class="so-product-search" type="text" autocomplete="off" required placeholder="Ketik nama atau kode produk..."><div class="so-product-suggestions" style="display:none"></div><select class="so-product" style="display:none">' + makeSoProductOptions() + '</select></div>',
    '<div class="field"><label>Satuan</label><input class="so-product-unit" readonly placeholder="Otomatis"></div>',
    '<div class="field"><label>Jumlah *</label><input class="so-quantity" type="number" min="0.001" step="0.001" required placeholder="Jumlah"></div>',
    '<div class="field"><label>Harga Satuan (Rp) *</label><input class="so-price" type="number" min="0" step="1" required placeholder="Harga manual"></div>',
    '<div class="field"><label>Subtotal</label><input class="so-subtotal" readonly value="Rp 0"></div>',
    '<button type="button" class="linkbtn so-remove">Hapus</button>'
  ].join('');
  container.appendChild(row);
  const search = row.querySelector('.so-product-search');
  if (search) {
    search.addEventListener('input', () => {
      row.querySelector('.so-product').value = '';
      row.querySelector('.so-product-code').value = '';
      row.querySelector('.so-product-unit').value = '';
      renderSoProductOptions(search.value, row);
    });
    search.addEventListener('focus', () => {
      if (search.value.trim() && !row.querySelector('.so-product').value) renderSoProductOptions(search.value, row);
    });
  }
  row.querySelector('.so-quantity')?.addEventListener('input', updateSoTotals);
  row.querySelector('.so-price')?.addEventListener('input', updateSoTotals);
  row.querySelector('.so-remove')?.addEventListener('click', () => {
    if (editingSalesOrderId && document.querySelectorAll('.so-item-row').length <= 1) {
      alert('Sales Order harus menyisakan minimal satu barang.');
      return;
    }
    row.remove();
    if (!document.querySelector('.so-item-row')) addSoItemRow();
    updateSoTotals();
  });
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
    const sub = qty * price;
    total += sub;
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
  select.innerHTML = '<option value="">Pilih pelanggan</option>' + soCustomers.map(c => {
    return `<option value="${escHtml(c.id)}">${escHtml(c.customer_code || '')} - ${escHtml(c.name)}</option>`;
  }).join('');
  if (!q) {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }
  if (!filtered.length) {
    box.innerHTML = '<div style="padding:12px;color:var(--muted)">Tidak ada pelanggan yang cocok.</div>';
    box.style.display = 'block';
    return;
  }
  box.innerHTML = filtered.slice(0, 50).map(c => {
    return `<button type="button" class="so-customer-option" data-customer-id="${escHtml(c.id)}"><strong>${escHtml(c.name)}</strong><small>Kode: ${escHtml(c.customer_code || '-')}</small></button>`;
  }).join('');
  box.style.display = 'block';
  box.querySelectorAll('[data-customer-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const customer = soCustomers.find(c => String(c.id) === btn.dataset.customerId);
      if (!customer) return;
      select.value = String(customer.id);
      const searchInput = document.getElementById('soCustomerSearch');
      if (searchInput) searchInput.value = customer.name;
      box.style.display = 'none';
      box.innerHTML = '';
    });
  });
}

document.getElementById('soCustomerSearch')?.addEventListener('input', e => {
  const custSel = document.getElementById('soCustomer');
  if (custSel) custSel.value = '';
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
  soCustomers = customersRes.data || [];
  soProducts = productsRes.data || [];
  soUnits = unitsRes.data || [];
  const searchInp = document.getElementById('soCustomerSearch');
  if (searchInp) searchInp.value = '';
  const custInp = document.getElementById('soCustomer');
  if (custInp) custInp.value = '';
  const box = document.getElementById('soCustomerSuggestions');
  if (box) box.style.display = 'none';
  renderSoCustomerOptions('');
}

async function loadSalesOrders() {
  const message = document.getElementById('salesOrderListMessage');
  const body = document.getElementById('salesOrdersBody');
  if (!body) return;
  if (message) {
    message.style.color = 'var(--muted)';
    message.textContent = 'Mengambil Sales Order dari Supabase...';
  }
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
    const orders = ordersRes.data || [];
    const customers = customersRes.data || [];
    const items = itemsRes.data || [];
    const customerMap = new Map(customers.map(x => [String(x.id), x.name]));
    const totals = new Map();
    for (const it of items) {
      const old = totals.get(String(it.sales_order_id)) || { total: 0, count: 0 };
      old.total += Number(it.quantity || 0) * Number(it.unit_price || 0) - Number(it.discount_amount || 0);
      old.count += 1;
      totals.set(String(it.sales_order_id), old);
    }
    if (!orders.length) {
      body.innerHTML = '<tr><td colspan="7" class="empty">Belum ada Sales Order tersimpan.</td></tr>';
    } else {
      body.innerHTML = orders.map(o => {
        const summary = totals.get(String(o.id)) || { total: 0, count: 0 };
        const statusLabel = ({ confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan', completed: 'Selesai' })[o.status] ||
