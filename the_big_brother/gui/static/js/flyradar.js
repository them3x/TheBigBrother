        let flightMap = null;
        async function scanSky() {
            const lat = document.getElementById('sky-lat').value.trim();
            const lon = document.getElementById('sky-lon').value.trim();
            const rad = document.getElementById('sky-rad').value.trim();
            if (!lat || !lon) return;

            document.getElementById('sky-status').innerText = "SCANNING AIRSPACE...";
            document.getElementById('sky-results').innerHTML = "<div style='text-align:center'>READING TRANSPONDERS...</div>";

            // Initialize Map if needed
            const mapDiv = document.getElementById('sky-map');
            mapDiv.style.display = 'block';
            if (!flightMap) {
                flightMap = L.map('sky-map').setView([lat, lon], 10);
                L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap &copy; CartoDB',
                    subdomains: 'abcd',
                    maxZoom: 19
                }).addTo(flightMap);
            } else {
                flightMap.setView([lat, lon], 10);
                flightMap.eachLayer((layer) => {
                    if (layer instanceof L.Marker) { flightMap.removeLayer(layer); }
                });
            }

            // Marker for Target
            L.marker([lat, lon]).addTo(flightMap).bindPopup("TARGET LOCATION").openPopup();

            try {
                const res = await fetch('/api/tools/flight', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat: parseFloat(lat), lon: parseFloat(lon), radius: parseFloat(rad) })
                });
                const data = await res.json();

                if (data.error || data.message) {
                    document.getElementById('sky-status').innerText = "SECTOR CLEAR or ERROR.";
                    document.getElementById('sky-results').innerHTML = `<div style="text-align:center">${data.error || data.message}</div>`;
                    return;
                }

                let listHtml = "";
                data.flights.forEach(f => {
                    // Add to map
                    if (f.lat && f.lon) {
                        const iconHtml = `<div style="color:#0099ff; font-size:20px; transform: rotate(${f.true_track || 0}deg); text-shadow:0 0 5px #0099ff;">✈</div>`;
                        const divIcon = L.divIcon({ html: iconHtml, className: 'plane-icon', iconSize: [24, 24], popupAnchor: [0, -10] });
                        const marker = L.marker([f.lat, f.lon], { icon: divIcon }).addTo(flightMap)
                            .bindPopup(`<strong style="color:#0099ff">${f.callsign || 'UNKNOWN'}</strong><br>${f.country}<br>Alt: ${f.alt}m | Vel: ${f.velocity}m/s`);

                        // Add marker reference to access later if needed (simple implementation)
                    }

                    // Populate List
                    listHtml += `
                    <div class="result-card" style="border-color:#0055aa; margin-bottom:10px; padding:10px; cursor:pointer; background:rgba(0,0,0,0.5);" onclick="focusMap(${f.lat}, ${f.lon}, '${f.callsign}')">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="site-name" style="color:#0099ff; font-size:1rem;">${f.callsign || 'UNK'}</span>
                            <span style="font-size:0.7rem; background:#003366; padding:2px 5px; border-radius:4px;">${f.country.substring(0, 3).toUpperCase()}</span>
                        </div>
                        <div style="font-size:0.8rem; margin-top:5px; display:flex; justify-content:space-between; color:#ccc;">
                            <span>ALT: ${f.alt}m</span>
                            <span>VEL: ${f.velocity}m/s</span>
                        </div>
                    </div>`;
                });

                document.getElementById('sky-results').innerHTML = listHtml || '<div style="text-align:center">NO TARGETS IN RANGE</div>';
                document.getElementById('sky-status').innerText = `TRACKING ${data.count} AIRCRAFT.`;

            } catch (e) {
                console.error(e);
                document.getElementById('sky-status').innerText = "RADAR MALFUNCTION.";
            }
        }

        function focusMap(lat, lon, callsign) {
            if (flightMap) {
                flightMap.setView([lat, lon], 12);
                // Optionally find marker and open popup - requires storing markers in object/array
            }
        }

        function updateSkyRegion() {
            const regions = {
                "uk": { lat: 51.5074, lon: -0.1278, rad: 300 },
                "usa_east": { lat: 40.7128, lon: -74.0060, rad: 500 },
                "usa_west": { lat: 34.0522, lon: -118.2437, rad: 500 },
                "france": { lat: 48.8566, lon: 2.3522, rad: 300 },
                "germany": { lat: 52.5200, lon: 13.4050, rad: 300 },
                "russia": { lat: 55.7558, lon: 37.6173, rad: 400 },
                "china": { lat: 31.2304, lon: 121.4737, rad: 500 },
                "japan": { lat: 35.6762, lon: 139.6503, rad: 300 },
                "dubai": { lat: 25.2048, lon: 55.2708, rad: 200 }
            };
            const sel = document.getElementById('sky-country').value;
            if (regions[sel]) {
                document.getElementById('sky-lat').value = regions[sel].lat;
                document.getElementById('sky-lon').value = regions[sel].lon;
                document.getElementById('sky-rad').value = regions[sel].rad;
            }
        }

        function renderDict(obj) {
            return Object.entries(obj).map(([k, v]) => `<div><span style="color:#666">${k}:</span> ${v}</div>`).join('');
        }
