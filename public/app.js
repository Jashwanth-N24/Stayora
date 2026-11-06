/**
 * STAYORA — BOUTIQUE DISCOVERY & BOOKING DEMO
 * Project Expo 2026 Edition
 * Engineering: David Hooker's Seven Principles (Architectural foundation)
 */

const $ = s => document.querySelector(s);
const app = $('#app');
const overlay = $('#overlay');

let token = localStorage.getItem('stayora_token') || '';
let me = JSON.parse(localStorage.getItem('stayora_user') || 'null');
let currentView = 'explore';
let wishlistCount = 0;

// Escape HTML utility (Secure, clean output)
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// API Client Helper
async function api(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const r = await fetch('/api' + url, {
    ...opts,
    headers,
    body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.error?.message || 'Request failed. Please check inputs.');
  return data;
}

// Toast notification
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast';
  setTimeout(() => el.className = '', 3400);
}

// Session state management
function setUser(d) {
  token = d.token;
  me = d.user;
  localStorage.setItem('stayora_token', token);
  localStorage.setItem('stayora_user', JSON.stringify(me));
  updateUserUI();
  updateWishlistBadge();
}

function clearUser() {
  token = '';
  me = null;
  localStorage.removeItem('stayora_token');
  localStorage.removeItem('stayora_user');
  updateUserUI();
  updateWishlistBadge();
}

function updateUserUI() {
  const accountBtn = $('#accountBtn');
  const chatLaunch = $('#chatLaunch');
  if (!accountBtn) return;

  if (me) {
    accountBtn.innerHTML = `<span>👤</span> ${esc(me.name.split(' ')[0])} (${me.role})`;
    if (chatLaunch) chatLaunch.style.display = (me.role === 'user' || !me.role) ? 'flex' : 'none';
  } else {
    accountBtn.textContent = 'Sign in';
    if (chatLaunch) chatLaunch.style.display = 'flex';
  }

  // Update Expo buttons active state
  document.querySelectorAll('.expo-btn').forEach(btn => btn.classList.remove('active-role'));
  if (me) {
    if (me.role === 'user') $('#expoUserBtn')?.classList.add('active-role');
    if (me.role === 'manager') $('#expoManagerBtn')?.classList.add('active-role');
    if (me.role === 'admin') $('#expoAdminBtn')?.classList.add('active-role');
  }
}

// Modal dialog system
function modal(html, size = 'normal') {
  const sizeClass = size === 'small' ? 'small-modal' : size === 'wide' ? 'wide-modal' : '';
  overlay.innerHTML = `
    <div class="modal-shade" role="dialog" aria-modal="true">
      <div class="modal ${sizeClass}">
        <button class="close" aria-label="Close modal">×</button>
        ${html}
      </div>
    </div>`;

  overlay.querySelector('.close').onclick = () => overlay.innerHTML = '';
  overlay.querySelector('.modal-shade').onclick = e => {
    if (e.target.classList.contains('modal-shade')) overlay.innerHTML = '';
  };
}

// Image and icon helpers
function imageFor(h) {
  return h.images?.[0] || '';
}

const amenityIcons = {
  wifi: '📶', pool: '🏊', parking: '🚗', ac: '❄️', breakfast: '☕', gym: '🏋️'
};

function amenityLabel(s) {
  const icon = amenityIcons[String(s).toLowerCase()] || '✳';
  return `${icon} ${String(s).replace(/^./, c => c.toUpperCase())}`;
}

// Wishlist Badge Counter
async function updateWishlistBadge() {
  const badge = $('#wishlistBadge');
  if (!badge) return;
  if (!token || !me || me.role !== 'user') {
    badge.textContent = '0';
    return;
  }
  try {
    const d = await api('/wishlist');
    wishlistCount = d.hotels?.length || 0;
    badge.textContent = wishlistCount;
  } catch {
    badge.textContent = '0';
  }
}

// ==========================================================================
// EXPO ROLE SWITCHER WITH PASSWORD AUTHENTICATION
// ==========================================================================
const demoLogins = {
  user: { email: 'user@stayora.com', password: 'User@123', label: 'Traveller (Aarav Shah)' },
  manager: { email: 'manager@stayora.com', password: 'Manager@123', label: 'Hotel Partner (Mira Sen)' },
  admin: { email: 'admin@stayora.com', password: 'Admin@123', label: 'Platform Admin' }
};

