import requests
import json

url = "http://127.0.0.1:8001/transcribe"
payload = {
    "audio_path": "D:\\kuliahyangbetul\\19MJ\\BE\\storage\\interviews\\12\\media-1779627716533.webm"
}

print("Triggering manual test transcription via Python STT...")
response = requests.post(url, json=payload)
print("Status Code:", response.status_code)
print("Response JSON:")
print(json.dumps(response.json(), indent=2))
