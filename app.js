/* ======================================
   WAYFARER — Globe.gl 3D
   ====================================== */

// ── STATO ─────────────────────────────
let places = JSON.parse(localStorage.getItem('wf_places') || '[]');
let sel = null;
let activeFilter = 'all';
let searchTimer = null;
let globe = null;

const STATUS_COLOR = {
  visited:  '#52b788',
  lived:    '#e63946',
  wishlist: '#457b9d'
};

// ── HELPERS ───────────────────────────
function $(id) { return document.getElementById(id); }
function save() { localStorage.setItem('wf_places', JSON.stringify(places)); }

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── GLOBE SETUP ───────────────────────
function initGlobe() {
  const container = $('globe-container');

  globe = Globe()
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    .atmosphereColor('#3a6fbf')
    .atmosphereAltitude(0.18)
    .pointsData([])
    .pointLat('lat')
    .pointLng('lng')
    .pointColor(d => STATUS_COLOR[d.status] || '#c9a84c')
    .pointAltitude(0.025)
    .pointRadius(d => d.status === 'lived' ? 0.65 : 0.48)
    .pointsMerge(false)
    .onPointHover(onHover)
    .onPointClick(onPointClick)
    (container);

  // Dimensione
  function resize() {
    globe.width(window.innerWidth).height(window.innerHeight - 54);
  }
  resize();
  window.addEventListener('resize', resize);

  // Auto-rotate
  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.35;
  globe.controls().enableZoom = true;
  globe.controls().minDistance = 150;
  globe.controls().maxDistance = 600;
}

// ── TOOLTIP ───────────────────────────
const tip = $('tip') || document.createElement('div');

function onHover(point, _coords, evt) {
  if (!point) {
    tip.classList.remove('show');
    return;
  }
  tip.innerHTML = `
    <div class="tip-city">${point.city}</div>
    <div class="tip-country">${point.country}</div>
    <span class="tip-badge tip-${point.status}">${point.status}</span>
    ${point.notes ? `<div class="tip-notes">${point.notes}</div>` : ''}
  `;
  if (evt) {
    tip.style.left = (evt.clientX + 16) + 'px';
    tip.style.top  = (evt.clientY - 10) + 'px';
  }
  tip.classList.add('show');
}

document.getElementById('globe-container').addEventListener('mousemove', evt => {
  if (tip.classList.contains('show')) {
    tip.style.left = (evt.clientX + 16) + 'px';
    tip.style.top  = (evt.clientY - 10) + 'px';
  }
});

function onPointClick(point) {
  if (!point) return;
  globe.controls().autoRotate = false;
  globe.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.5 }, 800);
}

// ── RENDER ────────────────────────────
function renderGlobe() {
  if (!globe) return;
  const data = activeFilter === 'all'
    ? places
    : places.filter(p => p.status === activeFilter);
  globe.pointsData(data);
}

// ── STATS ─────────────────────────────
function updateStats() {
  const countries = new Set(places.map(p => p.country));
  $('s-cities').textContent    = places.length;
  $('s-countries').textContent = countries.size;
  $('s-visited').textContent   = places.filter(p => p.status === 'visited' || p.status === 'lived').length;
  $('s-wish').textContent      = places.filter(p => p.status === 'wishlist').length;
}

function renderList() {
  const pl = $('plist');
  pl.innerHTML = '';
  const arr = activeFilter === 'all' ? places : places.filter(p => p.status === activeFilter);

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
      <button class="pdel">✕</button>
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

// ── FILTRO ────────────────────────────
document.querySelectorAll('.leg-item').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.leg-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    activeFilter = el.dataset.f;
    renderGlobe();
    renderList();
  });
});

// ── MODAL ─────────────────────────────
function openModal() {
  $('mo').classList.add('open');
  if (globe) globe.controls().autoRotate = false;
  setTimeout(() => $('ci').focus(), 200);
}

function closeModal() {
  $('mo').classList.remove('open');
  const ci = $('ci');
  ci.value = '';
  ci.style.display = 'block';
  $('sr').style.display = 'none';
  $('selp').style.display = 'none';
  sel = null;
  $('notes').value = '';
  document.querySelectorAll('input[name="st"]').forEach(r => r.checked = false);
}

$('btn-add').addEventListener('click', openModal);
$('mc').addEventListener('click', closeModal);
$('mo').addEventListener('click', e => { if (e.target === $('mo')) closeModal(); });

// ── STATS PANEL ───────────────────────
$('btn-stats').addEventListener('click', () => {
  $('panel').classList.add('open');
  updateStats();
  renderList();
});
$('close-panel').addEventListener('click', () => $('panel').classList.remove('open'));

// ── RICERCA CITTÀ ─────────────────────
$('ci').addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = $('ci').value.trim();
  if (q.length < 2) { $('sr').style.display = 'none'; return; }
  searchTimer = setTimeout(() => searchCity(q), 380);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.sw')) $('sr').style.display = 'none';
});

$('cs').addEventListener('click', () => {
  sel = null;
  $('selp').style.display = 'none';
  const ci = $('ci');
  ci.style.display = 'block';
  ci.value = '';
  ci.focus();
});

async function searchCity(q) {
  const sr = $('sr');
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&featuretype=city&addressdetails=1&accept-language=en`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();

    sr.innerHTML = '';
    if (!data.length) {
      sr.innerHTML = '<div class="sri"><div class="rc">No results found</div></div>';
      sr.style.display = 'block';
      return;
    }

    data.forEach(item => {
      const a       = item.address || {};
      const city    = a.city || a.town || a.village || a.municipality || item.display_name.split(',')[0];
      const state   = a.state   || '';
      const country = a.country || '';
      const label   = state ? `${state}, ${country}` : country;

      const d = document.createElement('div');
      d.className = 'sri';
      d.innerHTML = `<div class="rc">${city}</div><div class="rco">${label}</div>`;
      d.addEventListener('click', () => {
        sel = { city, country, state, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
        $('sel-city').textContent    = city;
        $('sel-country').textContent = label;
        $('selp').style.display      = 'flex';
        sr.style.display             = 'none';
        $('ci').value                = '';
        $('ci').style.display        = 'none';
      });
      sr.appendChild(d);
    });
    sr.style.display = 'block';

  } catch (err) {
    sr.innerHTML = '<div class="sri"><div class="rc">Connection error — check internet</div></div>';
    sr.style.display = 'block';
  }
}

// ── SALVA POSTO ───────────────────────
$('save').addEventListener('click', () => {
  if (!sel) { showToast('Please select a city first'); return; }
  const st = document.querySelector('input[name="st"]:checked');
  if (!st)  { showToast('Choose a status first'); return; }
  if (places.find(p => p.city === sel.city && p.country === sel.country)) {
    showToast(`${sel.city} is already on your map!`); return;
  }

  const p = {
    id:      Date.now().toString(),
    city:    sel.city,
    country: sel.country,
    state:   sel.state || '',
    lat:     sel.lat,
    lng:     sel.lng,
    status:  st.value,
    notes:   $('notes').value.trim(),
    addedAt: new Date().toISOString()
  };

  places.push(p);
  save();
  renderGlobe();
  updateStats();
  renderList();

  globe.controls().autoRotate = false;
  globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.8 }, 1000);

  closeModal();
  showToast(`✦ ${p.city} added to your map!`);
});

// ── AVVIO ─────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initGlobe();
  renderGlobe();
  updateStats();
});
