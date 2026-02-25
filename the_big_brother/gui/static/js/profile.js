        let jobId = null;
        let pollInterval = null;
        let currentUsername = "";

        function switchTab(tabId) {
            // Hide all contents
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            // Remove active class from buttons
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

            // Show selected content
            document.getElementById(tabId).classList.add('active');
            // Activate button (logic matches onClick in HTML)
            event.target.classList.add('active');
        }

        async function startScan() {
            const username = document.getElementById('username').value.trim();
            if (!username) return;
            currentUsername = username;

            // Reset UI
            document.getElementById('results').innerHTML = '';
            document.getElementById('images-container').innerHTML = '<div style="color:var(--accent-color); padding:20px; text-align:center; width:100%;">[ SEARCHING FOR BIOMETRIC DATA... ]</div>';
            document.getElementById('status').innerHTML = 'INITIALIZING NEURAL LINK...';
            document.getElementById('status').style.color = '#fff';

            document.getElementById('btn-scan').disabled = true;
            document.getElementById('btn-stop').disabled = false;
            document.getElementById('btn-download').disabled = true;
            document.getElementById('username').disabled = true;

            try {
                const res = await fetch('/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });
                const data = await res.json();
                jobId = data.job_id;

                if (pollInterval) clearInterval(pollInterval);
                pollInterval = setInterval(poll, 1500);
            } catch (e) {
                console.error(e);
                alert("SYSTEM FAILURE: CONNECTION REFUSED");
                resetState();
            }
        }

        async function stopScan() {
            if (!jobId) return;
            try {
                await fetch(`/api/stop/${jobId}`, { method: 'POST' });
                document.getElementById('status').innerText = "ABORTING SEQUENCE...";
                document.getElementById('status').style.color = 'var(--error)';
            } catch (e) { console.error(e); }
        }

        function downloadReport() {
            if (!jobId) return;
            window.location.href = `/api/download/${jobId}`;
        }

        function executeDork() {
            const u = document.getElementById('username').value.trim() || currentUsername;
            if (!u) return alert("ENTER TARGET IDENTIFIER FIRST");

            const type = document.getElementById('dork-select').value;
            let query = "";

            switch (type) {
                case 'linkedin': query = `site:linkedin.com "${u}"`; break;
                case 'instagram': query = `site:instagram.com "${u}"`; break;
                case 'twitter': query = `site:twitter.com "${u}"`; break;
                case 'facebook': query = `site:facebook.com "${u}"`; break;
                case 'tiktok': query = `site:tiktok.com "${u}"`; break;
                case 'pinterest': query = `site:pinterest.com "${u}"`; break;
                case 'github': query = `site:github.com "${u}"`; break;
                case 'gitlab': query = `site:gitlab.com "${u}"`; break;
                case 'stackoverflow': query = `site:stackoverflow.com "${u}"`; break;
                case 'pastebin': query = `site:pastebin.com "${u}"`; break;
                case 'reddit': query = `site:reddit.com "${u}"`; break;
                case 'pdf': query = `filetype:pdf "${u}"`; break;
                case 'doc': query = `filetype:doc "${u}"`; break;
                case 'txt': query = `filetype:txt "${u}"`; break;
                case 'intext': query = `intext:"${u}"`; break;
                case 'intitle': query = `intitle:"${u}"`; break;
                case 'inurl': query = `inurl:"${u}"`; break;
                case 'password': query = `"${u}" "password"`; break;
                case 'email': query = `"${u}" email`; break;
                case 'phone': query = `"${u}" phone`; break;
            }

            if (query) window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        }

        function downloadImage(url) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `target_${currentUsername}.jpg`;
            a.target = '_blank';
            a.click();
        }

        async function poll() {
            if (!jobId) return;

            try {
                const res = await fetch(`/api/results/${jobId}`);
                const data = await res.json();

                renderImages(data.images || []);
                renderResults(data.results);

                let statusText = "";
                let color = "#fff";

                if (data.status === 'running') { statusText = "SCANNING GLOBAL NETWORKS..."; color = "var(--accent-color)"; }
                else if (data.status === 'validating') { statusText = "VERIFYING TARGET VULNERABILITIES [HEADLESS]..."; color = "var(--warning)"; }
                else if (data.status === 'stopped') { statusText = "SEQUENCE ABORTED BY USER."; color = "var(--error)"; }
                else if (data.status === 'completed') { statusText = "TARGET ACQUISITION COMPLETE."; color = "var(--success)"; }
                else if (data.status === 'error') { statusText = "CRITICAL SYSTEM FAILURE."; color = "var(--error)"; }

                const statEl = document.getElementById('status');
                statEl.innerText = statusText;
                statEl.style.color = color;

                if (['completed', 'error', 'stopped'].includes(data.status)) {
                    clearInterval(pollInterval);
                    resetState(true);
                }
            } catch (e) {
                console.error(e);
            }
        }

        function renderImages(images) {
            const container = document.getElementById('images-container');
            // Allow update if we have images and they haven't been rendered yet
            if (images.length > 0 && container.children.length !== images.length) {
                container.innerHTML = images.map(src => `
                    <div class="image-wrapper" onclick="triggerDeepSearch('${src}', this)">
                        <img src="${src}" class="captured-image" onerror="this.parentElement.style.display='none'">
                        <button class="btn-deep">DEEP SEARCH</button>
                    </div>
                `).join('');
            }
        }

        async function triggerDeepSearch(url, wrapper) {
            // Set Target Image in Modal
            document.getElementById('deep-target-img').src = url;

            // Show Scanner Overlay
            document.querySelector('.target-scan').style.display = 'block';

            // Open Modal
            const modal = document.getElementById('deepModal');
            modal.style.display = 'flex';
            document.getElementById('deep-status').innerHTML = "DEPLOYING MULTI-VECTOR VISUAL SEARCH PROTOCOLS...<br><span style='font-size:0.8rem; color:#888'>TARGET: [ GOOGLE ] + [ BING ] + [ YANDEX ] + [ TINEYE ]</span>";

            document.getElementById('google-results').innerHTML = '<div style="color:#00ff41; animation: blink 1s infinite;">[ ESTABLISHING UPLINK... ]</div>';
            document.getElementById('bing-results').innerHTML = '<div style="color:#00ff41; animation: blink 1s infinite;">[ ESTABLISHING UPLINK... ]</div>';
            document.getElementById('yandex-results').innerHTML = '<div style="color:#00ff41; animation: blink 1s infinite;">[ ESTABLISHING UPLINK... ]</div>';
            document.getElementById('tineye-results').innerHTML = '<div style="color:#00ff41; animation: blink 1s infinite;">[ ESTABLISHING UPLINK... ]</div>';

            try {
                const res = await fetch('/api/deep-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_url: url })
                });
                const data = await res.json();

                // Stop Scanner Overlay to indicate completion
                document.querySelector('.target-scan').style.display = 'none';

                document.getElementById('deep-status').innerText = "TARGET VISUAL MATCHES ACQUIRED.";

                renderDeepResults('google-results', data.google);
                renderDeepResults('bing-results', data.bing);
                renderDeepResults('yandex-results', data.yandex);
                renderDeepResults('tineye-results', data.tineye);

            } catch (e) {
                console.error(e);
                document.getElementById('deep-status').innerText = "VISUAL SEARCH FAILURE: CONNECTION LOST.";
                document.querySelector('.target-scan').style.display = 'none';
            }
        }

        function renderDeepResults(divId, images) {
            const container = document.getElementById(divId);
            if (!images || images.length === 0) {
                container.innerHTML = '<div style="color:#444">NO MATCHES FOUND</div>';
                return;
            }
            container.innerHTML = images.map(src => `<img src="${src}" class="deep-img" onclick="window.open('${src}')">`).join('');
        }

        function closeDeepModal() {
            document.getElementById('deepModal').style.display = 'none';
        }

        function renderResults(results) {
            const container = document.getElementById('results');
            // Sort: Verified first
            const sorted = [...results].sort((a, b) => {
                const rank = s => {
                    if (s === 'Verified') return 0;
                    if (s === 'Checking...') return 1;
                    if (s === 'Pending') return 2;
                    return 3;
                }
                return rank(a.validation) - rank(b.validation);
            });

            container.innerHTML = sorted.map(r => `
                <div class="result-card">
                    <div class="result-header">
                        <span class="site-name">${r.site}</span>
                        ${renderBadge(r)}
                    </div>
                    <a href="${r.url}" target="_blank" class="link">${r.url}</a>
                    ${r.page_title ? `<div class="meta-info">TITLE: ${r.page_title}</div>` : ''}
                    ${r.reason ? `<div class="meta-info" style="color:var(--error)">ERR: ${r.reason}</div>` : ''}
                </div>
            `).join('');
        }

        function renderBadge(res) {
            if (res.validation === 'Pending') return '<span class="status-badge">PENDING</span>';
            if (res.validation === 'Checking...') return '<span class="status-badge check">CHECKING</span>';
            if (res.validation === 'Verified') return '<span class="status-badge verified">VERIFIED</span>';
            if (res.validation === 'False Positive') return '<span class="status-badge false">FALSE+</span>';
            return '';
        }

        function resetState(finished = false) {
            document.getElementById('btn-scan').disabled = false;
            document.getElementById('btn-stop').disabled = true;
            document.getElementById('btn-download').disabled = !finished;
            document.getElementById('username').disabled = false;
        }

