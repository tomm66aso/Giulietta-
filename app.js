/* ======================================
   WAYFARER — App Logic
   ====================================== */

// ── STATE ──────────────────────────────
let places = JSON.parse(localStorage.getItem('wayfarer_places') || '[]');
let selectedPlace = null;
let activeFilter = 'all';
let markers = {};
let searchTimeout = null;

// ── MAP INIT ──────────────────────────
const map = L.map('map', {
  center: [20, 10],
  zoom: 2.5,
  zoomControl: false,
  attributionControl: true
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com">CARTO</a>',
  maxZoom: 19
}).addTo(map);

L.control.zoom({ position: 'topright' }).addTo(map);

// ── DOM REFS ──────────────────────────
const btnAdd       = document.getElementById('btn-add');
const btnStats     = document.getElementById('btn-stats');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose   = document.getElementById('modal-close');
const statsPanel   = document.getElementById('stats-panel');
const closeStats   = document.getElementById('close-stats');
const citySearch   = document.getElementById('city-search');
const searchResults= document.getElementById('search-results');
const selectedEl   = document.getElementById('selected-place');
const selCity      = document.getElementById('sel-city');
const selCountry   = document.getElementById('sel-country');
const clearSel     = document.getElementById('clear-selection');
const btnSave      = document.getElementById('btn-save');
const placesList   = document.getElementById('places-list');
const toast        = document.getElementById('toast');
const legendItems  = document.querySelectorAll('.legend-item');

// Stats
const statCities   = document.getElementById('stat-cities');
const statCountries= document.getElementById('stat-countries');
const statVisited  = document.getElementById('stat-visited');
const statWishlist = document.getElementById('stat-wishlist');

