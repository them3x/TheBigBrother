from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import requests

SATOSHI_PER_BTC = 100_000_000
WEI_PER_ETH = 10**18

def wei_to_eth(wei: int) -> float:
    return wei / WEI_PER_ETH


def utc_iso(ts_unix: Optional[int]) -> Optional[str]:
    if ts_unix is None:
        return None
    return datetime.fromtimestamp(
        int(ts_unix),
        tz=timezone.utc
    ).strftime('%Y-%m-%d %H:%M:%S UTC')


def _get_tip_height_eth_blockscout(session: requests.Session, timeout: int = 15) -> int:
    # Returns latest block number as integer (hex string converted to int)
    r = session.get(
        "https://eth.blockscout.com/api",
        params={"module": "block", "action": "eth_block_number", "id": 1},
        headers={"Accept": "application/json"},
        timeout=timeout,
    )
    r.raise_for_status()
    tip_hex = r.json().get("result")
    if not isinstance(tip_hex, str) or not tip_hex.startswith("0x"):
        raise ValueError(f"Unexpected tip response: {tip_hex}")
    return int(tip_hex, 16)


def fetch_last_eth_txs_blockscout(
    address: str,
    limit: int = 10,
    timeout: int = 15,
    session: Optional[requests.Session] = None,
) -> Dict[str, Any]:

    s = session or requests.Session()

    # Normalize address
    addr = address.strip().lower()
    if not addr.startswith("0x"):
        addr = "0x" + addr

    tip_height = _get_tip_height_eth_blockscout(s, timeout=timeout)

    # Fetch normal transactions (Etherscan-compatible endpoint)
    r = s.get(
        "https://eth.blockscout.com/api",
        params={
            "module": "account",
            "action": "txlist",
            "address": addr,
            "page": 1,
            "offset": limit,
            "sort": "desc",  # latest first
        },
        timeout=timeout,
    )
    r.raise_for_status()
    data = r.json()

    result = data.get("result", [])
    if not isinstance(result, list):
        result = []

    out_txs: List[Dict[str, Any]] = []

    for tx in result[:limit]:

        txid = tx.get("hash")
        ts = tx.get("timeStamp")          # Unix timestamp (string)
        block_height = tx.get("blockNumber")
        frm = (tx.get("from") or "").lower()
        to = (tx.get("to") or "").lower()
        val_wei_str = tx.get("value")     # Wei as string

        # Convert block number to int
        try:
            bh_int = int(block_height) if block_height is not None else None
        except Exception:
            bh_int = None

        # Compute confirmations
        confirmations = (
            max(0, tip_height - bh_int + 1)
            if isinstance(bh_int, int)
            else 0
        )

        # Convert value to integer Wei
        try:
            val_wei = int(val_wei_str) if val_wei_str is not None else 0
        except Exception:
            val_wei = 0

        inputs = []
        outputs = []

        # Ethereum transactions have a single sender and single recipient
        # (unlike Bitcoin's multiple inputs/outputs model)

        if frm:
            inputs.append({
                "address": frm,
                "value_wei": val_wei,
                "value_eth": wei_to_eth(val_wei),
            })

        if to:
            outputs.append({
                "address": to,
                "value_wei": val_wei,
                "value_eth": wei_to_eth(val_wei),
            })

        # Calculate net value relative to queried address
        sent_wei = val_wei if frm == addr else 0
        received_wei = val_wei if to == addr else 0

        out_txs.append({
            "txid": txid,
            "time_utc": utc_iso(int(ts)) if ts is not None else None,
            "confirmations": confirmations,
            "block_height": bh_int,
            "inputs": inputs,
            "outputs": outputs,
            "net_eth": wei_to_eth(received_wei - sent_wei),
        })

    return {
        "address": addr,
        "txs": out_txs,
    }

def sat_to_btc(sat: int) -> float:
    return sat / SATOSHI_PER_BTC


def utc_iso(ts_unix: Optional[int]) -> Optional[str]:
    if ts_unix is None:
        return None
    return datetime.fromtimestamp(
        int(ts_unix),
        tz=timezone.utc
    ).strftime('%Y-%m-%d %H:%M:%S UTC')


def _get_tip_height(session: requests.Session, timeout: int = 15) -> int:
    r = session.get(
        "https://blockchain.info/latestblock",
        headers={"Accept": "application/json"},
        timeout=timeout,
    )
    r.raise_for_status()
    return r.json()["height"]


