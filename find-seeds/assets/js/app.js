const PAYMENT_ICONS = {
  'credit card':   '<i class="fa-solid fa-credit-card" title="Credit Card"></i>',
  'bitcoin':       '<i class="fa-brands fa-bitcoin" title="Crypto"></i>',
  'crypto':        '<i class="fa-brands fa-bitcoin" title="Crypto"></i>',
  'bank transfer': '<i class="fa-solid fa-building-columns" title="Bank Transfer"></i>',
  'cash':          '<i class="fa-solid fa-money-bill" title="Cash"></i>',
  'check':         '<i class="fa-solid fa-money-check-dollar" title="Check"></i>',
  'money order':   '<i class="fa-solid fa-money-check-dollar" title="Money Order"></i>',
};

function paymentIcons(methods) {
  return (methods || '').split('|').map(m => PAYMENT_ICONS[m.trim().toLowerCase()] || '').filter(Boolean).join(' ');
}

function shippingText(val) {
  return (val || '').split('|').map(s => s.trim()).filter(Boolean).join(', ') || 'Unknown';
}

function groupDisplayName(strain_group) {
  return strain_group.replace(/_/g, ' ').replace(/-/g, ' ');
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function initials(name) {
  return (name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function buildAffiliateUrl(row) {
  const url = row.product_url || '';
  if (row.affiliate_url) return row.affiliate_url;
  if (row.affiliate_param && url) return url + row.affiliate_param;
  return url || '#';
}

function normalizeShipping(val) {
  return (val || '').split('|').map(s => s.trim().toLowerCase().replace('intl', 'international'));
}

function normalizeType(val) {
  return (val || '').split('|').map(s => s.trim().toLowerCase());
}

// ── State ─────────────────────────────────────────────────────────────────────
let allRows      = [];
let strainGroups = {}; // group_key -> [rows]
let activeFilters = { type: new Set(), shipping: new Set() };
let activeQuick   = new Set();
let currentGroup  = null;
let openVendor    = null;

// ── Build strain groups ───────────────────────────────────────────────────────
function buildStrainGroups(rows) {
  const map = {};
  rows.forEach(row => {
    const group = row.strain_group || '';
    const isDefault = group.startsWith('default-');
    // key: for named groups use strain_group, for defaults use strain_name
    const key = isDefault ? ('__' + (row.strain_name || '').trim().toLowerCase()) : group;
    if (!key || key === '__') return;
    if (!map[key]) map[key] = { group, isDefault, displayName: isDefault ? (row.strain_name || '') : groupDisplayName(group), imgPath: row.img_path || '', rows: [] };
    map[key].rows.push(row);
  });
  return map;
}

// ── Filter helpers ────────────────────────────────────────────────────────────
function rowMatchesFilters(row) {
  if (activeFilters.type.size > 0) {
    const types = normalizeType(row.product_type);
    if (![...activeFilters.type].some(f => types.includes(f))) return false;
  }
  if (activeFilters.shipping.size > 0) {
    const regions = normalizeShipping(row.shipping_regions);
    if (![...activeFilters.shipping].some(f => regions.includes(f))) return false;
  }
  return true;
}

function rowMatchesQuick(row) {
  if (activeQuick.has('usa')       && !normalizeShipping(row.shipping_regions).includes('usa')) return false;
  if (activeQuick.has('crypto')    && !(row.payment_methods || '').toLowerCase().includes('crypto') && !(row.payment_methods || '').toLowerCase().includes('bitcoin')) return false;
  if (activeQuick.has('guarantee') && (!row.germ_guarantee || row.germ_guarantee === 'no')) return false;
  if (activeQuick.has('stealth')   && row.stealth_shipping !== 'yes') return false;
  return true;
}

// ── Level 1: Strain search dropdown ──────────────────────────────────────────
function renderDropdown(query) {
  const list = document.getElementById('strain-list');
  const q = query.trim().toLowerCase();

  if (!q) { list.innerHTML = ''; list.classList.add('hidden'); return; }

  const matches = Object.values(strainGroups).filter(g => {
    if (g.isDefault) return g.displayName.toLowerCase().includes(q);
    return g.displayName.toLowerCase().includes(q);
  }).slice(0, 40);

  if (!matches.length) {
    list.innerHTML = '<div class="no-results">No strains found</div>';
    list.classList.remove('hidden');
    return;
  }

  list.innerHTML = matches.map((g, i) => {
    const vendorCount = [...new Set(g.rows.map(r => r.vendor_name))].length;
    return `
      <div class="strain-item" data-idx="${i}">
        <img src="${g.imgPath}" alt="${g.displayName}" onerror="this.style.display='none'" />
        <div class="strain-item-info">
          <div class="strain-item-name">${g.displayName}</div>
        </div>
        <span class="strain-count">${vendorCount} vendor${vendorCount !== 1 ? 's' : ''}</span>
      </div>`;
  }).join('');

  list.classList.remove('hidden');

  list.querySelectorAll('.strain-item').forEach(el => {
    el.addEventListener('click', () => {
      selectGroup(matches[+el.dataset.idx]);
    });
  });
}

// ── Level 2: Select group → vendor list ──────────────────────────────────────
function selectGroup(groupObj) {
  currentGroup = groupObj;
  openVendor   = null;

  document.getElementById('strain-search').value = groupObj.displayName;
  const list = document.getElementById('strain-list');
  list.innerHTML = '';
  list.classList.add('hidden');

  renderVendorSection();
}

function renderVendorSection() {
  const section = document.getElementById('bank-section');
  if (!currentGroup) { section.classList.add('hidden'); return; }

  // Header
  document.getElementById('selected-strain-name').textContent = currentGroup.displayName;
  const imgEl = document.getElementById('selected-strain-img');
  imgEl.src = currentGroup.imgPath;
  imgEl.onerror = () => imgEl.style.display = 'none';

  // Build vendor map — apply top filters only (quick filters apply per-vendor row)
  const filteredRows = currentGroup.rows.filter(rowMatchesFilters);
  const vendorMap = {};
  filteredRows.forEach(r => {
    if (!vendorMap[r.vendor_name]) vendorMap[r.vendor_name] = [];
    vendorMap[r.vendor_name].push(r);
  });

  const vendors = Object.entries(vendorMap);

  if (!vendors.length) {
    document.getElementById('bank-grid').innerHTML = '<div class="no-results">No vendors match current filters</div>';
    section.classList.remove('hidden');
    return;
  }

  const grid = document.getElementById('bank-grid');
  grid.innerHTML = vendors.map(([vendorName, rows]) => {
    const slug        = slugify(vendorName.split('|')[0].trim());
    const skuCount    = rows.length;
    const sampleRow   = rows[0];
    const ships       = shippingText(sampleRow.shipping_regions);
    const guarantee   = sampleRow.germ_guarantee === 'yes' ? '<i class="fa-solid fa-shield-halved" title="Germ Guarantee"></i>' : '';
    const stealth     = sampleRow.stealth_shipping === 'yes' ? '<i class="fa-solid fa-user-secret" title="Stealth Shipping"></i>' : '';

    // SKU list — filtered by quick filters
    const quickRows = rows.filter(rowMatchesQuick);
    const skuHtml = quickRows.length
      ? quickRows.map(r => `
          <div class="sku-row" data-strain="${encodeURIComponent(JSON.stringify({
            strain_name: r.strain_name,
            product_type: r.product_type,
            pack_size: r.pack_size,
            price_min: r.price_min,
            price_max: r.price_max,
            currency_type: r.currency_type,
            vendor_name: r.vendor_name,
            shipping_regions: r.shipping_regions,
            germ_guarantee: r.germ_guarantee,
            stealth_shipping: r.stealth_shipping,
            loyalty_program: r.loyalty_program,
            payment_methods: r.payment_methods,
            product_url: r.product_url,
            affiliate_url: r.affiliate_url,
            affiliate_param: r.affiliate_param,
            img_path: r.img_path
          }))}">
            <span class="sku-name">${r.strain_name}</span>
            <span class="sku-meta">${[r.product_type, r.pack_size].filter(Boolean).join(' · ')}</span>
          </div>`).join('')
      : '<div class="sku-empty">No listings match current filters</div>';

    return `
      <div class="vendor-row" data-vendor="${vendorName}">
        <div class="vendor-row-header">
          <div class="vendor-row-logo-wrap">
            <img class="vendor-row-img" src="assets/img/company/${slug}.png" alt="${vendorName}"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" />
            <div class="vendor-initials" style="display:none">${initials(vendorName)}</div>
          </div>
          <div class="vendor-row-info">
            <span class="vendor-row-name">${vendorName}</span>
            <span class="vendor-row-meta">${skuCount} listing${skuCount !== 1 ? 's' : ''} &nbsp;${guarantee}${stealth}</span>
          </div>
          <i class="fa-solid fa-chevron-down vendor-chevron"></i>
        </div>
        <div class="vendor-accordion hidden">
          <div class="vendor-details">
            <div class="vendor-detail-row"><i class="fa-solid fa-truck-fast"></i><span>${ships}</span></div>
            <div class="vendor-detail-row"><i class="fa-solid fa-shield-halved"></i><span>${sampleRow.germ_guarantee === 'yes' ? 'Germ Guarantee' : 'No Guarantee'}</span></div>
            <div class="vendor-detail-row"><i class="fa-solid fa-credit-card"></i><span class="payment-icons">${paymentIcons(sampleRow.payment_methods) || 'Not listed'}</span></div>
            ${sampleRow.loyalty_program && sampleRow.loyalty_program !== 'no' ? `<div class="vendor-detail-row"><i class="fa-solid fa-gift"></i><span>${sampleRow.loyalty_program}</span></div>` : ''}
          </div>
          <div class="sku-list">${skuHtml}</div>
        </div>
      </div>`;
  }).join('');

  // Accordion toggle
  grid.querySelectorAll('.vendor-row-header').forEach(header => {
    header.addEventListener('click', () => {
      const row      = header.closest('.vendor-row');
      const vendor   = row.dataset.vendor;
      const accordion = row.querySelector('.vendor-accordion');
      const chevron   = row.querySelector('.vendor-chevron');

      if (openVendor && openVendor !== vendor) {
        const prev = grid.querySelector(`.vendor-row[data-vendor="${CSS.escape(openVendor)}"]`);
        if (prev) {
          prev.querySelector('.vendor-accordion').classList.add('hidden');
          prev.querySelector('.vendor-chevron').classList.remove('open');
        }
      }

      const isOpen = !accordion.classList.contains('hidden');
      accordion.classList.toggle('hidden', isOpen);
      chevron.classList.toggle('open', !isOpen);
      openVendor = isOpen ? null : vendor;
    });
  });

  // SKU click → popup
  grid.querySelectorAll('.sku-row').forEach(el => {
    el.addEventListener('click', () => {
      const data = JSON.parse(decodeURIComponent(el.dataset.strain));
      openSkuModal(data);
    });
  });

  section.classList.remove('hidden');
}

// ── Level 3: SKU popup ────────────────────────────────────────────────────────
function openSkuModal(r) {
  document.getElementById('modal-bank-name').textContent  = r.vendor_name;
  document.getElementById('modal-product-type').textContent = [r.product_type, r.pack_size].filter(Boolean).join(' · ');

  const logoEl = document.getElementById('modal-bank-logo');
  logoEl.src = `assets/img/company/${slugify((r.vendor_name || '').split('|')[0].trim())}.png`;
  logoEl.onerror = () => logoEl.style.display = 'none';

  // Strain image in modal header
  const strainImgEl = document.getElementById('modal-strain-img');
  if (strainImgEl) { strainImgEl.src = r.img_path || ''; strainImgEl.onerror = () => strainImgEl.style.display = 'none'; }

  document.getElementById('modal-lineage').textContent    = r.strain_name || '';
  document.getElementById('modal-shipping').innerHTML     = shippingText(r.shipping_regions);
  document.getElementById('modal-guarantee').textContent  = r.germ_guarantee === 'yes' ? '✓ Yes' : 'No';
  document.getElementById('modal-stealth').textContent    = r.stealth_shipping === 'yes' ? '✓ Yes' : 'No';
  document.getElementById('modal-loyalty').textContent    = (r.loyalty_program && r.loyalty_program !== 'no') ? r.loyalty_program : 'None';
  document.getElementById('modal-payment').innerHTML      = paymentIcons(r.payment_methods) || 'Not listed';

  const price = r.price_min
    ? `${r.price_min}${r.price_max && r.price_max !== r.price_min ? ' – ' + r.price_max : ''} ${r.currency_type || ''}`.trim()
    : 'Price not listed';
  document.getElementById('modal-price').textContent = price;

  document.getElementById('modal-buy-btn').href = buildAffiliateUrl(r);
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Search input ──────────────────────────────────────────────────────────────
document.getElementById('strain-search').addEventListener('input', e => {
  currentGroup = null;
  document.getElementById('bank-section').classList.add('hidden');
  renderDropdown(e.target.value);
});

document.getElementById('strain-search').addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('strain-list').classList.add('hidden');
  }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-bar') && !e.target.closest('#strain-list')) {
    document.getElementById('strain-list').classList.add('hidden');
  }
});

