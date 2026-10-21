// Modul Data Master
async function loadMasterData(){
  const status=document.getElementById('masterStatus');
  status.textContent='Sedang mengambil data dari Supabase...';
  status.style.color='';
  const [customersRes,productsRes,unitsRes,warehousesRes]=await Promise.all([
    supabaseClient.from('customers').select('id,customer_code,name,phone,address,credit_limit,payment_term_days,is_active').order('name'),
    supabaseClient.from('products').select('id,product_code,name,base_unit_id,is_active').order('name'),
    supabaseClient.from('units').select('id,code,name').order('name'),
    supabaseClient.from('warehouses').select('code,name,address,is_active').order('name')
  ]);
  const errors=[customersRes,productsRes,unitsRes,warehousesRes].filter(r=>r.error);
  if(errors.length){
    status.textContent='Data belum dapat dibaca: '+errors.map(r=>r.error.message).join(' | ');
    status.style.color='#b42318';
    return;
  }
  const customers=customersRes.data||[], products=productsRes.data||[], units=unitsRes.data||[], warehouses=warehousesRes.data||[];
  const unitMap=new Map(units.map(u=>[u.id,u.name||u.code||'-']));
  const unitSelect=document.getElementById('productBaseUnit');
  const selectedUnit=unitSelect.value;
  unitSelect.innerHTML='<option value="">Pilih satuan</option>'+units.map(u=>`<option value="${escHtml(u.id)}">${escHtml(u.name||u.code||'-')} (${escHtml(u.code||'')})</option>`).join('');
  if(units.some(u=>String(u.id)===selectedUnit)) unitSelect.value=selectedUnit;
  document.getElementById('customerCount').textContent=customers.length+' pelanggan';
  document.getElementById('productCount').textContent=products.length+' produk';
  document.getElementById('warehouseCount').textContent=warehouses.length+' gudang';
  document.getElementById('unitCount').textContent=units.length+' satuan';
  setTableRows('customersBody',customers.map(c=>`<tr><td>${escHtml(c.customer_code||'-')}</td><td>${escHtml(c.name)}</td><td>${escHtml(c.phone||'-')}</td><td>${c.is_active?'Aktif':'Nonaktif'}</td><td><button type="button" class="linkbtn" data-edit-customer="${escHtml(c.id)}">Edit</button> <button type="button" class="linkbtn" data-toggle-customer="${escHtml(c.id)}" data-active="${c.is_active?'true':'false'}">${c.is_active?'Nonaktifkan':'Aktifkan'}</button></td></tr>`),5);
  setTableRows('productsBody',products.map(p=>`<tr><td>${escHtml(p.product_code||'-')}</td><td>${escHtml(p.name)}</td><td>${escHtml(unitMap.get(p.base_unit_id)||'-')}</td><td>${p.is_active?'Aktif':'Nonaktif'}</td><td><button type="button" class="linkbtn" data-edit-product="${escHtml(p.id)}">Edit</button> <button type="button" class="linkbtn" data-toggle-product="${escHtml(p.id)}" data-active="${p.is_active?'true':'false'}">${p.is_active?'Nonaktifkan':'Aktifkan'}</button></td></tr>`),5);
  setTableRows('warehousesBody',warehouses.map(w=>`<tr><td>${escHtml(w.code||'-')}</td><td>${escHtml(w.name)}</td><td>${escHtml(w.address||'-')}</td><td>${w.is_active?'Aktif':'Nonaktif'}</td></tr>`),4);
  setTableRows('unitsBody',units.map(u=>`<tr><td>${escHtml(u.code||'-')}</td><td>${escHtml(u.name||'-')}</td></tr>`),2);
  status.textContent='Koneksi berhasil. Data pada halaman ini dibaca langsung dari database Supabase.';
  status.style.color='#12815d';
}

function setTableRows(id, rows, colspan, emptyText='Belum ada data.'){
  const body=document.getElementById(id);
  if(!rows||rows.length===0){body.innerHTML=`<tr><td colspan="${colspan}">${emptyText}</td></tr>`;return;}
  body.innerHTML=rows.join('');
}

document.getElementById('refreshMasterBtn').addEventListener('click',loadMasterData);

const productForm=document.getElementById('productForm');
const productFormMessage=document.getElementById('productFormMessage');
let editingProductId=null;

function resetProductForm(){
  editingProductId=null; productForm.reset(); document.getElementById('productActive').checked=true;
  document.getElementById('productFormTitle').textContent='Tambah Produk';
  document.getElementById('saveProductBtn').textContent='Simpan Produk'; productFormMessage.textContent='';
}

document.getElementById('showProductFormBtn').addEventListener('click',()=>{resetProductForm();productForm.style.display='block';document.getElementById('productCode').focus();});
document.getElementById('cancelProductBtn').addEventListener('click',()=>{resetProductForm();productForm.style.display='none';});

