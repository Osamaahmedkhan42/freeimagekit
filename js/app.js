/* ===================================================
   app.js — Tab switching, shared utilities, navbar
   =================================================== */

'use strict';

// ===== TAB SWITCHING =====
const tabs = ['home', 'resize', 'passport', 'compress', 'pdf'];

function switchTab(tabId) {
  if (!tabs.includes(tabId)) return;

  // Hide all sections
  tabs.forEach(t => {
    const section = document.getElementById('tab-' + t);
    if (section) section.classList.remove('active');
  });

  // Show target
  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabId);
  });

  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Close mobile menu
  document.getElementById('nav-links').classList.remove('open');
}

// Nav links (desktop + mobile)
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab(link.dataset.tab);
  });
});

// Tool cards on home
document.querySelectorAll('.tool-card').forEach(card => {
  card.addEventListener('click', () => {
    switchTab(card.dataset.tab);
  });
});

// Back buttons in tools
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Logo → home
document.getElementById('logo-link').addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('home');
});

// Hamburger menu toggle
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('open');
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
});

// ===== TOAST NOTIFICATION =====
let toastTimeout = null;
function showToast(message, type = 'info') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast toast-' + type;
  // Force reflow for animation
  toast.offsetHeight;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ===== SHARED FILE READING =====
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// ===== FORMAT FILE SIZE =====
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ===== DRAW IMAGE ON CANVAS (fit to max size) =====
function drawImageFit(canvas, img, maxW = 500, maxH = 280) {
  const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
  canvas.width  = Math.round(img.width  * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// ===== SETUP UPLOAD ZONE (drag & drop + click) =====
function setupUploadZone(zoneId, inputId, onFiles, multiple = false) {
  const zone  = document.getElementById(zoneId);
  const input = document.getElementById(inputId);

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onFiles(multiple ? files : [files[0]]);
  });

  input.addEventListener('change', () => {
    const files = Array.from(input.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onFiles(multiple ? files : [files[0]]);
    input.value = ''; // allow re-selecting same file
  });
}

// ===== TRIGGER DOWNLOAD =====
// Always converts data URLs → Blob URLs so browsers respect the filename.
// (Chromium ignores the `download` attribute on raw data: URLs from file://)
function triggerDownload(urlOrDataURL, filename) {
  let objectURL = urlOrDataURL;
  let needsRevoke = false;

  if (urlOrDataURL.startsWith('data:')) {
    // Parse data URL into a Blob
    const [header, b64] = urlOrDataURL.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    objectURL = URL.createObjectURL(blob);
    needsRevoke = true;
  }

  const a = document.createElement('a');
  a.href = objectURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (needsRevoke) {
    setTimeout(() => URL.revokeObjectURL(objectURL), 10000);
  }
}

// ===== CANVAS TO BLOB =====
function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

// Expose utilities globally for other modules
window.IK = {
  switchTab,
  showToast,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  loadImage,
  formatBytes,
  drawImageFit,
  setupUploadZone,
  triggerDownload,
  canvasToBlob,
};