// ── Filters ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const { filter, value } = btn.dataset;
    const set = activeFilters[filter];
    set.has(value) ? set.delete(value) : set.add(value);
    btn.classList.toggle('active');
    openVendor = null;
    if (currentGroup) renderVendorSection();
  });
});

document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const q = btn.dataset.quick;
    activeQuick.has(q) ? activeQuick.delete(q) : activeQuick.add(q);
    btn.classList.toggle('active');
    openVendor = null;
    if (currentGroup) renderVendorSection();
  });
});

// ── Modal close ───────────────────────────────────────────────────────────────
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// ── Share button ──────────────────────────────────────────────────────────────
document.getElementById('share-btn').addEventListener('click', () => {
  const params = new URLSearchParams();
  if (currentGroup) params.set('strain', currentGroup.displayName);
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  navigator.clipboard.writeText(url).then(() => {
    const confirm = document.getElementById('share-confirm');
    confirm.classList.remove('hidden');
    setTimeout(() => confirm.classList.add('hidden'), 2000);
  });
});

// ── URL deep link ─────────────────────────────────────────────────────────────
function loadFromURL() {
  const strain = new URLSearchParams(location.search).get('strain');
  if (!strain) return;
  const match = Object.values(strainGroups).find(g => g.displayName.toLowerCase() === strain.toLowerCase());
  if (match) {
    document.getElementById('strain-search').value = match.displayName;
    selectGroup(match);
  }
}



// ── Init ──────────────────────────────────────────────────────────────────────
Papa.parse('assets/data/seeds.csv', {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete({ data }) {
    data.forEach(r => {
      if (r.img_path) r.img_path = '../medium-feeding/assets/strain-img/' + r.img_path.replace(/^.*\//, '');
    });
    allRows      = data;
    strainGroups = buildStrainGroups(data);
    document.getElementById('loading-state').style.display  = 'none';
    document.getElementById('search-wrap').style.display    = '';
    document.getElementById('filters-wrap').style.display   = '';
    loadFromURL();
  }
});
