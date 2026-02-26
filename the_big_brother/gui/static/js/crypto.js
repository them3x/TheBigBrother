// ===== CSS FIX (ANTI-SOBREPOSIÇÃO / ANTI-CAXA PEQUENA) =====
(function injectCryptoLayoutFix() {
  const css = `
    /* Garante que o container do módulo não tenha posição/limite que quebre o layout */
    #crypto-results {
      width: 100% !important;
      max-width: none !important;
      position: relative !important;
      display: block !important;
      clear: both !important;
      overflow: visible !important;
    }

    /* Wrapper que controla o layout (flex é mais resistente que grid em CSS zoado) */
    #crypto-results .crypto-wrap {
      width: 100% !important;
      max-width: 1600px !important;
      margin: 0 auto !important;
      position: relative !important;
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      gap: 16px !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      overflow: visible !important;
    }

    /* Mata sobreposição causada por position/float no CSS global */
    #crypto-results .crypto-wrap *,
    #crypto-results .crypto-card {
      position: relative !important;
      float: none !important;
    }

    /* Cards: sem max-width, ocupam espaço corretamente */
    #crypto-results .crypto-card {
      box-sizing: border-box !important;
      width: calc(50% - 8px) !important;
      max-width: none !important;
      min-width: 420px !important; /* evita ficar “micro” */
    }

    /* Em telas pequenas: 1 coluna */
    @media (max-width: 1100px) {
      #crypto-results .crypto-card {
        width: 100% !important;
        min-width: 0 !important;
      }
    }

    /* Histórico: mais alto e com scroll */
    #crypto-results .tx-box {
      min-height: 760px !important;
    }
    #crypto-results .tx-scroll {
      height: 660px !important;
      overflow: auto !important;
      padding-right: 10px !important;
    }

    /* Quebra de texto pra não estourar */
    #crypto-results .break {
      word-break: break-all !important;
      overflow-wrap: anywhere !important;
    }
  `;

  // evita duplicar
  if (document.querySelector('style[data-crypto-fix="1"]')) return;

  const style = document.createElement("style");
  style.setAttribute("data-crypto-fix", "1");
  style.textContent = css;
  document.head.appendChild(style);
})();

// ===== FUNÇÕES =====
function fmtBTC(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(8);
}

function short(s, n = 12) {
  if (!s) return "-";
  s = String(s);
  return s.length > (n * 2) ? `${s.slice(0, n)}…${s.slice(-n)}` : s;
}

function rowAddrValue(addr, valBtc, color) {
  return `
    <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
      <div class="break" style="color:#888; flex:1;">${addr || "-"}</div>
      <div style="color:${color}; white-space:nowrap;">${fmtBTC(valBtc)} BTC</div>
    </div>
  `;
}