def fetch_last_bitcoin_txs_blockchaincom(
    address: str,
    limit: int = 10,
    timeout: int = 15,
    session: Optional[requests.Session] = None,
) -> Dict[str, Any]:

    s = session or requests.Session()
    tip_height = _get_tip_height(s, timeout=timeout)

    url = f"https://blockchain.info/rawaddr/{address}"
    params = {"limit": limit, "offset": 0}

    r = s.get(url, params=params, timeout=timeout)
    r.raise_for_status()
    data = r.json()

    out_txs: List[Dict[str, Any]] = []

    for tx in data.get("txs", [])[:limit]:

        txid = tx.get("hash")
        ts = tx.get("time")
        block_height = tx.get("block_height")

        confirmations = (
            max(0, tip_height - block_height + 1)
            if isinstance(block_height, int)
            else 0
        )

        inputs = []
        outputs = []

        for inp in tx.get("inputs", []):
            prev = inp.get("prev_out", {})
            val = prev.get("value")
            if isinstance(val, int):
                inputs.append({
                    "address": prev.get("addr"),
                    "value_sat": val,
                    "value_btc": sat_to_btc(val),
                })

        for o in tx.get("out", []):
            val = o.get("value")
            if isinstance(val, int):
                outputs.append({
                    "address": o.get("addr"),
                    "value_sat": val,
                    "value_btc": sat_to_btc(val),
                })

        sent_sat = sum(i["value_sat"] for i in inputs if i["address"] == address)
        received_sat = sum(o["value_sat"] for o in outputs if o["address"] == address)

        out_txs.append({
            "txid": txid,
            "time_utc": utc_iso(ts),
            "confirmations": confirmations,
            "block_height": block_height,
            "inputs": inputs,
            "outputs": outputs,
            "net_btc": sat_to_btc(received_sat - sent_sat),
        })

    return {
        "address": address,
        "txs": out_txs,
    }


def analyze_crypto(address: str, coin: str):

    results = {
        "coin": coin,
        "address": address,
        "balance": 0,
        "total_received": 0,
        "tx_count": 0,
        "last_seen": "Never",
        "error": None
    }

    try:
        if coin.lower() == "btc":

            url = f"https://blockchain.info/rawaddr/{address}"
            resp = requests.get(url, timeout=10)

            if resp.status_code != 200:
                results["error"] = f"API returned {resp.status_code}"
                return results

            data = resp.json()

            results["balance"] = data.get("final_balance", 0) / SATOSHI_PER_BTC
            results["total_received"] = data.get("total_received", 0) / SATOSHI_PER_BTC
            results["tx_count"] = data.get("n_tx", 0)

            txs = data.get("txs", [])
            if txs and txs[0].get("time"):
                results["last_seen"] = utc_iso(txs[0]["time"])

            # Get last transactions
            res = fetch_last_bitcoin_txs_blockchaincom(address, limit=10)
            results["history"] = res


        elif coin.lower() == "eth":
            addr = address.strip()
            if not addr.lower().startswith("0x"):
                addr = "0x" + addr
            addr = addr.lower()

            # ---------------------------------------------------
            # 1) Blockscout (Blockchair return 404 etc.)
            # ---------------------------------------------------
            base = "https://eth.blockscout.com/api"

            # balance
            bal_url = f"{base}?module=account&action=balance&address={addr}"
            bal_resp = None
            for _ in range(2):
                bal_resp = requests.get(bal_url, timeout=10)
                if bal_resp.status_code == 200:
                    break
            if bal_resp is None or bal_resp.status_code != 200:
                results["error"] = f"API returned {bal_resp.status_code if bal_resp else 'NO_RESPONSE'}"
                return results

            bal_json = bal_resp.json()
            if str(bal_json.get("status")) != "1" and bal_json.get("message") not in (None, "OK"):
                results["error"] = bal_json.get("result") or "Balance lookup failed"
                return results

            try:
                wei = int(bal_json.get("result", "0"))
            except Exception:
                wei = 0
            results["balance"] = wei / 10**18

            # txlist (tx_count + last_seen + total_received)
            tx_url = f"{base}?module=account&action=txlist&address={addr}&sort=desc"
            tx_resp = None
            for _ in range(2):
                tx_resp = requests.get(tx_url, timeout=10)
                if tx_resp.status_code == 200:
                    break
            if tx_resp is None or tx_resp.status_code != 200:
                results["error"] = f"API returned {tx_resp.status_code if tx_resp else 'NO_RESPONSE'}"
                return results

            tx_json = tx_resp.json()
            txs = tx_json.get("result", [])
            if not isinstance(txs, list):
                results["error"] = tx_json.get("result") or "Txlist lookup failed"
                return results

            results["tx_count"] = len(txs)

            # last_seen
            if txs and txs[0].get("timeStamp"):
                results["last_seen"] = utc_iso(int(txs[0]["timeStamp"]))

            # total_received
            total_in_wei = 0
            for tx in txs:
                try:
                    if (tx.get("to") or "").lower() == addr:
                        total_in_wei += int(tx.get("value", "0"))
                except Exception:
                    pass
            results["total_received"] = total_in_wei / 10**18

            # Get last transactions
            res = fetch_last_eth_txs_blockscout(address, limit=10)
            results["history"] = res


        else:
            results["error"] = "Moeda não suportada"

    except Exception as e:
        results["error"] = str(e)

    return results
