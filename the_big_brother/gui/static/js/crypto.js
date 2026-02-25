        async function scanCrypto() {
            const address = document.getElementById('crypto-input').value.trim();
            const coin = document.getElementById('crypto-type').value;
            if (!address) return;

            document.getElementById('crypto-status').innerText = "SYNCING WITH DISTRIBUTED LEDGER...";
            document.getElementById('crypto-results').innerHTML = '<div style="text-align:center; padding:50px;">FETCHING BLOCKS...</div>';

            try {
                const res = await fetch('/api/crypto/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address, coin })
                });
                const data = await res.json();

                if (data.error) {
                    document.getElementById('crypto-status').innerText = "ERROR: " + data.error;
                    document.getElementById('crypto-results').innerHTML = "";
                    return;
                }

                document.getElementById('crypto-status').innerText = `ANALYSIS COMPLETE: ${data.coin.toUpperCase()}`;

                const html = `
                <div class="result-card" style="border-color: #ffd700; max-width:800px; margin:0 auto;">
                    <div class="result-header">
                        <span class="site-name" style="color:#ffd700;">${data.coin.toUpperCase()} WALLET</span>
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
                     <div style="margin-top:20px; word-break:break-all; font-size:0.9rem; color:#666;">
                        ADDR: ${data.address}
                     </div>
                </div>
                `;
                document.getElementById('crypto-results').innerHTML = html;

            } catch (e) {
                document.getElementById('crypto-status').innerText = "LEDGER SYNC FAILED.";
            }
        }
