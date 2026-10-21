// Modul Faktur Penjualan
async function loadInvoices() {
  const body = document.getElementById('invoicesBody');
  const count = document.getElementById('invoiceCount');
  body.innerHTML = '<tr><td colspan="6">Memuat daftar faktur...</td></tr>';

  try {
    const [invRes, soRes, custRes, delivRes] = await Promise.all([
      supabaseClient.from('sales_invoices').select('id, invoice_no, sales_order_id, invoice_date, due_date, driver_name, status, notes, created_at').order('created_at', {ascending: false}),
      supabaseClient.from('sales_orders').select('id, order_no, customer_id'),
      supabaseClient.from('customers').select('id, name'),
      supabaseClient.from('sales_invoice_items').select('invoice_id, quantity_billed, unit_price, discount_amount')
    ]);

    if(invRes.error) throw invRes.error;

    const invoices = invRes.data || [];
    const soMap = new Map((soRes.data || []).map(s => [String(s.id), s]));
    const custMap = new Map((custRes.data || []).map(c => [String(c.id), c.name]));

    const totals = new Map();
    for(const item of delivRes.data || []) {
      const current = totals.get(String(item.invoice_id)) || 0;
      totals.set(String(item.invoice_id), current + (Number(item.quantity_billed || 0) * Number(item.unit_price || 0)) - Number(item.discount_amount || 0));
    }

    count.textContent = `${invoices.length} Faktur diterbitkan`;

    if(!invoices.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">Belum ada faktur diterbitkan. Faktur akan muncul setelah Kasir memproses pengiriman.</td></tr>';
      return;
    }

    body.innerHTML = invoices.map(inv => {
      const so = soMap.get(String(inv.sales_order_id)) || {};
      const custName = custMap.get(String(so.customer_id)) || 'Pelanggan';
      const grandTotal = totals.get(String(inv.id)) || 0;
      const statusLabel = inv.status === 'unpaid' ? 'Belum Lunas' : (inv.status === 'paid' ? 'Lunas' : inv.status);

      return `<tr>
        <td><strong>${escHtml(inv.invoice_no)}</strong></td>
        <td>${escHtml(so.order_no || '-')}</td>
        <td>${escHtml(inv.invoice_date || '-')}</td>
        <td>${escHtml(custName)}</td>
        <td><strong>${rupiah(grandTotal)}</strong></td>
        <td><span class="status red">${escHtml(statusLabel)}</span></td>
      </tr>`;
    }).join('');

  } catch(error) {
    body.innerHTML = '<tr><td colspan="6">Gagal memuat faktur: ' + error.message + '</td></tr>';
  }
}

document.getElementById('refreshInvoicesBtn').addEventListener('click', loadInvoices);

async function openCashierInvoiceForm(delivId) {
  const form = document.getElementById('cashierInvoiceForm');
  const msg = document.getElementById('cashierInvoiceMessage');
  const itemsBody = document.getElementById('cashierInvoiceItemsBody');

  form.style.display = 'flex';
  msg.textContent = 'Memuat data pengiriman untuk konfirmasi faktur...'; msg.style.color = 'var(--muted)';
  document.getElementById('cashierInvoiceDate').value = todayLocal();
  document.getElementById('cashierInvoiceNotes').value = '';

  try {
    const [delivRes, delivItemsRes, soRes, custRes, prodRes, unitRes] = await Promise.all([
      supabaseClient.from('deliveries').select('id, delivery_no, sales_order_id, delivery_date, driver_name, warehouse_id, notes').eq('id', delivId).single(),
      supabaseClient.from('delivery_items').select('id, delivery_id, sales_order_item_id, quantity_shipped').eq('delivery_id', delivId),
      supabaseClient.from('sales_orders').select('id, order_no, customer_id'),
      supabaseClient.from('customers').select('id, name'),
      supabaseClient.from('products').select('id, product_code, name'),
      supabaseClient.from('units').select('id, code, name')
    ]);

    const deliv = delivRes.data;
    const so = (soRes.data || []).find(s => String(s.id) === String(deliv.sales_order_id)) || {};
    const cust = (custRes.data || []).find(c => String(c.id) === String(so.customer_id)) || {};
    const pMap = new Map((prodRes.data || []).map(p => [String(p.id), p]));
    const uMap = new Map((unitRes.data || []).map(u => [String(u.id), u]));

    const soItemIds = delivItemsRes.data.map(i => i.sales_order_item_id);
    const {data: soItemsData} = await supabaseClient.from('sales_order_items').select('id, product_id, unit_id, unit_price, discount_amount').in('id', soItemIds.length ? soItemIds : [0]);
    const soItemMap = new Map((soItemsData || []).map(i => [String(i.id), i]));

    document.getElementById('cashierDeliveryId').value = String(deliv.id);
    document.getElementById('cashierSoId').value = String(deliv.sales_order_id);
    document.getElementById('cashierDelivNo').value = deliv.delivery_no;
    document.getElementById('cashierCustomer').value = cust.name || 'Pelanggan';
    document.getElementById('cashierDriver').value = deliv.driver_name || '-';

    itemsBody.innerHTML = delivItemsRes.data.map(di => {
      const soIt = soItemMap.get(String(di.sales_order_item_id)) || {};
      const prod = pMap.get(String(soIt.product_id)) || {name:'Produk'};
      const unit = uMap.get(String(soIt.unit_id)) || {name:'-'};
      const shippedQty = Number(di.quantity_shipped || 0);
      const price = Number(soIt.unit_price || 0);

      return `<tr data-deliv-item-id="${escHtml(di.id)}" data-price="${price}">
        <td><strong>${escHtml(prod.name)}</strong><br><small style="color:var(--muted)">Kode: ${escHtml(prod.product_code || '-')}</small></td>
        <td>${escHtml(unit.name || unit.code || '-')}</td>
        <td style="text-align:right">${shippedQty.toLocaleString('id-ID')}</td>
        <td style="text-align:right">${rupiah(price)}</td>
        <td>
          <input class="cashier-billed-qty" type="number" min="0" max="${shippedQty}" step="0.001" value="${shippedQty}" style="text-align:right;font-weight:bold" required>
        </td>
        <td style="text-align:right" class="cashier-subtotal">${rupiah(shippedQty * price)}</td>
      </tr>`;
    }).join('');

    updateCashierInvoiceTotal();

    document.querySelectorAll('.cashier-billed-qty').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const row = e.target.closest('tr');
        const price = Number(row.dataset.price || 0);
        const qty = Number(e.target.value || 0);
        row.querySelector('.cashier-subtotal').textContent = rupiah(qty * price);
        updateCashierInvoiceTotal();
      });
    });

    msg.textContent = '';

  } catch(error) {
    msg.style.color = 'var(--red)'; msg.textContent = 'Gagal memuat rincian pengiriman: ' + error.message;
  }
}

