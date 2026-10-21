// Modul Sales Order (Versi Kompatibel Maksimal)
let soCustomers = [];
let soProducts = [];
let soUnits = [];
let editingSalesOrderId = null;
let editingSalesOrderNo = null;

function makeSoProductOptions() {
  let html = '<option value="">Pilih produk</option>';
  for (let i = 0; i < soProducts.length; i++) {
    const p = soProducts[i];
    html += '<option value="' + escHtml(p.id) + '">' + escHtml(p.name) + '</option>';
  }
  return html;
}

function renderSoProductOptions(searchText, row) {
  const box = row.querySelector('.so-product-suggestions');
  if (!box) return;
  const q = String(searchText || '').trim().toLocaleLowerCase();
  
  let filtered = [];
  if (q) {
    for (let i = 0; i < soProducts.length; i++) {
      const p = soProducts[i];
      const name = String(p.name || '').toLocaleLowerCase();
      const code = String(p.product_code || '').toLocaleLowerCase();
      if (name.includes(q) || code.includes(q)) {
        filtered.push(p);
      }
    }
  }

  if (!q) {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }
  if (filtered.length === 0) {
    box.innerHTML = '<div style="padding:12px;color:var(--muted)">Tidak ada produk yang cocok.</div>';
    box.style.display = 'block';
    return;
  }

  let html = '';
  const limit = filtered.length > 50 ? 50 : filtered.length;
  for (let j = 0; j < limit; j++) {
    html += '<button type="button" class="so-product-option" role="option" data-product-id="' + escHtml(filtered[j].id) + '">' + escHtml(filtered[j].name) + '</button>';
  }
  box.innerHTML = html;
  box.style.display = 'block';

  const buttons = box.querySelectorAll('[data-product-id]');
  for (let k = 0; k < buttons.length; k++) {
    buttons[k].addEventListener('click', function() {
      const pid = this.getAttribute('data-product-id');
      let product = null;
      for (let m = 0; m < soProducts.length; m++) {
        if (String(soProducts[m].id) === pid) { product = soProducts[m]; break; }
      }
      if (!product) return;

      const prodInp = row.querySelector('.so-product');
      if (prodInp) prodInp.value = String(product.id);
      
      const searchInp = row.querySelector('.so-product-search');
      if (searchInp) searchInp.value = product.name;
      
      const codeInp = row.querySelector('.so-product-code');
      if (codeInp) codeInp.value = product.product_code || '';
      
      let unit = null;
      for (let n = 0; n < soUnits.length; n++) {
        if (String(soUnits[n].id) === String(product.base_unit_id)) { unit = soUnits[n]; break; }
      }
      const unitInp = row.querySelector('.so-product-unit');
      if (unitInp) unitInp.value = unit ? (unit.name || unit.code || '') : '-';
      
      box.innerHTML = '';
      box.style.display = 'none';
      updateSoTotals();
    });
  }
}

function addSoItemRow() {
  const container = document.getElementById('soItemsContainer');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'card so-item-row';
  row.style.padding = '10px';
  row.innerHTML = 
    '<div class="field"><label>Kode Produk</label><input class="so-product-code" readonly placeholder="Otomatis"></div>' +
    '<div class="field so-product-field"><label>Nama Produk *</label><input class="so-product-search" type="text" autocomplete="off" required placeholder="Ketik nama atau kode produk..."><div class="so-product-suggestions" style="display:none"></div><select class="so-product" style="display:none">' + makeSoProductOptions() + '</select></div>' +
    '<div class="field"><label>Satuan</label><input class="so-product-unit" readonly placeholder="Otomatis"></div>' +
    '<div class="field"><label>Jumlah *</label><input class="so-quantity" type="number" min="0.001" step="0.001" required placeholder="Jumlah"></div>' +
    '<div class="field"><label>Harga Satuan (Rp) *</label><input class="so-price" type="number" min="0" step="1" required placeholder="Harga manual"></div>' +
    '<div class="field"><label>Subtotal</label><input class="so-subtotal" readonly value="Rp 0"></div>' +
    '<button type="button" class="linkbtn so-remove">Hapus</button>';
  
  container.appendChild(row);
  
  const search = row.querySelector('.so-product-search');
  if (search) {
    search.addEventListener('input', function() {
      row.querySelector('.so-product').value = '';
      row.querySelector('.so-product-code').value = '';
      row.querySelector('.so-product-unit').value = '';
      renderSoProductOptions(search.value, row);
    });
    search.addEventListener('focus', function() {
      if (search.value.trim() !== '' && !row.querySelector('.so-product').value) {
        renderSoProductOptions(search.value, row);
      }
    });
  }
  
  const qtyInp = row.querySelector('.so-quantity');
  if (qtyInp) qtyInp.addEventListener('input', updateSoTotals);
  
  const priceInp = row.querySelector('.so-price');
  if (priceInp) priceInp.addEventListener('input', updateSoTotals);
  
  const removeBtn = row.querySelector('.so-remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', function() {
      if (editingSalesOrderId && document.querySelectorAll('.so-item-row').length <= 1) {
        alert('Sales Order harus menyisakan minimal satu barang.');
        return;
      }
      row.remove();
      if (document.querySelectorAll('.so-item-row').length === 0) {
        addSoItemRow();
      }
      updateSoTotals();
    });
  }
}

