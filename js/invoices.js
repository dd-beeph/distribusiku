// Modul Faktur Penjualan (Master Register Seluruh Faktur)

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
      supabaseClient.from('invoices').select('id,invoice_no,invoice_date,due_date,customer_id,delivery_id,status,notes,created_at').order('created_at', { ascending: false }),
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
      message.textContent = 'Menampilkan seluruh Faktur Penjualan (Lunas & Belum Lunas).';
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

// Fungsi Pemicu Pemfakturan Langsung dari Submenu Pengiriman Barang (Surat Jalan)
async function createInvoiceFromDelivery(deliveryId) {
  if (!confirm('Terbitkan Faktur Penjualan untuk Surat Jalan ini?')) return;

  try {
    // 1. Cek apakah Surat Jalan ini sudah pernah difakturkan
    const { data: existing, error: checkErr } = await supabaseClient.from('invoices').select('id,invoice_no').eq('delivery_id', deliveryId).maybeSingle();
    if (checkErr) throw checkErr;
    if (existing) {
      alert('Surat Jalan ini sudah memiliki Faktur: ' + existing.invoice_no);
      if (typeof showPage === 'function') showPage('invoices');
      return;
    }

    // 2. Ambil data Header Surat Jalan
    const { data: deliv, error: delivErr } = await supabaseClient.from('deliveries').select('id,sales_order_id,customer_id').eq('id', deliveryId).single();
    if (delivErr) throw delivErr;

    // 3. Ambil item terkirim dari Surat Jalan dan harga dari Sales Order
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

    // 4. Buat Nomor Faktur Otomatis (INV-YYYYMMDD-XXXXX)
    const now = new Date();
    const stamp = '' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const invNo = 'INV-' + stamp + '-' + randomPart;
    const todayStr = todayLocal();

    // 5. Simpan Header Faktur
    const { data: invHeader, error: invErr } = await supabaseClient.from('invoices').insert({
      invoice_no: invNo,
      invoice_date: todayStr,
      due_date: todayStr,
      customer_id: deliv.customer_id,
      sales_order_id: deliv.sales_order_id,
      delivery_id: Number(deliveryId),
      status: 'unpaid',
      notes: 'Diterbitkan otomatis dari Surat Jalan'
    }).select('id,invoice_no').single();

    if (invErr) throw invErr;

    // 6. Simpan Rincian Item Faktur
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
      alert('Gagal: Surat Jalan ini tidak memiliki kuantitas barang terkirim.');
      return;
    }

    const { error: insertItemsErr } = await supabaseClient.from('invoice_items').insert(invItems);
    if (insertItemsErr) {
      await supabaseClient.from('invoices').delete().eq('id', invHeader.id);
      throw insertItemsErr;
    }

    alert('Faktur ' + invHeader.invoice_no + ' berhasil diterbitkan dengan status Belum Lunas.');
    if (typeof showPage === 'function') showPage('invoices');
    await loadInvoices();

  } catch (err) {
    alert('Gagal menerbitkan Faktur: ' + err.message);
  }
}

const refreshInvoicesBtn = document.getElementById('refreshInvoicesBtn');
if (refreshInvoicesBtn) refreshInvoicesBtn.addEventListener('click', loadInvoices);

// Export Scope Global
window.loadInvoices = loadInvoices;
window.createInvoiceFromDelivery = createInvoiceFromDelivery;
