/* ======================================
   WAYFARER — Globe.gl 3D version
   ====================================== */

let places = JSON.parse(localStorage.getItem('wf_places') || '[]');
let sel = null, filter = 'all', stout = null;

// ── COLOR MAP ──────────────────────────
const STATUS_COLOR = {
  visited: '#52b788',
  lived:   '#e63946',
  wishlist: '#457b9d'
};

// ── GLOBE INIT ─────────────────────────
const globeEl = document.getElementById('globe-container');

const globe = Globe()(globeEl)
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
  .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
  .pointsData([])
  .pointLat(d => d.lat)
  .pointLng(d => d.lng)
  .pointColor(d => STATUS_COLOR[d.status])
  .pointAltitude(0.02)
  .pointRadius(d => d.status === 'lived' ? 0.6 : 0.45)
  .pointsMerge(false)
  .onPointHover(handleHover)
  .onPointClick(handleClick)
  .atmosphereColor('#3a6fbf')
  .atmosphereAltitude(0.15);

// Resize
function resizeGlobe() {
  const h = window.innerHeight - 54;
  globe.width(window.innerWidth).height(h);
}
resizeGlobe();
window.addEventListener('resize', resizeGlobe);

// Auto-rotate slow
globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.4;
globe.controls().enableZoom = true;

// ── TOOLTIP ────────────────────────────
const tip = document.getElementById('tip');

function handleHover(point, coords, evt) {
  if (!point) { tip.classList.remove('show'); return; }
  tip.innerHTML = `
    <div class="tip-city">${point.city}</div>
    <div class="tip-country">${point.country}</div>
    <span class="tip-status tip-${point.status}">${point.status}</span>
    ${point.notes ? `<div class="tip-notes">${point.notes}</div>` : ''}
  `;
  tip.style.left = (evt.clientX + 16) + 'px';
  tip.style.top  = (evt.clientY - 10) + 'px';
  tip.classList.add('show');
  globeEl.style.cursor = 'pointer';
}

globeEl.addEventListener('mousemove', evt => {
  if (tip.classList.contains('show')) {
    tip.style.left = (evt.clientX + 16) + 'px';
    tip.style.top  = (evt.clientY - 10) + 'px';
  }
});

function handleClick(point) {
  if (!point) return;
  globe.controls().autoRotate = false;
  globe.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.5 }, 800);
}

// ── RENDER POINTS ──────────────────────
function renderGlobe() {
  const data = filter === 'all'
    ? places
    : places.filter(p => p.status === filter);
  globe.pointsData(data);
}

// ── STATS ──────────────────────────────
function updateStats() {
  const countries = new Set(places.map(p => p.country));
  document.getElementById('s-cities').textContent   = places.length;
  document.getElementById('s-countries').textContent = countries.size;
  document.getElementById('s-visited').textContent   = places.filter(p => p.status === 'visited' || p.status === 'lived').length;
  document.getElementById('s-wish').textContent      = places.filter(p => p.status === 'wishlist').length;
}

function renderList() {
  const pl = document.getElementById('plist');
  pl.innerHTML = '';
  const arr = filter === 'all' ? places : places.filter(p => p.status === filter);
  if (!arr.length) {
    pl.innerHTML = '<p style="text-align:center;color:rgba(245,240,232,.3);font-size:12px;padding:18px 0;font-style:italic">No places yet…</p>';
    return;
  }
  arr.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'pi';
    d.style.animationDelay = `${i * 35}ms`;
    d.innerHTML = `
      <span class="psd" style="background:${STATUS_COLOR[p.status]}"></span>
      <div class="pinfo">
        <div class="pcity">${p.city}</div>
        <div class="pcountry">${p.country} · <em>${p.status}</em></div>
      </div>
      <button class="pdel" data-id="${p.id}">✕</button>
    `;
    d.addEventListener('click', e => {
      if (e.target.classList.contains('pdel')) return;
      globe.controls().autoRotate = false;
      globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.5 }, 900);
    });
    d.querySelector('.pdel').addEventListener('click', e => {
      e.stopPropagation();
      places = places.filter(x => x.id !== p.id);
      save(); renderGlobe(); updateStats(); renderList();
      showToast('Place removed');
    });
    pl.appendChild(d);
  });
}

