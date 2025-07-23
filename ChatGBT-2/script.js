let currentModel = '';
let speakEnabled = false;
let lastSpokenText = '';
let isPromptMode = false;
let chatHistory = [];

speechSynthesis.onvoiceschanged = () => {
  console.log("🔊 Voices ready:", speechSynthesis.getVoices().map(v => v.name));
};

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

// --- Corrected Speak Toggle Logic ---

const speakToggleBtn = document.getElementById('speak-toggle');
const speakIcon = document.getElementById('speak-icon');
// The 'let speakEnabled' declaration from here has been removed.

speakToggleBtn.addEventListener('click', () => {
  // Toggle the existing 'speakEnabled' variable (declared at the top of your file)
  speakEnabled = !speakEnabled; 

  if (speakEnabled) {
    speakIcon.src = 'icons/audio-speakers-01.svg'; // Set to 'sound on' icon
    speakIcon.alt = 'Sound On';                     // Update accessibility text
    if (lastSpokenText) {
        speakText(lastSpokenText); // Optional: Re-speak the last message when toggled on
    }
  } else {
    speakIcon.src = 'icons/audio-speakers-00.svg'; // Set to 'mute' icon
    speakIcon.alt = 'Mute';                         // Update accessibility text
    window.speechSynthesis.cancel(); // Stop any speech when muted
  }
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

function speakText(text) {
  if (!text || !window.speechSynthesis) return;

  lastSpokenText = text;
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const googleVoice = voices.find(v => v.name.includes("Google"));

  if (googleVoice) {
    utterance.voice = googleVoice;
  }

  utterance.lang = 'en-US';
  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.cancel(); // stop anything currently speaking
  window.speechSynthesis.speak(utterance);
}
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
