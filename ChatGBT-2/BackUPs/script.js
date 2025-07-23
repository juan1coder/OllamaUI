let currentModel = '';
let speakEnabled = false;
let lastSpokenText = '';
let isPromptMode = false;
let chatHistory = [];

async function getModels() {
  const res = await fetch('http://localhost:11434/api/tags');
  const data = await res.json();
  const list = document.getElementById('model-list');
  data.models.forEach(model => {
    const li = document.createElement('li');
    li.textContent = model.name;
    li.onclick = () => {
      currentModel = model.name;
      document.querySelectorAll('#model-list li').forEach(e => e.classList.remove('active'));
      li.classList.add('active');
    };
    list.appendChild(li);
  });
}

async function speakViaGTTS(text) {
  if (!text) {
    console.warn("❌ No text to speak");
    return;
  }

  console.log("🗣️ Sending to gTTS server:", text);

  try {
    const res = await fetch('http://localhost:5002/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: 'en' })
    });

    console.log("📥 Server responded with:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error response from TTS server:", errorText);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
    console.log("✅ Playing audio");
  } catch (err) {
    console.error("💥 Exception during TTS fetch:", err);
  }
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt || !currentModel) return;

  appendMessage('user', prompt);
  document.getElementById('prompt').value = '';

  const finalPrompt = isPromptMode ? `Make this idea more imaginative, creative, detailed, and poetic:\n\"${prompt}\"` : prompt;

  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({ model: currentModel, prompt: finalPrompt }),
  });

  const reader = res.body.getReader();
  let decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    for (let line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);
      if (parsed.response) {
        fullResponse += parsed.response;
        updateLastBotMessage(fullResponse);
      }
    }
  }

  if (speakEnabled) speakText(fullResponse);
  chatHistory.push({ model: currentModel, user: prompt, bot: fullResponse });
});

document.getElementById('enhance-btn').addEventListener('click', () => {
  const textarea = document.getElementById('prompt');
  textarea.value = `Enhance this idea and make it vivid, bold, creative, emotional, and inspiring:\n\n\"${textarea.value.trim()}\"`;
});

document.getElementById('ultra-enhance-btn').addEventListener('click', () => {
  const textarea = document.getElementById('prompt');
  const raw = textarea.value.trim();
  textarea.value = `# Prompt Enhancement Request (Hybrid Format)\n{\n  \"theme\": \"${raw}\",\n  \"style\": \"surreal, poetic, expressive\",\n  \"output_format\": \"JSON+Python hybrid\",\n  \"creative_boost\": true\n}`;
});

document.getElementById('speak-toggle').addEventListener('click', () => {
  speakEnabled = !speakEnabled;
  document.getElementById('speak-toggle').textContent = speakEnabled ? '🔊' : '🔈';
});

document.getElementById('mode-switch').addEventListener('change', (e) => {
  isPromptMode = e.target.checked;
});

document.getElementById('export-chat').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(chatHistory, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chat-log.json';
  a.click();
});

document.getElementById('upload-image').addEventListener('click', () => {
  document.getElementById('image-input').click();
});

document.getElementById('image-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];
    appendMessage('user', '[Image uploaded]');
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: 'llava',
        prompt: 'Describe this image in detail.',
        images: [base64]
      })
    });
    if (!res.ok) {
      updateLastBotMessage("⚠️ Failed to process image.");
      return;
    }
    const readerStream = res.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    while (true) {
      const { done, value } = await readerStream.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (let line of lines) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line);
        if (parsed.response) {
          fullResponse += parsed.response;
          updateLastBotMessage(fullResponse);
        }
      }
    }
    if (speakEnabled) speakText(fullResponse);
    chatHistory.push({ model: 'llava', user: '[Image]', bot: fullResponse });
  };
  reader.readAsDataURL(file);
});

if (speakEnabled) speakViaGTTS(fullResponse);


  document.getElementById('stop-speak').addEventListener('click', () => {
  window.speechSynthesis.cancel();
});

  document.getElementById('replay-speak').addEventListener('click', () => {
  if (lastSpokenText) speakText(lastSpokenText);
});

function appendMessage(sender, text) {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.textContent = text;
  document.getElementById('chat-box').appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
  if (sender === 'user') {
    appendMessage('bot', '...');
  }
}

function updateLastBotMessage(text) {
  const messages = document.querySelectorAll('.message.bot');
  const last = messages[messages.length - 1];
  if (last) last.textContent = text;
}

getModels();