document.addEventListener('click', function(e) {
  const rows = document.querySelectorAll('.so-item-row');
  for (let i = 0; i < rows.length; i++) {
    const field = rows[i].querySelector('.so-product-field');
    if (field && !field.contains(e.target)) {
      const box = rows[i].querySelector('.so-product-suggestions');
      if (box) box.style.display = 'none';
    }
  }
});

function updateSoTotals() {
  let total = 0;
  const rows = document.querySelectorAll('.so-item-row');
  for (let i = 0; i < rows.length; i++) {
    const qtyInp = rows[i].querySelector('.so-quantity');
    const priceInp = rows[i].querySelector('.so-price');
    const subInput = rows[i].querySelector('.so-subtotal');
    
    const qty = qtyInp ? Number(qtyInp.value || 0) : 0;
    const price = priceInp ? Number(priceInp.value || 0) : 0;
    const sub = qty * price;
    total += sub;
    
    if (subInput) subInput.value = rupiah(sub);
  }
  const totalElem = document.getElementById('soTotal');
  if (totalElem) totalElem.textContent = rupiah(total);
}

function renderSoCustomerOptions(searchText) {
  const select = document.getElementById('soCustomer');
  const box = document.getElementById('soCustomerSuggestions');
  if (!select || !box) return;
  
  const q = String(searchText || '').trim().toLocaleLowerCase();
  let filtered = [];
  if (q) {
    for (let i = 0; i < soCustomers.length; i++) {
      const c = soCustomers[i];
      if (String(c.customer_code || '').toLocaleLowerCase().includes(q) || String(c.name || '').toLocaleLowerCase().includes(q)) {
        filtered.push(c);
      }
    }
  }

  let selectHtml = '<option value="">Pilih pelanggan</option>';
  for (let i = 0; i < soCustomers.length; i++) {
    selectHtml += '<option value="' + escHtml(soCustomers[i].id) + '">' + escHtml(soCustomers[i].customer_code || '') + ' - ' + escHtml(soCustomers[i].name) + '</option>';
  }
  select.innerHTML = selectHtml;

  if (!q) {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }
  
  if (filtered.length === 0) {
    box.innerHTML = '<div style="padding:12px;color:var(--muted)">Tidak ada pelanggan yang cocok.</div>';
    box.style.display = 'block';
    return;
  }

  let html = '';
  const limit = filtered.length > 50 ? 50 : filtered.length;
  for (let j = 0; j < limit; j++) {
    html += '<button type="button" class="so-customer-option" data-customer-id="' + escHtml(filtered[j].id) + '">' +
            '<strong>' + escHtml(filtered[j].name) + '</strong><small>Kode: ' + escHtml(filtered[j].customer_code || '-') + '</small></button>';
  }
  box.innerHTML = html;
  box.style.display = 'block';

  const buttons = box.querySelectorAll('[data-customer-id]');
  for (let k = 0; k < buttons.length; k++) {
    buttons[k].addEventListener('click', function() {
      const cid = this.getAttribute('data-customer-id');
      let customer = null;
      for (let m = 0; m < soCustomers.length; m++) {
        if (String(soCustomers[m].id) === cid) { customer = soCustomers[m]; break; }
      }
      if (!customer) return;
      
      select.value = String(customer.id);
      const searchInput = document.getElementById('soCustomerSearch');
      if (searchInput) searchInput.value = customer.name;
      box.style.display = 'none';
      box.innerHTML = '';
    });
  }
}

