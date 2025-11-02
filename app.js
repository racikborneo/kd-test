// app.js — Kamus Dayak Kanayatn / Ahe ↔ Indonesia
// Pengembang: Nelsen Niko

const input = document.getElementById('wordInput');
const resultBox = document.getElementById('resultBox');
const suggestionsBox = document.getElementById('suggestionsBox');
const clearBtn = document.getElementById('clearButton');
const retryBtn = document.getElementById('retryButton');
const installBtn = document.getElementById('install-btn');
document.getElementById('year').textContent = new Date().getFullYear();

let kamusMap = new Map();
let debounceTimer;
let deferredPrompt;

/* --- Pesan default --- */
function setDefaultMessage() {
  resultBox.style.whiteSpace = 'pre-line';
  resultBox.textContent = `Adil Ka' Talino,\nBacuramitn Ka' Saruga,\nBasengat Ka' Jubata.`;
}

/* --- Memuat file kamus --- */
async function loadKamus() {
  retryBtn.style.display = 'none';
  resultBox.textContent = 'Memuat kamus...';

  try {
  const res = await fetch('/kd/data-max.json?v=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);

  const { kamus } = await res.json();
  kamusMap = new Map(Object.entries(kamus['id-dayak']));
  setDefaultMessage();
  console.log('Kamus berhasil dimuat. Jumlah entri:', kamusMap.size);
} catch (err) {
  console.error('Gagal memuat kamus:', err);
  resultBox.textContent = '❌ Gagal memuat kamus.';
  retryBtn.style.display = 'inline-flex';
  }

/* --- Fungsi debounce --- */
function debounce(fn, delay = 300) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* --- Menampilkan saran kata --- */
function renderSuggestions(list) {
  suggestionsBox.innerHTML = '';
  const fragment = document.createDocumentFragment();
  list.slice(0, 5).forEach(({ id, dy }) => {
    const li = document.createElement('li');
    li.textContent = `${id} → ${dy}`;
    li.tabIndex = 0;
    li.addEventListener('click', () => selectWord(id, dy));
    fragment.appendChild(li);
  });
  suggestionsBox.appendChild(fragment);
}

/* --- Menampilkan hasil pilihan --- */
function selectWord(id, dy) {
  input.value = id;
  resultBox.innerHTML = `<strong>${id}</strong> → ${dy}`;
  suggestionsBox.innerHTML = '';
}

/* --- Fungsi pencarian --- */
function searchWord() {
  const query = input.value.trim().toLowerCase();
  if (!query) {
    setDefaultMessage();
    suggestionsBox.innerHTML = '';
    return;
  }

  let found = false;
  const suggestions = [];

  for (const [id, dy] of kamusMap) {
    const idL = id.toLowerCase();
    const dyL = dy.toLowerCase();

    if (idL === query) {
      selectWord(id, dy);
      found = true;
      break;
    }
    if (dyL === query) {
      selectWord(dy, id);
      found = true;
      break;
    }
    if (idL.startsWith(query) || dyL.startsWith(query)) {
      suggestions.push({ id, dy });
    }
  }

  if (!found) {
    if (suggestions.length) {
      renderSuggestions(suggestions);
      resultBox.textContent = 'Pilih dari saran:';
    } else {
      resultBox.innerHTML = `
        Kata belum ada, tambahkan kata:
        <a href="https://wa.me/6285328736706"
           target="_blank"
           style="color:#1de9b6;font-weight:bold;">klik di sini untuk WhatsApp</a>`;
      suggestionsBox.innerHTML = '';
    }
  }
}

/* --- Event listeners --- */
input.addEventListener('input', debounce(searchWord, 250));
clearBtn.addEventListener('click', () => {
  input.value = '';
  searchWord();
  input.focus();
});
retryBtn.addEventListener('click', loadKamus);

/* --- Jalankan pertama kali --- */
loadKamus();

/* --- Registrasi Service Worker --- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => console.log('✅ Service Worker aktif:', reg.scope))
      .catch(err => console.warn('❌ SW gagal daftar:', err));
  });
}

/* --- Install Prompt (PWA) --- */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (!isStandalone && installBtn) {
    installBtn.style.display = 'block';
    installBtn.addEventListener('click', async () => {
      installBtn.style.display = 'none';
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(outcome === 'accepted' ? 'User menginstal PWA' : 'User batal instal');
      deferredPrompt = null;
    });
  }
});

/* --- Sembunyikan tombol install jika sudah diinstal --- */
window.addEventListener('load', () => {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone && installBtn) {
    installBtn.style.display = 'none';
  }
});
