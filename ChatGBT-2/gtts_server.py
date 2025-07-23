# gtts_server.py
from flask import Flask, request, send_file
from gtts import gTTS
import tempfile
import os

app = Flask(__name__)

@app.route('/speak', methods=['POST'])
def speak():
    data = request.json
    text = data.get("text", "")
    lang = data.get("lang", "en")

    if not text.strip():
        return {"error": "No text provided"}, 400

    try:
        # Create a temporary file
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        tts = gTTS(text=text, lang=lang)
        tts.save(tmp_file.name)

        return send_file(tmp_file.name, mimetype='audio/mpeg', as_attachment=False)

    except Exception as e:
        return {"error": str(e)}, 500

if __name__ == '__main__':
    app.run(port=5002)

