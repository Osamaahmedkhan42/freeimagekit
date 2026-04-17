/* ===================================================
   resize.js — Tool 1: Resize Image
   =================================================== */

'use strict';

(function () {
  let originalImg = null;
  let resizedDataURL = null;
  let aspectRatio = 1;

  const widthInput   = document.getElementById('resize-width');
  const heightInput  = document.getElementById('resize-height');
  const lockRatio    = document.getElementById('resize-lock-ratio');
  const formatSelect = document.getElementById('resize-format');
  const applyBtn     = document.getElementById('resize-apply-btn');
  const downloadBtn  = document.getElementById('resize-download-btn');
  const resetBtn     = document.getElementById('resize-reset-btn');
  const controls     = document.getElementById('resize-controls');
  const canvasOrig   = document.getElementById('resize-preview-original');
  const canvasOut    = document.getElementById('resize-preview-output');
  const infoOrig     = document.getElementById('resize-info-original');
  const infoOut      = document.getElementById('resize-info-output');

  // Setup upload zone
  IK.setupUploadZone('resize-upload-zone', 'resize-file-input', async (files) => {
    const file = files[0];
    try {
      const dataURL = await IK.readFileAsDataURL(file);
      originalImg = await IK.loadImage(dataURL);
      aspectRatio = originalImg.width / originalImg.height;

      // Show controls
      controls.style.display = 'block';
      document.getElementById('resize-upload-zone').style.display = 'none';

      // Draw original preview
      IK.drawImageFit(canvasOrig, originalImg);
      infoOrig.textContent = `${originalImg.width} × ${originalImg.height} px · ${IK.formatBytes(file.size)}`;

      // Pre-fill dimensions
      widthInput.value  = originalImg.width;
      heightInput.value = originalImg.height;

      // Clear output
      const ctx = canvasOut.getContext('2d');
      ctx.clearRect(0, 0, canvasOut.width, canvasOut.height);
      canvasOut.width = canvasOrig.width;
      canvasOut.height = canvasOrig.height;
      ctx.drawImage(canvasOrig, 0, 0);
      infoOut.textContent = 'Press "Apply Resize" to preview';

      resizedDataURL = null;
      downloadBtn.disabled = true;
    } catch (err) {
      IK.showToast('❌ Failed to load image', 'error');
    }
  });

  // Lock aspect ratio: width changes height
  widthInput.addEventListener('input', () => {
    if (lockRatio.checked && originalImg) {
      const w = parseInt(widthInput.value);
      if (!isNaN(w) && w > 0) {
        heightInput.value = Math.round(w / aspectRatio);
      }
    }
  });

  // Lock aspect ratio: height changes width
  heightInput.addEventListener('input', () => {
    if (lockRatio.checked && originalImg) {
      const h = parseInt(heightInput.value);
      if (!isNaN(h) && h > 0) {
        widthInput.value = Math.round(h * aspectRatio);
      }
    }
  });

  // Apply resize
  applyBtn.addEventListener('click', () => {
    if (!originalImg) return;

    const w = parseInt(widthInput.value);
    const h = parseInt(heightInput.value);

    if (!w || !h || w < 1 || h < 1) {
      IK.showToast('⚠ Please enter valid dimensions', 'error');
      return;
    }
    if (w > 10000 || h > 10000) {
      IK.showToast('⚠ Max dimension is 10,000 px', 'error');
      return;
    }

    // Draw resized image on output canvas
    canvasOut.width  = w;
    canvasOut.height = h;
    const ctx = canvasOut.getContext('2d');
    ctx.drawImage(originalImg, 0, 0, w, h);

    // Get data URL
    const format  = formatSelect.value;
    const quality = format === 'image/png' ? 1 : 0.92;
    resizedDataURL = canvasOut.toDataURL(format, quality);

    // Show preview (scaled for display)
    IK.drawImageFit(canvasOut, originalImg, 500, 280);
    canvasOut.width  = w;
    canvasOut.height = h;
    ctx.drawImage(originalImg, 0, 0, w, h);

    // Scale back for display properly
    const displayCanvas = canvasOut;
    const scale = Math.min(500 / w, 280 / h, 1);
    displayCanvas.style.width  = (w * scale) + 'px';
    displayCanvas.style.height = (h * scale) + 'px';

    // Estimate output size
    const base64 = resizedDataURL.split(',')[1];
    const outputBytes = Math.round(base64.length * 0.75);
    infoOut.textContent = `${w} × ${h} px · ~${IK.formatBytes(outputBytes)}`;

    downloadBtn.disabled = false;
    IK.showToast('✅ Resize applied!', 'success');
  });

  // Download
  downloadBtn.addEventListener('click', () => {
    if (!resizedDataURL) return;
    const ext  = formatSelect.value.split('/')[1].replace('jpeg', 'jpg');
    const w    = widthInput.value;
    const h    = heightInput.value;
    IK.triggerDownload(resizedDataURL, `resized_${w}x${h}.${ext}`);
    IK.showToast('⬇ Downloading...', 'success');
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    originalImg    = null;
    resizedDataURL = null;
    controls.style.display = 'none';
    document.getElementById('resize-upload-zone').style.display = '';
    widthInput.value = '';
    heightInput.value = '';
    downloadBtn.disabled = true;
    document.getElementById('resize-file-input').value = '';
  });

})();
