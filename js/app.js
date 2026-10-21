// Utility & Fungsi Dasar
const names={dashboard:'Dashboard',sales:'Sales Order',deliveries:'Pengiriman Barang',invoices:'Faktur Penjualan',payments:'Pembayaran',purchases:'Pembelian Supplier',inventory:'Persediaan',expenses:'Biaya Operasional',ledger:'Jurnal & Buku Besar',master:'Data Master'};
const escHtml=(value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const rupiah=(amount)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(amount||0));
function todayLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

function showPage(p){
  document.querySelectorAll('.pageview').forEach(x=>x.classList.remove('show'));
  const target=document.getElementById('page-'+p);
  if(target)target.classList.add('show');
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===p));
  document.getElementById('crumb').textContent=names[p]||p;
  document.getElementById('topTitle').textContent=names[p]||p;
  window.scrollTo(0,0);
  if(innerWidth<=650)document.querySelector('.side').style.display='none';
  if(p==='master'&&supabaseClient)loadMasterData();
  if(p==='sales'&&supabaseClient){loadSalesOrders();loadSoStockSummary();}
  if(p==='deliveries'&&supabaseClient){loadDeliveries();}
  if(p==='invoices'&&supabaseClient){loadInvoices();}
}

document.querySelectorAll('button[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));

function toggleNav(){
  const s=document.querySelector('.side');
  s.style.display=s.style.display==='block'?'none':'block';
  s.style.position='absolute';
  s.style.zIndex='5';
  s.style.width='245px';
  s.style.minHeight='100vh';
  s.style.boxShadow='8px 0 30px #0002';
}

function ensureSoModal(){
  let modal=document.getElementById('soDetailModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='soDetailModal';
  modal.className='so-modal-backdrop';
  modal.style.display='none';
  modal.innerHTML='<div class="so-modal" role="dialog" aria-modal="true" aria-labelledby="soModalTitle"><div class="so-modal-head"><div><h2 id="soModalTitle">Detail Sales Order</h2><div id="soModalMessage" class="sub"></div></div><button type="button" class="so-action-btn" id="soModalClose" aria-label="Tutup" title="Tutup">×</button></div><div id="soModalContent"></div><div class="so-modal-actions"><button type="button" class="linkbtn" id="soModalCloseBottom">Tutup</button></div></div>';
  document.body.appendChild(modal);
  const close=()=>{modal.style.display='none';};
  modal.querySelector('#soModalClose').addEventListener('click',close);
  modal.querySelector('#soModalCloseBottom').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  return modal;
}

function statusText(status){
  return ({confirmed:'Dikonfirmasi',cancelled:'Dibatalkan',completed:'Selesai',draft:'Perlu pembaruan status'})[status]||status||'-';
}

// Otentikasi Supabase
let supabaseClient = null;
const authGate = document.getElementById('authGate');
const authMessage = document.getElementById('authMessage');
const loginButton = document.getElementById('loginButton');

function setAuthMessage(message, isError=true){
  authMessage.textContent=message;
  authMessage.style.color=isError?'var(--red)':'var(--green)';
}

function showAuthenticatedUser(profile, user){
  authGate.style.display='none';
  const profileName = profile && profile.full_name ? profile.full_name : (user.email || 'Pengguna');
  const profileRole = profile && profile.role ? profile.role : 'Pengguna';
  const avatar = document.querySelector('.topright .avatar');
  if(avatar) avatar.textContent=profileName.slice(0,2).toUpperCase();
  const info = document.querySelector('.topright div:last-child');
  if(info) info.innerHTML='<strong style="font-size:12px;display:block"></strong><span style="font-size:11px;color:#8492a6"></span>';
  if(info){info.children[0].textContent=profileName;info.children[1].textContent=profileRole;}
  const topRight=document.querySelector('.topright');
  if(topRight && !document.getElementById('logoutBtn')){
    const btn=document.createElement('button');btn.id='logoutBtn';btn.type='button';btn.textContent='Keluar';
    btn.addEventListener('click',async()=>{await supabaseClient.auth.signOut();location.reload();});
    topRight.appendChild(btn);
  }
}

async function checkProfileAndShow(user){
  const {data: profile, error} = await supabaseClient.from('profiles').select('full_name, role, is_active').eq('id',user.id).maybeSingle();
  if(error){setAuthMessage('Login berhasil, tetapi profil belum dapat dibaca: '+error.message);return;}
  if(!profile){setAuthMessage('Profil pengguna tidak ditemukan.');return;}
  if(profile.is_active !== true){setAuthMessage('Akun belum aktif.');return;}
  showAuthenticatedUser(profile,user);
}

try {
  if(typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_PUBLISHABLE_KEY === 'undefined' || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.includes('TEMPEL_PUBLISHABLE')) {
    setAuthMessage('Konfigurasi Supabase belum lengkap di supabase-config.js');
  } else if(!window.supabase || !window.supabase.createClient) {
    setAuthMessage('Library Supabase belum dimuat.');
  } else {
    supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    supabaseClient.auth.getSession().then(({data,error})=>{
      if(error){setAuthMessage('Sesi gagal: '+error.message);return;}
      if(data.session) checkProfileAndShow(data.session.user);
    });
  }
} catch(e) { setAuthMessage('Koneksi belum siap: '+e.message); }

document.getElementById('loginForm').addEventListener('submit',async (event)=>{
  event.preventDefault();
  if(!supabaseClient){setAuthMessage('Supabase belum siap.');return;}
  loginButton.disabled=true;loginButton.textContent='Memeriksa...';setAuthMessage('',false);
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  loginButton.disabled=false;loginButton.textContent='Masuk';
  if(error){setAuthMessage('Login gagal: '+error.message);return;}
  await checkProfileAndShow(data.user);
});

