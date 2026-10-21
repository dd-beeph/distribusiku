// Modul Pengiriman Barang
async function loadDeliveries(){
  const msg = document.getElementById('deliveryListMessage');
  const body = document.getElementById('deliveriesBody');
  msg.style.color = 'var(--muted)'; msg.textContent = 'Memuat pengiriman aktif dari Supabase...';
  body.innerHTML = '<tr><td colspan="8">Memuat data...</td></tr>';
  try {
    const {data: invoicedItemsRes} = await supabaseClient.from('sales_invoice_items').select('delivery_item_id');
    const invoicedDelivItemIds = new Set((invoicedItemsRes || []).map(i => String(i.delivery_item_id)));

    const [delivRes, delivItemsRes, soRes, custRes, whRes] = await Promise.all([
      supabaseClient.from('deliveries').select('id, delivery_no, sales_order_id, delivery_date, driver_name, warehouse_id, status, notes, created_at').order('created_at', {ascending: false}),
      supabaseClient.from('delivery_items').select('id, delivery_id'),
      supabaseClient.from('sales_orders').select('id, order_no, customer_id'),
      supabaseClient.from('customers').select('id, name'),
      supabaseClient.from('warehouses').select('id, name, code')
    ]);

    if(delivRes.error) throw delivRes.error;

    const delivItemMap = new Map();
    for(const di of delivItemsRes.data || []) {
      const list = delivItemMap.get(String(di.delivery_id)) || [];
      list.push(di.id);
      delivItemMap.set(String(di.delivery_id), list);
    }

    const activeDeliveries = (delivRes.data || []).filter(d => {
      const itemIds = delivItemMap.get(String(d.id)) || [];
      return itemIds.some(id => !invoicedDelivItemIds.has(String(id)));
    });

    const soMap = new Map((soRes.data || []).map(s => [String(s.id), s]));
    const custMap = new Map((custRes.data || []).map(c => [String(c.id), c.name]));
    const whMap = new Map((whRes.data || []).map(w => [String(w.id), w.name || w.code]));

    document.getElementById('deliveryCount').textContent = `${activeDeliveries.length} Pengiriman aktif menunggu Faktur`;

    if(!activeDeliveries.length){
      body.innerHTML = '<tr><td colspan="8" class="empty">Tidak ada pengiriman aktif yang menunggu faktur. Semua pengiriman telah diterbitkan faktur atau belum ada eksekusi dari gudang.</td></tr>';
      msg.textContent = 'Antrean bersih. Pengiriman baru akan muncul di sini setelah disiapkan oleh Tim Gudang.';
      msg.style.color = 'var(--green)';
      return;
    }

    body.innerHTML = activeDeliveries.map(d => {
      const so = soMap.get(String(d.sales_order_id)) || {};
      const custName = custMap.get(String(so.customer_id)) || 'Pelanggan';
      const whName = whMap.get(String(d.warehouse_id)) || 'Gudang Utama';

      return `<tr>
        <td><strong>${escHtml(d.delivery_no)}</strong></td>
        <td>${escHtml(so.order_no || '-')}</td>
        <td>${escHtml(d.delivery_date || '-')}</td>
        <td>${escHtml(custName)}</td>
        <td>${escHtml(whName)}</td>
        <td>${escHtml(d.driver_name || '-')}</td>
        <td><span class="status orange">Sedang Dikirim</span></td>
        <td>
          <div class="so-actions">
            <button type="button" class="so-action-btn" data-deliv-action="invoice" data-deliv-id="${escHtml(d.id)}" title="Terbitkan Faktur (Kasir)" style="width:auto;padding:0 8px;font-size:12px;font-weight:bold;color:var(--green)">🧾 Terbitkan Faktur</button>
            <button type="button" class="so-action-btn" data-deliv-action="view" data-deliv-id="${escHtml(d.id)}" title="Lihat SJ">⌕</button>
            <button type="button" class="so-action-btn" data-deliv-action="print" data-deliv-id="${escHtml(d.id)}" title="Cetak Surat Jalan / Nota Driver">⎙</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    msg.textContent = 'Daftar pengiriman aktif berhasil dimuat dari Supabase.';
    msg.style.color = 'var(--green)';
  } catch(error) {
    body.innerHTML = '<tr><td colspan="8">Gagal memuat data pengiriman.</td></tr>';
    msg.style.color = 'var(--red)'; msg.textContent = 'Error: ' + error.message;
  }
}

document.getElementById('refreshDeliveriesBtn').addEventListener('click', loadDeliveries);

async function openWhDeliverForm(soId) {
  const form = document.getElementById('whDeliverForm');
  const msg = document.getElementById('whDeliverMessage');
  const whSelect = document.getElementById('whDeliverWarehouse');
  const itemsBody = document.getElementById('whDeliverItemsBody');

  form.style.display = 'flex';
  msg.textContent = 'Memuat rincian Sales Order...'; msg.style.color = 'var(--muted)';
  document.getElementById('whDeliverDate').value = todayLocal();
  document.getElementById('whDeliverDriver').value = '';
  document.getElementById('whDeliverNotes').value = '';

  try {
    const [soDetail, whRes, delivItemsRes] = await Promise.all([
      getSalesOrderDetail(soId),
      supabaseClient.from('warehouses').select('id, name, code, is_active').eq('is_active', true).order('name'),
      supabaseClient.from('delivery_items').select('sales_order_item_id, quantity_shipped')
    ]);

    document.getElementById('whDeliverSoId').value = String(soDetail.order.id);
    document.getElementById('whDeliverSoNo').value = soDetail.order.order_no;
    document.getElementById('whDeliverCustomer').value = soDetail.customer.name;

    whSelect.innerHTML = '<option value="">Pilih Gudang Pengirim...</option>' + 
      (whRes.data || []).map(w => `<option value="${escHtml(w.id)}">${escHtml(w.name || w.code)}</option>`).join('');

    const shippedMap = new Map();
    for(const di of delivItemsRes.data || []) {
      shippedMap.set(String(di.sales_order_item_id), (shippedMap.get(String(di.sales_order_item_id)) || 0) + Number(di.quantity_shipped || 0));
    }

    itemsBody.innerHTML = soDetail.items.map(i => {
      const totalQty = Number(i.quantity || 0);
      const prevShipped = shippedMap.get(String(i.id)) || 0;
      const remaining = Math.max(0, totalQty - prevShipped);

      return `<tr data-so-item-id="${escHtml(i.id)}" data-remaining="${remaining}">
        <td><strong>${escHtml(i.product.name)}</strong><br><small style="color:var(--muted)">Kode: ${escHtml(i.product.product_code || '-')}</small></td>
        <td>${escHtml(i.unit.name || i.unit.code || '-')}</td>
        <td style="text-align:right">${totalQty.toLocaleString('id-ID')}</td>
        <td style="text-align:right">${prevShipped.toLocaleString('id-ID')}</td>
        <td style="text-align:right"><strong>${remaining.toLocaleString('id-ID')}</strong></td>
        <td>
          <input class="wh-ship-qty" type="number" min="0" max="${remaining}" step="0.001" value="${remaining}" style="text-align:right;font-weight:bold" required>
        </td>
      </tr>`;
    }).join('');

    msg.textContent = '';

  } catch(error) {
    msg.style.color = 'var(--red)'; msg.textContent = 'Gagal membuka rincian SO: ' + error.message;
  }
}

document.getElementById('closeWhDeliverFormBtn').addEventListener('click', () => document.getElementById('whDeliverForm').style.display = 'none');
document.getElementById('cancelWhDeliverBtn').addEventListener('click', () => document.getElementById('whDeliverForm').style.display = 'none');

document.getElementById('whDeliverRecordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('whDeliverMessage');
  const saveBtn = document.getElementById('saveWhDeliverBtn');

  const soId = document.getElementById('whDeliverSoId').value;
  const warehouseId = document.getElementById('whDeliverWarehouse').value;
  const deliveryDate = document.getElementById('whDeliverDate').value;
  const driverName = document.getElementById('whDeliverDriver').value.trim();
  const notes = document.getElementById('whDeliverNotes').value.trim() || null;

  if(!warehouseId || !driverName || !deliveryDate) {
    msg.style.color = 'var(--red)'; msg.textContent = 'Lengkapi Gudang, Tanggal, dan Nama Driver.'; return;
  }

  const rows = [...document.querySelectorAll('#whDeliverItemsBody tr[data-so-item-id]')];
  const itemsToShip = [];
  let totalQty = 0;

  for(const row of rows) {
    const soItemId = row.dataset.soItemId;
    const remaining = Number(row.dataset.remaining || 0);
    const shipQty = Number(row.querySelector('.wh-ship-qty').value || 0);

    if(shipQty > remaining + 0.0001) {
      msg.style.color = 'var(--red)'; msg.textContent = `Jumlah kirim melebihi sisa SO (${remaining}).`; return;
    }
    if(shipQty > 0) {
      itemsToShip.push({ sales_order_item_id: Number(soItemId), quantity_shipped: shipQty });
      totalQty += shipQty;
    }
  }

  if(totalQty <= 0) {
    msg.style.color = 'var(--red)'; msg.textContent = 'Masukkan jumlah barang yang dikirim (minimal 1 item > 0).'; return;
  }

  saveBtn.disabled = true; saveBtn.textContent = 'Memproses...';
  try {
    const {data: userData} = await supabaseClient.auth.getUser();
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const randomPart = Math.random().toString(36).slice(2,6).toUpperCase();
    const deliveryNo = `SJ-${stamp}-${randomPart}`;

    const {data: deliv, error: delivErr} = await supabaseClient.from('deliveries').insert({
      delivery_no: deliveryNo,
      sales_order_id: Number(soId),
      delivery_date: deliveryDate,
      driver_name: driverName,
      warehouse_id: Number(warehouseId),
      status: 'shipped',
      notes: notes,
      created_by: userData.user?.id || null
    }).select('id, delivery_no').single();

    if(delivErr) throw delivErr;

    const {error: itemsErr} = await supabaseClient.from('delivery_items').insert(
      itemsToShip.map(it => ({...it, delivery_id: deliv.id}))
    );

    if(itemsErr) {
      await supabaseClient.from('deliveries').delete().eq('id', deliv.id);
      throw itemsErr;
    }

    document.getElementById('whDeliverForm').style.display = 'none';
    await loadSalesOrders();
    alert(`Surat Jalan ${deliv.delivery_no} berhasil dibuat dan masuk ke sub menu Pengiriman Barang!`);
    showPage('deliveries');

  } catch(error) {
    msg.style.color = 'var(--red)'; msg.textContent = 'Gagal mengeksekusi pengiriman: ' + error.message;
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Proses & Masukkan ke Pengiriman Barang';
  }
});

async function viewDeliveryDetail(id) {
  const modal = ensureSoModal();
  modal.style.display = 'flex';
  modal.querySelector('#soModalTitle').textContent = 'Detail Surat Jalan';
  modal.querySelector('#soModalMessage').textContent = 'Memuat detail pengiriman...';
  modal.querySelector('#soModalContent').innerHTML = '';

  try {
    const [delivRes, itemsRes, soRes, custRes, whRes, prodRes, unitRes] = await Promise.all([
      supabaseClient.from('deliveries').select('id, delivery_no, sales_order_id, delivery_date, driver_name, warehouse_id, status, notes').eq('id', id).single(),
      supabaseClient.from('delivery_items').select('sales_order_item_id, quantity_shipped').eq('delivery_id', id),
      supabaseClient.from('sales_orders').select('id, order_no, customer_id'),
      supabaseClient.from('customers').select('id, name, address, phone'),
      supabaseClient.from('warehouses').select('id, name, code'),
      supabaseClient.from('products').select('id, product_code, name'),
      supabaseClient.from('units').select('id, code, name')
    ]);

    const deliv = delivRes.data;
    const so = (soRes.data || []).find(s => String(s.id) === String(deliv.sales_order_id)) || {};
    const cust = (custRes.data || []).find(c => String(c.id) === String(so.customer_id)) || {};
    const whName = (whRes.data || []).find(w => String(w.id) === String(deliv.warehouse_id))?.name || 'Gudang Utama';
    const pMap = new Map((prodRes.data || []).map(p => [String(p.id), p]));
    const uMap = new Map((unitRes.data || []).map(u => [String(u.id), u]));

    const soItemIds = itemsRes.data.map(i => i.sales_order_item_id);
    const {data: soItemsData} = await supabaseClient.from('sales_order_items').select('id, product_id, unit_id').in('id', soItemIds.length ? soItemIds : [0]);
    const soItemMap = new Map((soItemsData || []).map(i => [String(i.id), i]));

    const items = itemsRes.data.map(it => {
      const soIt = soItemMap.get(String(it.sales_order_item_id)) || {};
      return {
        ...it,
        product: pMap.get(String(soIt.product_id)) || {name:'Produk'},
        unit: uMap.get(String(soIt.unit_id)) || {name:'-'}
      };
    });

    modal.querySelector('#soModalTitle').textContent = deliv.delivery_no;
    modal.querySelector('#soModalMessage').textContent = 'Detail Surat Jalan Pengiriman';
    modal.querySelector('#soModalContent').innerHTML = `
      <div class="so-modal-grid">
        <div class="so-modal-info"><small>No. Sales Order</small><strong>${escHtml(so.order_no || '-')}</strong></div>
        <div class="so-modal-info"><small>Tanggal Kirim</small><strong>${escHtml(deliv.delivery_date || '-')}</strong></div>
        <div class="so-modal-info"><small>Pelanggan</small><strong>${escHtml(cust.name || '-')}</strong></div>
        <div class="so-modal-info"><small>Gudang Pengirim</small><strong>${escHtml(whName)}</strong></div>
        <div class="so-modal-info"><small>Pengemudi / Driver</small><strong>${escHtml(deliv.driver_name || '-')}</strong></div>
        <div class="so-modal-info"><small>Catatan</small><strong>${escHtml(deliv.notes || '-')}</strong></div>
      </div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr><th>Kode Produk</th><th>Nama Produk</th><th>Satuan</th><th style="text-align:right">Jumlah Dikirim</th></tr>
          </thead>
          <tbody>
            ${items.map(i => `<tr>
              <td>${escHtml(i.product.product_code || '-')}</td>
              <td>${escHtml(i.product.name)}</td>
              <td>${escHtml(i.unit.name || i.unit.code || '-')}</td>
              <td style="text-align:right"><strong>${Number(i.quantity_shipped).toLocaleString('id-ID')}</strong></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(error) {
    modal.querySelector('#soModalMessage').textContent = 'Gagal memuat detail pengiriman: ' + error.message;
  }
}

async function printDeliveryDocument(id) {
  const win = window.open('','_blank');
  if(!win){ alert('Browser memblokir jendela cetak. Izinkan pop-up.'); return; }
  win.document.write('<!doctype html><html><head><title>Cetak Surat Jalan</title></head><body style="font:14px Arial;padding:24px">Memuat Surat Jalan...</body></html>');
  win.document.close();

  try {
    const [delivRes, itemsRes, soRes, custRes, whRes, prodRes, unitRes] = await Promise.all([
      supabaseClient.from('deliveries').select('id, delivery_no, sales_order_id, delivery_date, driver_name, warehouse_id, status, notes').eq('id', id).single(),
      supabaseClient.from('delivery_items').select('sales_order_item_id, quantity_shipped').eq('delivery_id', id),
      supabaseClient.from('sales_orders').select('id, order_no, customer_id'),
      supabaseClient.from('customers').select('id, name, address, phone'),
      supabaseClient.from('warehouses').select('id, name, code, address'),
      supabaseClient.from('products').select('id, product_code, name'),
      supabaseClient.from('units').select('id, code, name')
    ]);

    const deliv = delivRes.data;
    const so = (soRes.data || []).find(s => String(s.id) === String(deliv.sales_order_id)) || {};
    const cust = (custRes.data || []).find(c => String(c.id) === String(so.customer_id)) || {};
    const wh = (whRes.data || []).find(w => String(w.id) === String(deliv.warehouse_id)) || {};
    const pMap = new Map((prodRes.data || []).map(p => [String(p.id), p]));
    const uMap = new Map((unitRes.data || []).map(u => [String(u.id), u]));

    const soItemIds = itemsRes.data.map(i => i.sales_order_item_id);
    const {data: soItemsData} = await supabaseClient.from('sales_order_items').select('id, product_id, unit_id').in('id', soItemIds.length ? soItemIds : [0]);
    const soItemMap = new Map((soItemsData || []).map(i => [String(i.id), i]));

    const items = itemsRes.data.map(it => {
      const soIt = soItemMap.get(String(it.sales_order_item_id)) || {};
      return {
        ...it,
        product: pMap.get(String(soIt.product_id)) || {name:'Produk'},
        unit: uMap.get(String(soIt.unit_id)) || {name:'-'}
      };
    });

    win.document.open();
    win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escHtml(deliv.delivery_no)}</title>
    <style>
      body{font:13px Arial,sans-serif;color:#111;margin:24px}
      h1{font-size:20px;margin:0 0 4px}
      .muted{color:#555}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;background:#f9f9f9;padding:12px;border-radius:6px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #aaa;padding:8px;text-align:left}
      th{background:#f2f2f2}
      .num{text-align:right}
      .sign{display:flex;justify-content:space-between;margin-top:60px;text-align:center}
      .sign div{width:28%}
      @media print{button{display:none}}
    </style></head>
    <body>
      <h1>SURAT JALAN / PENGIRIMAN</h1>
      <div class="muted">No: <strong>${escHtml(deliv.delivery_no)}</strong> · Ref SO: ${escHtml(so.order_no || '-')}</div>
      <div class="meta">
        <div><strong>Tanggal Kirim:</strong> ${escHtml(deliv.delivery_date || '-')}</div>
        <div><strong>Toko / Pelanggan:</strong> ${escHtml(cust.name || '-')}</div>
        <div><strong>Gudang Pengirim:</strong> ${escHtml(wh.name || 'Gudang Utama')}</div>
        <div><strong>Alamat Tujuan:</strong> ${escHtml(cust.address || '-')}</div>
        <div><strong>Pengemudi / Driver:</strong> ${escHtml(deliv.driver_name || '-')}</div>
        <div><strong>Telepon Pelanggan:</strong> ${escHtml(cust.phone || '-')}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:40px">No.</th>
            <th>Kode Produk</th>
            <th>Nama Barang</th>
            <th>Satuan</th>
            <th class="num">Jumlah Dikirim</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((i, idx) => `<tr>
            <td>${idx + 1}</td>
            <td>${escHtml(i.product.product_code || '-')}</td>
            <td>${escHtml(i.product.name)}</td>
            <td>${escHtml(i.unit.name || i.unit.code || '-')}</td>
            <td class="num"><strong>${Number(i.quantity_shipped).toLocaleString('id-ID')}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p style="margin-top:16px"><strong>Catatan:</strong> ${escHtml(deliv.notes || '-' )}</p>
      <div class="sign">
        <div>Pengemudi,<br><br><br>( ${escHtml(deliv.driver_name || '___________')} )</div>
        <div>Petugas Gudang,<br><br><br>(________________)</div>
        <div>Penerima / Toko,<br><br><br>(________________)</div>
      </div>
      <script>window.onload=()=>window.print();<\/script>
    </body></html>`);
    win.document.close();
  } catch(error) {
    win.document.body.innerHTML = 'Gagal memuat Dokumen Surat Jalan: ' + escHtml(error.message);
  }
}

document.getElementById('deliveriesBody').addEventListener('click', e => {
  const btn = e.target.closest('[data-deliv-action]');
  if(!btn) return;
  const id = btn.dataset.delivId;
  const action = btn.dataset.delivAction;
  if(action === 'invoice') openCashierInvoiceForm(id);
  else if(action === 'view') viewDeliveryDetail(id);
  else if(action === 'print') printDeliveryDocument(id);
});

