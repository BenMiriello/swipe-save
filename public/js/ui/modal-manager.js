/**
 * Manages modal creation and interactions
 */
const modalManager = {
  elements: {
    infoModal: null,
    filenameModal: null,
    comfyuiModal: null,
    directoryBrowser: null,
    numberDialModal: null
  },

  /**
   * Create info modal with instructions
   */
  createInfoModal() {
    if (document.getElementById('infoModal')) {
      this.elements.infoModal = document.getElementById('infoModal');
      return;
    }

    const infoModal = document.createElement('div');
    infoModal.id = 'infoModal';
    infoModal.className = 'modal';
    infoModal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal" id="closeInfoModal">&times;</span>
        <h2>Instructions</h2>
        <div class="instructions-content">
          ${window.appConfig.instructionsContent}
        </div>
      </div>
    `;
    document.body.appendChild(infoModal);
    this.elements.infoModal = infoModal;

    document.getElementById('closeInfoModal').addEventListener('click', () => {
      this.elements.infoModal.style.display = "none";
    });

    window.addEventListener('click', (event) => {
      if (event.target === this.elements.infoModal) {
        this.elements.infoModal.style.display = "none";
      }
    });
  },

  /**
   * Create number dial modal for media selection
   */
  createNumberDialModal() {
    if (document.getElementById('numberDialModal')) {
      this.elements.numberDialModal = document.getElementById('numberDialModal');
      return;
    }

    const dialModal = document.createElement('div');
    dialModal.id = 'numberDialModal';
    dialModal.className = 'number-dial-modal';
    dialModal.innerHTML = `
      <div class="number-dial-container">
        <button class="dial-close">&times;</button>
        <div class="dial-header">Select Media Item</div>
        <div class="dial-track">
          <div class="dial-thumb" id="dialThumb"></div>
        </div>
        <div class="dial-numbers" id="dialNumbers"></div>
        <div class="dial-arrows">
          <button class="dial-arrow" id="dialPrev">‹</button>
          <button class="dial-arrow" id="dialNext">›</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialModal);
    this.elements.numberDialModal = dialModal;

    this.setupNumberDialHandlers();
  },

  /**
   * Create directory browser modal
   */
  createDirectoryBrowser() {
    const browserModal = document.createElement('div');
    browserModal.id = 'directoryBrowser';
    browserModal.className = 'modal';
    browserModal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal" id="closeBrowserModal">&times;</span>
        <h2 id="browserTitle">Select Directory</h2>
        <div class="browser-controls">
          <div class="current-path" id="currentPath"></div>
          <button id="upButton" class="btn btn-secondary">Up</button>
        </div>
        <div class="directory-list" id="directoryList">
          Loading...
        </div>
        <div class="browser-actions">
          <button id="selectDirectory" class="btn">Select This Directory</button>
          <button id="cancelBrowser" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(browserModal);
    this.elements.directoryBrowser = browserModal;

    document.getElementById('closeBrowserModal').addEventListener('click', () => {
      this.elements.directoryBrowser.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
      if (event.target === this.elements.directoryBrowser) {
        this.elements.directoryBrowser.style.display = 'none';
      }
    });
  },

  /**
   * Show filename modal for renaming
   * @param {string} currentFilename - Current filename
   * @param {string} customFilename - Custom filename if available
   */
  showFilenameModal(currentFilename, customFilename) {
    if (!this.elements.filenameModal) {
      this.elements.filenameModal = document.getElementById('filenameModal');
    }
    if (!this.elements.filenameInput) {
      this.elements.filenameInput = document.getElementById('customFilename');
    }

    if (!this.elements.filenameInput || !this.elements.filenameModal) return;

    this.elements.filenameInput.value = customFilename || currentFilename;
    this.elements.filenameModal.style.display = "block";

    setTimeout(() => {
      this.elements.filenameInput.focus();
      this.elements.filenameInput.select();
    }, 50);
  },

  /**
   * Show ComfyUI modal
   */
  showComfyUIModal() {
    if (!this.elements.comfyuiModal) {
      this.elements.comfyuiModal = document.getElementById('comfyuiModal');
    }
    if (this.elements.comfyuiModal) {
      this.elements.comfyuiModal.style.display = "block";
    }
  },

  /**
   * Hide ComfyUI modal
   */
  hideComfyUIModal() {
    if (this.elements.comfyuiModal) {
      this.elements.comfyuiModal.style.display = "none";
    }
  },

  /**
   * Open number dial modal
   */
  openNumberDial() {
    if (!window.appController || !window.appController.state.allFiles.length) {
      return;
    }

    if (!this.elements.numberDialModal) {
      this.createNumberDialModal();
      this.elements.numberDialModal = document.getElementById('numberDialModal');
    }

    const totalFiles = window.appController.state.allFiles.length;
    const currentIndex = window.appController.state.currentIndex;

    this.currentDialData = {
      totalFiles,
      currentIndex
    };

    this.setupDialNumbers(totalFiles);
    this.updateDialNumbers(currentIndex);
    this.updateDialPosition(currentIndex);
    this.elements.numberDialModal.style.display = 'block';
  },

  /**
   * Close number dial modal
   */
  closeNumberDial() {
    this.elements.numberDialModal.style.display = 'none';
  },

  /**
   * Setup number dial event handlers
   */
  setupNumberDialHandlers() {
    const modal = this.elements.numberDialModal;
    const thumb = modal.querySelector('#dialThumb');
    const track = modal.querySelector('.dial-track');

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeNumberDial();
      }
    });

    let isDragging = false;
    let startX = 0;
    let startLeft = 0;

    const handleStart = (clientX) => {
      isDragging = true;
      startX = clientX;
      startLeft = parseInt(thumb.style.left) || 0;
      thumb.style.cursor = 'grabbing';
    };

    const handleMove = (clientX) => {
      if (!isDragging) return;

      const trackRect = track.getBoundingClientRect();
      const thumbWidth = thumb.offsetWidth;
      const trackWidth = trackRect.width - thumbWidth;

      let newLeft = startLeft + (clientX - startX);
      newLeft = Math.max(0, Math.min(newLeft, trackWidth));

      const percentage = newLeft / trackWidth;
      const totalFiles = this.currentDialData?.totalFiles || 1;
      const newIndex = Math.round(percentage * (totalFiles - 1));

      this.updateDialPosition(newIndex, false);
      this.updateDialNumbers(newIndex);
    };

    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      thumb.style.cursor = 'grab';

      const currentIndex = this.currentDialData?.currentIndex || 0;
      this.selectMediaItem(currentIndex);
    };

    thumb.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleStart(e.clientX);
    });

    document.addEventListener('mousemove', (e) => {
      handleMove(e.clientX);
    });

    document.addEventListener('mouseup', handleEnd);

    thumb.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleStart(e.touches[0].clientX);
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    });

    document.addEventListener('touchend', handleEnd);

    track.addEventListener('click', (e) => {
      if (e.target === thumb) return;

      const trackRect = track.getBoundingClientRect();
      const thumbWidth = thumb.offsetWidth;
      const clickX = e.clientX - trackRect.left - (thumbWidth / 2);
      const trackWidth = trackRect.width - thumbWidth;

      const percentage = Math.max(0, Math.min(1, clickX / trackWidth));
      const totalFiles = this.currentDialData?.totalFiles || 1;
      const newIndex = Math.round(percentage * (totalFiles - 1));

      this.updateDialPosition(newIndex, true);
      this.updateDialNumbers(newIndex);
      this.selectMediaItem(newIndex);
    });
  },

  /**
   * Setup number markers on the dial
   */
  setupDialNumbers(totalFiles) {
    if (!this.elements.numberDialModal) return;

    const numbersContainer = this.elements.numberDialModal.querySelector('#dialNumbers');
    if (!numbersContainer) return;

    numbersContainer.innerHTML = '';
    this.updateDialNumbers(this.currentDialData?.currentIndex || 0);
  },

  /**
   * Update visible numbers based on current index
   */
  updateDialNumbers(currentIndex) {
    const numbersContainer = this.elements.numberDialModal.querySelector('#dialNumbers');
    if (!numbersContainer) return;

    const totalFiles = this.currentDialData?.totalFiles || 1;
    numbersContainer.innerHTML = '';

    const numbers = [];
    const current = currentIndex + 1;

    if (totalFiles <= 7) {
      for (let i = 1; i <= totalFiles; i++) {
        numbers.push({ num: i, isEllipsis: false });
      }
    } else {
      if (current > 4) {
        numbers.push({ num: 1, isEllipsis: false });
        numbers.push({ num: '...', isEllipsis: true });
      }

      for (let i = Math.max(1, current - 3); i < current; i++) {
        if (current <= 4 || i > 1) {
          numbers.push({ num: i, isEllipsis: false });
        }
      }

      numbers.push({ num: current, isEllipsis: false });

      for (let i = current + 1; i <= Math.min(totalFiles, current + 3); i++) {
        if (current >= totalFiles - 3 || i < totalFiles) {
          numbers.push({ num: i, isEllipsis: false });
        }
      }

      if (current < totalFiles - 3) {
        numbers.push({ num: '...', isEllipsis: true });
        numbers.push({ num: totalFiles, isEllipsis: false });
      }
    }

    numbers.forEach(item => {
      const numberEl = document.createElement('div');
      numberEl.className = 'dial-number';
      if (item.isEllipsis) {
        numberEl.className += ' ellipsis';
        numberEl.textContent = item.num;
      } else {
        numberEl.textContent = item.num;
        if (item.num === current) {
          numberEl.classList.add('active');
        }
        numberEl.addEventListener('click', () => {
          this.updateDialPosition(item.num - 1, true);
          this.updateDialNumbers(item.num - 1);
          this.selectMediaItem(item.num - 1);
        });
      }
      numbersContainer.appendChild(numberEl);
    });
  },

  /**
   * Update dial thumb position and highlight current number
   */
  updateDialPosition(index, animate = false) {
    const totalFiles = this.currentDialData?.totalFiles || 1;
    const percentage = totalFiles > 1 ? index / (totalFiles - 1) : 0;

    const track = this.elements.numberDialModal.querySelector('.dial-track');
    const thumb = this.elements.numberDialModal.querySelector('#dialThumb');
    const thumbWidth = thumb.offsetWidth;
    const trackWidth = track.offsetWidth - thumbWidth;

    const newLeft = (percentage * trackWidth);

    if (animate) {
      const currentLeft = parseInt(thumb.style.left) || 0;
      const distance = Math.abs(newLeft - currentLeft);
      const maxDistance = trackWidth;
      const minDuration = 0.3;
      const maxDuration = 0.6;
      const duration = minDuration + (distance / maxDistance) * (maxDuration - minDuration);

      thumb.style.transition = `left ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
      thumb.style.left = newLeft + 'px';

      setTimeout(() => {
        thumb.style.transition = '';
      }, duration * 1000);
    } else {
      thumb.style.transition = '';
      thumb.style.left = newLeft + 'px';
    }

    this.currentDialData.currentIndex = index;
  },

  /**
   * Select a media item by index
   */
  selectMediaItem(index) {
    if (window.appController) {
      window.appController.goToIndex(index);
    }
  }
};

window.modalManager = modalManager;