const soCustomerSearch = document.getElementById('soCustomerSearch');
if (soCustomerSearch) {
  soCustomerSearch.addEventListener('input', function(e) {
    const custSel = document.getElementById('soCustomer');
    if (custSel) custSel.value = '';
    renderSoCustomerOptions(e.target.value);
  });
  soCustomerSearch.addEventListener('focus', function(e) {
    if (e.target.value.trim() !== '') renderSoCustomerOptions(e.target.value);
  });
}

document.addEventListener('click', function(e) {
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
  
  if (customersRes.error) throw new Error(customersRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (unitsRes.error) throw new Error(unitsRes.error.message);
  
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
    const [ordersRes, customersRes, itemsRes] = await Promise.all([
      supabaseClient.from('sales_orders').select('id,order_no,order_date,customer_id,status,notes,created_at').order('created_at', { ascending: false }),
      supabaseClient.from('customers').select('id,name'),
      supabaseClient.from('sales_order_items').select('sales_order_id,quantity,unit_price,discount_amount')
    ]);
    
    if (ordersRes.error) throw new Error(ordersRes.error.message);
    if (customersRes.error) throw new Error(customersRes.error.message);
    if (itemsRes.error) throw new Error(itemsRes.error.message);
    
    const orders = ordersRes.data || [];
    const customers = customersRes.data || [];
    const items = itemsRes.data || [];
    
    const totals = {};
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const soId = String(it.sales_order_id);
      if (!totals[soId]) totals[soId] = { total: 0, count: 0 };
      totals[soId].total += (Number(it.quantity || 0) * Number(it.unit_price || 0)) - Number(it.discount_amount || 0);
      totals[soId].count += 1;
    }
    
    if (orders.length === 0) {
      body.innerHTML = '<tr><td colspan="7" class="empty">Belum ada Sales Order tersimpan.</td></tr>';
    } else {
      let html = '';
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        const summary = totals[String(o.id)] || { total: 0, count: 0 };
        
        let custName = 'Pelanggan tidak ditemukan';
        for (let j = 0; j < customers.length; j++) {
          if (String(customers[j].id) === String(o.customer_id)) { custName = customers[j].name; break; }
        }
        
        let statusLabel = o.status;
        if (o.status === 'confirmed') statusLabel = 'Dikonfirmasi';
        else if (o.status === 'cancelled') statusLabel = 'Dibatalkan';
        else if (o.status === 'completed') statusLabel = 'Selesai';
        else if (o.status === 'draft') statusLabel = 'Perlu pembaruan status';
        
        const canEdit = (o.status === 'confirmed');
        const stClass = (o.status === 'confirmed') ? 'green' : ((o.status === 'cancelled') ? 'red' : '');
        const disAttr = canEdit ? '' : 'disabled';
        
        html += '<tr>' +
          '<td>' + escHtml(o.order_no) + '</td>' +
          '<td>' + escHtml(o.order_date || '-') + '</td>' +
          '<td>' + escHtml(custName) + '</td>' +
          '<td>' + summary.count + ' jenis</td>' +
          '<td>' + rupiah(summary.total) + '</td>' +
          '<td><span class="status ' + stClass + '">' + escHtml(statusLabel) + '</span></td>' +
          '<td>' +
          '<div class="so-actions">' +
          '<button type="button" class="so-action-btn" data-so-action="view" data-so-id="' + escHtml(o.id) + '" title="Lihat Detail">⌕</button>' +
          '<button type="button" class="so-action-btn" data-so-action="deliver" data-so-id="' + escHtml(o.id) + '" title="Gudang Eksekusi Kirim" ' + disAttr + '>▞</button>' +
          '<button type="button" class="so-action-btn" data-so-action="edit" data-so-id="' + escHtml(o.id) + '" title="Edit" ' + disAttr + '>✎</button>' +
          '<button type="button" class="so-action-btn danger" data-so-action="cancel" data-so-id="' + escHtml(o.id) + '" title="Batalkan" ' + disAttr + '>⊗</button>' +
          '</div>' +
          '</td>' +
          '</tr>';
      }
      body.innerHTML = html;
    }
    
    const countElem = document.getElementById('salesOrderCount');
    if (countElem) countElem.textContent = orders.length + ' Sales Order tersimpan';
    
    if (message) {
      message.textContent = 'Data ditampilkan langsung dari Supabase. Klik ikon ▞ untuk mengeksekusi pengiriman.';
      message.style.color = 'var(--green)';
    }
  } catch (error) {
    body.innerHTML = '<tr><td colspan="7">Data belum dapat ditampilkan.</td></tr>';
    if (message) {
      message.style.color = 'var(--red)';
      message.textContent = 'Gagal memuat Sales Order: ' + error.message;
    }
  }
}

