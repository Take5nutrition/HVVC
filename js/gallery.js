// ========================================
// HVVC — Gallery & Photo Upload System
// Photos are stored in localStorage
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'hvvc_gallery_photos';
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const uploadPreview = document.getElementById('uploadPreview');
  const galleryGrid = document.getElementById('galleryGrid');
  const galleryEmpty = document.getElementById('galleryEmpty');
  const galleryFilters = document.getElementById('galleryFilters');

  // Lightbox elements
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  let currentLightboxIndex = 0;
  let currentFilteredPhotos = [];

  // ---- Default gallery photos (static images) ----
  const DEFAULT_PHOTOS = [
    { id: 'default_1', name: 'HVVC 16-1 Team', data: 'img/hero-16u-team.png', category: 'team', isDefault: true },
    { id: 'default_2', name: 'HVVC 16-2 Team', data: 'img/team-16u.jpg', category: 'team', isDefault: true },
    { id: 'default_3', name: 'HVVC 14U Team', data: 'img/team-14u.jpg', category: 'team', isDefault: true },
    { id: 'default_4', name: 'HVVC 14U Team Photo', data: 'img/team-14u-alt.jpg', category: 'team', isDefault: true },
    { id: 'default_5', name: 'HVVC 12-1 Team', data: 'img/team-12u.jpg', category: 'team', isDefault: true },
    { id: 'default_6', name: 'HVVC 12-2 Team', data: 'img/team-12u-floor.jpg', category: 'team', isDefault: true },
    { id: 'default_7', name: 'Tournament Action', data: 'img/action-bench.jpg', category: 'tournament', isDefault: true },
    { id: 'default_8', name: 'Celebrating a Win', data: 'img/action-celebrate.jpg', category: 'tournament', isDefault: true },
    { id: 'default_9', name: 'Coaching Staff', data: 'img/coaches-group.jpg', category: 'team', isDefault: true },
    { id: 'default_10', name: 'Creative Team Photo', data: 'img/team-spiral.png', category: 'team', isDefault: true },
    { id: 'default_11', name: 'End of Season Invite', data: 'img/event-invite.png', category: 'team', isDefault: true },
  ];

  // ---- Load photos from localStorage ----
  function getPhotos() {
    try {
      const uploaded = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      return [...uploaded, ...DEFAULT_PHOTOS];
    } catch {
      return [...DEFAULT_PHOTOS];
    }
  }

  function savePhotos(photos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    } catch (e) {
      alert('Storage is full. Try removing some photos first.');
    }
  }

  // ---- Render gallery ----
  function renderGallery(filter = 'all') {
    const photos = getPhotos();
    const filtered = filter === 'all' ? photos :
      filter === 'uploaded' ? photos.filter(p => !p.isDefault) :
      photos.filter(p => p.category === filter);

    currentFilteredPhotos = filtered;

    // Remove old photo items (keep empty state)
    galleryGrid.querySelectorAll('.gallery-item').forEach(el => el.remove());

    if (filtered.length === 0) {
      galleryEmpty.style.display = 'flex';
    } else {
      galleryEmpty.style.display = 'none';

      filtered.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item reveal visible';
        item.setAttribute('data-index', index);
        item.innerHTML = `
          <div class="gallery-item__img-wrap">
            <img src="${photo.data}" alt="${photo.name || 'HVVC Photo'}" loading="lazy" />
            <div class="gallery-item__overlay">
              <span class="gallery-item__zoom">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </span>
            </div>
          </div>
          <div class="gallery-item__info">
            <span class="gallery-item__name">${photo.name || 'Untitled'}</span>
            <span class="gallery-item__category">${photo.category || 'uploaded'}</span>
            ${photo.isDefault ? '' : `<button class="gallery-item__delete" data-id="${photo.id}" title="Delete photo">&times;</button>`}
          </div>
        `;

        // Click to open lightbox
        item.querySelector('.gallery-item__img-wrap').addEventListener('click', () => {
          openLightbox(index);
        });

        // Delete button (only for uploaded photos)
        const delBtn = item.querySelector('.gallery-item__delete');
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this photo?')) {
              deletePhoto(photo.id);
            }
          });
        }

        galleryGrid.appendChild(item);
      });
    }
  }

  function deletePhoto(id) {
    const photos = getPhotos().filter(p => p.id !== id);
    savePhotos(photos);
    renderGallery(getActiveFilter());
  }

  function getActiveFilter() {
    const active = galleryFilters.querySelector('.active');
    return active ? active.getAttribute('data-filter') : 'all';
  }

  // ---- Upload handling ----
  function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) {
        alert(`${f.name} is not an image file.`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        alert(`${f.name} is too large (max 10MB).`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Show upload preview
    uploadPreview.innerHTML = '';

    let processed = 0;

    validFiles.forEach(file => {
      const reader = new FileReader();

      reader.onload = (e) => {
        // Resize image to save localStorage space
        resizeImage(e.target.result, 1200, (resizedData) => {
          const photo = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: file.name.replace(/\.[^/.]+$/, ''),
            data: resizedData,
            category: 'uploaded',
            date: new Date().toISOString()
          };

          // Show preview
          const preview = document.createElement('div');
          preview.className = 'upload-preview__item';
          preview.innerHTML = `
            <img src="${resizedData}" alt="${photo.name}" />
            <div class="upload-preview__info">
              <input type="text" class="upload-preview__name" value="${photo.name}" placeholder="Photo name" data-id="${photo.id}" />
              <select class="upload-preview__cat" data-id="${photo.id}">
                <option value="uploaded">General</option>
                <option value="tournament">Tournament</option>
                <option value="practice">Practice</option>
                <option value="team">Team</option>
              </select>
            </div>
          `;
          uploadPreview.appendChild(preview);

          // Save to storage
          const photos = getPhotos();
          photos.unshift(photo);
          savePhotos(photos);

          processed++;

          // When all files processed, update gallery and show save button
          if (processed === validFiles.length) {
            // Add save button if not already there
            if (!uploadPreview.querySelector('.upload-preview__save')) {
              const saveBtn = document.createElement('button');
              saveBtn.className = 'btn btn--primary upload-preview__save';
              saveBtn.textContent = 'Update Names & Categories';
              saveBtn.addEventListener('click', () => {
                const nameInputs = uploadPreview.querySelectorAll('.upload-preview__name');
                const catSelects = uploadPreview.querySelectorAll('.upload-preview__cat');
                const allPhotos = getPhotos();

                nameInputs.forEach(input => {
                  const id = input.getAttribute('data-id');
                  const photo = allPhotos.find(p => p.id === id);
                  if (photo) photo.name = input.value;
                });

                catSelects.forEach(select => {
                  const id = select.getAttribute('data-id');
                  const photo = allPhotos.find(p => p.id === id);
                  if (photo) photo.category = select.value;
                });

                savePhotos(allPhotos);
                renderGallery(getActiveFilter());
                uploadPreview.innerHTML = '';
              });
              uploadPreview.appendChild(saveBtn);
            }

            renderGallery(getActiveFilter());
          }
        });
      };

      reader.readAsDataURL(file);
    });
  }

  // ---- Resize image to fit within maxWidth ----
  function resizeImage(dataUrl, maxWidth, callback) {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  }

  // ---- Upload zone events ----
  if (uploadZone) {
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('upload-zone--active');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('upload-zone--active');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('upload-zone--active');
      handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
      handleFiles(fileInput.files);
      fileInput.value = '';
    });
  }

  // ---- Filter tabs ----
  if (galleryFilters) {
    galleryFilters.addEventListener('click', (e) => {
      if (e.target.classList.contains('gallery-filter')) {
        galleryFilters.querySelectorAll('.gallery-filter').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderGallery(e.target.getAttribute('data-filter'));
      }
    });
  }

  // ---- Lightbox ----
  function openLightbox(index) {
    if (currentFilteredPhotos.length === 0) return;
    currentLightboxIndex = index;
    const photo = currentFilteredPhotos[index];
    lightboxImg.src = photo.data;
    lightboxCaption.textContent = photo.name || '';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateLightbox(direction) {
    currentLightboxIndex += direction;
    if (currentLightboxIndex < 0) currentLightboxIndex = currentFilteredPhotos.length - 1;
    if (currentLightboxIndex >= currentFilteredPhotos.length) currentLightboxIndex = 0;
    const photo = currentFilteredPhotos[currentLightboxIndex];
    lightboxImg.src = photo.data;
    lightboxCaption.textContent = photo.name || '';
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
  if (lightboxNext) lightboxNext.addEventListener('click', () => navigateLightbox(1));

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  // ---- Initial render ----
  renderGallery();
});
