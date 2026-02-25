import socket
import asyncio
import requests
from pyvis.network import Network
import tempfile
import os, json
import dns.resolver
from the_big_brother.modules import port_scan

# Subdomain Brute force
def subd_discover(domain, wlist):
    def dns_ipv4(mounted_domain):
        try:
            data = socket.getaddrinfo(mounted_domain, None, socket.AF_INET)
            addr = data[2][4][0]
            return addr
        except socket.gaierror:
            return 0

    checked = []
    subdomains = {}
    with open(wlist) as wordlist:
        for line in wordlist.readlines():
            try:
                line = line.replace("\n", "")
                mounted_domain = f"{line}.{domain}"
                if mounted_domain not in checked:
                    addr = dns_ipv4(mounted_domain)
                    if addr != 0:
                        if addr in subdomains:
                            subdomains[addr].append(mounted_domain)
                        else:
                            subdomains[addr] = [mounted_domain]
                    checked.append(mounted_domain)
            except KeyboardInterrupt:
                exit(0)
    return subdomains

async def check_port(ip, port):
    conn = asyncio.open_connection(ip, port)
    try:
        reader, writer = await asyncio.wait_for(conn, timeout=1)
        writer.close()
        await writer.wait_closed()
        return port, True
    except:
        return port, False

def get_geoip(ip):
    try:
        resp = requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return {}

