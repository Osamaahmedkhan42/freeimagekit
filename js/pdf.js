/* ===================================================
   pdf.js — Tool 4: Images to PDF
   Uses jsPDF (loaded via CDN)
   =================================================== */

'use strict';

(function () {
  let imageFiles = []; // { file, dataURL, img }
  let pdfBlob    = null;

  const controls      = document.getElementById('pdf-controls');
  const imageList     = document.getElementById('pdf-image-list');
  const generateBtn   = document.getElementById('pdf-generate-btn');
  const downloadBtn   = document.getElementById('pdf-download-btn');
  const resetBtn      = document.getElementById('pdf-reset-btn');
  const progressArea  = document.getElementById('pdf-progress-area');
  const progressBar   = document.getElementById('pdf-progress-bar');
  const progressLabel = document.getElementById('pdf-progress-label');
  const pageSizeEl    = document.getElementById('pdf-page-size');
  const orientEl      = document.getElementById('pdf-orientation');
  const marginEl      = document.getElementById('pdf-margin');
  const qualityEl     = document.getElementById('pdf-quality');

  // Upload zone (multiple)
  IK.setupUploadZone('pdf-upload-zone', 'pdf-file-input', async (files) => {
    const newImages = [];
    for (const file of files) {
      try {
        const dataURL = await IK.readFileAsDataURL(file);
        const img     = await IK.loadImage(dataURL);
        newImages.push({ file, dataURL, img });
      } catch {
        IK.showToast(`⚠ Skipped: ${file.name}`, 'error');
      }
    }
    imageFiles = [...imageFiles, ...newImages];
    pdfBlob = null;
    downloadBtn.disabled = true;
    controls.style.display = 'block';
    document.getElementById('pdf-upload-zone').style.display = 'none';
    renderThumbs();
  }, true);

  // Render thumbnail grid
  function renderThumbs() {
    imageList.innerHTML = '';
    imageFiles.forEach((item, index) => {
      const card = document.createElement('div');
      card.className   = 'pdf-thumb-card';
      card.draggable   = true;
      card.dataset.idx = index;

      card.innerHTML = `
        <img class="pdf-thumb-img" src="${item.dataURL}" alt="${item.file.name}" />
        <div class="pdf-thumb-label">${item.file.name}</div>
        <div class="pdf-thumb-num">${index + 1}</div>
        <button class="pdf-thumb-remove" title="Remove" data-idx="${index}">✕</button>
      `;

      // Remove button
      card.querySelector('.pdf-thumb-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        const i = parseInt(e.target.dataset.idx);
        imageFiles.splice(i, 1);
        pdfBlob = null;
        downloadBtn.disabled = true;
        renderThumbs();
        if (imageFiles.length === 0) {
          controls.style.display = 'none';
          document.getElementById('pdf-upload-zone').style.display = '';
        }
      });

      // Drag-to-reorder
      card.addEventListener('dragstart', onDragStart);
      card.addEventListener('dragover',  onDragOver);
      card.addEventListener('dragleave', onDragLeave);
      card.addEventListener('drop',      onDrop);
      card.addEventListener('dragend',   onDragEnd);

      imageList.appendChild(card);
    });
  }

  // ---- Drag & Drop Reorder ----
  let dragSrcIdx = null;

  function onDragStart(e) {
    dragSrcIdx = parseInt(this.dataset.idx);
    this.classList.add('drag-active');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrcIdx);
  }
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over-target');
  }
  function onDragLeave() {
    this.classList.remove('drag-over-target');
  }
  function onDrop(e) {
    e.preventDefault();
    const dropIdx = parseInt(this.dataset.idx);
    if (dragSrcIdx === null || dragSrcIdx === dropIdx) return;
    // Reorder
    const [moved] = imageFiles.splice(dragSrcIdx, 1);
    imageFiles.splice(dropIdx, 0, moved);
    pdfBlob = null;
    downloadBtn.disabled = true;
    renderThumbs();
  }
  function onDragEnd() {
    document.querySelectorAll('.pdf-thumb-card').forEach(c => {
      c.classList.remove('drag-active', 'drag-over-target');
    });
    dragSrcIdx = null;
  }

  // ---- Generate PDF ----
  generateBtn.addEventListener('click', async () => {
    if (!imageFiles.length) return;

    pdfBlob = null;
    downloadBtn.disabled = true;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span>Building PDF...';
    progressArea.style.display = 'block';
    progressBar.style.width    = '0%';

    const pageSize   = pageSizeEl.value;
    const orient     = orientEl.value;
    const marginMM   = parseInt(marginEl.value);
    const imgQuality = parseFloat(qualityEl.value);
    const total      = imageFiles.length;

    try {
      // jsPDF dimensions for page sizes
      const PAGE_SIZES = {
        a4:     [210, 297],
        letter: [215.9, 279.4],
      };

      let pdf = null;

      for (let i = 0; i < total; i++) {
        const { img } = imageFiles[i];
        progressBar.style.width  = ((i / total) * 100) + '%';
        progressLabel.textContent = `Adding page ${i + 1} of ${total}...`;

        let pageW, pageH;

        if (pageSize === 'fit') {
          // Fit to image native dimensions (points: 1pt = 0.352778mm)
          const scale = 0.264583; // px to mm at 96dpi
          pageW = img.width  * scale;
          pageH = img.height * scale;
        } else {
          [pageW, pageH] = PAGE_SIZES[pageSize];
          if (orient === 'landscape') { [pageW, pageH] = [pageH, pageW]; }
        }

        if (i === 0) {
          const { jsPDF } = window.jspdf;
          pdf = new jsPDF({
            orientation: pageSize === 'fit'
              ? (img.width >= img.height ? 'landscape' : 'portrait')
              : orient,
            unit: 'mm',
            format: pageSize === 'fit' ? [pageW, pageH] : pageSize,
          });
        } else {
          const addOrient = pageSize === 'fit'
            ? (img.width >= img.height ? 'landscape' : 'portrait')
            : orient;

          pdf.addPage(
            pageSize === 'fit' ? [pageW, pageH] : pageSize,
            addOrient
          );
        }

        // Available area after margins
        const availW = pageW - marginMM * 2;
        const availH = pageH - marginMM * 2;

        // Scale image to fit within available area (keep aspect)
        const imgAspect = img.width / img.height;
        const boxAspect = availW / availH;

        let drawW, drawH;
        if (imgAspect > boxAspect) {
          drawW = availW;
          drawH = availW / imgAspect;
        } else {
          drawH = availH;
          drawW = availH * imgAspect;
        }

        // Center the image
        const xOff = marginMM + (availW - drawW) / 2;
        const yOff = marginMM + (availH - drawH) / 2;

        // Determine format for jsPDF
        const mimeType = imageFiles[i].file.type;
        const fmt = mimeType === 'image/png' ? 'PNG' : 'JPEG';

        pdf.addImage(
          imageFiles[i].dataURL,
          fmt,
          xOff, yOff,
          drawW, drawH,
          undefined,
          'FAST'
        );
      }

      progressBar.style.width  = '100%';
      progressLabel.textContent = 'Finalizing PDF...';

      // Small delay to allow UI update
      await new Promise(r => setTimeout(r, 100));

      pdfBlob = pdf.output('blob');

      progressLabel.textContent = `✅ PDF ready — ${total} page${total > 1 ? 's' : ''}`;
      downloadBtn.disabled = false;
      IK.showToast('✅ PDF generated!', 'success');

    } catch (err) {
      console.error(err);
      IK.showToast('❌ PDF generation failed: ' + err.message, 'error');
      progressLabel.textContent = 'Error generating PDF';
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = 'Generate PDF';
    }
  });

  // Download PDF
  downloadBtn.addEventListener('click', () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    IK.triggerDownload(url, 'imagekit_output.pdf');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    IK.showToast('⬇ PDF downloading...', 'success');
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    imageFiles = [];
    pdfBlob    = null;
    imageList.innerHTML  = '';
    controls.style.display = 'none';
    document.getElementById('pdf-upload-zone').style.display = '';
    progressArea.style.display = 'none';
    progressBar.style.width    = '0%';
    downloadBtn.disabled = true;
    document.getElementById('pdf-file-input').value = '';
  });

})();
