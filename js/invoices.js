// Modul Faktur Penjualan (Terkoneksi Langsung dengan Surat Jalan / Pengiriman)
let invActiveDeliveries = [];

async function loadInvoiceChoices() {
  // Ambil Surat Jalan (deliveries) beserta informasi Sales Order dan Pelanggan
  const [delivRes, ordersRes, customersRes] = await Promise.all([
    supabaseClient.from('deliveries').select('id,delivery_no,delivery_date,sales_order_id,customer_id,status').order('created_at', { ascending: false }),
    supabaseClient.from('sales_orders').select('id,order_no'),
    supabaseClient.from('customers').select('id,name')
  ]);

  if (delivRes.error) throw new Error(delivRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);

  const deliveries = delivRes.data || [];
  const orders = ordersRes.data || [];
  const customers = customersRes.data || [];

  const orderMap = {};
  for (let i = 0; i < orders.length; i++) {
    orderMap[String(orders[i].id)] = orders[i].order_no;
  }

  const custMap = {};
  for (let i = 0; i < customers.length; i++) {
    custMap[String(customers[i].id)] = customers[i].name;
  }

  invActiveDeliveries = deliveries;

  // Isi dropdown pilihan dengan daftar Surat Jalan
  const select = document.getElementById('invSalesOrder');
  if (select) {
    let html = '<option value="">-- Pilih Surat Jalan / Pengiriman --</option>';
    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      const soNo = orderMap[String(d.sales_order_id)] || 'SO -';
      const custName = custMap[String(d.customer_id)] || 'Pelanggan -';
      html += '<option value="' + escHtml(d.id) + '">' + escHtml(d.delivery_no) + ' (' + escHtml(soNo) + ') — ' + escHtml(custName) + '</option>';
    }
    select.innerHTML = html;
  }
}

async function loadInvoices() {
  const message = document.getElementById('invoicesListMessage');
  const body = document.getElementById('invoicesBody');
  if (!body) return;

  if (message) {
    message.style.color = 'var(--muted)';
    message.textContent = 'Mengambil data Faktur Penjualan dari Supabase...';
  }
  body.innerHTML = '<tr><td colspan="7">Memuat data...</td></tr>';

  try {
    const [invoicesRes, customersRes, itemsRes, delivRes] = await Promise.all([
      supabaseClient.from('invoices').select('id,invoice_no,invoice_date,due_date,customer_id,sales_order_id,delivery_id,status,notes,created_at').order('created_at', { ascending: false }),
      supabaseClient.from('customers').select('id,name'),
      supabaseClient.from('invoice_items').select('invoice_id,quantity,unit_price,discount_amount'),
      supabaseClient.from('deliveries').select('id,delivery_no')
    ]);

    if (invoicesRes.error) throw new Error(invoicesRes.error.message);
    if (customersRes.error) throw new Error(customersRes.error.message);
    if (itemsRes.error) throw new Error(itemsRes.error.message);

    const invoices = invoicesRes.data || [];
    const customers = customersRes.data || [];
    const items = itemsRes.data || [];
    const deliveries = delivRes.data || [];

    const delivMap = {};
    for (let i = 0; i < deliveries.length; i++) {
      delivMap[String(deliveries[i].id)] = deliveries[i].delivery_no;
    }

    const totals = {};
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const invId = String(it.invoice_id);
      if (!totals[invId]) totals[invId] = 0;
      totals[invId] += (Number(it.quantity || 0) * Number(it.unit_price || 0)) - Number(it.discount_amount || 0);
    }

    if (invoices.length === 0) {
      body.innerHTML = '<tr><td colspan="7" class="empty">Belum ada Faktur Penjualan tersimpan.</td></tr>';
    } else {
      let html = '';
      for (let i = 0; i < invoices.length; i++) {
        const inv = invoices[i];
        const total = totals[String(inv.id)] || 0;
        const delivNo = delivMap[String(inv.delivery_id)] || '-';

        let custName = 'Pelanggan tidak ditemukan';
        for (let j = 0; j < customers.length; j++) {
          if (String(customers[j].id) === String(inv.customer_id)) { custName = customers[j].name; break; }
        }

        let stLabel = inv.status;
        let stClass = '';
        if (inv.status === 'unpaid') { stLabel = 'Belum Lunas'; stClass = 'red'; }
        else if (inv.status === 'paid') { stLabel = 'Lunas'; stClass = 'green'; }
        else if (inv.status === 'cancelled') { stLabel = 'Dibatalkan'; stClass = ''; }

        html += '<tr>' +
          '<td>' + escHtml(inv.invoice_no) + '</td>' +
          '<td>' + escHtml(inv.invoice_date || '-') + '</td>' +
          '<td>' + escHtml(delivNo) + '</td>' +
          '<td>' + escHtml(custName) + '</td>' +
          '<td>' + rupiah(total) + '</td>' +
          '<td><span class="status ' + stClass + '">' + escHtml(stLabel) + '</span></td>' +
          '<td>' +
          '<div class="so-actions">' +
          '<button type="button" class="so-action-btn" data-inv-action="view" data-inv-id="' + escHtml(inv.id) + '" title="Lihat Detail Faktur">⌕</button>' +
          '</div>' +
          '</td>' +
          '</tr>';
      }
      body.innerHTML = html;
    }

    const countElem = document.getElementById('invoicesCount');
    if (countElem) countElem.textContent = invoices.length + ' Faktur tersimpan';

    if (message) {
      message.textContent = 'Data Faktur Penjualan terhubung langsung dengan Surat Jalan.';
      message.style.color = 'var(--green)';
    }
  } catch (error) {
    body.innerHTML = '<tr><td colspan="7">Data belum dapat ditampilkan.</td></tr>';
    if (message) {
      message.style.color = 'var(--red)';
      message.textContent = 'Gagal memuat Faktur: ' + error.message;
    }
  }
}