function updateCashierInvoiceTotal() {
  let grandTotal = 0;
  document.querySelectorAll('#cashierInvoiceItemsBody tr').forEach(row => {
    const qty = Number(row.querySelector('.cashier-billed-qty').value || 0);
    const price = Number(row.dataset.price || 0);
    grandTotal += (qty * price);
  });
  document.getElementById('cashierInvoiceTotal').textContent = rupiah(grandTotal);
}

document.getElementById('closeCashierInvoiceFormBtn').addEventListener('click', () => document.getElementById('cashierInvoiceForm').style.display = 'none');
document.getElementById('cancelCashierInvoiceBtn').addEventListener('click', () => document.getElementById('cashierInvoiceForm').style.display = 'none');

document.getElementById('cashierInvoiceRecordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('cashierInvoiceMessage');
  const saveBtn = document.getElementById('saveCashierInvoiceBtn');

  const delivId = document.getElementById('cashierDeliveryId').value;
  const soId = document.getElementById('cashierSoId').value;
  const invoiceDate = document.getElementById('cashierInvoiceDate').value;
  const driverName = document.getElementById('cashierDriver').value;
  const notes = document.getElementById('cashierInvoiceNotes').value.trim() || null;

  const rows = [...document.querySelectorAll('#cashierInvoiceItemsBody tr[data-deliv-item-id]')];
  const invoiceItems = [];
  let totalBilledQty = 0;

  for(const row of rows) {
    const delivItemId = row.dataset.delivItemId;
    const price = Number(row.dataset.price || 0);
    const billedQty = Number(row.querySelector('.cashier-billed-qty').value || 0);

    if(billedQty > 0) {
      invoiceItems.push({
        delivery_item_id: Number(delivItemId),
        quantity_billed: billedQty,
        unit_price: price,
        discount_amount: 0
      });
      totalBilledQty += billedQty;
    }
  }

  if(totalBilledQty <= 0) {
    msg.style.color = 'var(--red)'; msg.textContent = 'Minimal harus ada 1 barang yang diterima toko untuk menerbitkan faktur.'; return;
  }

  saveBtn.disabled = true; saveBtn.textContent = 'Menerbitkan Faktur...';
  try {
    const {data: userData} = await supabaseClient.auth.getUser();
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const randomPart = Math.random().toString(36).slice(2,6).toUpperCase();
    const invoiceNo = `INV-${stamp}-${randomPart}`;

    const due = new Date(invoiceDate);
    due.setDate(due.getDate() + 14);
    const dueDateStr = `${due.getFullYear()}-${String(due.getMonth()+1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}`;

    const {data: inv, error: invErr} = await supabaseClient.from('sales_invoices').insert({
      invoice_no: invoiceNo,
      sales_order_id: Number(soId),
      invoice_date: invoiceDate,
      due_date: dueDateStr,
      driver_name: driverName,
      status: 'unpaid',
      notes: notes,
      created_by: userData.user?.id || null
    }).select('id, invoice_no').single();

    if(invErr) throw invErr;

    const {error: itemsErr} = await supabaseClient.from('sales_invoice_items').insert(
      invoiceItems.map(it => ({...it, invoice_id: inv.id}))
    );

    if(itemsErr) {
      await supabaseClient.from('sales_invoices').delete().eq('id', inv.id);
      throw itemsErr;
    }

    document.getElementById('cashierInvoiceForm').style.display = 'none';
    await loadDeliveries();
    alert(`Faktur Penjualan ${inv.invoice_no} BERHASIL DITERBITKAN!\nPengiriman selesai dan piutang pelanggan tercatat.`);
    showPage('invoices');

  } catch(error) {
    msg.style.color = 'var(--red)'; msg.textContent = 'Gagal menerbitkan faktur: ' + error.message;
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Simpan & Terbitkan Faktur Penjualan';
  }
});