const salesOrderForm = document.getElementById('salesOrderForm');

function resetSalesOrderForm() {
  editingSalesOrderId = null;
  editingSalesOrderNo = null;
  if (salesOrderForm) salesOrderForm.reset();
  const container = document.getElementById('soItemsContainer');
  if (container) container.innerHTML = '';
  const modal = document.getElementById('salesFormModal');
  if (modal) modal.style.display = 'none';
  const title = document.getElementById('salesFormTitle');
  if (title) title.textContent = 'Buat Sales Order';
  const saveBtn = document.getElementById('saveSalesOrderBtn');
  if (saveBtn) saveBtn.textContent = 'Simpan Sales Order';
  const msg = document.getElementById('salesOrderMessage');
  if (msg) msg.textContent = '';
  
  const searchInp = document.getElementById('soCustomerSearch');
  if (searchInp) searchInp.readOnly = false;
  const dateInp = document.getElementById('soDate');
  if (dateInp) dateInp.readOnly = false;
  const notesInp = document.getElementById('soNotes');
  if (notesInp) notesInp.readOnly = false;
  const addBtn = document.getElementById('addSoItemBtn');
  if (addBtn) addBtn.style.display = 'inline-block';
}

const showSalesFormBtn = document.getElementById('showSalesFormBtn');
if (showSalesFormBtn) {
  showSalesFormBtn.addEventListener('click', async function() {
    resetSalesOrderForm();
    const msg = document.getElementById('salesOrderMessage');
    if (!supabaseClient) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Koneksi Supabase belum siap.'; }
      return;
    }
    const modal = document.getElementById('salesFormModal');
    if (modal) modal.style.display = 'flex';
    if (msg) { msg.textContent = 'Memuat data...'; msg.style.color = 'var(--muted)'; }
    try {
      await loadSoChoices();
      const dateInp = document.getElementById('soDate');
      if (dateInp) dateInp.value = todayLocal();
      const container = document.getElementById('soItemsContainer');
      if (container) container.innerHTML = '';
      addSoItemRow();
      if (msg) msg.textContent = '';
    } catch (error) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Gagal memuat pilihan data: ' + error.message; }
    }
  });
}

const closeSalesFormBtn = document.getElementById('closeSalesFormBtn');
if (closeSalesFormBtn) closeSalesFormBtn.addEventListener('click', resetSalesOrderForm);

const cancelSalesOrderBtn = document.getElementById('cancelSalesOrderBtn');
if (cancelSalesOrderBtn) cancelSalesOrderBtn.addEventListener('click', resetSalesOrderForm);

const addSoItemBtn = document.getElementById('addSoItemBtn');
if (addSoItemBtn) addSoItemBtn.addEventListener('click', addSoItemRow);

const refreshSalesOrdersBtn = document.getElementById('refreshSalesOrdersBtn');
if (refreshSalesOrdersBtn) refreshSalesOrdersBtn.addEventListener('click', loadSalesOrders);

const refreshSoStockBtn = document.getElementById('refreshSoStockBtn');
if (refreshSoStockBtn) refreshSoStockBtn.addEventListener('click', loadSoStockSummary);