const showInvoiceFormBtn = document.getElementById('showInvoiceFormBtn');
if (showInvoiceFormBtn) {
  showInvoiceFormBtn.addEventListener('click', async function() {
    const msg = document.getElementById('invoiceMessage');
    const modal = document.getElementById('invoiceFormModal');
    if (modal) modal.style.display = 'flex';
    if (msg) { msg.textContent = 'Memuat data Surat Jalan...'; msg.style.color = 'var(--muted)'; }
    try {
      await loadInvoiceChoices();
      const dateInp = document.getElementById('invDate');
      if (dateInp) dateInp.value = todayLocal();
      const dueDateInp = document.getElementById('invDueDate');
      if (dueDateInp) dueDateInp.value = todayLocal();
      if (msg) msg.textContent = '';
    } catch (err) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Gagal memuat data: ' + err.message; }
    }
  });
}

const closeInvoiceFormBtn = document.getElementById('closeInvoiceFormBtn');
if (closeInvoiceFormBtn) {
  closeInvoiceFormBtn.addEventListener('click', function() {
    const modal = document.getElementById('invoiceFormModal');
    if (modal) modal.style.display = 'none';
  });
}

const invoiceForm = document.getElementById('invoiceForm');
if (invoiceForm) {
  invoiceForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const msg = document.getElementById('invoiceMessage');
    const deliveryId = document.getElementById('invSalesOrder')?.value;
    const invDate = document.getElementById('invDate')?.value;
    const dueDate = document.getElementById('invDueDate')?.value;
    const notes = document.getElementById('invNotes')?.value.trim() || null;

    if (!deliveryId) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Pilih Surat Jalan terlebih dahulu.'; }
      return;
    }

    const saveBtn = document.getElementById('saveInvoiceBtn');
    if (saveBtn) saveBtn.disabled = true;
    if (msg) { msg.style.color = 'var(--muted)'; msg.textContent = 'Menerbitkan Faktur dari Surat Jalan...'; }

    try {
      // 1. Ambil data Header Surat Jalan
      const { data: deliv, error: delivErr } = await supabaseClient.from('deliveries').select('id,sales_order_id,customer_id').eq('id', deliveryId).single();
      if (delivErr) throw delivErr;

      // 2. Ambil barang terkirim (delivery_items) dan rincian harga dari SO (sales_order_items)
      const [delivItemsRes, soItemsRes] = await Promise.all([
        supabaseClient.from('delivery_items').select('sales_order_item_id,quantity_shipped').eq('delivery_id', deliveryId),
        supabaseClient.from('sales_order_items').select('id,product_id,unit_id,unit_price,discount_amount').eq('sales_order_id', deliv.sales_order_id)
      ]);

      if (delivItemsRes.error) throw delivItemsRes.error;
      if (soItemsRes.error) throw soItemsRes.error;

      const delivItems = delivItemsRes.data || [];
      const soItems = soItemsRes.data || [];

      const soItemMap = {};
      for (let i = 0; i < soItems.length; i++) {
        soItemMap[String(soItems[i].id)] = soItems[i];
      }

      // 3. Buat Kode Faktur (INV-YYYYMMDD-XXXXX)
      const now = new Date();
      const stamp = '' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invNo = 'INV-' + stamp + '-' + randomPart;

      // 4. Simpan Header Faktur
      const { data: invHeader, error: invErr } = await supabaseClient.from('invoices').insert({
        invoice_no: invNo,
        invoice_date: invDate,
        due_date: dueDate,
        customer_id: deliv.customer_id,
        sales_order_id: deliv.sales_order_id,
        delivery_id: Number(deliveryId),
        status: 'unpaid',
        notes: notes
      }).select('id,invoice_no').single();

      if (invErr) throw invErr;

      // 5. Susun Rincian Item Faktur Berdasarkan Kuantitas Terkirim
      const invItems = [];
      for (let i = 0; i < delivItems.length; i++) {
        const dItem = delivItems[i];
        const soMatch = soItemMap[String(dItem.sales_order_item_id)];
        if (soMatch && Number(dItem.quantity_shipped) > 0) {
          invItems.push({
            invoice_id: invHeader.id,
            product_id: soMatch.product_id,
            unit_id: soMatch.unit_id,
            quantity: dItem.quantity_shipped,
            unit_price: soMatch.unit_price,
            discount_amount: soMatch.discount_amount || 0
          });
        }
      }

      if (invItems.length === 0) {
        await supabaseClient.from('invoices').delete().eq('id', invHeader.id);
        throw new Error('Surat Jalan ini tidak memiliki barang terkirim untuk ditagihkan.');
      }

      const { error: insertItemsErr } = await supabaseClient.from('invoice_items').insert(invItems);
      if (insertItemsErr) {
        await supabaseClient.from('invoices').delete().eq('id', invHeader.id);
        throw insertItemsErr;
      }

      document.getElementById('invoiceFormModal').style.display = 'none';
      invoiceForm.reset();
      await loadInvoices();

      const listMsg = document.getElementById('invoicesListMessage');
      if (listMsg) {
        listMsg.style.color = 'var(--green)';
        listMsg.textContent = 'Faktur ' + invHeader.invoice_no + ' berhasil diterbitkan berdasarkan Surat Jalan.';
      }
    } catch (err) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Gagal menyimpan Faktur: ' + err.message; }
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });
}

const refreshInvoicesBtn = document.getElementById('refreshInvoicesBtn');
if (refreshInvoicesBtn) refreshInvoicesBtn.addEventListener('click', loadInvoices);

const invoicesBody = document.getElementById('invoicesBody');
if (invoicesBody) {
  invoicesBody.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-inv-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-inv-id');
    const action = btn.getAttribute('data-inv-action');
    if (action === 'view') alert('Rincian Faktur Penjualan ID: ' + id);
  });
}

// Export Scope Global
window.loadInvoices = loadInvoices;
