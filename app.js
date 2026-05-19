/* ======================================
   WAYFARER — app.js
   Mappa 3D con Globe.gl, tutto il resto
   identico alla versione Leaflet che funzionava
   ====================================== */

// ── STATO ─────────────────────────────
var places = JSON.parse(localStorage.getItem('wayfarer_places') || '[]');
var selectedPlace = null;
var activeFilter = 'all';
var searchTimeout = null;
var globe = null;

var STATUS_COLOR = {
  visited:  '#52b788',
  lived:    '#e63946',
  wishlist: '#457b9d'
};

// ── UTILS ─────────────────────────────
function save() {
  localStorage.setItem('wayfarer_places', JSON.stringify(places));
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2200);
}

function getColor(status) {
  return STATUS_COLOR[status] || '#c9a84c';
}

// ── GLOBE INIT ─────────────────────────
var container = document.getElementById('globe-container');

globe = Globe()
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
  .atmosphereColor('#3a6fbf')
  .atmosphereAltitude(0.18)
  .pointsData([])
  .pointLat('lat')
  .pointLng('lng')
  .pointColor(function(d) { return getColor(d.status); })
  .pointAltitude(0.025)
  .pointRadius(function(d) { return d.status === 'lived' ? 0.65 : 0.48; })
  .pointsMerge(false)
  .onPointHover(handleHover)
  .onPointClick(handleClick)
  (container);

// Resize
function resizeGlobe() {
  globe.width(window.innerWidth).height(window.innerHeight - 57);
}
resizeGlobe();
window.addEventListener('resize', resizeGlobe);

// Auto-rotate
globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.35;
globe.controls().enableZoom = true;

// ── TOOLTIP ───────────────────────────
var tooltip = document.getElementById('globe-tooltip');

function handleHover(point, coords, evt) {
  if (!point) {
    tooltip.classList.remove('show');
    return;
  }
  tooltip.innerHTML =
    '<div class="tt-city">' + point.city + '</div>' +
    '<div class="tt-country">' + point.country + '</div>' +
    '<span class="tt-badge tt-' + point.status + '">' + point.status + '</span>' +
    (point.notes ? '<div class="tt-notes">' + point.notes + '</div>' : '');

  if (evt) {
    tooltip.style.left = (evt.clientX + 16) + 'px';
    tooltip.style.top  = (evt.clientY - 10) + 'px';
  }
  tooltip.classList.add('show');
}

container.addEventListener('mousemove', function(evt) {
  if (tooltip.classList.contains('show')) {
    tooltip.style.left = (evt.clientX + 16) + 'px';
    tooltip.style.top  = (evt.clientY - 10) + 'px';
  }
});

function handleClick(point) {
  if (!point) return;
  globe.controls().autoRotate = false;
  globe.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.5 }, 800);
}

// ── RENDER GLOBO ──────────────────────
function renderGlobe() {
  var data = activeFilter === 'all'
    ? places
    : places.filter(function(p) { return p.status === activeFilter; });
  globe.pointsData(data);
}

// ── STATS ─────────────────────────────
function updateStats() {
  var countries = {};
  places.forEach(function(p) { countries[p.country] = 1; });
  document.getElementById('stat-cities').textContent   = places.length;
  document.getElementById('stat-countries').textContent = Object.keys(countries).length;
  document.getElementById('stat-visited').textContent   = places.filter(function(p) { return p.status === 'visited' || p.status === 'lived'; }).length;
  document.getElementById('stat-wishlist').textContent  = places.filter(function(p) { return p.status === 'wishlist'; }).length;
}

function renderList() {
  var pl = document.getElementById('places-list');
  pl.innerHTML = '';
  var arr = activeFilter === 'all' ? places : places.filter(function(p) { return p.status === activeFilter; });

  if (!arr.length) {
    pl.innerHTML = '<p style="text-align:center;color:rgba(245,240,232,.3);font-size:13px;padding:20px 0;font-style:italic">No places yet…</p>';
    return;
  }

  arr.forEach(function(p, i) {
    var item = document.createElement('div');
    item.className = 'place-item';
    item.style.animationDelay = (i * 40) + 'ms';
    item.innerHTML =
      '<span class="place-status-dot" style="background:' + getColor(p.status) + '"></span>' +
      '<div class="place-info">' +
        '<div class="place-city">' + p.city + '</div>' +
        '<div class="place-country">' + p.country + ' · <em>' + p.status + '</em></div>' +
      '</div>' +
      '<button class="place-delete" title="Remove">✕</button>';

    item.addEventListener('click', function(e) {
      if (e.target.classList.contains('place-delete')) return;
      globe.controls().autoRotate = false;
      globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.5 }, 900);
    });

    item.querySelector('.place-delete').addEventListener('click', function(e) {
      e.stopPropagation();
      places = places.filter(function(x) { return x.id !== p.id; });
      save(); renderGlobe(); updateStats(); renderList();
      showToast('Place removed');
    });

    pl.appendChild(item);
  });
}

