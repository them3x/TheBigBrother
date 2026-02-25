
let NETSCAN_WORDLIST_LINES = []; // cache em memória (array de strings)

function normalizeWordlistLines(text) {
  // quebra por linha, trim, remove vazias e comentários comuns
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter(l => !l.startsWith('#') && !l.startsWith('//') && !l.startsWith(';'));
}

function updateWordlistUI() {
  const infoEl = document.getElementById('wordlist-info');
  const previewEl = document.getElementById('opt-wordlist-preview');

  if (!infoEl || !previewEl) return;

  if (!NETSCAN_WORDLIST_LINES.length) {
    infoEl.textContent = 'no file loaded';
    previewEl.value = '';
    return;
  }

  infoEl.textContent = `${NETSCAN_WORDLIST_LINES.length} lines loaded`;
  // preview limitado pra não travar o textarea
  const previewMax = 200;
  const slice = NETSCAN_WORDLIST_LINES.slice(0, previewMax);
  previewEl.value = slice.join('\n') + (NETSCAN_WORDLIST_LINES.length > previewMax ? `\n... (${NETSCAN_WORDLIST_LINES.length - previewMax} more)` : '');
}

function clearWordlist() {
  NETSCAN_WORDLIST_LINES = [];
  const fileEl = document.getElementById('opt-wordlist-file');
  if (fileEl) fileEl.value = '';
  updateWordlistUI();
}

function setupWordlistLoader() {
  const fileEl = document.getElementById('opt-wordlist-file');
  if (!fileEl) return;

  // evita múltiplos listeners se esse módulo for recarregado
  if (fileEl.dataset.listenerAttached === '1') return;
  fileEl.dataset.listenerAttached = '1';

  fileEl.addEventListener('change', async () => {
    const f = fileEl.files && fileEl.files[0];
    if (!f) {
      clearWordlist();
      return;
    }

    try {
      const text = await f.text();
      NETSCAN_WORDLIST_LINES = normalizeWordlistLines(text);
      updateWordlistUI();
    } catch (e) {
      console.error(e);
      NETSCAN_WORDLIST_LINES = [];
      updateWordlistUI();
      alert('Failed to read wordlist file.');
    }
  });

  updateWordlistUI();
}

// inicializa loader assim que o script carrega
setupWordlistLoader();

