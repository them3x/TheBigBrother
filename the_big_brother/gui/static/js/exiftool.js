        async function analyzeExifFile() {
            const fileInput = document.getElementById('exif-file');
            if (fileInput.files.length === 0) return;
            const file = fileInput.files[0];

            document.getElementById('exif-status').innerText = "UPLOADING BITSTREAM...";
            document.getElementById('exif-results').innerHTML = '<div style="text-align:center; padding:50px;">EXTRACTING METADATA LAYERS...</div>';

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/tools/exif/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                renderExif(data);
            } catch (e) {
                document.getElementById('exif-status').innerText = "UPLOAD FAILED.";
            }
        }

        function renderExif(data) {
            if (data.error) {
                document.getElementById('exif-status').innerText = "EXTRACT FAIL: " + data.error;
                document.getElementById('exif-results').innerHTML = "";
                return;
            }
            document.getElementById('exif-status').innerText = "METADATA REVEALED.";
            let gpsHtml = "";
            if (data.gps && Object.keys(data.gps).length > 0) {
                gpsHtml = `<h4 style="color:var(--accent-color); border-bottom:1px solid var(--accent-color); margin-top:20px;">GEOLOCATION DATA</h4>` + renderDict(data.gps);
            } else {
                gpsHtml = `<div style="margin-top:20px; color:#666">[NO GPS DATA EMBEDDED]</div>`;
            }

            const html = `
                 <div class="result-card" style="border-color: var(--accent-color); width: 90vw;">
                    <div class="result-header">
                        <span class="site-name" style="color:var(--accent-color);">IMAGE METADATA</span>
                        <span class="status-badge" style="border-color:var(--accent-color); color:var(--accent-color);">EXIF</span>
                    </div>
                    <div>
                        <h4 style="color:var(--accent-color); border-bottom:1px solid var(--accent-color);">BASIC INFO</h4>
                        ${renderDict(data.basic)}
                    </div>
                    ${gpsHtml}
                 </div>
                `;
            document.getElementById('exif-results').innerHTML = html;
        }

        async function analyzeExif() {
            const url = document.getElementById('exif-input').value.trim();
            if (!url) return;

            document.getElementById('exif-status').innerText = "DOWNLOADING RAW BYTES...";
            document.getElementById('exif-results').innerHTML = '<div style="text-align:center; padding:50px;">EXTRACTING METADATA LAYERS...</div>';

            try {
                const res = await fetch('/api/tools/exif', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                const data = await res.json();
                renderExif(data);

            } catch (e) {
                document.getElementById('exif-status').innerText = "ANALYSIS ERROR.";
            }
        }