// ── FILTRO ────────────────────────────
document.querySelectorAll('.legend-item').forEach(function(el) {
  el.addEventListener('click', function() {
    document.querySelectorAll('.legend-item').forEach(function(x) { x.classList.remove('active'); });
    el.classList.add('active');
    activeFilter = el.dataset.filter;
    renderGlobe();
    renderList();
  });
});

// ── MODAL ─────────────────────────────
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  globe.controls().autoRotate = false;
  setTimeout(function() { document.getElementById('city-search').focus(); }, 200);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  var ci = document.getElementById('city-search');
  ci.value = '';
  ci.style.display = 'block';
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('selected-place').style.display = 'none';
  selectedPlace = null;
  document.getElementById('place-notes').value = '';
  document.querySelectorAll('input[name="status"]').forEach(function(r) { r.checked = false; });
}

document.getElementById('btn-add').addEventListener('click', openModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ── STATS PANEL ───────────────────────
document.getElementById('btn-stats').addEventListener('click', function() {
  document.getElementById('stats-panel').classList.add('open');
  updateStats();
  renderList();
});
document.getElementById('close-stats').addEventListener('click', function() {
  document.getElementById('stats-panel').classList.remove('open');
});

// ── RICERCA CITTÀ ─────────────────────
document.getElementById('city-search').addEventListener('input', function() {
  clearTimeout(searchTimeout);
  var q = this.value.trim();
  if (q.length < 2) { document.getElementById('search-results').style.display = 'none'; return; }
  searchTimeout = setTimeout(function() { searchCity(q); }, 380);
});

document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-wrapper')) {
    document.getElementById('search-results').style.display = 'none';
  }
});

document.getElementById('clear-selection').addEventListener('click', function() {
  selectedPlace = null;
  document.getElementById('selected-place').style.display = 'none';
  var ci = document.getElementById('city-search');
  ci.style.display = 'block';
  ci.value = '';
  ci.focus();
});

function searchCity(q) {
  var sr = document.getElementById('search-results');
  fetch(
    'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) +
    '&format=json&limit=6&featuretype=city&addressdetails=1&accept-language=en',
    { headers: { 'Accept-Language': 'en' } }
  )
  .then(function(r) { return r.json(); })
  .then(function(data) {
    sr.innerHTML = '';
    if (!data.length) {
      sr.innerHTML = '<div class="search-result-item"><div class="result-city">No results found</div></div>';
      sr.style.display = 'block';
      return;
    }
    data.forEach(function(item) {
      var a       = item.address || {};
      var city    = a.city || a.town || a.village || a.municipality || item.display_name.split(',')[0];
      var state   = a.state   || '';
      var country = a.country || '';
      var label   = state ? state + ', ' + country : country;

      var d = document.createElement('div');
      d.className = 'search-result-item';
      d.innerHTML = '<div class="result-city">' + city + '</div><div class="result-country">' + label + '</div>';
      d.addEventListener('click', function() {
        selectedPlace = { city: city, country: country, state: state, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
        document.getElementById('sel-city').textContent    = city;
        document.getElementById('sel-country').textContent = label;
        document.getElementById('selected-place').style.display = 'flex';
        sr.style.display = 'none';
        document.getElementById('city-search').value = '';
        document.getElementById('city-search').style.display = 'none';
      });
      sr.appendChild(d);
    });
    sr.style.display = 'block';
  })
  .catch(function() {
    sr.innerHTML = '<div class="search-result-item"><div class="result-city">Connection error</div></div>';
    sr.style.display = 'block';
  });
}

// ── SALVA ─────────────────────────────
document.getElementById('btn-save').addEventListener('click', function() {
  if (!selectedPlace) { showToast('Please select a city first'); return; }
  var st = document.querySelector('input[name="status"]:checked');
  if (!st) { showToast('Choose a status first'); return; }
  var dup = places.find(function(p) { return p.city === selectedPlace.city && p.country === selectedPlace.country; });
  if (dup) { showToast(selectedPlace.city + ' is already on your map!'); return; }

  var p = {
    id:      Date.now().toString(),
    city:    selectedPlace.city,
    country: selectedPlace.country,
    state:   selectedPlace.state || '',
    lat:     selectedPlace.lat,
    lng:     selectedPlace.lng,
    status:  st.value,
    notes:   document.getElementById('place-notes').value.trim(),
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
  showToast('✦ ' + p.city + ' added to your map!');
});

// ── INIT ──────────────────────────────
renderGlobe();
updateStats();