// ── UTILS ─────────────────────────────
function save() {
  localStorage.setItem('wayfarer_places', JSON.stringify(places));
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function getStatusColor(status) {
  return { visited: '#52b788', lived: '#e63946', wishlist: '#457b9d' }[status] || '#c9a84c';
}

function createMarkerIcon(status) {
  return L.divIcon({
    className: '',
    html: `<div class="custom-marker marker-${status}"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30]
  });
}

// ── MARKERS ───────────────────────────
function addMarker(place) {
  const icon = createMarkerIcon(place.status);
  const m = L.marker([place.lat, place.lng], { icon }).addTo(map);
  m.bindPopup(`
    <div class="popup-city">${place.city}</div>
    <div class="popup-country">${place.country}</div>
    <span class="popup-status popup-${place.status}">${place.status}</span>
    ${place.notes ? `<div class="popup-notes">${place.notes}</div>` : ''}
  `);
  markers[place.id] = m;
}

function removeMarker(id) {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
}

function refreshMarkers() {
  // Clear all
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  // Re-add filtered
  places.forEach(p => {
    if (activeFilter === 'all' || p.status === activeFilter) {
      addMarker(p);
    }
  });
}

// ── STATS ─────────────────────────────
function updateStats() {
  const countries = new Set(places.map(p => p.country));
  statCities.textContent   = places.length;
  statCountries.textContent= countries.size;
  statVisited.textContent  = places.filter(p => p.status === 'visited' || p.status === 'lived').length;
  statWishlist.textContent = places.filter(p => p.status === 'wishlist').length;
}

function renderList() {
  placesList.innerHTML = '';
  const filtered = activeFilter === 'all' ? places : places.filter(p => p.status === activeFilter);

  if (filtered.length === 0) {
    placesList.innerHTML = `<p style="text-align:center; color:#9a8e84; font-size:13px; padding:20px 0; font-style:italic;">No places yet…</p>`;
    return;
  }

  filtered.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = 'place-item';
    item.style.animationDelay = `${i * 40}ms`;
    item.innerHTML = `
      <span class="place-status-dot" style="background:${getStatusColor(p.status)}"></span>
      <div class="place-info">
        <div class="place-city">${p.city}</div>
        <div class="place-country">${p.country} · <em>${p.status}</em></div>
      </div>
      <button class="place-delete" data-id="${p.id}" title="Remove">✕</button>
    `;
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('place-delete')) return;
      map.flyTo([p.lat, p.lng], 8, { duration: 1.2 });
      if (markers[p.id]) markers[p.id].openPopup();
    });
    item.querySelector('.place-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePlace(p.id);
    });
    placesList.appendChild(item);
  });
}

function deletePlace(id) {
  places = places.filter(p => p.id !== id);
  save();
  removeMarker(id);
  updateStats();
  renderList();
  showToast('Place removed');
}

// ── SEARCH (Nominatim) ────────────────
async function searchCities(query) {
  if (query.length < 2) { searchResults.innerHTML = ''; searchResults.style.display = 'none'; return; }
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&featuretype=city&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();

    if (!data.length) {
      searchResults.innerHTML = `<div class="search-result-item"><div class="result-city">No results found</div></div>`;
      searchResults.style.display = 'block';
      return;
    }

    searchResults.innerHTML = '';
    data.forEach(item => {
      const addr = item.address || {};
      const city = addr.city || addr.town || addr.village || addr.municipality || item.display_name.split(',')[0];
      const state = addr.state || '';
      const country = addr.country || '';
      const label = state ? `${state}, ${country}` : country;

      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = `
        <div class="result-city">${city}</div>
        <div class="result-country">${label}</div>
      `;
      div.addEventListener('click', () => {
        selectPlace({ city, country, state: addr.state || '', lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
      });
      searchResults.appendChild(div);
    });
    searchResults.style.display = 'block';
  } catch (err) {
    console.error(err);
    searchResults.innerHTML = `<div class="search-result-item"><div class="result-city">Error searching. Check connection.</div></div>`;
    searchResults.style.display = 'block';
  }
}

function selectPlace(data) {
  selectedPlace = data;
  selCity.textContent = data.city;
  selCountry.textContent = data.state ? `${data.state}, ${data.country}` : data.country;
  selectedEl.style.display = 'flex';
  searchResults.style.display = 'none';
  citySearch.value = '';
  citySearch.style.display = 'none';
}

function clearSelection() {
  selectedPlace = null;
  selectedEl.style.display = 'none';
  citySearch.style.display = 'block';
  citySearch.value = '';
  citySearch.focus();
}

// ── FILTER ────────────────────────────
legendItems.forEach(item => {
  item.addEventListener('click', () => {
    legendItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    activeFilter = item.dataset.filter;
    refreshMarkers();
    renderList();
  });
});
document.querySelector('[data-filter="all"]').classList.add('active');

// ── MODAL ─────────────────────────────
function openModal() {
  modalOverlay.classList.add('open');
  setTimeout(() => citySearch.focus(), 200);
}

function closeModal() {
  modalOverlay.classList.remove('open');
  citySearch.value = '';
  citySearch.style.display = 'block';
  searchResults.innerHTML = '';
  searchResults.style.display = 'none';
  selectedEl.style.display = 'none';
  selectedPlace = null;
  document.getElementById('place-notes').value = '';
  document.querySelectorAll('input[name="status"]').forEach(r => r.checked = false);
}

btnAdd.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

// ── STATS PANEL ───────────────────────
btnStats.addEventListener('click', () => {
  statsPanel.classList.add('open');
  updateStats();
  renderList();
});
closeStats.addEventListener('click', () => statsPanel.classList.remove('open'));

// ── SEARCH INPUT ──────────────────────
citySearch.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = citySearch.value.trim();
  if (q.length < 2) { searchResults.style.display = 'none'; return; }
  searchTimeout = setTimeout(() => searchCities(q), 350);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrapper')) {
    searchResults.style.display = 'none';
  }
});

clearSel.addEventListener('click', clearSelection);

// ── SAVE ──────────────────────────────
btnSave.addEventListener('click', () => {
  if (!selectedPlace) { showToast('Please select a city first'); return; }
  const statusInput = document.querySelector('input[name="status"]:checked');
  if (!statusInput) { showToast('Choose a status (visited, lived, wishlist)'); return; }
  const notes = document.getElementById('place-notes').value.trim();

  // Check duplicate
  const exists = places.find(p => p.city === selectedPlace.city && p.country === selectedPlace.country);
  if (exists) { showToast(`${selectedPlace.city} is already on your map!`); return; }

  const place = {
    id: Date.now().toString(),
    city: selectedPlace.city,
    country: selectedPlace.country,
    state: selectedPlace.state || '',
    lat: selectedPlace.lat,
    lng: selectedPlace.lng,
    status: statusInput.value,
    notes,
    addedAt: new Date().toISOString()
  };

  places.push(place);
  save();
  addMarker(place);
  updateStats();
  renderList();

  map.flyTo([place.lat, place.lng], 7, { duration: 1.4 });
  setTimeout(() => { if (markers[place.id]) markers[place.id].openPopup(); }, 1500);

  closeModal();
  showToast(`✦ ${place.city} added to your map!`);
});

// ── INIT ──────────────────────────────
(function init() {
  places.forEach(p => addMarker(p));
  updateStats();
})();