document.getElementById('productsBody').addEventListener('click',async(event)=>{
  const toggleButton=event.target.closest('[data-toggle-product]');
  if(toggleButton){
    const productId=toggleButton.getAttribute('data-toggle-product');
    const currentlyActive=toggleButton.getAttribute('data-active')==='true';
    if(!confirm(`Ubah status produk menjadi ${currentlyActive?'nonaktif':'aktif'}?`))return;
    const {error}=await supabaseClient.from('products').update({is_active:!currentlyActive}).eq('id',productId);
    if(error){alert('Gagal mengubah status: '+error.message);return;}
    await loadMasterData(); return;
  }
  const button=event.target.closest('[data-edit-product]');
  if(!button)return;
  const productId=button.getAttribute('data-edit-product');
  const {data,error}=await supabaseClient.from('products').select('id,product_code,name,base_unit_id,is_active').eq('id',productId).single();
  if(error){alert('Gagal membuka produk: '+error.message);return;}
  editingProductId=data.id;
  document.getElementById('productCode').value=data.product_code||'';
  document.getElementById('productName').value=data.name||'';
  document.getElementById('productBaseUnit').value=String(data.base_unit_id||'');
  document.getElementById('productActive').checked=!!data.is_active;
  document.getElementById('productFormTitle').textContent='Edit Produk';
  document.getElementById('saveProductBtn').textContent='Simpan Perubahan';
  productForm.style.display='block';
});

productForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const saveBtn=document.getElementById('saveProductBtn'); saveBtn.disabled=true;
  const payload={
    product_code:document.getElementById('productCode').value.trim(),
    name:document.getElementById('productName').value.trim(),
    base_unit_id:Number(document.getElementById('productBaseUnit').value),
    is_active:document.getElementById('productActive').checked
  };
  const result=editingProductId!==null
    ? await supabaseClient.from('products').update(payload).eq('id',editingProductId)
    : await supabaseClient.from('products').insert(payload);
  saveBtn.disabled=false;
  if(result.error){productFormMessage.style.color='var(--red)';productFormMessage.textContent='Gagal: '+result.error.message;return;}
  resetProductForm(); await loadMasterData(); productForm.style.display='none';
});

const customerForm=document.getElementById('customerForm');
const customerFormMessage=document.getElementById('customerFormMessage');
let editingCustomerId=null;

function resetCustomerForm(){
  editingCustomerId=null; customerForm.reset(); document.getElementById('customerCredit').value='0';
  document.getElementById('customerTerm').value='14'; document.getElementById('customerActive').checked=true;
  document.getElementById('customerFormTitle').textContent='Tambah Pelanggan';
  document.getElementById('saveCustomerBtn').textContent='Simpan Pelanggan'; customerFormMessage.textContent='';
}

document.getElementById('showCustomerFormBtn').addEventListener('click',()=>{resetCustomerForm();customerForm.style.display='block';document.getElementById('customerName').focus();});
document.getElementById('cancelCustomerBtn').addEventListener('click',()=>{resetCustomerForm();customerForm.style.display='none';});

document.getElementById('customersBody').addEventListener('click',async(event)=>{
  const toggleButton=event.target.closest('[data-toggle-customer]');
  if(toggleButton){
    const customerId=toggleButton.getAttribute('data-toggle-customer');
    const currentlyActive=toggleButton.getAttribute('data-active')==='true';
    if(!confirm(`Ubah status pelanggan menjadi ${currentlyActive?'nonaktif':'aktif'}?`))return;
    const {error}=await supabaseClient.from('customers').update({is_active:!currentlyActive}).eq('id',customerId);
    if(error){alert('Gagal mengubah status: '+error.message);return;}
    await loadMasterData(); return;
  }
  const button=event.target.closest('[data-edit-customer]');
  if(!button)return;
  const customerId=button.getAttribute('data-edit-customer');
  const {data,error}=await supabaseClient.from('customers').select('id,customer_code,name,phone,address,credit_limit,payment_term_days,is_active').eq('id',customerId).single();
  if(error){alert('Gagal membuka pelanggan: '+error.message);return;}
  editingCustomerId=data.id;
  document.getElementById('customerCode').value=data.customer_code||'';
  document.getElementById('customerName').value=data.name||'';
  document.getElementById('customerPhone').value=data.phone||'';
  document.getElementById('customerAddress').value=data.address||'';
  document.getElementById('customerCredit').value=Number(data.credit_limit||0);
  document.getElementById('customerTerm').value=Number(data.payment_term_days??14);
  document.getElementById('customerActive').checked=!!data.is_active;
  document.getElementById('customerFormTitle').textContent='Edit Pelanggan';
  document.getElementById('saveCustomerBtn').textContent='Simpan Perubahan';
  customerForm.style.display='block';
});

customerForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const saveBtn=document.getElementById('saveCustomerBtn'); saveBtn.disabled=true;
  const details={
    name:document.getElementById('customerName').value.trim(),
    phone:document.getElementById('customerPhone').value.trim()||null,
    address:document.getElementById('customerAddress').value.trim()||null,
    credit_limit:Number(document.getElementById('customerCredit').value||0),
    payment_term_days:Number(document.getElementById('customerTerm').value||0),
    is_active:document.getElementById('customerActive').checked
  };
  const result=editingCustomerId!==null
    ? await supabaseClient.from('customers').update(details).eq('id',editingCustomerId)
    : await supabaseClient.from('customers').insert({...details,customer_code:null});
  saveBtn.disabled=false;
  if(result.error){customerFormMessage.style.color='var(--red)';customerFormMessage.textContent='Gagal: '+result.error.message;return;}
  resetCustomerForm(); await loadMasterData(); customerForm.style.display='none';
});

