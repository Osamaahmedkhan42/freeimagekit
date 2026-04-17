/* ===================================================
   compress.js — Tool 3: Smart Image Compression
   ZIP bundle when multiple images, single file when one
   =================================================== */

'use strict';

(function () {
  let uploadedFiles   = [];
  let compressedBlobs = []; // { blob, filename, originalSize, compressedSize }

  const controls         = document.getElementById('compress-controls');
  const fileListEl       = document.getElementById('compress-file-list');
  const compressBtn      = document.getElementById('compress-btn');
  const downloadBtn      = document.getElementById('compress-download-btn');
  const resetBtn         = document.getElementById('compress-reset-btn');
  const progressArea     = document.getElementById('compress-progress-area');
  const progressBar      = document.getElementById('compress-progress-bar');
  const progressLabel    = document.getElementById('compress-progress-label');
  const qualitySlider    = document.getElementById('compress-quality');
  const qualityDisplay   = document.getElementById('quality-display');
  const qualityControl   = document.getElementById('quality-control');
  const sizeControl      = document.getElementById('size-control');
  const modeSelector     = document.getElementById('compress-mode-selector');
  const targetSizeSelect = document.getElementById('compress-target-size');
  const formatSelect     = document.getElementById('compress-format');

  let currentMode = 'quality';

  // Mode toggle
  modeSelector.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modeSelector.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      qualityControl.style.display = currentMode === 'quality' ? 'block' : 'none';
      sizeControl.style.display    = currentMode === 'size'    ? 'block' : 'none';
    });
  });

  // Quality slider live update
  qualitySlider.addEventListener('input', () => {
    qualityDisplay.textContent = qualitySlider.value;
  });

  // Upload zone (multiple)
  IK.setupUploadZone('compress-upload-zone', 'compress-file-input', async (files) => {
    uploadedFiles = [...uploadedFiles, ...files];
    compressedBlobs = [];
    downloadBtn.disabled = true;
    controls.style.display = 'block';
    document.getElementById('compress-upload-zone').style.display = 'none';
    await renderFileList();
  }, true);

  async function renderFileList() {
    fileListEl.innerHTML = '';
    for (const file of uploadedFiles) {
      const dataURL = await IK.readFileAsDataURL(file);
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <img class="file-item-thumb" src="${dataURL}" alt="${file.name}" />
        <div class="file-item-info">
          <div class="file-item-name">${file.name}</div>
          <div class="file-item-sizes">Original: ${IK.formatBytes(file.size)}</div>
        </div>
        <span class="file-item-status status-pending">Pending</span>
      `;
      fileListEl.appendChild(item);
    }
  }

  // Compress all
  compressBtn.addEventListener('click', async () => {
    if (!uploadedFiles.length) return;

    compressedBlobs = [];
    downloadBtn.disabled = true;
    progressArea.style.display = 'block';
    compressBtn.disabled = true;
    compressBtn.innerHTML = '<span class="spinner"></span>Compressing...';

    const items = fileListEl.querySelectorAll('.file-item');
    const total = uploadedFiles.length;

    for (let i = 0; i < total; i++) {
      const file = uploadedFiles[i];
      const item = items[i];
      const statusEl = item.querySelector('.file-item-status');
      const sizesEl  = item.querySelector('.file-item-sizes');

      statusEl.className = 'file-item-status status-pending';
      statusEl.textContent = 'Processing...';

      // Update progress bar
      progressBar.style.width = ((i / total) * 100) + '%';
      progressLabel.textContent = `Compressing ${i + 1} of ${total}: ${file.name}`;

      try {
        // Build compression options
        const outputFormat = formatSelect.value === 'keep'
          ? file.type
          : formatSelect.value;

        let options = {
          useWebWorker: true,
          fileType: outputFormat,
          preserveExif: false,
        };

        if (currentMode === 'quality') {
          const q = parseInt(qualitySlider.value) / 100;
          options.initialQuality = q;
          options.maxSizeMB = 999; // no size limit — just quality
        } else {
          const targetKB = parseInt(targetSizeSelect.value);
          options.maxSizeMB      = targetKB / 1024;
          options.initialQuality = 0.9;
        }

        const compressed = await imageCompression(file, options);
        const ext = outputFormat.split('/')[1].replace('jpeg', 'jpg');
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const outName  = `${baseName}_compressed.${ext}`;

        compressedBlobs.push({
          blob: compressed,
          filename: outName,
          originalSize: file.size,
          compressedSize: compressed.size,
        });

        const saved = ((1 - compressed.size / file.size) * 100).toFixed(0);
        sizesEl.innerHTML = `
          Original: ${IK.formatBytes(file.size)} → 
          <strong>${IK.formatBytes(compressed.size)}</strong>
          <span class="size-saved"> (${saved > 0 ? '-' + saved + '% saved' : 'already optimized'})</span>
        `;
        statusEl.className = 'file-item-status status-done';
        statusEl.textContent = '✓ Done';

      } catch (err) {
        console.error(err);
        statusEl.className = 'file-item-status status-error';
        statusEl.textContent = '✗ Error';
        compressedBlobs.push(null);
      }
    }

    progressBar.style.width  = '100%';
    progressLabel.textContent = `Done! ${total} image${total > 1 ? 's' : ''} compressed.`;

    compressBtn.disabled = false;
    compressBtn.innerHTML = 'Compress All';
    downloadBtn.disabled  = false;
    IK.showToast('✅ Compression complete!', 'success');
  });

  // Download — ZIP if multiple, single file if one
  downloadBtn.addEventListener('click', async () => {
    const validBlobs = compressedBlobs.filter(Boolean);
    if (!validBlobs.length) return;

    if (validBlobs.length === 1) {
      // Single file — direct download
      const item = validBlobs[0];
      const url  = URL.createObjectURL(item.blob);
      IK.triggerDownload(url, item.filename);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      IK.showToast('⬇ Downloading...', 'success');
    } else {
      // Multiple files → ZIP
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<span class="spinner"></span>Creating ZIP...';

      try {
        const zip = new JSZip();
        for (const item of validBlobs) {
          const buf = await item.blob.arrayBuffer();
          zip.file(item.filename, buf);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        IK.triggerDownload(url, 'compressed_images.zip');
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        IK.showToast('📦 ZIP downloading...', 'success');
      } catch (err) {
        IK.showToast('❌ Failed to create ZIP', 'error');
        console.error(err);
      } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '⬇ Download';
      }
    }
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    uploadedFiles   = [];
    compressedBlobs = [];
    fileListEl.innerHTML = '';
    controls.style.display = 'none';
    document.getElementById('compress-upload-zone').style.display = '';
    progressArea.style.display = 'none';
    progressBar.style.width    = '0%';
    downloadBtn.disabled = true;
    document.getElementById('compress-file-input').value = '';
  });

})();