if (salesOrderForm) {
  salesOrderForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const msg = document.getElementById('salesOrderMessage');
    if (!supabaseClient) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Koneksi Supabase belum siap.'; }
      return;
    }
    
    const custSel = document.getElementById('soCustomer');
    const customerId = custSel ? custSel.value : '';
    const dateInp = document.getElementById('soDate');
    const orderDate = dateInp ? dateInp.value : '';
    const notesInp = document.getElementById('soNotes');
    const notes = notesInp ? (notesInp.value.trim() || null) : null;
    
    const rowNodes = document.querySelectorAll('.so-item-row');
    const rows = Array.prototype.slice.call(rowNodes);
    
    if (!customerId) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Pilih pelanggan terlebih dahulu.'; }
      return;
    }
    if (rows.length === 0) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Tambahkan minimal satu barang.'; }
      return;
    }
    
    const orderItems = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const prodInp = row.querySelector('.so-product');
      const qtyInp = row.querySelector('.so-quantity');
      const priceInp = row.querySelector('.so-price');
      
      const productId = prodInp ? prodInp.value : '';
      const quantity = qtyInp ? Number(qtyInp.value) : 0;
      const unitPrice = priceInp ? Number(priceInp.value) : 0;
      
      let product = null;
      for (let j = 0; j < soProducts.length; j++) {
        if (String(soProducts[j].id) === String(productId)) { product = soProducts[j]; break; }
      }
      
      if (!product || isNaN(quantity) || quantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
        if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Periksa produk, jumlah, dan harga pada baris ke-' + (i+1); }
        return;
      }
      
      orderItems.push({ 
        product_id: product.id, 
        unit_id: product.base_unit_id, 
        quantity: quantity, 
        conversion_factor: 1, 
        unit_price: unitPrice, 
        discount_amount: 0, 
        notes: null 
      });
    }
    
    const saveBtn = document.getElementById('saveSalesOrderBtn');
    if (saveBtn) saveBtn.disabled = true;
    
    if (msg) { msg.style.color = 'var(--muted)'; msg.textContent = 'Menyimpan...'; }
    
    try {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (userError) throw userError;
      
      const userId = (userData && userData.user) ? userData.user.id : null;
      
      if (editingSalesOrderId) {
        const id = editingSalesOrderId;
        const { data: existingItems, error: existingError } = await supabaseClient.from('sales_order_items').select('id').eq('sales_order_id', id);
        if (existingError) throw existingError;
        
        const existingIds = (existingItems || []).map(function(x) { return String(x.id); });
        const keptIds = [];
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const itemId = row.getAttribute('data-so-item-id');
          const qtyInp = row.querySelector('.so-quantity');
          const qty = qtyInp ? Number(qtyInp.value) : 0;
          
          if (!itemId || existingIds.indexOf(String(itemId)) === -1) throw new Error('Detail barang tidak valid.');
          
          const { error: updErr } = await supabaseClient.from('sales_order_items').update({ quantity: qty }).eq('id', itemId).eq('sales_order_id', id);
          if (updErr) throw updErr;
          
          keptIds.push(String(itemId));
        }
        
        const removedIds = [];
        for (let i = 0; i < existingIds.length; i++) {
          if (keptIds.indexOf(existingIds[i]) === -1) removedIds.push(existingIds[i]);
        }
        
        if (removedIds.length > 0) {
          const { error: delErr } = await supabaseClient.from('sales_order_items').delete().eq('sales_order_id', id).in('id', removedIds);
          if (delErr) throw delErr;
        }
        
        const { error: updateError } = await supabaseClient.from('sales_orders').update({ updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'confirmed');
        if (updateError) throw updateError;
        
        const orderNo = editingSalesOrderNo;
        resetSalesOrderForm();
        await loadSalesOrders();
        await loadSoStockSummary();
        
        const listMsg = document.getElementById('salesOrderListMessage');
        if (listMsg) { listMsg.style.color = 'var(--green)'; listMsg.textContent = 'Sales Order ' + orderNo + ' berhasil diperbarui.'; }
        
      } else {
        const now = new Date();
        const stamp = '' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
        const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        const orderNo = 'SO-' + stamp + '-' + randomPart;
        
        const { data: order, error: orderError } = await supabaseClient.from('sales_orders').insert({ 
          order_no: orderNo, 
          order_date: orderDate, 
          customer_id: Number(customerId), 
          warehouse_id: null, 
          status: 'confirmed', 
          notes: notes, 
          created_by: userId 
        }).select('id,order_no').single();
        
        if (orderError) throw orderError;
        
        for (let i = 0; i < orderItems.length; i++) {
          orderItems[i].sales_order_id = order.id;
        }
        
        const { error: itemsError } = await supabaseClient.from('sales_order_items').insert(orderItems);
        if (itemsError) {
          await supabaseClient.from('sales_orders').delete().eq('id', order.id);
          throw new Error('Detail barang gagal disimpan: ' + itemsError.message);
        }
        
        resetSalesOrderForm();
        await loadSalesOrders();
        await loadSoStockSummary();
        
        const listMsg = document.getElementById('salesOrderListMessage');
        if (listMsg) { listMsg.style.color = 'var(--green)'; listMsg.textContent = 'Sales Order ' + order.order_no + ' berhasil disimpan. Tim Gudang sudah dapat mengeksekusi pengiriman.'; }
      }
    } catch (error) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Gagal menyimpan: ' + (error.message || String(error)); }
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = editingSalesOrderId ? 'Simpan Perubahan' : 'Simpan Sales Order'; }
    }
  });
}

