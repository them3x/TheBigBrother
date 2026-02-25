        async function runGeoint() {
            const lat = document.getElementById('geo-lat').value.trim();
            const lon = document.getElementById('geo-lon').value.trim();
            if (!lat || !lon) return;

            document.getElementById('geo-status').innerText = "TRIANGULATING POSITION...";
            document.getElementById('geo-results').innerHTML = '<div style="text-align:center; padding:50px;">ACQUIRING SATELLITE LOCK...</div>';

            try {
                const res = await fetch('/api/tools/geoint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat, lon })
                });
                const data = await res.json();

                if (data.error) {
                    document.getElementById('geo-status').innerText = data.error;
                    document.getElementById('geo-results').innerHTML = "";
                    return;
                }

                let linksHtml = "";
                for (const [key, url] of Object.entries(data.links)) {
                    linksHtml += `
                    <div class="result-card" style="border-color:#00ff00;">
                        <div style="font-weight:bold; color:#00ff00">${key}</div>
                        <button class="dork-btn" style="background:#00ff00; color:black; font-weight:bold;" onclick="window.open('${url}')">LAUNCH VIEW ></button>
                    </div>`;
                }
                document.getElementById('geo-results').innerHTML = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">${linksHtml}</div>`;
                document.getElementById('geo-status').innerText = `TARGET ACQUIRED: ${data.coords}`;

            } catch (e) {
                document.getElementById('geo-status').innerText = "SATELLITE LINK FAILED.";
            }
        }

