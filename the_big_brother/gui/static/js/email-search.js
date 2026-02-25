        async function scanFootprint() {
            const query = document.getElementById('footprint-input').value.trim();
            const type = document.getElementById('footprint-type').value;

            if (!query) return;

            document.getElementById('footprint-status').innerText = "SCANNING DIGITAL TRACE...";
            document.getElementById('footprint-results').innerHTML = '<div style="text-align:center; padding:20px;">ACCESSING DATABASES...</div>';

            try {
                const res = await fetch('/api/footprint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, type })
                });
                const data = await res.json();

                if (data.error) {
                    document.getElementById('footprint-results').innerHTML = `<div class="result-card" style="border-color:var(--error); text-align:center;">ERROR: ${data.error}</div>`;
                } else if (type === "phone") {
                    // Detailed Phone Data
                    const p = data;
                    document.getElementById('footprint-results').innerHTML = `
                    <div class="result-card" style="border-color: #00ff41;">
                        <h3 style="color:#00ff41">PHONE INTELLIGENCE</h3>
                        <p><strong>VALID NUMBER:</strong> ${p.valid}</p>
                        <p><strong>FORMAT:</strong> ${p.number}</p>
                        <p><strong>COUNTRY:</strong> ${p.country}</p>
                        <p><strong>CARRIER:</strong> ${p.carrier}</p>
                        <p><strong>LINE TYPE:</strong> ${p.line_type}</p>
                        <p><strong>TIMEZONES:</strong> ${p.timezones.join(', ')}</p>
                    </div>`;
                    document.getElementById('footprint-status').innerText = "PHONE TRACE COMPLETE.";
                } else { // Email results
                    let contentHtml = "";
                    if (data.found_on.length > 0) {
                        contentHtml += `<div class="result-card" style="border-color:#00ff41;">
                            <h3 style="color:#00ff41; border-bottom:1px solid #005500;">DIGITAL FOOTPRINT DETECTED</h3>
                            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:10px; margin-top:10px;">`;

                        data.found_on.forEach(s => {
                            contentHtml += `<div style="background:#003300; padding:10px; border:1px solid #00ff41; font-size:0.9rem; text-align:center;">${s}</div>`;
                        });
                        contentHtml += `</div></div>`;

                        // MX Status Card
                        const mxColor = data.valid_mx ? "#00ff41" : "red";
                        contentHtml += `<div class="result-card" style="border-color:${mxColor}; margin-top:10px;">
                            <h3 style="color:${mxColor};">MX RECORDS STATUS</h3>
                            <div style="font-size:1.2rem;">${data.valid_mx ? "VALID MAIL SERVER" : "INVALID / UNREACHABLE"}</div>
                            <div style="font-size:0.8rem; color:#888;">${data.mx_records.length} SERVERS FOUND</div>
                        </div>`;

                        document.getElementById('footprint-results').innerHTML = contentHtml;
                        document.getElementById('footprint-status').innerText = `EMAIL FOUND ON ${data.found_on.length} PLATFORMS.`;
                    } else {
                        document.getElementById('footprint-results').innerHTML = `
                         <div class="result-card" style="border-color:gray; text-align:center;">
                            <h3 style="color:gray">NO PUBLIC TRACE</h3>
                            <div>TARGET EMAIL APPEARS CLEAN ON SCANNED PLATFORMS.</div>
                            <div style="margin-top:10px; font-size:0.9rem;">MX VALIDITY: ${data.valid_mx ? "TRUE" : "FALSE"}</div>
                         </div>`;
                    }
                }

            } catch (e) {
                console.error(e);
                document.getElementById('footprint-status').innerText = "ERROR EXECUTING TRACE.";
            }
        }

