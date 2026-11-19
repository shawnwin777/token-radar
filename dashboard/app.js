// Token Radar dashboard: renders window.RADAR with no network and no fetch.
// Sorting, filtering and the detail view all run from the same data the
// board.json rows carry. The page recomputes each row's implied value from
// its stored factors (impliedOf), so the code and the board visibly agree:
// implied = round(TVL x categoryMultiple x growthMult x maturityMult x
// breadthMult). Factors are stored rounded to 4 decimals, so a recomputed
// product may differ from the stored value by a few dollars.
(function () {
  var D = window.RADAR;
  if (!D) { document.getElementById('rows').textContent = 'No radar data loaded.'; return; }
  var watch = {};
  D.rows.forEach(function (r) { watch[r.slug] = true; });
  var params = new URLSearchParams(location.search);
  var state = { q: '', cat: '', chain: '', scope: 'all', sort: 'implied', sel: null };

  function $(id) { return document.getElementById(id); }
  function money(n) {
    if (n === null || n === undefined) return 'n/a';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return '<span class="flat">n/a</span>';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(2) + '%</span>';
  }
  function age(r) {
    if (r.age_days === null || r.age_days === undefined) return 'unknown';
    if (r.age_days >= 365) return (r.age_days / 365).toFixed(1) + 'y';
    return r.age_days + 'd';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function impliedOf(r) {
    return Math.max(1, Math.round(r.tvl_usd * r.category_multiple * r.growth_multiplier * r.maturity_multiplier * r.breadth_multiplier));
  }
  function isWatchSlug(slug) { return (D.watchlist || []).indexOf(slug) >= 0; }

  // Header stats.
  var totalImplied = D.rows.reduce(function (a, r) { return a + r.implied_value_usd; }, 0);
  var topCat = {};
  D.rows.forEach(function (r) { topCat[r.category || 'Uncategorised'] = (topCat[r.category || 'Uncategorised'] || 0) + 1; });
  $('stats').innerHTML =
    '<div class="stat"><b>' + D.board_size + '</b><span>Board rows</span></div>' +
    '<div class="stat"><b>' + D.watchlist_size + '</b><span>Watchlist</span></div>' +
    '<div class="stat"><b>' + D.early_size + '</b><span>Early finds</span></div>' +
    '<div class="stat"><b>' + money(totalImplied) + '</b><span>Total implied</span></div>' +
    '<div class="stat"><b>' + esc(D.as_of) + '</b><span>Snapshot</span></div>';
  $('modelbar').innerHTML = '<b>Model ' + esc(D.model_version) + ':</b> implied value = TVL &times; category multiple (median mcap/TVL of live-token peers in the same category, shrunk to the global median ' +
    D.global_multiple + ') &times; growth &times; maturity &times; chain breadth. ' +
    'No name is ever special-cased. Every row below records no token; the live-token set is shown apart, at market value.';

  // Filter options.
  var cats = [], chains = [];
  D.rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();
  cats.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; $('cat').appendChild(o); });
  chains.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; $('chain').appendChild(o); });

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = D.rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (state.scope === 'watchlist' && !isWatchSlug(r.slug)) return false;
      if (state.scope === 'early' && isWatchSlug(r.slug)) return false;
      return true;
    });
    var s = state.sort;
    list.sort(function (a, b) {
      if (s === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (s === 'change') return (b.change_7d === null ? -1e9 : b.change_7d) - (a.change_7d === null ? -1e9 : a.change_7d);
      if (s === 'age') return (b.age_days === null ? -1 : b.age_days) - (a.age_days === null ? -1 : a.age_days);
      if (s === 'name') return a.name < b.name ? -1 : 1;
      return b.implied_value_usd - a.implied_value_usd || a.rank - b.rank;
    });
    return list;
  }

  function render() {
    var list = filtered();
    $('count').textContent = 'Showing ' + list.length + ' of ' + D.rows.length + ' ranked protocols' +
      (state.scope === 'watchlist' ? ' — watchlist only' : state.scope === 'early' ? ' — early finds below the floor only' : '') +
      '. Click any row for its farm plan and model breakdown.';
    var html = '';
    list.forEach(function (r) {
      html += '<tr data-slug="' + esc(r.slug) + '"' + (state.sel === r.slug ? ' class="sel"' : '') + '>' +
        '<td class="num">' + r.rank + '</td>' +
        '<td class="name">' + esc(r.name) + '<small>' + esc(r.slug) + (isWatchSlug(r.slug) ? ' &middot; watchlist' : '') + '</small></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 2).join(', ')) + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r) + '</td>' +
        '<td class="num implied">' + money(r.implied_value_usd) + '</td>' +
        '<td><span class="badge pre">records no token</span></td></tr>';
    });
    $('rows').innerHTML = html || '<tr><td colspan="9">No protocols match these filters.</td></tr>';
    Array.prototype.forEach.call($('rows').querySelectorAll('tr[data-slug]'), function (tr) {
      tr.addEventListener('click', function () { select(tr.getAttribute('data-slug'), true); });
    });
  }

  function select(slug, scroll) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    state.sel = slug;
    var recomputed = impliedOf(r);
    var steps = r.farm_steps.map(function (s, i) {
      var parts = s.split(' Cost: ');
      var head = parts[0] || s;
      var tail = parts[1] ? ' Cost: ' + parts[1] : '';
      return '<li><b>Step ' + (i + 1) + '.</b> ' + esc(head) + esc(tail) + '</li>';
    }).join('');
    $('detail').innerHTML =
      '<h2>#' + r.rank + ' &nbsp;' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' &middot; ' + esc(r.category || 'Uncategorised') + ' &middot; ' + esc(r.chains.join(', ') || 'no chains listed') +
      ' &middot; listed ' + esc(r.listed_at || 'date unknown') + ' &middot; ' + (isWatchSlug(r.slug) ? '<span class="badge watch">Watchlist</span> ' : '<span class="badge pre">Early find</span> ') +
      '<span class="badge pre">records no token</span></p>' +
      '<div class="calc">' +
      '<div><b>' + money(r.tvl_usd) + '</b><span>TVL</span></div>' +
      '<div><b>&times; ' + r.category_multiple.toFixed(3) + '</b><span>Category multiple</span></div>' +
      '<div><b>&times; ' + r.growth_multiplier.toFixed(3) + '</b><span>Growth (' + (r.change_7d === null ? 'n/a' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(2) + '% 7d') + ')</span></div>' +
      '<div><b>&times; ' + r.maturity_multiplier.toFixed(3) + '</b><span>Maturity (' + age(r) + ')</span></div>' +
      '<div><b>&times; ' + r.breadth_multiplier.toFixed(3) + '</b><span>Breadth (' + r.chains.length + ' chains)</span></div>' +
      '<div><b class="eq">= ' + money(r.implied_value_usd) + '</b><span>Implied value (recomputed ' + money(recomputed) + ')</span></div>' +
      '</div>' +
      '<h3>How to farm it — 7 steps</h3><ol>' + steps + '</ol>' +
      '<p class="note">Implied value is this radar\u2019s own claim from the snapshot\u2019s figures. It is not a prediction that ' + esc(r.name) + ' will issue a token, or of any price if it does.</p>';
    render();
    if (scroll) $('detail').scrollIntoView({ behavior: params.get('shot') ? 'auto' : 'smooth', block: 'start' });
  }

  // Live-token set, apart and at market value — never ranked.
  var liveHtml = '<h2>Already trading — shown at market value, never ranked</h2>' +
    '<p class="note">These ' + D.live.length + ' protocols record a token, so the market already prices them. They are here for contrast only: the board above ranks pre-token protocols alone.</p>' +
    '<table><thead><tr><th>Protocol</th><th>Category</th><th>TVL</th><th>Market cap</th><th>7d</th></tr></thead><tbody>';
  D.live.forEach(function (p) {
    liveHtml += '<tr><td class="name">' + esc(p.name) + '<small>' + esc(p.slug) + '</small></td><td>' + esc(p.category || '—') + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd) + '</td><td class="num">' + pct(p.change_7d) + '</td></tr>';
  });
  $('live').innerHTML = liveHtml + '</tbody></table>';

  // Methodology.
  var catRows = D.category_multiples.slice(0, 14).map(function (c) {
    return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.live_peers + '</td><td class="num">' + c.median_ratio.toFixed(3) + '</td><td class="num">' + c.multiple.toFixed(3) + '</td></tr>';
  }).join('');
  $('method').innerHTML = '<h2>How the model works</h2>' +
    '<p><code>implied = TVL &times; categoryMultiple &times; (1 + clamp(change_7d, -50, 150) / 100 &times; 0.55) &times; (0.65 + 0.35 &times; min(age, 1460) / 1460) &times; (1 + 0.03 &times; min(chains - 1, 8))</code></p>' +
    '<p>The category multiple is the median market-cap-to-TVL ratio of the live-token protocols in the same category, shrunk toward the global median (' + D.global_multiple + ') with a prior weight of 6, then clamped to [0.05, 1.20]. A category with few live peers therefore cannot swing the board. Unknown age counts as 365 days; unreported 7-day change counts as 0. No protocol name is special-cased anywhere in the code.</p>' +
    '<table><thead><tr><th>Category</th><th>Live peers</th><th>Median mcap/TVL</th><th>Multiple used</th></tr></thead><tbody>' + catRows + '</tbody></table>' +
    '<p class="note">Farm plans are generated from each protocol\u2019s own record — its category, chains, TVL and age — with a capital tier, weekly actions, a holding period and a claim-safety check. The watchlist is the floor, never the ceiling: ' + D.early_size + ' of the ' + D.board_size + ' rows sit below it.</p>';

  // Controls.
  $('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
  $('cat').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
  $('chain').addEventListener('change', function (e) { state.chain = e.target.value; render(); });
  $('scope').addEventListener('change', function (e) { state.scope = e.target.value; render(); });
  $('sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
  Array.prototype.forEach.call(document.querySelectorAll('th[data-sort]'), function (th) {
    th.addEventListener('click', function () {
      var map = { implied: 'implied', tvl: 'tvl', change: 'change', age: 'age', name: 'name' };
      state.sort = map[th.getAttribute('data-sort')] || 'implied';
      $('sort').value = state.sort;
      render();
    });
  });

  // Screenshot staging: ?shot=board (default), ?shot=detail&slug=…, ?shot=filtered.
  var shot = params.get('shot') || 'board';
  if (shot === 'filtered') {
    var want = cats.indexOf('Lending') >= 0 ? 'Lending' : cats[0];
    state.cat = want; $('cat').value = want; state.sort = 'implied'; $('sort').value = 'implied';
    render();
    select(D.rows[0].slug, false);
  } else if (shot === 'detail') {
    document.body.classList.add('shot-detail');
    var slug = params.get('slug') || D.rows[0].slug;
    render();
    select(slug, false);
  } else {
    render();
    select(D.rows[0].slug, false);
  }
})();
