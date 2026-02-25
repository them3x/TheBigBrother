        async function generateDorks() {
            const target = document.getElementById('dork-target').value.trim();
            const domain = document.getElementById('dork-domain').value.trim();
            if (!target) return;

            try {
                const res = await fetch('/api/tools/dork', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target, domain })
                });
                const data = await res.json();

                let html = "";

                // Render Google Dorks
                html += `<h3 style="color:#fff; border-bottom:1px solid #fff;">GOOGLE (EXTREME)</h3>`;
                data.google.forEach(d => {
                    html += `
                    <div class="result-card" style="border-color:#fff;">
                        <div style="font-weight:bold; color:#fff">${d.title}</div>
                        <div style="font-family:monospace; color:#ccc; background:#222; padding:10px; margin:5px 0; word-break:break-all;">${d.query}</div>
                        <button class="dork-btn" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(d.query)}')">OPEN GOOGLE ></button>
                    </div>`;
                });

                // Render Shodan Dorks
                html += `<h3 style="color:#ff4400; border-bottom:1px solid #ff4400; margin-top:30px;">SHODAN (INFRA)</h3>`;
                data.shodan.forEach(d => {
                    html += `
                    <div class="result-card" style="border-color:#ff4400;">
                        <div style="font-weight:bold; color:#ff4400">${d.title}</div>
                        <div style="font-family:monospace; color:#ccc; background:#222; padding:10px; margin:5px 0;">${d.query}</div>
                        <button class="dork-btn" style="background:#ff4400" onclick="window.open('https://www.shodan.io/search?query=${encodeURIComponent(d.query)}')">OPEN SHODAN ></button>
                    </div>`;
                });

                // Render Github Dorks
                html += `<h3 style="color:#6e5494; border-bottom:1px solid #6e5494; margin-top:30px;">GITHUB (LEAKS)</h3>`;
                data.github.forEach(d => {
                    html += `
                    <div class="result-card" style="border-color:#6e5494;">
                        <div style="font-weight:bold; color:#6e5494">${d.title}</div>
                        <div style="font-family:monospace; color:#ccc; background:#222; padding:10px; margin:5px 0;">${d.query}</div>
                        <button class="dork-btn" style="background:#6e5494" onclick="window.open('https://github.com/search?q=${encodeURIComponent(d.query)}&type=Code')">OPEN GITHUB ></button>
                    </div>`;
                });

                document.getElementById('dork-results').innerHTML = html;
                document.getElementById('dork-status').innerText = "ATTACK VECTORS GENERATED.";

            } catch (e) {
                console.error(e);
            }
        }