async function loadSoStockSummary() {
  const body = document.getElementById('soStockBody');
  const message = document.getElementById('soStockMessage');
  if (!body) return;
  if (!supabaseClient) {
    if (message) message.textContent = 'Koneksi Supabase belum siap.';
    return;
  }
  body.innerHTML = '<tr><td colspan="4">Memuat data...</td></tr>';
  if (message) message.textContent = 'Menghitung kebutuhan pesanan...';
  
  try {
    const [ordersRes, itemsRes, productsRes, deliveryItemsRes] = await Promise.all([
      supabaseClient.from('sales_orders').select('id,status').eq('status', 'confirmed'),
      supabaseClient.from('sales_order_items').select('id,sales_order_id,product_id,quantity'),
      supabaseClient.from('products').select('id,product_code,name,is_active'),
      supabaseClient.from('delivery_items').select('sales_order_item_id,quantity_shipped')
    ]);
    
    if (ordersRes.error) throw ordersRes.error;
    if (itemsRes.error) throw itemsRes.error;
    if (productsRes.error) throw productsRes.error;
    if (deliveryItemsRes.error) throw deliveryItemsRes.error;
    
    const activeOrderIds = [];
    const orders = ordersRes.data || [];
    for (let i = 0; i < orders.length; i++) { activeOrderIds.push(String(orders[i].id)); }
    
    const items = itemsRes.data || [];
    const activeItems = [];
    for (let i = 0; i < items.length; i++) {
      if (activeOrderIds.indexOf(String(items[i].sales_order_id)) !== -1) {
        activeItems.push(items[i]);
      }
    }
    
    const shipped = {};
    const delivItems = deliveryItemsRes.data || [];
    for (let i = 0; i < delivItems.length; i++) {
      const soItemId = String(delivItems[i].sales_order_item_id);
      if (!shipped[soItemId]) shipped[soItemId] = 0;
      shipped[soItemId] += Number(delivItems[i].quantity_shipped || 0);
    }
    
    const needed = {};
    for (let i = 0; i < activeItems.length; i++) {
      const it = activeItems[i];
      const shippedQty = shipped[String(it.id)] || 0;
      const outstanding = Math.max(0, Number(it.quantity || 0) - shippedQty);
      if (outstanding > 0) {
        const pId = String(it.product_id);
        if (!needed[pId]) needed[pId] = 0;
        needed[pId] += outstanding;
      }
    }
    
    const allProducts = productsRes.data || [];
    let html = '';
    let found = false;
    for (let i = 0; i < allProducts.length; i++) {
      const p = allProducts[i];
      if (needed[String(p.id)]) {
        found = true;
        html += '<tr>' +
          '<td>' + escHtml(p.product_code || '-') + '</td>' +
          '<td>' + escHtml(p.name || '-') + '</td>' +
          '<td>' + Number(needed[String(p.id)]).toLocaleString('id-ID') + '</td>' +
          '<td><span class="status">Menunggu tabel stok</span></td>' +
          '</tr>';
      }
    }
    
    if (!found) {
      body.innerHTML = '<tr><td colspan="4" class="empty">Tidak ada kebutuhan stok dari Sales Order aktif.</td></tr>';
    } else {
      body.innerHTML = html;
    }
    
    if (message) message.textContent = 'Kebutuhan dihitung dari SO aktif dikurangi jumlah yang sudah diproses Surat Jalan oleh Gudang.';
  } catch (error) {
    body.innerHTML = '<tr><td colspan="4">Gagal memuat kebutuhan stok.</td></tr>';
    if (message) message.textContent = 'Gagal menghitung: ' + error.message;
  }
}

async function getSalesOrderDetail(id) {
  const { data: order, error: orderError } = await supabaseClient.from('sales_orders').select('id,order_no,order_date,customer_id,status,notes,created_at').eq('id', id).single();
  if (orderError) throw orderError;
  
  const [customerRes, itemsRes, productsRes, unitsRes] = await Promise.all([
    supabaseClient.from('customers').select('id,customer_code,name,address,phone').eq('id', order.customer_id).maybeSingle(),
    supabaseClient.from('sales_order_items').select('id,sales_order_id,product_id,unit_id,quantity,conversion_factor,unit_price,discount_amount,notes').eq('sales_order_id', id),
    supabaseClient.from('products').select('id,product_code,name,base_unit_id').order('name'),
    supabaseClient.from('units').select('id,code,name')
  ]);
  
  if (customerRes.error) throw customerRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (productsRes.error) throw productsRes.error;
  if (unitsRes.error) throw unitsRes.error;
  
  const products = productsRes.data || [];
  const units = unitsRes.data || [];
  const items = itemsRes.data || [];
  
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    it.product = { name: 'Produk tidak ditemukan', product_code: '-' };
    for (let j = 0; j < products.length; j++) {
      if (String(products[j].id) === String(it.product_id)) { it.product = products[j]; break; }
    }
    it.unit = { name: '-' };
    for (let k = 0; k < units.length; k++) {
      if (String(units[k].id) === String(it.unit_id)) { it.unit = units[k]; break; }
    }
  }
  
  return { order: order, customer: customerRes.data || { name: 'Pelanggan tidak ditemukan' }, items: items };
}

