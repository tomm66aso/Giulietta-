let places = JSON.parse(localStorage.getItem('wf_places')||'[]');
let sel = null, filter = 'all', markers = {}, stout = null;

const map = L.map('map',{center:[20,10],zoom:2.3,zoomControl:false});
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{attribution:'&copy; CARTO',maxZoom:19}).addTo(map);
L.control.zoom({position:'topright'}).addTo(map);

const $ = id => document.getElementById(id);

function save(){ localStorage.setItem('wf_places',JSON.stringify(places)); }

function showToast(msg){
  const t=$('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

function color(s){ return {visited:'#52b788',lived:'#e63946',wishlist:'#457b9d'}[s]||'#c9a84c'; }

function mkIcon(s){
  const cls = s==='visited'?'mv':s==='lived'?'ml':'mw';
  return L.divIcon({className:'',html:`<div class="cm ${cls}"></div>`,iconSize:[26,26],iconAnchor:[13,26],popupAnchor:[0,-28]});
}

function addMark(p){
  const m = L.marker([p.lat,p.lng],{icon:mkIcon(p.status)}).addTo(map);
  m.bindPopup(`<div class="popc">${p.city}</div><div class="popco">${p.country}</div><span class="pops pop-${p.status}">${p.status}</span>${p.notes?`<div class="popn">${p.notes}</div>`:''}`);
  markers[p.id]=m;
}

function rmMark(id){ if(markers[id]){map.removeLayer(markers[id]);delete markers[id];} }

function refreshMarks(){
  Object.values(markers).forEach(m=>map.removeLayer(m)); markers={};
  places.forEach(p=>{ if(filter==='all'||p.status===filter) addMark(p); });
}

function updateStats(){
  const c=new Set(places.map(p=>p.country));
  $('s-cities').textContent=places.length;
  $('s-countries').textContent=c.size;
  $('s-visited').textContent=places.filter(p=>p.status==='visited'||p.status==='lived').length;
  $('s-wish').textContent=places.filter(p=>p.status==='wishlist').length;
}

function renderList(){
  const pl=$('plist'); pl.innerHTML='';
  const arr=filter==='all'?places:places.filter(p=>p.status===filter);
  if(!arr.length){pl.innerHTML='<p style="text-align:center;color:#9a8e84;font-size:12px;padding:18px 0;font-style:italic">No places yet…</p>';return;}
  arr.forEach((p,i)=>{
    const d=document.createElement('div'); d.className='pi'; d.style.animationDelay=`${i*35}ms`;
    d.innerHTML=`<span class="psd" style="background:${color(p.status)}"></span><div class="pinfo"><div class="pcity">${p.city}</div><div class="pcountry">${p.country} · <em>${p.status}</em></div></div><button class="pdel" data-id="${p.id}">✕</button>`;
    d.addEventListener('click',e=>{
      if(e.target.classList.contains('pdel'))return;
      map.flyTo([p.lat,p.lng],8,{duration:1.2});
      if(markers[p.id]) markers[p.id].openPopup();
    });
    d.querySelector('.pdel').addEventListener('click',e=>{
      e.stopPropagation();
      places=places.filter(x=>x.id!==p.id); save(); rmMark(p.id); updateStats(); renderList(); showToast('Place removed');
    });
    pl.appendChild(d);
  });
}

// Filter legend
document.querySelectorAll('.leg-item').forEach(el=>{
  el.addEventListener('click',()=>{
    document.querySelectorAll('.leg-item').forEach(x=>x.classList.remove('active'));
    el.classList.add('active'); filter=el.dataset.f; refreshMarks(); renderList();
  });
});

// Modal
function openModal(){ $('mo').classList.add('open'); setTimeout(()=>$('ci').focus(),180); }
function closeModal(){
  $('mo').classList.remove('open');
  $('ci').value=''; $('ci').style.display='block';
  $('sr').style.display='none'; $('selp').style.display='none'; sel=null;
  $('notes').value=''; document.querySelectorAll('input[name="st"]').forEach(r=>r.checked=false);
}
$('btn-add').addEventListener('click',openModal);
$('mc').addEventListener('click',closeModal);
$('mo').addEventListener('click',e=>{ if(e.target===$('mo')) closeModal(); });

// Stats panel
$('btn-stats').addEventListener('click',()=>{ $('panel').classList.add('open'); updateStats(); renderList(); });
$('close-panel').addEventListener('click',()=>$('panel').classList.remove('open'));

// City search
$('ci').addEventListener('input',()=>{
  clearTimeout(stout);
  const q=$('ci').value.trim();
  if(q.length<2){$('sr').style.display='none';return;}
  stout=setTimeout(()=>searchCity(q),350);
});
document.addEventListener('click',e=>{ if(!e.target.closest('.sw')) $('sr').style.display='none'; });
$('cs').addEventListener('click',()=>{ sel=null; $('selp').style.display='none'; $('ci').style.display='block'; $('ci').value=''; $('ci').focus(); });

async function searchCity(q){
  try{
    const res=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&featuretype=city&addressdetails=1&accept-language=en`,{headers:{'Accept-Language':'en'}});
    const data=await res.json();
    const sr=$('sr'); sr.innerHTML='';
    if(!data.length){ sr.innerHTML='<div class="sri"><div class="rc">No results found</div></div>'; sr.style.display='block'; return; }
    data.forEach(item=>{
      const a=item.address||{};
      const city=a.city||a.town||a.village||a.municipality||item.display_name.split(',')[0];
      const state=a.state||''; const country=a.country||'';
      const label=state?`${state}, ${country}`:country;
      const d=document.createElement('div'); d.className='sri';
      d.innerHTML=`<div class="rc">${city}</div><div class="rco">${label}</div>`;
      d.addEventListener('click',()=>{
        sel={city,country,state,lat:parseFloat(item.lat),lng:parseFloat(item.lon)};
        $('sel-city').textContent=city;
        $('sel-country').textContent=state?`${state}, ${country}`:country;
        $('selp').style.display='flex'; sr.style.display='none'; $('ci').value=''; $('ci').style.display='none';
      });
      sr.appendChild(d);
    });
    sr.style.display='block';
  }catch(err){
    $('sr').innerHTML='<div class="sri"><div class="rc">Connection error</div></div>'; $('sr').style.display='block';
  }
}

// Save
$('save').addEventListener('click',()=>{
  if(!sel){ showToast('Please select a city first'); return; }
  const st=document.querySelector('input[name="st"]:checked');
  if(!st){ showToast('Choose a status first'); return; }
  if(places.find(p=>p.city===sel.city&&p.country===sel.country)){ showToast(`${sel.city} is already on your map!`); return; }
  const p={id:Date.now()+'',city:sel.city,country:sel.country,state:sel.state||'',lat:sel.lat,lng:sel.lng,status:st.value,notes:$('notes').value.trim(),addedAt:new Date().toISOString()};
  places.push(p); save(); addMark(p); updateStats(); renderList();
  map.flyTo([p.lat,p.lng],7,{duration:1.3});
  setTimeout(()=>{ if(markers[p.id]) markers[p.id].openPopup(); },1400);
  closeModal(); showToast(`✦ ${p.city} added to your map!`);
});

// Init
places.forEach(p=>addMark(p)); updateStats();
