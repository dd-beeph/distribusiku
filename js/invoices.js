// Modul Faktur Penjualan (Sales Invoices)
let invActiveOrders = [];

async function loadInvoiceChoices() {
  const [ordersRes, customersRes] = await Promise.all([
    supabaseClient.from('sales_orders').select('id,order_no,order_date,customer_id,status').eq('status', 'confirmed').order('created_at', { ascending: false }),
    supabaseClient.from('customers').select('id,name')
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);

  const orders = ordersRes.data || [];
  const customers = customersRes.data || [];

  for (let i = 0; i < orders.length; i++) {
    let custName = 'Pelanggan tidak ditemukan';
    for (let j = 0; j < customers.length; j++) {
      if (String(customers[j].id) === String(orders[i].customer_id)) {
        custName = customers[j].name;
        break;
      }
    }
    orders[i].customer_name = custName;
  }

  invActiveOrders = orders;

  const select = document.getElementById('invSalesOrder');
  if (select) {
    let html = '<option value="">-- Pilih Sales Order --</option>';
    for (let i = 0; i < orders.length; i++) {
      html += '<option value="' + escHtml(orders[i].id) + '">' + escHtml(orders[i].order_no) + ' — ' + escHtml(orders[i].customer_name) + '</option>';
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
    const [invoicesRes, customersRes, itemsRes] = await Promise.all([
      supabaseClient.from('invoices').select('id,invoice_no,invoice_date,due_date,customer_id,sales_order_id,status,notes,created_at').order('created_at', { ascending: false }),
      supabaseClient.from('customers').select('id,name'),
      supabaseClient.from('invoice_items').select('invoice_id,quantity,unit_price,discount_amount')
    ]);

    if (invoicesRes.error) throw new Error(invoicesRes.error.message);
    if (customersRes.error) throw new Error(customersRes.error.message);
    if (itemsRes.error) throw new Error(itemsRes.error.message);

    const invoices = invoicesRes.data || [];
    const customers = customersRes.data || [];
    const items = itemsRes.data || [];

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
          '<td>' + escHtml(inv.due_date || '-') + '</td>' +
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
      message.textContent = 'Data Faktur Penjualan dimuat secara real-time.';
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
    if (msg) { msg.textContent = 'Memuat pilihan Sales Order...'; msg.style.color = 'var(--muted)'; }
    try {
      await loadInvoiceChoices();
      const dateInp = document.getElementById('invDate');
      if (dateInp) dateInp.value = todayLocal();
      const dueDateInp = document.getElementById('invDueDate');
      if (dueDateInp) dueDateInp.value = todayLocal();
      if (msg) msg.textContent = '';
    } catch (err) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Gagal memuat SO: ' + err.message; }
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
    const soId = document.getElementById('invSalesOrder')?.value;
    const invDate = document.getElementById('invDate')?.value;
    const dueDate = document.getElementById('invDueDate')?.value;
    const notes = document.getElementById('invNotes')?.value.trim() || null;

    if (!soId) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Pilih Sales Order terlebih dahulu.'; }
      return;
    }

    const saveBtn = document.getElementById('saveInvoiceBtn');
    if (saveBtn) saveBtn.disabled = true;
    if (msg) { msg.style.color = 'var(--muted)'; msg.textContent = 'Menerbitkan Faktur...'; }

    try {
      // 1. Ambil detail SO
      const { data: so, error: soErr } = await supabaseClient.from('sales_orders').select('id,customer_id').eq('id', soId).single();
      if (soErr) throw soErr;

      const { data: items, error: itemsErr } = await supabaseClient.from('sales_order_items').select('product_id,unit_id,quantity,unit_price,discount_amount').eq('sales_order_id', soId);
      if (itemsErr) throw itemsErr;

      // 2. Buat Nomor Faktur (INV-YYYYMMDD-XXXXX)
      const now = new Date();
      const stamp = '' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invNo = 'INV-' + stamp + '-' + randomPart;

      // 3. Simpan Faktur Header
      const { data: invHeader, error: invErr } = await supabaseClient.from('invoices').insert({
        invoice_no: invNo,
        invoice_date: invDate,
        due_date: dueDate,
        customer_id: so.customer_id,
        sales_order_id: Number(soId),
        status: 'unpaid',
        notes: notes
      }).select('id,invoice_no').single();

      if (invErr) throw invErr;

      // 4. Simpan Detail Item Faktur
      const invItems = [];
      for (let i = 0; i < items.length; i++) {
        invItems.push({
          invoice_id: invHeader.id,
          product_id: items[i].product_id,
          unit_id: items[i].unit_id,
          quantity: items[i].quantity,
          unit_price: items[i].unit_price,
          discount_amount: items[i].discount_amount || 0
        });
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
        listMsg.textContent = 'Faktur ' + invHeader.invoice_no + ' berhasil diterbitkan.';
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
    if (action === 'view') alert('Fungsi cetak/lihat rincian faktur ID: ' + id);
  });
}

// Export Scope Global
window.loadInvoices = loadInvoices;
