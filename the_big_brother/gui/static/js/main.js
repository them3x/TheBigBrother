const moduleMap = {
    'tab-profiler':  'modules/profile.html',
    'tab-footprint': 'modules/email-search.html',
    'tab-network':   'modules/network-mapper.html',
    'tab-darkwatch': 'modules/dark_watch.html',
    'tab-crypto':    'modules/cripto.html',
    'tab-ssl':       'modules/ssl.html',
    'tab-exif':      'modules/exiftool.html',
    'tab-dorks':     'modules/dork.html',
    'tab-geoint':    'modules/geolock.html',
    'tab-flight':    'modules/skyradar.html',
};

async function loadModules() {
    for (const [id, path] of Object.entries(moduleMap)) {
        const res = await fetch(path);
        const html = await res.text();
        const container = document.getElementById(id);
        container.innerHTML = html;

        container.querySelectorAll('script').forEach(old => {
            const s = document.createElement('script');
            if (old.src) {
                s.src = old.src;
            } else {
                s.textContent = old.textContent;
            }
            document.body.appendChild(s);
            old.remove();
        });
    }
}

document.addEventListener('DOMContentLoaded', loadModules);