function save() { localStorage.setItem('wf_places', JSON.stringify(places)); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── FILTER ─────────────────────────────
document.querySelectorAll('.leg-item').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.leg-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    filter = el.dataset.f;
    renderGlobe(); renderList();
  });
});

// ── MODAL ──────────────────────────────
function openModal() {
  document.getElementById('mo').classList.add('open');
  globe.controls().autoRotate = false;
  setTimeout(() => document.getElementById('ci').focus(), 180);
}
function closeModal() {
  document.getElementById('mo').classList.remove('open');
  const ci = document.getElementById('ci');
  ci.value = ''; ci.style.display = 'block';
  document.getElementById('sr').style.display = 'none';
  document.getElementById('selp').style.display = 'none';
  sel = null;
  document.getElementById('notes').value = '';
  document.querySelectorAll('input[name="st"]').forEach(r => r.checked = false);
}
document.getElementById('btn-add').addEventListener('click', openModal);
document.getElementById('mc').addEventListener('click', closeModal);
document.getElementById('mo').addEventListener('click', e => { if (e.target === document.getElementById('mo')) closeModal(); });

// ── STATS PANEL ────────────────────────
document.getElementById('btn-stats').addEventListener('click', () => {
  document.getElementById('panel').classList.add('open');
  updateStats(); renderList();
});
document.getElementById('close-panel').addEventListener('click', () => {
  document.getElementById('panel').classList.remove('open');
});

// ── CITY SEARCH ────────────────────────
document.getElementById('ci').addEventListener('input', () => {
  clearTimeout(stout);
  const q = document.getElementById('ci').value.trim();
  if (q.length < 2) { document.getElementById('sr').style.display = 'none'; return; }
  stout = setTimeout(() => searchCity(q), 350);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.sw')) document.getElementById('sr').style.display = 'none';
});

document.getElementById('cs').addEventListener('click', () => {
  sel = null;
  document.getElementById('selp').style.display = 'none';
  const ci = document.getElementById('ci');
  ci.style.display = 'block'; ci.value = ''; ci.focus();
});

async function searchCity(q) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&featuretype=city&addressdetails=1&accept-language=en`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const sr = document.getElementById('sr');
    sr.innerHTML = '';
    if (!data.length) {
      sr.innerHTML = '<div class="sri"><div class="rc">No results found</div></div>';
      sr.style.display = 'block'; return;
    }
    data.forEach(item => {
      const a = item.address || {};
      const city = a.city || a.town || a.village || a.municipality || item.display_name.split(',')[0];
      const state = a.state || '';
      const country = a.country || '';
      const label = state ? `${state}, ${country}` : country;
      const d = document.createElement('div');
      d.className = 'sri';
      d.innerHTML = `<div class="rc">${city}</div><div class="rco">${label}</div>`;
      d.addEventListener('click', () => {
        sel = { city, country, state, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
        document.getElementById('sel-city').textContent = city;
        document.getElementById('sel-country').textContent = state ? `${state}, ${country}` : country;
        document.getElementById('selp').style.display = 'flex';
        sr.style.display = 'none';
        document.getElementById('ci').value = '';
        document.getElementById('ci').style.display = 'none';
      });
      sr.appendChild(d);
    });
    sr.style.display = 'block';
  } catch (err) {
    document.getElementById('sr').innerHTML = '<div class="sri"><div class="rc">Connection error</div></div>';
    document.getElementById('sr').style.display = 'block';
  }
}

// ── SAVE ───────────────────────────────
document.getElementById('save').addEventListener('click', () => {
  if (!sel) { showToast('Please select a city first'); return; }
  const st = document.querySelector('input[name="st"]:checked');
  if (!st) { showToast('Choose a status first'); return; }
  if (places.find(p => p.city === sel.city && p.country === sel.country)) {
    showToast(`${sel.city} is already on your map!`); return;
  }
  const p = {
    id: Date.now() + '',
    city: sel.city, country: sel.country, state: sel.state || '',
    lat: sel.lat, lng: sel.lng,
    status: st.value,
    notes: document.getElementById('notes').value.trim(),
    addedAt: new Date().toISOString()
  };
  places.push(p); save(); renderGlobe(); updateStats(); renderList();

  // Fly to new point
  globe.controls().autoRotate = false;
  globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.8 }, 1000);

  closeModal();
  showToast(`✦ ${p.city} added to your map!`);
});

// ── INIT ───────────────────────────────
renderGlobe();
updateStats();