async function viewSalesOrder(id) {
  const modal = ensureSoModal();
  modal.style.display = 'flex';
  const title = modal.querySelector('#soModalTitle');
  const msg = modal.querySelector('#soModalMessage');
  const content = modal.querySelector('#soModalContent');
  
  if (title) title.textContent = 'Detail Sales Order';
  if (msg) msg.textContent = 'Memuat detail...';
  if (content) content.innerHTML = '';
  
  try {
    const d = await getSalesOrderDetail(id);
    let total = 0;
    for (let i = 0; i < d.items.length; i++) {
      total += (Number(d.items[i].quantity || 0) * Number(d.items[i].unit_price || 0)) - Number(d.items[i].discount_amount || 0);
    }
    
    if (title) title.textContent = d.order.order_no;
    if (msg) msg.textContent = 'Detail Sales Order';
    
    let tableRows = '';
    for (let i = 0; i < d.items.length; i++) {
      const it = d.items[i];
      const sub = (Number(it.quantity) * Number(it.unit_price)) - Number(it.discount_amount || 0);
      tableRows += '<tr>' +
        '<td>' + escHtml(it.product.product_code || '-') + '</td>' +
        '<td>' + escHtml(it.product.name) + '</td>' +
        '<td>' + escHtml(it.unit.name || it.unit.code || '-') + '</td>' +
        '<td>' + escHtml(it.quantity) + '</td>' +
        '<td>' + rupiah(it.unit_price) + '</td>' +
        '<td>' + rupiah(sub) + '</td>' +
        '</tr>';
    }
    
    if (content) {
      content.innerHTML = 
        '<div class="so-modal-grid">' +
        '<div class="so-modal-info"><small>Tanggal</small><strong>' + escHtml(d.order.order_date || '-') + '</strong></div>' +
        '<div class="so-modal-info"><small>Status</small><strong>' + escHtml(statusText(d.order.status)) + '</strong></div>' +
        '<div class="so-modal-info"><small>Pelanggan</small><strong>' + escHtml(d.customer.name || '-') + '</strong></div>' +
        '<div class="so-modal-info"><small>Catatan</small><strong>' + escHtml(d.order.notes || '-') + '</strong></div>' +
        '</div>' +
        '<div class="tablewrap">' +
        '<table><thead><tr><th>Kode</th><th>Produk</th><th>Satuan</th><th>Jumlah</th><th>Harga</th><th>Subtotal</th></tr></thead>' +
        '<tbody>' + tableRows + '</tbody></table>' +
        '</div>' +
        '<div class="so-modal-total">Total: ' + rupiah(total) + '</div>';
    }
  } catch (error) {
    if (msg) msg.textContent = 'Gagal memuat detail: ' + error.message;
  }
}

