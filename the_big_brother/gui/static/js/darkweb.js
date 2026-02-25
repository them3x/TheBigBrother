        async function scanDarkWeb() {
            const query = document.getElementById('dark-input').value.trim();
            if (!query) return;

            document.getElementById('dark-status').innerText = "ROUTING THROUGH TOR GATEWAYS...";
            document.getElementById('dark-results').innerHTML = '<div style="color:#ffcc00; text-align:center;">DECYPHERING...</div>';

            try {
                const res = await fetch('/api/dark/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                const data = await res.json();

                if (data.error) {
                    document.getElementById('dark-results').innerHTML = `<div style="color:red">ERROR: ${data.error}</div>`;
                    return;
                }

                let html = "";
                data.results.forEach(item => {
                    const isRansom = item.title.includes("Ransomware");
                    const badgeColor = isRansom ? "#ff00ff" : "#ff0000";
                    const badgeText = isRansom ? "LEAK" : "ONION";

                    html += `
                    <div class="result-card" style="border-color: ${badgeColor};">
                        <div class="result-header">
                            <span class="site-name" style="color:${badgeColor}; font-size:0.9rem;">${item.title}</span>
                            <span class="status-badge" style="border-color:${badgeColor}; color:${badgeColor};">${badgeText}</span>
                        </div>
                        <div style="font-size:0.8rem; color:#888; margin-bottom:5px;">${item.date}</div>
                        <div style="font-size:0.8rem; margin-bottom:10px;">${item.snippet}</div>
                        <a href="${item.link}" target="_blank" class="link" style="color:#ffcc00;">${item.link}</a>
                    </div>`;
                });

                if (data.results.length === 0) html = "<div style='text-align:center;'>NO HIDDEN SERVICES FOUND.</div>";

                document.getElementById('dark-results').innerHTML = html;
                document.getElementById('dark-status').innerText = `FOUND ${data.count} ONION SERVICES.`;

            } catch (e) {
                console.error(e);
                document.getElementById('dark-status').innerText = "CONNECTION FAILURE.";
            }
        }