async function scanNetwork() {
  const domain = document.getElementById('network-input').value.trim();
  if (!domain) return;

  // opções do modal
  const fullPorts = document.getElementById('opt-full-ports')?.checked ?? false;
  const scanAllHosts = document.getElementById('opt-scan-all-hosts')?.checked ?? false;

  // wordlist (array de linhas)
  const wordlist = NETSCAN_WORDLIST_LINES; // manda tudo junto

  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;

  const spinner = setInterval(() => {
    document.getElementById('network-status').innerText = `${frames[i++ % frames.length]} SCANNING...`;
  }, 80);

  document.getElementById('network-graph').innerHTML =
    '<div style="text-align:center; padding:100px;">ESTABLISHING CONNECTIONS...</div>';
  document.getElementById('network-ports').innerHTML = '';

  try {
    const res = await fetch('/api/network/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        options: {
          full_ports: fullPorts,
          scan_all_hosts: scanAllHosts
        },
        wordlist // <-- aqui vai a wordlist completa (linha por linha)
      })
    });

    const data = await res.json();
    clearInterval(spinner);

    if (data.error) {
      document.getElementById('network-status').innerText = "ERROR: " + data.error;
      return;
    }

    if (data.map_html) {
      const blob = new Blob([data.map_html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      document.getElementById('network-graph').innerHTML =
        `<iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>`;
    }

    let intelHtml = `<div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px;">`;

    intelHtml += `<div class="result-card" style="border-color:var(--accent-color);">
      <h3 style="color:var(--accent-color); border-bottom:1px solid var(--accent-color)">IPs & PORTS</h3>
      <div style="margin-top:10px;">`;

    if (data.subdomains && Object.keys(data.subdomains).length > 0) {
      Object.entries(data.subdomains).forEach(([ip, info]) => {
        intelHtml += `<div style="margin-bottom:10px;">
          <div style="color:#ffcc00; font-weight:bold; margin-bottom:4px;">⬡ ${ip}</div>`;

        if (info.portScan && info.portScan.length > 0) {
          info.portScan.forEach(p => {
            intelHtml += `<div style="margin-left:12px; margin-bottom:3px; padding:4px 8px; background:rgba(0,255,65,0.1); border-left:2px solid var(--accent-color);">
              <span style="color:var(--accent-color); font-weight:bold;">${p.port}</span>
              <span style="color:#aaa;">${p.service}</span>
            </div>`;
          });
        } else {
          intelHtml += `<div style="margin-left:12px; color:#444; font-size:0.85em;">no open ports</div>`;
        }

        intelHtml += `</div>`;
      });
    } else {
      intelHtml += `<div style="color:#666;">NO IPs DETECTED</div>`;
    }

    intelHtml += `</div></div>`;

    intelHtml += `<div class="result-card" style="border-color:var(--accent-color);">
      <h3 style="color:var(--accent-color); border-bottom:1px solid var(--accent-color)">GEO / WHOIS</h3>
      <div style="font-size:0.9rem; margin-top:10px;">`;

    if (data.geoip && data.geoip.country) {
      intelHtml += `<div style="margin-bottom:5px;"><strong>LOC:</strong> ${data.geoip.country} (${data.geoip.countryCode})</div>`;
      intelHtml += `<div style="margin-bottom:5px;"><strong>ISP:</strong> ${data.geoip.isp}</div>`;
      intelHtml += `<div style="margin-bottom:5px;"><strong>ORG:</strong> ${data.geoip.org}</div>`;
    } else {
      intelHtml += `<div>[GEO DATA UNAVAILABLE]</div>`;
    }

    intelHtml += `<div style="margin:10px 0; border-top:1px dashed #333;"></div>`;

    if (data.whois && data.whois.registrar) {
      intelHtml += `<div style="margin-bottom:5px;"><strong>REG:</strong> ${data.whois.registrar}</div>`;
      intelHtml += `<div style="margin-bottom:5px;"><strong>DATE:</strong> ${data.whois.creation_date}</div>`;
    } else {
      intelHtml += `<div>[WHOIS REDACTED/UNAVAILABLE]</div>`;
    }

    intelHtml += `</div></div>`;

    intelHtml += `<div class="result-card" style="border-color:var(--accent-color);">
      <h3 style="color:var(--accent-color); border-bottom:1px solid var(--accent-color)">DNS RECORDS</h3>
      <div style="font-size:0.9rem; margin-top:10px;">`;

    if (data.dns) {
      if (data.dns.MX && data.dns.MX.length) intelHtml += `<div style="margin-bottom:5px;"><span style="color:#888;">MX:</span> ${data.dns.MX[0]}</div>`;
      if (data.dns.NS && data.dns.NS.length) intelHtml += `<div style="margin-bottom:5px;"><span style="color:#888;">NS:</span> ${data.dns.NS[0]}</div>`;
      if (data.dns.A && data.dns.A.length) intelHtml += `<div style="margin-bottom:5px;"><span style="color:#888;">A:</span> ${data.dns.A.join(', ')}</div>`;
      if (data.dns.TXT && data.dns.TXT.length) intelHtml += `<div style="margin-bottom:5px;"><span style="color:#888;">TXT:</span> ${data.dns.TXT.length} RECORDS</div>`;
    }

    intelHtml += `</div></div></div>`;

    document.getElementById('network-ports').innerHTML = intelHtml;
    document.getElementById('network-status').innerText = "SCAN COMPLETE.";
  } catch (e) {
    console.error(e);
    clearInterval(spinner);
    document.getElementById('network-status').innerText = "NETWORK ERROR.";
  }
}