async function editSalesOrder(id) {
  try {
    const detail = await getSalesOrderDetail(id);
    if (detail.order.status !== 'confirmed') {
      alert('Hanya Sales Order berstatus Dikonfirmasi yang dapat diedit.');
      return;
    }
    
    await loadSoChoices();
    
    let custFound = false;
    for (let i = 0; i < soCustomers.length; i++) {
      if (String(soCustomers[i].id) === String(detail.customer.id)) { custFound = true; break; }
    }
    if (!custFound && detail.customer.id) {
      detail.customer.is_active = false;
      soCustomers.push(detail.customer);
    }
    
    for (let i = 0; i < detail.items.length; i++) {
      const it = detail.items[i];
      if (it.product && it.product.id) {
        let pFound = false;
        for (let j = 0; j < soProducts.length; j++) {
          if (String(soProducts[j].id) === String(it.product.id)) { pFound = true; break; }
        }
        if (!pFound) soProducts.push(it.product);
      }
    }
    
    editingSalesOrderId = detail.order.id;
    editingSalesOrderNo = detail.order.order_no;
    
    const modal = document.getElementById('salesFormModal');
    if (modal) modal.style.display = 'flex';
    
    const title = document.getElementById('salesFormTitle');
    if (title) title.textContent = 'Edit Sales Order ' + detail.order.order_no;
    
    const saveBtn = document.getElementById('saveSalesOrderBtn');
    if (saveBtn) saveBtn.textContent = 'Simpan Perubahan';
    
    const customerSel = document.getElementById('soCustomer');
    if (customerSel) {
      let optHtml = '<option value="">Pilih pelanggan</option>';
      for (let i = 0; i < soCustomers.length; i++) {
        optHtml += '<option value="' + escHtml(soCustomers[i].id) + '">' + escHtml(soCustomers[i].customer_code || '') + ' - ' + escHtml(soCustomers[i].name) + '</option>';
      }
      customerSel.innerHTML = optHtml;
      customerSel.value = String(detail.order.customer_id);
    }
    
    const searchInp = document.getElementById('soCustomerSearch');
    if (searchInp) { searchInp.value = detail.customer.name || ''; searchInp.readOnly = true; }
    
    const dateInp = document.getElementById('soDate');
    if (dateInp) { dateInp.value = detail.order.order_date || todayLocal(); dateInp.readOnly = true; }
    
    const notesInp = document.getElementById('soNotes');
    if (notesInp) { notesInp.value = detail.order.notes || ''; notesInp.readOnly = true; }
    
    const addBtn = document.getElementById('addSoItemBtn');
    if (addBtn) addBtn.style.display = 'none';
    
    const container = document.getElementById('soItemsContainer');
    if (container) container.innerHTML = '';
    
    for (let i = 0; i < detail.items.length; i++) {
      const it = detail.items[i];
      addSoItemRow();
      
      const rows = document.querySelectorAll('.so-item-row');
      const row = rows[rows.length - 1];
      if (row) {
        const prodSel = row.querySelector('.so-product');
        if (prodSel) prodSel.value = String(it.product_id);
        
        const pSearch = row.querySelector('.so-product-search');
        if (pSearch) { pSearch.value = it.product.name || ''; pSearch.readOnly = true; }
        
        const pCode = row.querySelector('.so-product-code');
        if (pCode) pCode.value = it.product.product_code || '';
        
        const pUnit = row.querySelector('.so-product-unit');
        if (pUnit) pUnit.value = it.unit.name || it.unit.code || '';
        
        const pQty = row.querySelector('.so-quantity');
        if (pQty) pQty.value = it.quantity;
        
        const pPrice = row.querySelector('.so-price');
        if (pPrice) { pPrice.value = it.unit_price; pPrice.readOnly = true; }
        
        row.setAttribute('data-so-item-id', String(it.id));
      }
    }
    updateSoTotals();
    const msg = document.getElementById('salesOrderMessage');
    if (msg) msg.textContent = '';
  } catch (error) {
    alert('Gagal membuka Sales Order untuk diedit: ' + error.message);
  }
}

async function cancelSalesOrder(id) {
  try {
    const detail = await getSalesOrderDetail(id);
    if (detail.order.status !== 'confirmed') {
      alert('Hanya Sales Order berstatus Dikonfirmasi yang dapat dibatalkan.');
      return;
    }
    if (!confirm('Batalkan ' + detail.order.order_no + '? Pesanan akan tetap tersimpan dengan status Dibatalkan.')) return;
    
    const { error } = await supabaseClient.from('sales_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'confirmed');
    if (error) throw error;
    
    await loadSalesOrders();
    await loadSoStockSummary();
    
    const m = document.getElementById('salesOrderListMessage');
    if (m) { m.style.color = 'var(--green)'; m.textContent = 'Sales Order ' + detail.order.order_no + ' dibatalkan.'; }
  } catch (error) {
    alert('Gagal membatalkan Sales Order: ' + error.message);
  }
}

const salesOrdersBody = document.getElementById('salesOrdersBody');
if (salesOrdersBody) {
  salesOrdersBody.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-so-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-so-id');
    const action = btn.getAttribute('data-so-action');
    if (action === 'view') viewSalesOrder(id);
    else if (action === 'deliver') { if (typeof openWhDeliverForm === 'function') openWhDeliverForm(id); }
    else if (action === 'edit') editSalesOrder(id);
    else if (action === 'cancel') cancelSalesOrder(id);
  });
}

// Export ke scope global window
window.loadSalesOrders = loadSalesOrders;
window.loadSoStockSummary = loadSoStockSummary;
window.viewSalesOrder = viewSalesOrder;
window.editSalesOrder = editSalesOrder;
window.cancelSalesOrder = cancelSalesOrder;