function switchUserWithPasswordModal(role) {
  const creds = demoLogins[role] || demoLogins.user;
  modal(`
    <div style="text-align:center;margin-bottom:14px;">
      <img src="/stayora-logo.jpg" alt="Stayora" style="height:48px;mix-blend-mode:multiply;margin-bottom:8px;">
      <span class="eyebrow" style="display:block;">SECURITY AUTHENTICATION</span>
      <h2 style="font-size:24px;margin:4px 0;">Switch to ${esc(creds.label)}</h2>
      <p style="font-size:13px;margin:0 0 12px 0;">Please enter password to authenticate as <b>${esc(creds.email)}</b></p>
    </div>

    <div style="background:#FFFDF5;border:1px dashed #E5A11D;border-radius:var(--radius-sm);padding:8px 12px;font-size:11px;color:#8C5405;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <span>Account: <code>${esc(creds.email)}</code></span>
      <span>Demo Key: <code>${esc(creds.password)}</code></span>
    </div>

    <form id="switchAuthForm">
      <input type="hidden" name="email" value="${esc(creds.email)}">
      <input type="hidden" name="role" value="${esc(role)}">
      <label>Enter Password for ${esc(creds.label)}
        <input type="password" name="password" id="switchPwInput" placeholder="Enter password" required autofocus autocomplete="current-password">
      </label>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button type="submit" class="primary" style="flex:1;" id="switchConfirmBtn">
          Verify & Sign In ↗
        </button>
        <button type="button" class="action" onclick="window.location.href='/login.html?role=${role}'">
          Full Login Page
        </button>
      </div>
    </form>
  `, 'small');

  setTimeout(() => $('#switchPwInput')?.focus(), 80);

  $('#switchAuthForm').onsubmit = async e => {
    e.preventDefault();
    const btn = $('#switchConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    const pw = $('#switchPwInput').value;
    try {
      const d = await api('/auth/login', {
        method: 'POST',
        body: { email: creds.email, password: pw, role }
      });
      setUser(d);
      overlay.innerHTML = '';
      toast(`Verified! Signed in as ${creds.label}`);
      if (role === 'user') {
        loadHotels();
      } else {
        dashboard();
      }
    } catch (err) {
      toast(err.message || 'Incorrect password');
      btn.disabled = false;
      btn.textContent = 'Verify & Sign In ↗';
      $('#switchPwInput').select();
    }
  };
}

// ==========================================================================
// DUAL-LAYER PHOTO GUARD & ANTI-FRAUD INSPECTOR
// ==========================================================================
function showPhotoGuardTech() {
  modal(`
    <span class="eyebrow">INNOVATION & FRAUD PREVENTION</span>
    <h2>Stayora Dual-Layer Photo Shield</h2>
    <p>A major vulnerability in modern travel aggregators is photo theft: bad actors upload existing hotel photography to fake listings. Stayora stops this at the upload boundary.</p>

    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;margin:20px 0;">
      <h4 style="font-family:var(--font-serif);margin:0 0 10px 0;">How the Defense Pipeline Works:</h4>
      <ol style="font-size:13px;line-height:1.7;margin:0;padding-left:20px;color:var(--ink-secondary);">
        <li><b>Sanitization & Multer Guard:</b> File type whitelist (JPEG, PNG, WebP) and 5 MB strict limit.</li>
        <li><b>SHA-256 Bit-Exact Check:</b> Calculates cryptographic SHA-256 digest. Identical re-uploads are rejected immediately with HTTP 409.</li>
        <li><b>Sharp 9×8 Grayscale Normalization:</b> Sharp decodes the image, strips metadata, converts to grayscale, and resizes to 9×8 pixels (72 total pixels).</li>
        <li><b>64-bit Difference Hash (dHash):</b> Compares adjacent horizontal pixel brightness (is pixel X &gt; pixel X+1?). Produces a 64-bit binary fingerprint represented as a 16-character hex string.</li>
        <li><b>Hamming Distance Comparison:</b> Bitwise XOR calculates differing bits against all registered images. If Hamming distance is <b>≤ 5 bits</b>, the image is classified as a perceptual duplicate and automatically rejected.</li>
      </ol>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;font-size:12px;">
        <strong style="color:var(--red);">Exact Hash (SHA-256)</strong>
        <p class="muted" style="margin:4px 0 0 0;">Catches exact file duplicates down to the byte.</p>
      </div>
      <div style="flex:1;min-width:200px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;font-size:12px;">
        <strong style="color:var(--green);">Perceptual dHash (64-bit)</strong>
        <p class="muted" style="margin:4px 0 0 0;">Catches cropped, compressed, or slightly edited re-uploads.</p>
      </div>
      <div style="flex:1;min-width:200px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;font-size:12px;">
        <strong style="color:var(--amber);">Human-in-the-Loop</strong>
        <p class="muted" style="margin:4px 0 0 0;">Admin verification queue ensures manual audit before publication.</p>
      </div>
    </div>
  `, 'wide');
}

// ==========================================================================
// HOTEL DISCOVERY & RENDERING
// ==========================================================================
let debounceTimer;

async function loadHotels() {
  currentView = 'explore';
  const c = $('#city')?.value.trim() || '';
  const ci = $('#checkin')?.value || '';
  const co = $('#checkout')?.value || '';
  const g = $('#guests')?.value || '1';
  const mp = $('#maxPrice')?.value || '';
  const rat = $('#minRating')?.value || '';
  const rt = $('#roomType')?.value || '';
  const sort = $('#sort')?.value || 'rating';
  const am = [...document.querySelectorAll('.checks input:checked')].map(x => x.value);

  const q = new URLSearchParams();
  if (c) q.set('city', c);
  if (ci) q.set('check_in', ci);
  if (co) q.set('check_out', co);
  q.set('guests', g);
  if (mp) q.set('max_price', mp);
  if (rat) q.set('rating', rat);
  if (rt) q.set('room_type', rt);
  if (am.length) q.set('amenities', am.join(','));
  q.set('sort', sort);

  try {
    const d = await api('/hotels?' + q);
    renderSpotlight(d.hotels);
    renderCards(d.hotels);
    const resultsTitle = $('#resultsTitle');
    const resultCount = $('#resultCount');
    if (resultsTitle) resultsTitle.textContent = c ? `Stays in ${c}` : 'Stays worth the journey';
    if (resultCount) resultCount.textContent = `${d.total} ${d.total === 1 ? 'stay' : 'stays'} available`;
  } catch (e) {
    toast(e.message);
  }
}

// Render the Promoted / Sponsored Spotlight Banner as an Advertisement
function renderSpotlight(hotels) {
  const container = $('#spotlightContainer');
  if (!container) return;

  const promoted = hotels.find(h => h.is_promoted);
  if (!promoted) {
    container.innerHTML = '';
    return;
  }

  const minPrice = Math.min(...promoted.rooms.map(r => r.price));
  container.innerHTML = `
    <article class="spotlight-card" data-hotel="${promoted.id}">
      <div class="spotlight-photo">
        ${imageFor(promoted)
          ? `<img src="${esc(imageFor(promoted))}" alt="${esc(promoted.name)}">`
          : `<div class="photo-placeholder" style="background:#8C5405;">${esc(promoted.city)}</div>`
        }
        <span class="spotlight-badge">📢 ADVERTISEMENT</span>
      </div>
      <div class="spotlight-body">
        <span class="spotlight-eyebrow">FEATURED ADVERTISEMENT · ${esc(promoted.city)}</span>
        <h3>${esc(promoted.name)}</h3>
        <span class="spotlight-city">📍 ${esc(promoted.address)} · ★ ${promoted.rating?.rating || '5.0'} (${promoted.rating?.count || 1} reviews)</span>
        <div class="spotlight-tagline">${esc(promoted.ad_tagline || '🌟 Featured Advertisement: Special direct booking rates with complimentary breakfast')}</div>
        <div class="spotlight-foot">
          <div class="spotlight-price">
            ₹${minPrice.toLocaleString('en-IN')} <small>/ night</small>
          </div>
          <button class="spotlight-btn" data-id="${promoted.id}">
            <span>View Advertised Stay</span> ↗
          </button>
        </div>
      </div>
    </article>
  `;

  container.querySelector('.spotlight-card').onclick = () => {
    showHotel(promoted.id);
  };
}

function renderCards(hotels) {
  const node = $('#cards');
  if (!node) return;
  if (!hotels?.length) {
    node.innerHTML = `
      <div class="empty">
        <h3 style="font-family:var(--font-serif);margin-bottom:8px;">No stays match your criteria</h3>
        <p style="margin-bottom:16px;">Try expanding your budget, selecting fewer amenities, or exploring another destination.</p>
        <button class="primary" onclick="$('#clearFilters').click()">Reset all filters</button>
      </div>`;
    return;
  }

  node.innerHTML = hotels.map(h => {
    const minPrice = Math.min(...h.rooms.map(r => r.price));
    const isPromoted = Boolean(h.is_promoted);
    return `
      <article class="hotel-card ${isPromoted ? 'promoted' : ''}" data-hotel="${h.id}">
        <div class="photo">
          ${imageFor(h)
            ? `<img src="${esc(imageFor(h))}" alt="${esc(h.name)}" loading="lazy">`
            : `<div class="photo-placeholder" style="background:${['#B76E55','#5F8274','#BB9563','#68879B'][h.id % 4]}">${esc(h.city)}</div>`
          }
          <div class="card-badges">
            ${isPromoted ? `<span class="promoted-pill">📢 ADVERTISEMENT</span>` : ''}
            <span class="verified-pill">✓ Verified Stay</span>
          </div>
          <button class="heart" data-save="${h.id}" aria-label="Save to favourites">♡</button>
        </div>
        <div class="card-body">
          <div class="card-top">
            <div>
              <h3>${esc(h.name)}</h3>
              <span class="card-city">📍 ${esc(h.city)}</span>
            </div>
            <span class="rating">
              <span class="rating-star">★</span> ${h.rating?.rating || 'New'}
              <span style="color:var(--muted);font-weight:400;">(${h.rating?.count || 0})</span>
            </span>
          </div>
          ${isPromoted && h.ad_tagline ? `<div class="card-tagline"><b>Advertisement:</b> ${esc(h.ad_tagline)}</div>` : ''}
          <p class="card-desc">${esc(h.description)}</p>
          <div class="amenities">
            ${h.amenities.slice(0, 3).map(a => `<span class="chip">${esc(amenityLabel(a))}</span>`).join('')}
            ${h.amenities.length > 3 ? `<span class="chip">+${h.amenities.length - 3}</span>` : ''}
          </div>
          <div class="card-foot">
            <span class="price">₹${minPrice.toLocaleString('en-IN')} <small>/ night</small></span>
            <span style="font-size:12px;color:var(--muted);font-weight:500;">${h.rooms.length} room tier${h.rooms.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');

  node.querySelectorAll('.hotel-card').forEach(card => {
    card.onclick = e => {
      if (e.target.closest('[data-save]')) return;
      showHotel(card.dataset.hotel);
    };
  });

  node.querySelectorAll('[data-save]').forEach(b => {
    b.onclick = e => {
      e.stopPropagation();
      saveHotel(b.dataset.save);
    };
  });
}

async function saveHotel(id) {
  if (!me) {
    loginModal('user');
    return;
  }
  try {
    const d = await api('/wishlist/' + id, { method: 'POST' });
    toast(d.saved ? '❤️ Added to your saved collection' : 'Removed from your saved collection');
    updateWishlistBadge();
  } catch (e) {
    toast(e.message);
  }
}

// ==========================================================================
// HOTEL DETAILS VIEW
// ==========================================================================
async function showHotel(id) {
  try {
    const { hotel: h, reviews } = await api('/hotels/' + id);
    modal(`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <span class="eyebrow">${esc(h.city)} · STAYORA VERIFIED COLLECTION</span>
          <h2 style="font-size:32px;margin:4px 0 6px 0;">${esc(h.name)}</h2>
          <p style="margin:0;font-size:13px;color:var(--muted);">📍 ${esc(h.address)} · Licence: <code>${esc(h.license_no)}</code></p>
        </div>
        <div style="text-align:right;">
          <span class="rating" style="font-size:14px;padding:6px 10px;">
            <span class="rating-star">★</span> ${h.rating?.rating || 'New'} (${h.rating?.count || 0} reviews)
          </span>
        </div>
      </div>

      <div class="detail-gallery">
        ${[0, 1, 2].map(i => h.images[i]
          ? `<img src="${esc(h.images[i])}" alt="${esc(h.name)} photo ${i + 1}">`
          : `<div class="photo-placeholder" style="background:#B78F6C">${esc(h.city)}</div>`
        ).join('')}
      </div>

      ${h.is_promoted && h.ad_tagline ? `
        <div style="background:#FFFDF5;border:1.5px solid #E5A11D;border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:22px;">★</span>
          <div>
            <strong style="color:#8C5405;font-size:13px;">Featured Partner Promotion:</strong>
            <p style="margin:2px 0 0 0;font-size:13px;font-style:italic;color:var(--ink);">${esc(h.ad_tagline)}</p>
          </div>
        </div>
      ` : ''}

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;">🛡️</span>
        <div style="font-size:12px;color:var(--ink-secondary);">
          <strong>Stayora Photo Shield Certified</strong><br>
          Images verified for perceptual uniqueness (SHA-256 + 64-bit dHash). Contact: ${esc(h.phone)} | ${esc(h.email)}
        </div>
      </div>

      <p style="font-size:15px;line-height:1.7;color:var(--ink-secondary);">${esc(h.description)}</p>

      <h4 style="font-family:var(--font-serif);font-size:18px;margin:24px 0 10px 0;">Property Amenities</h4>
      <div class="amenities" style="margin-bottom:28px;">
        ${h.amenities.map(a => `<span class="chip" style="font-size:12px;padding:6px 12px;">${esc(amenityLabel(a))}</span>`).join('')}
      </div>

      <h3 style="font-family:var(--font-serif);font-size:22px;margin:28px 0 14px 0;border-top:1px solid var(--border-light);padding-top:20px;">
        Available Room Tiers
      </h3>
      <div>
        ${h.rooms.map(r => `
          <div class="room-row">
            <div>
              <strong style="font-size:16px;">${esc(r.type)}</strong>
              <div class="muted" style="margin-top:2px;">
                Sleeps up to ${r.capacity} guests · ${r.quantity} rooms available
              </div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:18px;font-weight:700;">₹${Number(r.price).toLocaleString('en-IN')}</span>
              <small class="muted" style="display:block;">/ night</small>
            </div>
            <button class="primary book-room" data-room="${r.id}" data-capacity="${r.capacity}" data-price="${r.price}" data-name="${esc(h.name)}" data-type="${esc(r.type)}" style="padding:10px 18px;font-size:13px;">
              Select & Book ↗
            </button>
          </div>
        `).join('')}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:32px;border-top:1px solid var(--border-light);padding-top:20px;">
        <h3 style="font-family:var(--font-serif);font-size:20px;margin:0;">
          Verified Guest Reviews (${reviews.length})
        </h3>
        <span style="font-size:14px;font-weight:700;color:#E5A11D;">
          ★ ${h.rating?.rating || 'New'} <small style="color:var(--muted);font-weight:400;">(${h.rating?.count || 0} reviews)</small>
        </span>
      </div>

      ${reviews.length ? reviews.map(r => `
        <div style="border-bottom:1px solid var(--border-light);padding:14px 0;${r.user_id === me?.id ? 'background:#FFFDF8;padding:14px 12px;border-radius:6px;border:1px solid #F0C46B;margin:8px 0;' : ''}">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
            <strong>
              ${esc(r.name)}
              ${r.user_id === me?.id ? '<span style="font-size:10px;background:var(--red-soft);color:var(--red);padding:2px 6px;border-radius:4px;margin-left:4px;font-weight:700;">YOU</span>' : ''}
              <span style="font-size:11px;background:var(--green-bg);color:var(--green);padding:2px 6px;border-radius:4px;font-weight:600;margin-left:4px;">✓ Verified Stay</span>
            </strong>
            <span style="color:#E5A11D;font-weight:700;font-size:14px;">★ ${r.rating}.0</span>
          </div>
          <p style="margin:4px 0 0 0;font-size:13px;color:var(--ink-secondary);font-style:italic;line-height:1.5;">“${esc(r.comment)}”</p>
        </div>
      `).join('') : '<p class="muted" style="margin-top:12px;">No guest reviews yet. Book a stay to share the first review.</p>'}
    `, 'normal');

    overlay.querySelectorAll('.book-room').forEach(b => {
      b.onclick = () => bookingModal(id, b.dataset.room, b.dataset.capacity, b.dataset.price, b.dataset.name, b.dataset.type);
    });
  } catch (e) {
    toast(e.message);
  }
}

// ==========================================================================
// INTERACTIVE BOOKING MODAL WITH LIVE PRICE CALCULATOR
// ==========================================================================
function bookingModal(hotelId, roomId, capacity, price, hotelName, roomType) {
  if (!me) {
    overlay.innerHTML = '';
    loginModal('user');
    return;
  }
  if (me.role !== 'user') {
    toast('Please switch to a Traveller account to make reservations');
    return;
  }

  // Pre-fill tomorrow and 3 days later
  const today = new Date();
  const dIn = new Date(today);
  dIn.setDate(today.getDate() + 1);
  const dOut = new Date(today);
  dOut.setDate(today.getDate() + 4);

  const defaultIn = dIn.toISOString().slice(0, 10);
  const defaultOut = dOut.toISOString().slice(0, 10);

  modal(`
    <span class="eyebrow">SAFE DEMO CHECKOUT</span>
    <h2>Confirm your stay at ${esc(hotelName || 'Stayora')}</h2>
    <p>Simulated demo booking — no real currency is charged. Live availability verified via SQLite ACID transaction.</p>

    <form id="bookForm">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <label>
          Check-in Date
          <input type="date" name="check_in" id="bCheckIn" value="${defaultIn}" required>
        </label>
        <label>
          Check-out Date
          <input type="date" name="check_out" id="bCheckOut" value="${defaultOut}" required>
        </label>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <label>
          Guests
          <select name="guests" id="bGuests">
            ${Array.from({ length: Number(capacity) }, (_, i) => `<option value="${i + 1}">${i + 1} Guest${i > 0 ? 's' : ''}</option>`).join('')}
          </select>
        </label>
        <label>
          Promo / Expo Voucher
          <input type="text" id="promoCode" placeholder="Try EXPO2026" uppercase>
        </label>
      </div>

      <!-- Live Dynamic Price Calculator -->
      <div class="price-breakdown" id="priceBreakdown">
        <div class="price-row">
          <span>₹${Number(price).toLocaleString('en-IN')} × <span id="nightsCount">3</span> nights</span>
          <span id="baseFare">₹${(Number(price) * 3).toLocaleString('en-IN')}</span>
        </div>
        <div class="price-row">
          <span>Service & Linen fee</span>
          <span>₹450</span>
        </div>
        <div class="price-row">
          <span>Demo GST / Luxury Tax (12%)</span>
          <span id="taxFee">₹${Math.round(Number(price) * 3 * 0.12).toLocaleString('en-IN')}</span>
        </div>
        <div class="price-row" id="promoRow" style="display:none;color:var(--green);font-weight:600;">
          <span>Expo Discount (15% off)</span>
          <span id="discountVal">-₹0</span>
        </div>
        <div class="price-row total">
          <span>Estimated Demo Total</span>
          <span id="calcTotal" style="color:var(--red);">₹${Math.round(Number(price) * 3 * 1.12 + 450).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <button class="primary" style="width:100%;height:50px;font-size:15px;">
        <span>🔒 Confirm Demo Booking</span>
      </button>
    </form>
  `, 'small');

  function updateCalc() {
    const ci = $('#bCheckIn')?.value;
    const co = $('#bCheckOut')?.value;
    const promo = $('#promoCode')?.value.trim().toUpperCase();
    if (!ci || !co) return;

    const diff = (Date.parse(co) - Date.parse(ci)) / 86400000;
    const nights = Math.max(1, isNaN(diff) ? 1 : diff);
    const base = Number(price) * nights;
    const tax = Math.round(base * 0.12);
    const discount = promo === 'EXPO2026' ? Math.round((base + 450 + tax) * 0.15) : 0;
    const total = Math.max(0, base + 450 + tax - discount);

    if ($('#nightsCount')) $('#nightsCount').textContent = nights;
    if ($('#baseFare')) $('#baseFare').textContent = '₹' + base.toLocaleString('en-IN');
    if ($('#taxFee')) $('#taxFee').textContent = '₹' + tax.toLocaleString('en-IN');
    if ($('#calcTotal')) $('#calcTotal').textContent = '₹' + total.toLocaleString('en-IN');

    const promoRow = $('#promoRow');
    if (promoRow) {
      if (discount > 0) {
        promoRow.style.display = 'flex';
        $('#discountVal').textContent = '-₹' + discount.toLocaleString('en-IN');
      } else {
        promoRow.style.display = 'none';
      }
    }
  }

  $('#bCheckIn').onchange = updateCalc;
  $('#bCheckOut').onchange = updateCalc;
  $('#promoCode').oninput = updateCalc;

  $('#bookForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const d = await api('/bookings', {
        method: 'POST',
        body: {
          room_id: Number(roomId),
          check_in: f.get('check_in'),
          check_out: f.get('check_out'),
          guests: Number(f.get('guests'))
        }
      });

      // Show Printable Stay Voucher
      showStayVoucher(d.booking, hotelName || 'Stayora Partner Stay', roomType || 'Standard', f.get('check_in'), f.get('check_out'), f.get('guests'));
    } catch (err) {
      toast(err.message);
    }
  };
}

// ==========================================================================
// PRINTABLE STAY VOUCHER & QR PASS (ISOLATED PDF & PRINT SYSTEM)
// ==========================================================================
function printStayVoucher(b, hotelName, roomType, checkIn, checkOut, guests) {
  const nights = b.nights || Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000));
  const bookingRef = `STY-${String(b.id).padStart(5, '0')}`;
  const totalAmount = Number(b.total || b.total_price || 0).toLocaleString('en-IN');
  const guestName = (typeof me !== 'undefined' && me?.name) ? me.name : 'Aarav Shah';
  const guestEmail = (typeof me !== 'undefined' && me?.email) ? me.email : 'user@stayora.com';

  const printHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Stayora_BoardingPass_${bookingRef}.pdf</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #FFFFFF;
      color: #1A110E;
      margin: 0;
      padding: 24px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .ticket {
      max-width: 680px;
      margin: 0 auto;
      border: 2px solid #8C5405;
      border-radius: 12px;
      padding: 30px;
      background: #FFFDF8;
      box-shadow: none;
    }
    .ticket-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px dashed #C8B29E;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .ticket-brand img {
      height: 48px;
      display: block;
      margin-bottom: 6px;
    }
    .ticket-title {
      font-size: 24px;
      font-weight: 700;
      color: #8C5405;
      margin: 2px 0 0 0;
    }
    .badge-verified {
      display: inline-block;
      background: #EAF6ED;
      color: #1B663E;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #C4E6CD;
    }
    .ticket-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 22px 0;
    }
    .field-label {
      font-size: 11px;
      font-weight: 700;
      color: #7D6B62;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 3px;
    }
    .field-val {
      font-size: 15px;
      font-weight: 700;
      color: #1A110E;
    }
    .ticket-divider {
      border-top: 1px dashed #C8B29E;
      margin: 20px 0;
    }
    .ticket-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #7D6B62;
    }
    .barcode {
      text-align: center;
      margin: 20px 0 10px 0;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-head">
      <div>
        <div class="ticket-brand">
          <img src="/stayora-logo.jpg" alt="Stayora">
        </div>
        <span class="badge-verified">✓ CONFIRMED BOARDING PASS</span>
        <div class="ticket-title">Guest Stay Voucher</div>
        <small style="color:#7D6B62;font-family:monospace;">Booking Ref: #${bookingRef} · Demo Payment Verified</small>
      </div>
      <div style="text-align:right;">
        <svg width="74" height="74" viewBox="0 0 24 24" fill="#1A110E">
          <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4 0h2v2h-2v-2zm2 4h4v2h-4v-2zm-2 2h2v2h-2v-2zm4-4h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z"/>
        </svg>
        <div style="font-size:10px;font-family:monospace;color:#7D6B62;margin-top:4px;">SCAN AT CHECK-IN</div>
      </div>
    </div>

    <div class="ticket-grid">
      <div>
        <div class="field-label">Primary Guest</div>
        <div class="field-val">${esc(guestName)}</div>
        <small style="color:#7D6B62;">${esc(guestEmail)}</small>
      </div>
      <div>
        <div class="field-label">Property Name</div>
        <div class="field-val">${esc(hotelName)}</div>
      </div>
      <div>
        <div class="field-label">Room Tier</div>
        <div class="field-val">${esc(roomType)}</div>
      </div>
      <div>
        <div class="field-label">Travellers</div>
        <div class="field-val">${guests} Guest${Number(guests) === 1 ? '' : 's'}</div>
      </div>
      <div>
        <div class="field-label">Check-In Date</div>
        <div class="field-val" style="color:#1B663E;">${esc(checkIn)} (from 14:00)</div>
      </div>
      <div>
        <div class="field-label">Check-Out Date</div>
        <div class="field-val" style="color:#C0392B;">${esc(checkOut)} (until 11:00)</div>
      </div>
      <div>
        <div class="field-label">Duration of Stay</div>
        <div class="field-val">${nights} Night${nights === 1 ? '' : 's'}</div>
      </div>
      <div>
        <div class="field-label">Total Amount Paid</div>
        <div class="field-val" style="color:#8C5405;">₹${totalAmount} <small style="font-size:11px;color:#1B663E;">(CONFIRMED)</small></div>
      </div>
    </div>

    <div class="barcode">
      <svg width="100%" height="42" viewBox="0 0 300 42" preserveAspectRatio="none">
        ${Array.from({ length: 48 }).map((_, i) => `
          <rect x="${i * 6.2 + (i % 3 === 0 ? 2 : 1)}" y="0" width="${(i % 5 === 0 ? 3.5 : (i % 2 === 0 ? 2.2 : 1.2))}" height="32" fill="#1A110E"/>
        `).join('')}
      </svg>
      <div style="font-family:monospace;font-size:12px;letter-spacing:4px;color:#7D6B62;">* ${bookingRef} *</div>
    </div>

    <div class="ticket-divider"></div>

    <div class="ticket-footer">
      <span>🛡️ Verified Stayora Protection · Dual-Layer Photo Shield Certified</span>
      <span>Present this pass or your booking reference at reception.</span>
    </div>
  </div>
</body>
</html>`;

  // Hidden print frame to prevent full-page CSS contamination and pop-up blocker issues
  let frame = document.getElementById('stayoraPrintFrame');
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = 'stayoraPrintFrame';
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
  }

  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(printHtml);
  doc.close();

  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }, 350);
}

function downloadBoardingPassFile(b, hotelName, roomType, checkIn, checkOut, guests) {
  const nights = b.nights || Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000));
  const bookingRef = `STY-${String(b.id).padStart(5, '0')}`;
  const totalAmount = Number(b.total || b.total_price || 0).toLocaleString('en-IN');
  const guestName = (typeof me !== 'undefined' && me?.name) ? me.name : 'Aarav Shah';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Stayora Boarding Pass - #${bookingRef}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF5EE; color: #1A110E; padding: 40px 20px; display: flex; justify-content: center; }
    .ticket { max-width: 600px; width: 100%; background: #FFF; border: 2px solid #8C5405; border-radius: 12px; padding: 26px; box-shadow: 0 8px 30px rgba(0,0,0,0.1); }
    .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #C8B29E; padding-bottom: 16px; margin-bottom: 18px; }
    .badge { background: #EAF6ED; color: #1B663E; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: inline-block; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 14px; margin: 18px 0; }
    .lbl { font-size: 11px; font-weight: 700; color: #7D6B62; text-transform: uppercase; margin-bottom: 2px; }
    .val { font-size: 15px; font-weight: 700; color: #1A110E; }
    .btn { background: #C0392B; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%; font-size: 14px; margin-top: 18px; }
    @media print { .btn { display: none; } body { background: #fff; padding: 0; } }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="head">
      <div>
        <span class="badge">✓ CONFIRMED BOARDING PASS</span>
        <h2 style="margin:4px 0 0 0;color:#8C5405;font-size:22px;">Stayora Guest Pass</h2>
        <small style="color:#7D6B62;font-family:monospace;">Booking Ref: #${bookingRef}</small>
      </div>
      <div style="text-align:right;">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="#1A110E">
          <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4 0h2v2h-2v-2zm2 4h4v2h-4v-2zm-2 2h2v2h-2v-2zm4-4h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z"/>
        </svg>
      </div>
    </div>
    <div class="grid">
      <div><div class="lbl">Primary Guest</div><div class="val">${esc(guestName)}</div></div>
      <div><div class="lbl">Property Name</div><div class="val">${esc(hotelName)}</div></div>
      <div><div class="lbl">Room Tier</div><div class="val">${esc(roomType)}</div></div>
      <div><div class="lbl">Travellers</div><div class="val">${guests} Guest(s)</div></div>
      <div><div class="lbl">Check-In</div><div class="val" style="color:#1B663E;">${esc(checkIn)}</div></div>
      <div><div class="lbl">Check-Out</div><div class="val" style="color:#C0392B;">${esc(checkOut)}</div></div>
      <div><div class="lbl">Duration</div><div class="val">${nights} Night(s)</div></div>
      <div><div class="lbl">Total Paid</div><div class="val" style="color:#8C5405;">₹${totalAmount}</div></div>
    </div>
    <button class="btn" onclick="window.print()">🖨️ Print or Save as PDF</button>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Stayora-BoardingPass-${bookingRef}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('📥 Boarding pass downloaded to your device!');
}

function showStayVoucher(b, hotelName, roomType, checkIn, checkOut, guests) {
  const nights = b.nights || Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000));
  const bookingRef = `STY-${String(b.id).padStart(5, '0')}`;
  const totalAmount = Number(b.total || b.total_price || 0).toLocaleString('en-IN');

  modal(`
    <div class="stay-voucher" id="printVoucher">
      <div class="voucher-header">
        <div>
          <img src="/stayora-logo.jpg" alt="Stayora" style="height:44px;mix-blend-mode:multiply;display:block;margin-bottom:6px;">
          <span class="eyebrow" style="color:var(--green);">✓ CONFIRMED RESERVATION</span>
          <h2 style="font-size:24px;margin:2px 0 0 0;">Stayora Guest Pass</h2>
          <small class="muted">Booking Ref: <b>#${bookingRef}</b> · Demo Payment Verified</small>
        </div>
        <div class="voucher-qr">
          <svg width="68" height="68" viewBox="0 0 24 24" fill="var(--ink)">
            <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4 0h2v2h-2v-2zm2 4h4v2h-4v-2zm-2 2h2v2h-2v-2zm4-4h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z"/>
          </svg>
        </div>
      </div>

      <div class="voucher-grid">
        <div>
          <span class="muted" style="font-size:11px;display:block;">PROPERTY</span>
          <strong>${esc(hotelName)}</strong>
        </div>
        <div>
          <span class="muted" style="font-size:11px;display:block;">ROOM TIER</span>
          <strong>${esc(roomType)}</strong>
        </div>
        <div>
          <span class="muted" style="font-size:11px;display:block;">DATES</span>
          <strong>${esc(checkIn)} → ${esc(checkOut)}</strong> (${nights} night${nights === 1 ? '' : 's'})
        </div>
        <div>
          <span class="muted" style="font-size:11px;display:block;">GUESTS</span>
          <strong>${guests} Traveller${Number(guests) === 1 ? '' : 's'}</strong>
        </div>
        <div>
          <span class="muted" style="font-size:11px;display:block;">TOTAL AMOUNT PAID</span>
          <strong style="color:var(--red);font-size:16px;">₹${totalAmount}</strong>
        </div>
        <div>
          <span class="muted" style="font-size:11px;display:block;">PAYMENT STATUS</span>
          <span class="status CONFIRMED">CONFIRMED (DEMO_PAID)</span>
        </div>
      </div>

      <div style="margin-top:20px;padding-top:16px;border-top:1px dashed var(--border);font-size:11px;color:var(--muted);display:flex;justify-content:space-between;align-items:center;">
        <span>Present this digital pass at reception.</span>
        <span>Secured via SQLite ACID Transaction</span>
      </div>
    </div>

    <!-- Clear PDF & Print Controls (All Fully Functional) -->
    <div style="background:#FFFDF5;border:1px dashed #E5A11D;border-radius:var(--radius-sm);padding:8px 12px;font-size:11px;color:#8C5405;margin-bottom:12px;text-align:center;">
      💡 <b>To save as PDF:</b> Click <b>"Print / Save as PDF"</b> and select <b>"Save as PDF"</b> in your browser's Destination dropdown.
    </div>

    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
      <button class="primary" style="flex:1.2;min-width:160px;" id="printPassBtn">
        🖨️ Print / Save as PDF
      </button>
      <button class="action" style="flex:1;min-width:140px;" id="downloadPassFileBtn">
        📥 Download Pass File
      </button>
      <button class="action" style="flex:1;min-width:130px;" id="viewAllBookingsBtn">
        View My Bookings ↗
      </button>
    </div>
  `, 'small');

  $('#printPassBtn').onclick = () => {
    printStayVoucher(b, hotelName, roomType, checkIn, checkOut, guests);
  };

  $('#downloadPassFileBtn').onclick = () => {
    downloadBoardingPassFile(b, hotelName, roomType, checkIn, checkOut, guests);
  };

  $('#viewAllBookingsBtn').onclick = () => {
    overlay.innerHTML = '';
    bookingsView();
  };
}

// ==========================================================================
// TRAVELLER GUEST FEEDBACK SYSTEM & MODAL
// ==========================================================================
function feedbackModal(b) {
  const isEdit = Boolean(b.review_id);
  const currentRating = b.review_rating || 5;
  const currentComment = b.review_comment || '';

  const ratingDescriptions = {
    5: '★ ★ ★ ★ ★ (5/5) — Exceptional! Exceeded all expectations.',
    4: '★ ★ ★ ★ ☆ (4/5) — Very Good! Enjoyable & comfortable stay.',
    3: '★ ★ ★ ☆ ☆ (3/5) — Average. Standard experience with room for improvement.',
    2: '★ ★ ☆ ☆ ☆ (2/5) — Disappointing. Encountered several issues.',
    1: '★ ☆ ☆ ☆ ☆ (1/5) — Poor. Substantially below expectations.'
  };

  const highlightTags = [
    '✨ Spotless Clean',
    '☕ Delicious Breakfast',
    '🏊 Superb Amenities',
    '🤝 Hospitable Host',
    '📍 Prime Location',
    '🔕 Peaceful & Quiet',
    '📶 Fast Wi-Fi',
    '🌄 Stunning Views',
    '🛌 Super Comfortable Bed',
    '🌿 Beautiful Ambience'
  ];

  modal(`
    <div style="text-align:center;margin-bottom:16px;">
      <img src="/stayora-logo.jpg" alt="Stayora" style="height:44px;mix-blend-mode:multiply;display:block;margin:0 auto 6px auto;">
      <span class="eyebrow" style="color:var(--red);">VERIFIED GUEST FEEDBACK</span>
      <h2 style="font-size:24px;margin:2px 0 4px 0;">${isEdit ? 'Update Your Feedback' : 'Rate & Review Your Stay'}</h2>
      <p style="font-size:13px;color:var(--muted);margin:0;">
        <b>${esc(b.hotel)}</b> · ${esc(b.type)} (📍 ${esc(b.city)})
      </p>
    </div>

    <form id="stayFeedbackForm">
      <!-- Interactive Star Rating Widget -->
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;text-align:center;margin-bottom:16px;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--ink-secondary);display:block;margin-bottom:4px;">
          Overall Stay Rating
        </span>
        <div class="interactive-stars" id="starPicker">
          ${[1, 2, 3, 4, 5].map(i => `
            <span class="star-item" data-val="${i}">${i <= currentRating ? '★' : '☆'}</span>
          `).join('')}
        </div>
        <input type="hidden" name="rating" id="ratingInput" value="${currentRating}">
        <div id="ratingText" style="font-size:12px;font-weight:600;color:var(--ink);margin-top:4px;">
          ${ratingDescriptions[currentRating]}
        </div>
      </div>

      <!-- Quick Feedback Aspect Chips -->
      <div style="margin-bottom:14px;">
        <span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--ink-secondary);margin-bottom:6px;">
          Trip Highlights (Click to add to review)
        </span>
        <div class="quick-tags">
          ${highlightTags.map(tag => `
            <button type="button" class="tag-chip" data-tag="${esc(tag)}">${esc(tag)}</button>
          `).join('')}
        </div>
      </div>

      <!-- Written Review Comment -->
      <label style="display:block;margin-bottom:16px;">
        <span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--ink-secondary);margin-bottom:6px;">
          Your Written Experience
        </span>
        <textarea name="comment" id="feedbackComment" rows="4" placeholder="How was the check-in, host hospitality, room comfort, cleanliness, and local views? Your feedback helps fellow slow-travellers." required minlength="5" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);font-size:13px;line-height:1.5;">${esc(currentComment)}</textarea>
      </label>

      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="primary" style="flex:1;">
          ${isEdit ? '✓ Update Feedback' : '★ Submit Verified Review'}
        </button>
        <button type="button" class="action" onclick="overlay.innerHTML=''">
          Cancel
        </button>
      </div>
    </form>
  `, 'small');

  const starPicker = $('#starPicker');
  const ratingInput = $('#ratingInput');
  const ratingText = $('#ratingText');
  const commentBox = $('#feedbackComment');

  const setRating = (val) => {
    ratingInput.value = val;
    ratingText.textContent = ratingDescriptions[val];
    starPicker.querySelectorAll('.star-item').forEach(s => {
      const v = Number(s.dataset.val);
      s.textContent = v <= val ? '★' : '☆';
    });
  };

  starPicker.querySelectorAll('.star-item').forEach(s => {
    s.onclick = () => setRating(Number(s.dataset.val));
  });

  overlay.querySelectorAll('.tag-chip').forEach(btn => {
    btn.onclick = () => {
      const tag = btn.dataset.tag;
      if (!commentBox.value.includes(tag)) {
        commentBox.value = commentBox.value ? `${commentBox.value.trim()} • ${tag}` : tag;
        btn.classList.add('active');
      }
    };
  });

  $('#stayFeedbackForm').onsubmit = async e => {
    e.preventDefault();
    const rating = Number(ratingInput.value);
    const comment = commentBox.value.trim();
    try {
      if (isEdit) {
        await api(`/reviews/${b.id}`, {
          method: 'PUT',
          body: { rating, comment }
        });
        toast('Your verified feedback was updated successfully!');
      } else {
        await api('/reviews', {
          method: 'POST',
          body: {
            booking_id: b.id,
            rating,
            comment
          }
        });
        toast('⭐ Thank you! Your verified feedback is now live on Stayora.');
      }
      overlay.innerHTML = '';
      bookingsView();
    } catch (err) {
      toast(err.message);
    }
  };
}

// ==========================================================================
// TRAVELLER BOOKINGS VIEW (WITH INTEGRATED FEEDBACK)
// ==========================================================================
async function bookingsView() {
  if (!me) {
    loginModal('user');
    return;
  }
  if (me.role !== 'user') {
    toast('Traveller account required to view personal bookings');
    return;
  }
  currentView = 'bookings';
  try {
    const d = await api('/bookings/mine');
    app.innerHTML = `
      <section class="panel">
        <span class="eyebrow">YOUR TRAVEL JOURNAL</span>
        <h1>My Bookings & Stay Feedback</h1>
        <p class="muted">Live reservations, confirmed demo stays, and your personal reviews & ratings.</p>

        <div class="panel-section">
          ${d.bookings.length ? d.bookings.map(b => {
            const hasFeedback = Boolean(b.review_id);
            const canLeaveFeedback = b.status === 'CONFIRMED' || b.status === 'COMPLETED';
            const canCancel = b.status === 'CONFIRMED' && b.check_in > new Date().toISOString().slice(0, 10);

            return `
              <div class="booking-row" style="flex-direction:column;align-items:stretch;gap:12px;padding:20px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                      <strong style="font-size:18px;color:var(--ink);">${esc(b.hotel)}</strong>
                      <span class="status ${b.status}">${b.status}</span>
                      ${hasFeedback ? `<span style="font-size:10px;background:#EAF6ED;color:#1B663E;font-weight:700;padding:2px 8px;border-radius:var(--radius-full);border:1px solid #C4E6CD;">✓ REVIEWED</span>` : ''}
                    </div>
                    <div class="muted" style="font-size:13px;">
                      📍 ${esc(b.city)} · Room: <b>${esc(b.type)}</b> · <b>${b.check_in}</b> → <b>${b.check_out}</b> (${b.guests} guest${b.guests === 1 ? '' : 's'})
                    </div>
                    <div class="muted" style="font-size:11px;margin-top:2px;">
                      Booking ID: <code>#STY-${String(b.id).padStart(5, '0')}</code> · Demo Payment Completed
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <span style="font-size:20px;font-weight:700;color:var(--ink);">₹${Number(b.total_price).toLocaleString('en-IN')}</span>
                    <small class="muted" style="display:block;font-size:11px;">Total amount paid</small>
                  </div>
                </div>

                <!-- Traveller Stay Feedback Component -->
                ${hasFeedback ? `
                  <div style="background:#FFFDF7;border:1.5px solid #F0C46B;border-radius:var(--radius-sm);padding:14px 16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <span style="font-size:12px;font-weight:700;color:#8C5405;display:flex;align-items:center;gap:4px;">
                        <span>★</span> Your Verified Rating: <b>${b.review_rating}.0 / 5.0</b>
                      </span>
                      <span style="font-size:11px;color:var(--muted);">${esc(b.review_date ? b.review_date.slice(0, 10) : '')}</span>
                    </div>
                    <p style="margin:0 0 10px 0;font-size:13px;font-style:italic;color:var(--ink-secondary);line-height:1.5;">
                      “${esc(b.review_comment)}”
                    </p>
                    <div style="display:flex;gap:8px;">
                      <button class="action edit-feedback-btn" data-booking='${JSON.stringify(b)}' style="font-size:12px;padding:6px 12px;background:#FFFFFF;">
                        ✏️ Edit Feedback
                      </button>
                      <button class="action view-hotel-btn" data-hotel-id="${b.hotel_id}" style="font-size:12px;padding:6px 12px;">
                        🏨 View on Hotel Page ↗
                      </button>
                    </div>
                  </div>
                ` : canLeaveFeedback ? `
                  <div style="background:var(--bg);border:1px dashed var(--border);border-radius:var(--radius-sm);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <span style="font-size:26px;">⭐</span>
                      <div>
                        <strong style="font-size:13px;color:var(--ink);display:block;">How was your stay experience?</strong>
                        <span class="muted" style="font-size:12px;">Share your rating and feedback on cleanliness, host hospitality, and room comfort.</span>
                      </div>
                    </div>
                    <button class="primary open-feedback-btn" data-booking='${JSON.stringify(b)}' style="font-size:12px;padding:8px 16px;">
                      ★ Give Stay Feedback
                    </button>
                  </div>
                ` : ''}

                <!-- Action Controls -->
                <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--border-light);padding-top:10px;margin-top:2px;">
                  ${canCancel ? `
                    <button class="action cancel-book" data-id="${b.id}" style="color:var(--red);font-size:12px;padding:6px 12px;">Cancel Reservation</button>
                  ` : ''}
                  <button class="action view-voucher-btn" data-booking='${JSON.stringify(b)}' style="font-size:12px;padding:6px 12px;">
                    🎟️ View Boarding Pass
                  </button>
                </div>
              </div>
            `;
          }).join('') : '<div class="empty">No bookings on file yet. Book your first stay from the explore page!</div>'}
        </div>

        <button class="primary" data-view="explore" style="margin-top:8px;">Find another stay ↗</button>
      </section>
    `;

    // Bind Feedback Buttons
    app.querySelectorAll('.open-feedback-btn, .edit-feedback-btn').forEach(btn => {
      btn.onclick = () => {
        const booking = JSON.parse(btn.dataset.booking);
        feedbackModal(booking);
      };
    });

    // Bind View Hotel Buttons
    app.querySelectorAll('.view-hotel-btn').forEach(btn => {
      btn.onclick = () => showHotel(btn.dataset.hotelId);
    });

    // Bind Boarding Pass Voucher
    app.querySelectorAll('.view-voucher-btn').forEach(btn => {
      btn.onclick = () => {
        const b = JSON.parse(btn.dataset.booking);
        const nights = Math.max(1, Math.round((Date.parse(b.check_out) - Date.parse(b.check_in)) / 86400000));
        showStayVoucher(
          { id: b.id, nights, total: b.total_price },
          b.hotel,
          b.type,
          b.check_in,
          b.check_out,
          b.guests
        );
      };
    });

    // Bind Cancellation
    app.querySelectorAll('.cancel-book').forEach(b => {
      b.onclick = async () => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        try {
          await api(`/bookings/${b.dataset.id}/cancel`, { method: 'POST' });
          toast('Booking cancelled successfully');
          bookingsView();
        } catch (e) {
          toast(e.message);
        }
      };
    });

    // Bind "Find another stay" button
    app.querySelectorAll('[data-view="explore"]').forEach(btn => {
      btn.onclick = () => { location.reload(); };
    });
  } catch (e) {
    toast(e.message);
  }
}

// ==========================================================================
// WISHLIST / SAVED STAYS
// ==========================================================================
async function wishlistView() {
  if (!me) {
    loginModal('user');
    return;
  }
  currentView = 'wishlist';
  try {
    const d = await api('/wishlist');
    wishlistCount = d.hotels.length;
    updateWishlistBadge();

    app.innerHTML = `
      <section class="panel">
        <span class="eyebrow">SAVED COLLECTION</span>
        <h1>Wishlist & Favourites</h1>
        <p class="muted">Places you have saved for future slow-travel journeys.</p>

        <div class="cards" style="margin-top:24px;">
          ${d.hotels.length ? d.hotels.map(h => `
            <article class="hotel-card" data-id="${h.id}">
              <div class="photo">
                <img src="${esc(imageFor(h))}" alt="${esc(h.name)}">
                <button class="heart saved unsave" data-id="${h.id}" aria-label="Remove from saved">♥</button>
              </div>
              <div class="card-body">
                <h3>${esc(h.name)}</h3>
                <span class="card-city">📍 ${esc(h.city)}</span>
                <div class="card-foot" style="margin-top:14px;">
                  <span class="price">₹${Math.min(...h.rooms.map(r => r.price)).toLocaleString('en-IN')} <small>/ night</small></span>
                  <button class="action view-hotel" data-id="${h.id}">View Details ↗</button>
                </div>
              </div>
            </article>
          `).join('') : '<div class="empty"><h3>No saved stays yet</h3><p>Click the heart icon on any hotel card to save it here.</p><button class="primary" onclick="location.reload()" style="margin-top:14px;">Explore Stays ↗</button></div>'}
        </div>
      </section>
    `;

    app.querySelectorAll('.unsave').forEach(b => {
      b.onclick = async e => {
        e.stopPropagation();
        await api('/wishlist/' + b.dataset.id, { method: 'POST' });
        wishlistView();
      };
    });

    app.querySelectorAll('.view-hotel').forEach(b => {
      b.onclick = () => showHotel(b.dataset.id);
    });
  } catch (e) {
    toast(e.message);
  }
}

// ==========================================================================
// DASHBOARDS (Manager & Admin)
// ==========================================================================
async function dashboard() {
  if (!me) return;
  if (me.role === 'user') {
    location.reload();
    return;
  }
  currentView = 'dashboard';
  if (me.role === 'manager') return managerDash();
  return adminDash();
}

async function managerDash() {
  try {
    const d = await api('/manager/dashboard');
    const hotels = await api('/manager/hotels');
    window.stayoraHotels = hotels.hotels;

    app.innerHTML = `
      <section class="panel">
        <span class="eyebrow">HOTEL PARTNER WORKSPACE</span>
        <h1>Partner Console: ${esc(me.name)}</h1>
        <p class="muted">Manage your property catalog, launch advertising campaigns, monitor bookings, and upload verified photography.</p>

        <div class="stats">
          <div class="stat">Total Bookings<b>${d.total || 0}</b></div>
          <div class="stat">Demo Revenue<b>₹${Number(d.revenue || 0).toLocaleString('en-IN')}</b></div>
          <div class="stat">Properties Listed<b>${hotels.hotels.length}</b></div>
          <div class="stat">30-Day Occupancy<b>${d.occupancy || 0}%</b></div>
        </div>

        <div class="panel-section">
          <h3>Submit a New Property</h3>
          <p class="muted">All properties must pass automated photo uniqueness checks (SHA-256 + 64-bit dHash) and admin audit before publication.</p>
          <form class="panel-form" id="hotelForm" enctype="multipart/form-data">
            <label>Property Name<input name="name" placeholder="e.g. Heritage Courtyard" required></label>
            <label>City<input name="city" placeholder="e.g. Udaipur" required></label>
            <label class="wide">Full Street Address<input name="address" placeholder="12 Lake View Road" required></label>
            <label class="wide">Property Description<textarea name="description" placeholder="Describe the aesthetic, views, and experience..." required rows="2"></textarea></label>
            <label>Government Licence / Registration No.<input name="license_no" placeholder="STY-102938" required></label>
            <label>Partner Phone<input name="phone" placeholder="+91 98765 43210" required></label>
            <label>Partner Email<input name="email" type="email" placeholder="partner@example.com" required></label>
            <label>Key Amenities (comma separated)<input name="amenities" placeholder="wifi, pool, ac, breakfast, parking"></label>
            <label class="wide">Property Photos (At least 3 unique JPG/PNG/WebP images)<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label>
            <button class="primary" style="margin-top:8px;">Submit for Verification ↗</button>
          </form>
        </div>

        <div class="panel-section">
          <h3>Property Listings & Advertising Campaigns (Manager Only)</h3>
          <p class="muted" style="margin-bottom:16px;">As a verified hotel manager, boost your property with paid promotion. Boosted stays are published with prominent <b>📢 ADVERTISEMENT</b> badges, top search rank, and prime Featured Spotlight placement across all public guests.</p>
          ${hotels.hotels.map(h => `
            <div class="booking-row" style="align-items:flex-start;">
              <div style="flex:1;">
                <strong style="font-size:16px;">${esc(h.name)}</strong> · ${esc(h.city)}
                <span class="status ${h.status}">${h.status}</span>
                ${h.is_promoted ? `<span class="promoted-pill" style="margin-left:6px;">📢 ADVERTISEMENT ACTIVE</span>` : ''}
                <div class="muted" style="margin-top:2px;">Licence: ${esc(h.license_no)} · Contact: ${esc(h.phone)}</div>
                ${h.is_promoted && h.ad_tagline ? `<div class="card-tagline" style="margin:6px 0;"><b>Ad Tagline:</b> ${esc(h.ad_tagline)}</div>` : ''}
                ${h.rejection_reason ? `<div style="color:var(--red);font-size:13px;margin:6px 0;background:var(--red-soft);padding:6px 10px;border-radius:4px;">Rejection Note: ${esc(h.rejection_reason)}</div><button class="action resubmit" data-id="${h.id}">Resubmit for Review</button>` : ''}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="action promote-btn" data-id="${h.id}" data-name="${esc(h.name)}" data-promoted="${h.is_promoted ? '1' : '0'}" data-tagline="${esc(h.ad_tagline || '')}" style="background:#FFFBF2;border-color:#E5A11D;color:#8C5405;">
                  ${h.is_promoted ? '📢 Manage Advertisement' : '🚀 Boost & Advertise'}
                </button>
                <button class="action add-room" data-id="${h.id}">+ Add Room</button>
              </div>
            </div>
          `).join('') || '<p class="muted">No properties submitted yet.</p>'}
        </div>

        <div class="panel-section">
          <h3>Recent Guest Reservations</h3>
          ${d.bookings.map(b => `
            <div class="booking-row">
              <div>
                <strong>${esc(b.hotel)} · ${esc(b.type)}</strong>
                <div class="muted">${esc(b.customer)} · ${b.check_in} → ${b.check_out} · ${b.guests} guests</div>
              </div>
              <span class="status ${b.status}">${b.status}</span>
              <select class="booking-status" data-id="${b.id}" style="width:auto;padding:6px 10px;font-size:12px;">
                <option value="CONFIRMED" ${b.status === 'CONFIRMED' ? 'selected' : ''}>CONFIRMED</option>
                <option value="COMPLETED" ${b.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                <option value="CANCELLED" ${b.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
              </select>
            </div>
          `).join('') || '<p class="muted">No bookings recorded yet.</p>'}
        </div>

        <div class="panel-section">
          <h3>Guest Reviews & Feedback (${d.reviews?.length || 0})</h3>
          <p class="muted">Live ratings and authentic feedback shared by verified travellers who stayed at your properties.</p>
          ${d.reviews?.length ? d.reviews.map(r => `
            <div class="booking-row" style="align-items:flex-start;padding:14px;">
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <strong style="font-size:15px;">${esc(r.guest_name)}</strong>
                  <span style="font-size:10px;background:var(--green-bg);color:var(--green);font-weight:700;padding:2px 7px;border-radius:4px;">✓ Verified Stay</span>
                  <span style="color:#E5A11D;font-weight:700;">★ ${r.rating}.0</span>
                </div>
                <div class="muted" style="font-size:12px;">Property: <b>${esc(r.hotel_name)}</b> (${esc(r.room_type || 'Room')}) · ${esc(r.created_at || '')}</div>
                <p style="margin:6px 0 0 0;font-size:13px;font-style:italic;color:var(--ink-secondary);line-height:1.5;">“${esc(r.comment)}”</p>
              </div>
            </div>
          `).join('') : '<p class="muted">No guest reviews submitted yet for your properties.</p>'}
        </div>

        <button class="action logout" style="margin-top:20px;">Sign Out of Partner Portal</button>
      </section>
    `;

    $('#hotelForm').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const x = await api('/manager/hotels', { method: 'POST', body: fd });
        toast(`Submitted for review! Property #${x.hotel.id}`);
        managerDash();
      } catch (err) {
        toast(err.message);
      }
    };

    app.querySelectorAll('.promote-btn').forEach(b => {
      b.onclick = () => {
        campaignModal(b.dataset.id, b.dataset.name, b.dataset.promoted === '1', b.dataset.tagline);
      };
    });

    app.querySelectorAll('.add-room').forEach(b => {
      b.onclick = () => {
        modal(`
          <h2>Add Room Tier</h2>
          <form id="roomForm">
            <label>Room Tier Name<input name="type" placeholder="e.g. Garden Suite" required></label>
            <label>Price per Night (₹)<input type="number" name="price" min="1" placeholder="6500" required></label>
            <label>Guest Capacity<input type="number" name="capacity" min="1" placeholder="2" required></label>
            <label>Total Units Available<input type="number" name="quantity" min="1" placeholder="4" required></label>
            <label>Room Amenities (comma separated)<input name="amenities" placeholder="wifi, ac, balcony"></label>
            <button class="primary" style="width:100%;">Create Room</button>
          </form>
        `, 'small');

        $('#roomForm').onsubmit = async e => {
          e.preventDefault();
          const f = new FormData(e.target);
          try {
            await api('/rooms', {
              method: 'POST',
              body: {
                hotel_id: Number(b.dataset.id),
                type: f.get('type'),
                price: Number(f.get('price')),
                capacity: Number(f.get('capacity')),
                quantity: Number(f.get('quantity')),
                amenities: f.get('amenities')
              }
            });
            overlay.innerHTML = '';
            toast('Room tier added successfully');
            managerDash();
          } catch (err) {
            toast(err.message);
          }
        };
      };
    });

    app.querySelectorAll('.resubmit').forEach(b => {
      b.onclick = async () => {
        try {
          await api(`/manager/hotels/${b.dataset.id}/resubmit`, { method: 'PUT' });
          toast('Resubmitted for verification audit');
          managerDash();
        } catch (err) {
          toast(err.message);
        }
      };
    });

    app.querySelectorAll('.booking-status').forEach(s => {
      s.onchange = async () => {
        try {
          await api(`/manager/bookings/${s.dataset.id}`, {
            method: 'PATCH',
            body: { status: s.value }
          });
          toast('Booking status updated');
        } catch (err) {
          toast(err.message);
        }
      };
    });

    app.querySelector('.logout').onclick = () => {
      clearUser();
      location.reload();
    };
  } catch (err) {
    toast(err.message);
  }
}

// Advertising Campaign Modal for Hotel Managers (Manager Only)
function campaignModal(id, name, isPromoted, currentTagline) {
  modal(`
    <span class="eyebrow">HOTEL MANAGER ADVERTISING CONSOLE (MANAGER ONLY)</span>
    <h2>Boost & Advertise ${esc(name)}</h2>
    <p>Promote your stay to display it as a high-visibility <b>📢 ADVERTISEMENT</b> at the top of traveller searches and in the prominent Front-Page Featured Spotlight.</p>

    <form id="campaignForm">
      <div class="campaign-card selected" id="tierHero">
        <span class="campaign-price">₹1,999 <small style="font-size:11px;font-weight:400;color:var(--muted);">/ 30 days (Demo)</small></span>
        <strong>📢 Sponsored Advertisement Tier</strong>
        <p style="font-size:12px;color:var(--muted);margin:4px 0 0 0;">Guaranteed #1 Hero Feature + 📢 ADVERTISEMENT badge + top-priority search placement.</p>
      </div>

      <label style="margin-top:16px;">
        Promotional Headline / Ad Tagline
        <input name="tagline" id="campTagline" value="${esc(currentTagline || '🌟 Featured Stay of the Week • Complimentary Breakfast & Sunset View')}" placeholder="e.g. Free Welcome Drinks & 20% Direct Booking Discount" required maxlength="120">
      </label>

      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="primary" style="flex:1;">
          ${isPromoted ? 'Update Advertisement Campaign' : '🚀 Pay Demo Fee & Publish Advertisement'}
        </button>
        ${isPromoted ? `
          <button type="button" class="action" id="cancelAdBtn" style="color:var(--red);">
            🛑 Stop Advertisement
          </button>
        ` : ''}
      </div>
    </form>
  `, 'small');

  $('#campaignForm').onsubmit = async e => {
    e.preventDefault();
    const tagline = $('#campTagline').value.trim();
    try {
      await api(`/manager/hotels/${id}/promote`, {
        method: 'POST',
        body: { promoted: true, tagline }
      });
      overlay.innerHTML = '';
      toast(`🚀 Advertisement Live! ${name} is now published on the public Explore page.`);
      managerDash();
    } catch (err) {
      toast(err.message);
    }
  };

  $('#cancelAdBtn')?.addEventListener('click', async () => {
    try {
      await api(`/manager/hotels/${id}/promote`, {
        method: 'POST',
        body: { promoted: false, tagline: '' }
      });
      overlay.innerHTML = '';
      toast('Advertisement stopped. Property returned to standard organic listing.');
      managerDash();
    } catch (err) {
      toast(err.message);
    }
  });
}

async function adminDash() {
  try {
    const [d, hd, ud, bd, ld] = await Promise.all([
      api('/admin/dashboard'),
      api('/admin/hotels'),
      api('/admin/users'),
      api('/admin/bookings'),
      api('/admin/logs')
    ]);

    app.innerHTML = `
      <section class="panel">
        <span class="eyebrow">SUPERUSER AUDIT & OVERSIGHT</span>
        <h1>Platform Control Room</h1>
        <p class="muted">Security verification, photo anti-fraud audits, accounts and platform transaction logs.</p>

        <div class="stats">
          <div class="stat">Registered Travellers<b>${d.users}</b></div>
          <div class="stat">Hotel Partners<b>${d.managers}</b></div>
          <div class="stat">Active Stays<b>${d.hotels}</b></div>
          <div class="stat">Pending Audit<b style="color:var(--red);">${d.pending}</b></div>
          <div class="stat">Reservations<b>${d.bookings}</b></div>
          <div class="stat">Demo Volume<b>₹${Number(d.revenue).toLocaleString('en-IN')}</b></div>
        </div>

        <div class="panel-section">
          <h3>Distribution by Destination</h3>
          <div class="bars">
            ${d.byCity.map(c => `
              <div class="bar-row">
                <span>📍 ${esc(c.city)}</span>
                <div><i style="width:${Math.max(10, Math.round(c.count / Math.max(...d.byCity.map(x => x.count)) * 100))}%"></i></div>
                <b>${c.count}</b>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="panel-section">
          <h3>Verification Queue (Fraud & Photo Audits)</h3>
          ${hd.hotels.map(h => `
            <div class="admin-row" style="align-items:flex-start;">
              <div style="flex:1;">
                <strong>${esc(h.name)}</strong> · ${esc(h.city)}
                <span class="status ${h.status}">${h.status}</span>
                ${h.is_promoted ? `<span class="promoted-pill" style="margin-left:6px;">⚡ SPONSORED</span>` : ''}
                <div class="muted" style="margin-top:2px;">
                  Licence: ${esc(h.license_no)} · Manager: ${esc(h.manager)} (${esc(h.manager_email)})
                </div>
                <div class="muted" style="font-size:11px;margin-top:4px;">
                  Security checks: ${Object.entries(h.checks).map(([k, v]) => `<code>${k}: ${v ? 'PASS' : 'FAIL'}</code>`).join(' · ')}
                </div>
                <div class="amenities" style="margin-top:8px;">
                  ${h.images.map(src => `<a target="_blank" href="${esc(src)}" class="chip" style="color:var(--red);">Inspect Photo ↗</a>`).join(' ')}
                </div>
              </div>
              ${h.status !== 'APPROVED' ? `
                <div style="display:flex;gap:8px;">
                  <button class="primary approve" data-id="${h.id}" style="padding:8px 14px;font-size:12px;">Approve Listing</button>
                  <button class="action reject" data-id="${h.id}" style="color:var(--red);">Reject</button>
                </div>
              ` : ''}
            </div>
          `).join('') || '<p class="muted">No pending submissions.</p>'}
        </div>

        <div class="panel-section">
          <h3>User & Host Accounts</h3>
          ${ud.users.map(u => `
            <div class="booking-row">
              <div>
                <strong>${esc(u.name)}</strong> (${esc(u.email)})
                <div class="muted">Role: <b>${u.role}</b> · Created: ${esc(u.created_at)}</div>
              </div>
              <span class="status ${u.is_blocked ? 'REJECTED' : 'APPROVED'}">${u.is_blocked ? 'BLOCKED' : 'ACTIVE'}</span>
              ${u.role !== 'admin' ? `
                <button class="action block-user" data-id="${u.id}" data-block="${u.is_blocked ? 'false' : 'true'}">
                  ${u.is_blocked ? 'Unblock User' : 'Block User'}
                </button>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="panel-section">
          <h3>Audit Log</h3>
          ${ld.logs.map(l => `
            <div class="booking-row">
              <span><b>${esc(l.admin)}</b>: ${esc(l.action)} for <em>${esc(l.hotel || 'hotel')}</em></span>
              <span class="muted">${esc(l.note || '')}</span>
              <span class="muted" style="font-size:11px;">${esc(l.created_at)}</span>
            </div>
          `).join('') || '<p class="muted">No audit entries yet.</p>'}
        </div>

        <button class="action logout" style="margin-top:20px;">Sign Out of Admin Console</button>
      </section>
    `;

    app.querySelectorAll('.approve').forEach(b => {
      b.onclick = () => reviewHotel(b.dataset.id, 'APPROVED');
    });

    app.querySelectorAll('.reject').forEach(b => {
      b.onclick = () => {
        modal(`
          <h2>Reject Property Submission</h2>
          <p>Please enter an audit reason to help the partner correct licence details or replace duplicate imagery.</p>
          <form id="rejectForm">
            <label>Audit Reason
              <textarea name="reason" rows="4" placeholder="e.g. Photo #2 flagged as perceptual duplicate. Please provide original exterior photography." required minlength="5"></textarea>
            </label>
            <button class="primary" style="width:100%;">Confirm Rejection</button>
          </form>
        `, 'small');

        $('#rejectForm').onsubmit = async e => {
          e.preventDefault();
          try {
            await reviewHotel(b.dataset.id, 'REJECTED', new FormData(e.target).get('reason'));
            overlay.innerHTML = '';
          } catch (err) {
            toast(err.message);
          }
        };
      };
    });

    app.querySelectorAll('.block-user').forEach(b => {
      b.onclick = async () => {
        try {
          await api(`/admin/users/${b.dataset.id}/block`, {
            method: 'PATCH',
            body: { blocked: b.dataset.block === 'true' }
          });
          toast('Account status updated');
          adminDash();
        } catch (err) {
          toast(err.message);
        }
      };
    });

    app.querySelector('.logout').onclick = () => {
      clearUser();
      location.reload();
    };
  } catch (err) {
    toast(err.message);
  }
}

async function reviewHotel(id, decision, reason = '') {
  try {
    await api(`/admin/hotels/${id}/review`, {
      method: 'POST',
      body: { decision, reason }
    });
    toast(`Hotel ${decision.toLowerCase()} successfully`);
    adminDash();
  } catch (err) {
    toast(err.message);
  }
}

// ==========================================================================
// AI ASSISTANT ("ASK STAYORA")
// ==========================================================================
function chatToggle() {
  let box = $('#chatbox');
  if (box) {
    box.remove();
    return;
  }

  const c = document.createElement('div');
  c.id = 'chatbox';
  c.className = 'chatbox';
  c.innerHTML = `
    <div class="chathead">
      <div class="chathead-title">
        <span>✳</span> Ask Stayora Assistant
      </div>
      <button id="closeChat" style="color:white;font-size:20px;">×</button>
    </div>
    <div class="chatlog" id="chatlog">
      <div class="bubble">
        Hello! I'm your Stayora Travel Concierge. Tell me where you’re travelling, your dates, budget, or preferred amenities. I only recommend approved, verified stays with real-time availability.
      </div>
    </div>
    <div class="chat-suggestions">
      <button class="chat-chip" data-q="Goa pool villa under ₹6000">🏖️ Goa with pool &lt; ₹6K</button>
      <button class="chat-chip" data-q="Jaipur haveli with breakfast">🏰 Jaipur haveli</button>
      <button class="chat-chip" data-q="What is the cancellation policy?">❓ Cancellation</button>
    </div>
    <form class="chatinput" id="chatForm">
      <input name="message" placeholder="Ask about stays, dates, policies..." required autocomplete="off">
      <button type="submit">Ask</button>
    </form>
  `;

  document.body.appendChild(c);
  $('#closeChat').onclick = () => c.remove();

  c.querySelectorAll('.chat-chip').forEach(btn => {
    btn.onclick = () => {
      const input = c.querySelector('input[name="message"]');
      if (input) {
        input.value = btn.dataset.q;
        $('#chatForm').dispatchEvent(new Event('submit'));
      }
    };
  });

  $('#chatForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const q = f.get('message');
    const log = $('#chatlog');
    log.innerHTML += `<div class="bubble me">${esc(q)}</div>`;
    e.target.reset();
    log.scrollTop = log.scrollHeight;

    try {
      const d = await api('/assistant/chat', { method: 'POST', body: { message: q } });
      log.innerHTML += `
        <div class="bubble">
          ${esc(d.followup || d.faq || d.reply)}
          <span class="bubble-meta">Engine: Stayora ${d.mode} NLP</span>
        </div>
      `;

      if (d.hotels?.length) {
        log.innerHTML += d.hotels.map(h => `
          <div class="bubble" style="background:var(--surface);border:1px solid var(--border);">
            <strong>${esc(h.name)}</strong> · ${esc(h.city)}<br>
            <span style="color:var(--red);font-weight:700;">₹${Math.min(...h.rooms.map(r => r.price)).toLocaleString('en-IN')}/night</span> · ★ ${h.rating?.rating || 'New'}<br>
            <button class="action chat-view" data-id="${h.id}" style="margin-top:6px;">View & Book ↗</button>
          </div>
        `).join('');
      }

      log.querySelectorAll('.chat-view').forEach(b => {
        b.onclick = () => showHotel(b.dataset.id);
      });
      log.scrollTop = log.scrollHeight;
    } catch (err) {
      log.innerHTML += `<div class="bubble" style="color:var(--red);">${esc(err.message)}</div>`;
    }
  };
}

// ==========================================================================
// AUTH ROUTING (Dedicated Webpages)
// ==========================================================================
function loginModal(role = 'user') {
  window.location.href = `/login.html?role=${role}`;
}

function registerModal(role = 'user') {
  window.location.href = `/register.html?role=${role}`;
}

// ==========================================================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================================================
// Search bar triggers
$('#searchBtn')?.addEventListener('click', loadHotels);
$('#city')?.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadHotels, 320);
});
$('#city')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') loadHotels();
});

$('#sort')?.addEventListener('change', loadHotels);
$('#minRating')?.addEventListener('change', loadHotels);
$('#roomType')?.addEventListener('change', loadHotels);
$('#maxPrice')?.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadHotels, 320);
});

document.querySelectorAll('.checks input').forEach(x => x.addEventListener('change', loadHotels));

$('#clearFilters')?.addEventListener('click', () => {
  if ($('#maxPrice')) $('#maxPrice').value = '';
  if ($('#minRating')) $('#minRating').value = '';
  if ($('#roomType')) $('#roomType').value = '';
  if ($('#city')) $('#city').value = '';
  document.querySelectorAll('.checks input').forEach(x => x.checked = false);
  loadHotels();
});

// Destination chips
document.querySelectorAll('.dest-chip').forEach(chip => {
  chip.onclick = () => {
    const city = chip.dataset.city;
    if ($('#city')) $('#city').value = city;
    loadHotels();
  };
});

// Navigation view routing
document.querySelectorAll('[data-view]').forEach(b => {
  b.onclick = () => {
    const view = b.dataset.view;
    document.querySelectorAll('.navlink').forEach(l => l.classList.remove('active'));
    b.classList.add('active');

    if (view === 'bookings') bookingsView();
    else if (view === 'wishlist') wishlistView();
    else if (view === 'explore') location.reload();
  };
});

// Expo role switchers with password authentication
$('#expoUserBtn')?.addEventListener('click', () => switchUserWithPasswordModal('user'));
$('#expoManagerBtn')?.addEventListener('click', () => switchUserWithPasswordModal('manager'));
$('#expoAdminBtn')?.addEventListener('click', () => switchUserWithPasswordModal('admin'));
$('#expoFraudBtn')?.addEventListener('click', showPhotoGuardTech);
$('#footerPhotoGuardBtn')?.addEventListener('click', showPhotoGuardTech);

// Account & Drawer controls
$('#accountBtn')?.addEventListener('click', () => {
  if (!me) {
    window.location.href = '/login.html';
  } else {
    modal(`
      <div style="text-align:center;margin-bottom:12px;">
        <img src="/stayora-logo.jpg" alt="Stayora" style="height:44px;mix-blend-mode:multiply;margin-bottom:4px;">
        <span class="eyebrow" style="display:block;">AUTHENTICATED PROFILE</span>
        <h2 style="font-size:24px;margin:4px 0;">${esc(me.name)}</h2>
        <p style="font-size:13px;color:var(--muted);margin:0;">${esc(me.email)} · Role: <b style="color:var(--red);">${esc(me.role.toUpperCase())}</b></p>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:20px;">
        ${me.role !== 'user' ? `<button class="primary" id="openDashBtn">Open ${me.role === 'admin' ? 'Admin' : 'Partner'} Console</button>` : ''}
        <button class="action" id="userBookingsModalBtn">View My Bookings</button>
        <button class="action" onclick="window.location.href='/login.html'">Switch User Account</button>
        <button class="action" id="modalLogoutBtn" style="color:var(--red);">Sign Out</button>
      </div>
    `, 'small');

    $('#openDashBtn')?.addEventListener('click', () => {
      overlay.innerHTML = '';
      dashboard();
    });

    $('#userBookingsModalBtn')?.addEventListener('click', () => {
      overlay.innerHTML = '';
      bookingsView();
    });

    $('#modalLogoutBtn')?.addEventListener('click', () => {
      clearUser();
      overlay.innerHTML = '';
      location.reload();
    });
  }
});

$('#managerLogin')?.addEventListener('click', () => { window.location.href = '/login.html?role=manager'; });
$('#adminLogin')?.addEventListener('click', () => { window.location.href = '/login.html?role=admin'; });
$('#chatLaunch')?.addEventListener('click', chatToggle);
$('#menuBtn')?.addEventListener('click', () => me ? dashboard() : window.location.href = '/login.html');

// Start application
updateUserUI();
updateWishlistBadge();
loadHotels();
