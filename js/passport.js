/* ===================================================
   passport.js — Tool 2: Passport Photo Generator
   =================================================== */

'use strict';

(function () {
  // Passport size presets (width × height in mm)
  const PRESETS = {
    us:     { w: 51,  h: 51,  label: 'USA 2×2"' },
    uk:     { w: 35,  h: 45,  label: 'UK 35×45mm' },
    eu:     { w: 35,  h: 45,  label: 'EU/Schengen 35×45mm' },
    pk:     { w: 35,  h: 45,  label: 'Pakistan 35×45mm' },
    in:     { w: 35,  h: 45,  label: 'India 35×45mm' },
    ca:     { w: 50,  h: 70,  label: 'Canada 50×70mm' },
    custom: { w: 35,  h: 45,  label: 'Custom' },
  };

  // Print sheet dimensions: 4×6 inch = 101.6×152.4mm
  const SHEET_W_MM = 101.6;
  const SHEET_H_MM = 152.4;

  let originalImg   = null;
  let passportDataURL = null;
  let sheetDataURL    = null;

  const sizeSelect    = document.getElementById('passport-size');
  const bgSelect      = document.getElementById('passport-bg');
  const dpiSelect     = document.getElementById('passport-dpi');
  const sheetToggle   = document.getElementById('passport-sheet');
  const customInputs  = document.getElementById('custom-size-inputs');
  const customW       = document.getElementById('passport-custom-w');
  const customH       = document.getElementById('passport-custom-h');
  const generateBtn   = document.getElementById('passport-generate-btn');
  const downloadBtn   = document.getElementById('passport-download-btn');
  const sheetDownBtn  = document.getElementById('passport-sheet-download-btn');
  const resetBtn      = document.getElementById('passport-reset-btn');
  const controls      = document.getElementById('passport-controls');
  const canvasOrig    = document.getElementById('passport-preview-original');
  const canvasOut     = document.getElementById('passport-preview-output');
  const infoOut       = document.getElementById('passport-info-output');

  // Show/hide custom inputs
  sizeSelect.addEventListener('change', () => {
    customInputs.style.display = sizeSelect.value === 'custom' ? 'block' : 'none';
  });

  // Upload
  IK.setupUploadZone('passport-upload-zone', 'passport-file-input', async (files) => {
    try {
      const dataURL = await IK.readFileAsDataURL(files[0]);
      originalImg = await IK.loadImage(dataURL);
      controls.style.display = 'block';
      document.getElementById('passport-upload-zone').style.display = 'none';
      IK.drawImageFit(canvasOrig, originalImg);
      passportDataURL = null;
      sheetDataURL = null;
      downloadBtn.disabled = true;
      sheetDownBtn.disabled = true;
      infoOut.textContent = 'Press "Generate Photo" to create';
    } catch {
      IK.showToast('❌ Failed to load image', 'error');
    }
  });

  // Generate passport photo
  generateBtn.addEventListener('click', () => {
    if (!originalImg) return;

    const dpi = parseInt(dpiSelect.value);
    const bg  = bgSelect.value;

    // Get dimensions in mm
    let preset;
    if (sizeSelect.value === 'custom') {
      preset = { w: parseFloat(customW.value), h: parseFloat(customH.value) };
    } else {
      preset = PRESETS[sizeSelect.value];
    }

    if (!preset || isNaN(preset.w) || isNaN(preset.h)) {
      IK.showToast('⚠ Invalid dimensions', 'error');
      return;
    }

    // Convert mm → pixels at given DPI
    const MM_PER_INCH = 25.4;
    const pxW = Math.round((preset.w / MM_PER_INCH) * dpi);
    const pxH = Math.round((preset.h / MM_PER_INCH) * dpi);

    // Create passport photo canvas
    const canvas = document.createElement('canvas');
    canvas.width  = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, pxW, pxH);

    // Draw image: cover-fit (centered crop)
    const srcRatio  = originalImg.width  / originalImg.height;
    const destRatio = pxW / pxH;
    let sx, sy, sw, sh;
    if (srcRatio > destRatio) {
      // wider than needed: crop sides
      sh = originalImg.height;
      sw = Math.round(sh * destRatio);
      sx = Math.round((originalImg.width - sw) / 2);
      sy = 0;
    } else {
      // taller than needed: crop top/bottom (keep top-biased for faces)
      sw = originalImg.width;
      sh = Math.round(sw / destRatio);
      sx = 0;
      sy = Math.round((originalImg.height - sh) * 0.2); // slight top bias for face
    }

    ctx.drawImage(originalImg, sx, sy, sw, sh, 0, 0, pxW, pxH);

    passportDataURL = canvas.toDataURL('image/jpeg', 0.95);

    // Preview output (scaled)
    IK.drawImageFit(canvasOut, canvas, 220, 280);
    canvasOut.width  = Math.round(canvas.width);
    canvasOut.height = Math.round(canvas.height);
    const dctx = canvasOut.getContext('2d');
    dctx.drawImage(canvas, 0, 0);
    const scale = Math.min(220 / pxW, 280 / pxH, 1);
    canvasOut.style.width  = (pxW * scale) + 'px';
    canvasOut.style.height = (pxH * scale) + 'px';

    const base64 = passportDataURL.split(',')[1];
    const bytes  = Math.round(base64.length * 0.75);
    infoOut.textContent = `${pxW}×${pxH} px at ${dpi} DPI · ~${IK.formatBytes(bytes)}`;

    downloadBtn.disabled = false;

    // Generate print sheet if toggled
    if (sheetToggle.checked) {
      generatePrintSheet(canvas, pxW, pxH, dpi, bg);
    } else {
      sheetDataURL = null;
      sheetDownBtn.disabled = true;
    }

    IK.showToast('✅ Passport photo ready!', 'success');
  });

  function generatePrintSheet(passportCanvas, pxW, pxH, dpi, bg) {
    const MM_PER_INCH = 25.4;
    const sheetPxW = Math.round((SHEET_W_MM / MM_PER_INCH) * dpi);
    const sheetPxH = Math.round((SHEET_H_MM / MM_PER_INCH) * dpi);

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width  = sheetPxW;
    sheetCanvas.height = sheetPxH;
    const ctx = sheetCanvas.getContext('2d');

    // White page background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetPxW, sheetPxH);

    // Margin in px
    const marginPx = Math.round((3 / MM_PER_INCH) * dpi); // 3mm margin
    const gapPx    = Math.round((2 / MM_PER_INCH) * dpi); // 2mm gap

    // Calculate how many fit
    const cols = Math.floor((sheetPxW - marginPx * 2 + gapPx) / (pxW + gapPx));
    const rows = Math.floor((sheetPxH - marginPx * 2 + gapPx) / (pxH + gapPx));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = marginPx + c * (pxW + gapPx);
        const y = marginPx + r * (pxH + gapPx);
        ctx.drawImage(passportCanvas, x, y, pxW, pxH);
        // Draw thin guide lines
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, pxW, pxH);
      }
    }

    sheetDataURL = sheetCanvas.toDataURL('image/jpeg', 0.95);
    sheetDownBtn.disabled = false;
  }

  // Download photo
  downloadBtn.addEventListener('click', () => {
    if (!passportDataURL) return;
    const preset = PRESETS[sizeSelect.value] || { label: 'custom' };
    IK.triggerDownload(passportDataURL, `passport_${preset.label.replace(/[^a-z0-9]/gi, '_')}.jpg`);
    IK.showToast('⬇ Downloading photo...', 'success');
  });

  // Download sheet
  sheetDownBtn.addEventListener('click', () => {
    if (!sheetDataURL) return;
    IK.triggerDownload(sheetDataURL, 'passport_print_sheet_4x6.jpg');
    IK.showToast('🖨 Downloading print sheet...', 'success');
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    originalImg = null;
    passportDataURL = null;
    sheetDataURL = null;
    controls.style.display = 'none';
    document.getElementById('passport-upload-zone').style.display = '';
    downloadBtn.disabled  = true;
    sheetDownBtn.disabled = true;
    infoOut.textContent   = '';
    document.getElementById('passport-file-input').value = '';
  });

})();
