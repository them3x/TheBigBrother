from io import BytesIO
import tempfile
import os
import requests
import exiftool

def get_exif_data(image_source, is_url: bool = True, filename: str = "upload"):
    results = {"source": image_source if is_url else filename, "basic": {}, "gps": {}, "error": None}
    try:
        if is_url:
            resp = requests.get(image_source, timeout=10)
            if resp.status_code != 200:
                return {"error": f"Failed to download image: {resp.status_code}"}
            content = resp.content
            suffix = os.path.splitext(image_source.split("?")[0])[-1] or ".jpg"
        else:
            content = image_source
            suffix = os.path.splitext(filename)[-1]

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        with exiftool.ExifToolHelper() as et:
            metadata = et.get_metadata(tmp_path)[0]

        os.unlink(tmp_path)

        for key, value in metadata.items():
            if key.startswith("GPS:"):
                results["gps"][key.replace("GPS:", "")] = str(value)
            elif not key.startswith("File:") and len(str(value)) < 500:
                results["basic"][key] = value

    except Exception as e:
        results["error"] = str(e)

    return results
