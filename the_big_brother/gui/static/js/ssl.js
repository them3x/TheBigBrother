        async function scanSSL() {
            const domain = document.getElementById('ssl-input').value.trim();
            if (!domain) return;

            document.getElementById('ssl-status').innerText = "INITIATING SSL HANDSHAKE...";
            document.getElementById('ssl-results').innerHTML = '<div style="text-align:center; padding:50px;">DECODING CERTIFICATE CHAIN...</div>';

            try {
                const res = await fetch('/api/ssl/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domain })
                });
                const data = await res.json();

                if (data.error) {
                    document.getElementById('ssl-status').innerText = "SSL FAIL: " + data.error;
                    document.getElementById('ssl-results').innerHTML = "";
                    return;
                }

                document.getElementById('ssl-status').innerText = "CERTIFICATE VERIFIED.";

                let sansHtml = data.sans.map(s => `<span style="background:#003333; padding:2px 5px; margin:2px; display:inline-block; font-size:0.8rem; border:1px solid #00ffff;">${s}</span>`).join('');

                const html = `
                 <div class="result-card" style="border-color: #00ffff; width:100%;">
                    <div class="result-header">
                        <span class="site-name" style="color:#00ffff;">${data.domain}</span>
                        ${data.expired ? '<span class="status-badge" style="color:red; border-color:red">EXPIRED</span>' : '<span class="status-badge verified">VALID</span>'}
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div>
                            <h4 style="color:#00ffff; border-bottom:1px solid #005555; padding-bottom:5px;">ISSUED BY</h4>
                            ${renderDict(data.issuer)}
                             <div style="margin-top:10px;">
                                <div style="font-size:0.8rem; color:#888;">VALIDITY</div>
                                <div>${data.not_before} -> ${data.not_after}</div>
                             </div>
                        </div>
                        <div>
                            <h4 style="color:#00ffff; border-bottom:1px solid #005555; padding-bottom:5px;">ISSUED TO</h4>
                            ${renderDict(data.subject)}
                        </div>
                    </div>
                    
                    <div style="margin-top:20px;">
                         <h4 style="color:#00ffff; border-bottom:1px solid #005555; padding-bottom:5px;">SUBDOMAINS (SANs) [${data.sans.length}]</h4>
                         <div style="margin-top:10px;">${sansHtml}</div>
                    </div>
                 </div>
                `;
                document.getElementById('ssl-results').innerHTML = html;

            } catch (e) {
                document.getElementById('ssl-status').innerText = "HANDSHAKE FAILED.";
            }
        }