def get_rdap_whois(domain):
    try:
        # RDAP is the new JSON standard for WHOIS
        resp = requests.get(f"https://rdap.org/domain/{domain}", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            # Extract key info safely
            return {
                "registrar": data.get("entities", [{}])[0].get("vcardArray", [[],[]])[1][1][3] if "entities" in data else "Unknown",
                "creation_date":  next((e["date"] for e in data.get("events", []) if e["eventAction"] == "registration"), "Unknown"),
                "status": data.get("status", [])
            }
    except:
        pass
    return {}

def get_dns_records(domain):
    records = {"MX": [], "NS": [], "TXT": []}
    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = 2
        resolver.lifetime = 2
        
        try:
            for r in resolver.resolve(domain, 'MX'):
                records["MX"].append(str(r.exchange))
        except: pass
        
        try:
            for r in resolver.resolve(domain, 'NS'):
                records["NS"].append(str(r.target))
        except: pass
        
        try:
            for r in resolver.resolve(domain, 'TXT'):
                records["TXT"].append(str(r))
        except: pass
        
    except Exception as e:
        print(f"DNS Error: {e}")
    return records

async def scan_target(domain: str):
    """
    Scans a target for IP, open ports, subdomains, GeoIP, Whois, and DNS.
    """
    results = {
        "domain": domain,
        "ip": None,
        "ports": [],
        "subdomains": [],
        "geoip": {},
        "whois": {},
        "dns": {}
    }
    
    # Resolve IP
    try:
        results["ip"] = socket.gethostbyname(domain)
    except:
        return {"error": "Could not resolve domain"}
        
    # Parallel Tasks
    # 1. GeoIP (Sync but fast enough, or thread it)
    results["geoip"] = await asyncio.to_thread(get_geoip, results["ip"])
    
    # 2. Whois
    results["whois"] = await asyncio.to_thread(get_rdap_whois, domain)

    # 3. DNS
    results["dns"] = await asyncio.to_thread(get_dns_records, domain)

    # 4. Subdomain Brute Force
    wordlist = "/app/the_big_brother/wordlist/subdomains-100.txt"
    sudomains = await asyncio.to_thread(subd_discover, domain, wordlist)

    # Add main IP/Domain to list (port scan)
    if results["ip"] in sudomains:
        if domain not in sudomains[results["ip"]]:
            sudomains[results["ip"]].append(domain)
    else:
        sudomains[results["ip"]] = [domain]

    # 5. PortScan
    p = port_scan.PortScan()
    ipv4 = {}
    for ip in subd_discover(domain, wordlist):
        port_results = await asyncio.to_thread(p.scanning, ip)
        ipv4[ip] = {"portScan":port_results, "domains": sudomains[ip]}

    results["subdomains"] = ipv4

    return results

def generate_network_map(data):
#    print(json.dumps(data, indent=4, ensure_ascii=False))

    net = Network(height="600px", width="100%", bgcolor="#0a0a0a", font_color="white")
    
    domain = data["domain"]
    node_details = {}  # Armazena detalhes para o modal

    # Root Node
    net.add_node(domain, label=domain, color="#00ff41", shape="star", size=30)
    node_details[domain] = {
        "type": "Domain",
        "ip": data.get("ip", "N/A"),
        "geoip": data.get("geoip", {})
    }

    # DNS
    dns_data = data.get("dns", {})
    for mx in dns_data.get("MX", []):
        label = f"MX: {mx}"
        net.add_node(label, label=label, color="#00ccff", shape="triangle")
        net.add_edge(domain, label)
        node_details[label] = {"type": "MX Record", "value": mx}
    for ns in dns_data.get("NS", []):
        label = f"NS: {ns}"
        net.add_node(label, label=label, color="#ff00ff", shape="triangle")
        net.add_edge(domain, label)
        node_details[label] = {"type": "NS Record", "value": ns}

    # Subdomains
    for sub_ip, sub_data in data.get("subdomains", {}).items():
        ports = sub_data.get("portScan", [])
        node_details[sub_ip] = {
            "type": "IP Address",
            "ports": ports
        }

        for sub_domain in sub_data.get("domains", []):
            net.add_node(sub_domain, label=sub_domain, color="#00cc00", shape="dot", size=15)
            net.add_edge(domain, sub_domain)
            node_details[sub_domain] = {"type": "Subdomain", "ip": sub_ip}

            net.add_node(sub_ip, label=sub_ip, color="#ffcc00", shape="diamond", size=20)
            net.add_edge(sub_domain, sub_ip)

        for p in ports:
            port_label = f"{p['service']}:{p['port']}"
            node_id = f"port_{sub_ip}_{p['port']}"
            net.add_node(node_id, label=port_label, color="#ff4444", shape="dot", size=8)
            net.add_edge(sub_ip, node_id)
            node_details[node_id] = {"type": "Port", "port": p["port"], "service": p["service"], "ip": sub_ip}

    net.force_atlas_2based()

    html = net.generate_html()

    # Inject modal CSS + JS
    modal_css = """
    <style>
    #nodeModal {
        display: none;
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a2e;
        border: 1px solid #00ff41;
        border-radius: 8px;
        padding: 20px;
        z-index: 9999;
        min-width: 300px;
        color: white;
        font-family: monospace;
        box-shadow: 0 0 30px #00ff4155;
    }
    #nodeModal h3 {
        color: #00ff41;
        margin: 0 0 12px 0;
        border-bottom: 1px solid #333;
        padding-bottom: 8px;
    }
    #nodeModal .close-btn {
        position: absolute;
        top: 10px; right: 14px;
        cursor: pointer;
        color: #ff4444;
        font-size: 18px;
    }
    #nodeModal table { width: 100%; border-collapse: collapse; }
    #nodeModal td { padding: 4px 8px; border-bottom: 1px solid #222; }
    #nodeModal td:first-child { color: #aaa; width: 100px; }
    #overlay {
        display: none;
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9998;
    }
    </style>
    """

    modal_html = """
    <div id="overlay" onclick="closeModal()"></div>
    <div id="nodeModal">
        <span class="close-btn" onclick="closeModal()">✕</span>
        <h3 id="modalTitle"></h3>
        <div id="modalContent"></div>
    </div>
    """

    modal_js = f"""
    <script>
    const nodeDetails = {json.dumps(node_details)};

    function closeModal() {{
        document.getElementById('nodeModal').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    }}

    function buildModalContent(details) {{
        let rows = '';
        if (details.type === 'IP Address') {{
            rows += `<tr><td>Type</td><td>${{details.type}}</td></tr>`;
            if (details.ports && details.ports.length > 0) {{
                const portList = details.ports.map(p => `<span style="color:#ff4444">${{p.port}}</span> <span style="color:#aaa">${{p.service}}</span>`).join('<br>');
                rows += `<tr><td>Ports</td><td>${{portList}}</td></tr>`;
            }} else {{
                rows += `<tr><td>Ports</td><td style="color:#666">None found</td></tr>`;
            }}
        }} else if (details.type === 'Domain') {{
            rows += `<tr><td>Type</td><td>${{details.type}}</td></tr>`;
            rows += `<tr><td>IP</td><td style="color:#ffcc00">${{details.ip}}</td></tr>`;
            if (details.geoip && details.geoip.country) {{
                rows += `<tr><td>Country</td><td>${{details.geoip.country}} (${{details.geoip.countryCode}})</td></tr>`;
                rows += `<tr><td>City</td><td>${{details.geoip.city}}</td></tr>`;
                rows += `<tr><td>ISP</td><td>${{details.geoip.isp}}</td></tr>`;
            }}
        }} else {{
            for (const [key, val] of Object.entries(details)) {{
                rows += `<tr><td>${{key}}</td><td>${{val}}</td></tr>`;
            }}
        }}
        return `<table>${{rows}}</table>`;
    }}

    // Hook into vis.js click event after network is ready
    window.addEventListener('load', () => {{
        const checkNetwork = setInterval(() => {{
            if (typeof network !== 'undefined') {{
                clearInterval(checkNetwork);
                network.on('click', function(params) {{
                    if (params.nodes.length > 0) {{
                        const nodeId = params.nodes[0];
                        const details = nodeDetails[nodeId];
                        if (details) {{
                            document.getElementById('modalTitle').innerText = nodeId;
                            document.getElementById('modalContent').innerHTML = buildModalContent(details);
                            document.getElementById('nodeModal').style.display = 'block';
                            document.getElementById('overlay').style.display = 'block';
                        }}
                    }}
                }});
            }}
        }}, 100);
    }});
    </script>
    """

    html = html.replace("</head>", modal_css + "</head>")
    html = html.replace("</body>", modal_html + modal_js + "</body>")

    return html