// ===== MAIN =====
async function scanCrypto() {
  const address = document.getElementById('crypto-input').value.trim();
  const coin = document.getElementById('crypto-type').value;
  if (!address) return;

  const statusEl = document.getElementById('crypto-status');
  const resultsEl = document.getElementById('crypto-results');

  statusEl.innerText = "SYNCING WITH DISTRIBUTED LEDGER...";
  resultsEl.innerHTML = '<div style="text-align:center; padding:50px;">FETCHING BLOCKS...</div>';

  try {
    const res = await fetch('/api/crypto/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, coin })
    });

    const data = await res.json();

    if (data.error) {
      statusEl.innerText = "ERROR: " + data.error;
      resultsEl.innerHTML = "";
      return;
    }

    statusEl.innerText = `ANALYSIS COMPLETE: ${String(data.coin).toUpperCase()}`;

    const txs = (data.history && data.history.txs) ? data.history.txs : [];

    const historyHtml = txs.length ? txs.map(tx => {
      // filtra zerados por satoshi (melhor)
      const ins = (tx.inputs || [])
        .filter(i => Number(i.value_sat || 0) > 0)
        .slice(0, 6)
        .map(i => rowAddrValue(i.address, i.value_btc, "#ffd700"))
        .join("");

      const outs = (tx.outputs || [])
        .filter(o => Number(o.value_sat || 0) > 0)
        .slice(0, 6)
        .map(o => rowAddrValue(o.address, o.value_btc, "#00ff88"))
        .join("");

      const net = Number(tx.net_btc || 0);
      const netColor = net >= 0 ? "#00ff88" : "#ff4d4d";

      return `
        <div style="border:1px solid #222; border-radius:12px; padding:12px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
            <div class="break" style="color:#ffd700;">
              TXID: <a target="_blank" style="color:inherit; text-decoration:none;" href="https://www.blockchain.com/explorer/search?search=${tx.txid}">${short(tx.txid, 14)}</a>
            </div>
            <div style="font-size:0.85rem; color:#aaa; white-space:nowrap;">
              ${tx.time_utc || "-"}
            </div>
          </div>

          <div style="margin-top:6px; font-size:0.85rem; color:#aaa;">
            CONFIRMAÇÕES: <span style="color:#ffd700;">${tx.confirmations ?? 0}</span>
          </div>

          <div style="margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div>
              <div style="font-size:0.75rem; color:#666; margin-bottom:6px;">INPUTS</div>
              ${ins || '<div style="color:#333;">—</div>'}
            </div>
            <div>
              <div style="font-size:0.75rem; color:#666; margin-bottom:6px;">OUTPUTS</div>
              ${outs || '<div style="color:#333;">—</div>'}
            </div>
          </div>

          <div style="margin-top:12px; font-size:0.95rem; color:#aaa;">
            NET: <span style="color:${netColor};">${fmtBTC(net)} BTC</span>
          </div>
        </div>
      `;
    }).join("") : `<div style="color:#666; padding:10px;">Sem histórico.</div>`;

    // ===== HTML FINAL (sem depender do teu CSS global) =====
    const html = `
      <div class="crypto-wrap">

        <div class="result-card crypto-card" style="border-color:#ffd700;">
          <div class="result-header">
            <span class="site-name" style="color:#ffd700;">${String(data.coin).toUpperCase()} WALLET</span>
            <span class="status-badge verified">ACTIVE</span>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
            <div>
              <div style="font-size:0.8rem; color:#888;">BALANCE</div>
              <div style="font-size:2rem; font-weight:bold;">${data.balance}</div>
            </div>
            <div>
              <div style="font-size:0.8rem; color:#888;">TOTAL RECEIVED</div>
              <div style="font-size:2rem; font-weight:bold;">${data.total_received}</div>
            </div>
            <div>
              <div style="font-size:0.8rem; color:#888;">TRANSACTIONS</div>
              <div style="font-size:1.5rem;">${data.tx_count}</div>
            </div>
            <div>
              <div style="font-size:0.8rem; color:#888;">LAST ACTIVITY</div>
              <div style="font-size:1.5rem;">${data.last_seen}</div>
            </div>
          </div>

          <div class="break" style="margin-top:20px; font-size:0.9rem; color:#666;">
            ADDR: ${data.address}
          </div>
        </div>

        <div class="result-card crypto-card tx-box" style="border-color:#333;">
          <div class="result-header">
            <span class="site-name" style="color:#ffd700;">LAST 10 TXS</span>
          </div>
          <div class="tx-scroll" style="margin-top:14px;">
            ${historyHtml}
          </div>
        </div>

      </div>
    `;

    resultsEl.innerHTML = html;

  } catch (e) {
    statusEl.innerText = "LEDGER SYNC FAILED.";
    resultsEl.innerHTML = `<pre style="white-space:pre-wrap; color:#ff6b6b;">${String(e)}</pre>`;
  }
}

// garante que o onclick do HTML acha a função
window.scanCrypto = scanCrypto;
