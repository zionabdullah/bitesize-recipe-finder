// ===================================================================
// BITESIZE CLIENT AUTH & DATA SERVICE (BFF API Client)
// Secure: Zero Firebase credentials or SDKs imported on the client.
// ===================================================================
const authApi = {
  _isRefreshing: false,
  _refreshQueue: [],

  getToken() {
    return localStorage.getItem('bitesize_auth_token') || null;
  },
  // Note: For a portfolio app, localStorage is acceptable for refresh tokens.
  // In a high-security production app, use an HttpOnly cookie.
  getRefreshToken() {
    return localStorage.getItem('bitesize_auth_refresh_token') || null;
  },
  setSession(user, token, refreshToken) {
    if (token) localStorage.setItem('bitesize_auth_token', token);
    if (refreshToken) localStorage.setItem('bitesize_auth_refresh_token', refreshToken);
    if (user) localStorage.setItem('bitesize_auth_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('bitesize_auth_token');
    localStorage.removeItem('bitesize_auth_refresh_token');
    localStorage.removeItem('bitesize_auth_user');
  },
  getCachedUser() {
    try {
      const u = localStorage.getItem('bitesize_auth_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },
  async doTokenRefresh() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Refresh failed');
    }
    
    this.setSession(null, data.token, data.refreshToken);
    return data.token;
  },
  async request(endpoint, options = {}, isRetry = false) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    
    const res = await fetch(endpoint, { ...options, headers });
    
    // Automatic 401 Interceptor and Refresh
    if (res.status === 401 && !isRetry) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        if (!this._isRefreshing) {
          this._isRefreshing = true;
          try {
            const newToken = await this.doTokenRefresh();
            this._isRefreshing = false;
            this._refreshQueue.forEach(cb => cb(newToken));
            this._refreshQueue = [];
            
            // Retry the original request
            options.headers = { ...options.headers, 'Authorization': `Bearer ${newToken}` };
            return await this.request(endpoint, options, true);
          } catch (err) {
            this._isRefreshing = false;
            this._refreshQueue.forEach(cb => cb(null));
            this._refreshQueue = [];
            this.clearSession();
            // Dispatch a custom event to update the UI
            window.dispatchEvent(new CustomEvent('session_expired'));
            throw err;
          }
        } else {
          // Wait for the ongoing refresh to complete
          return new Promise((resolve, reject) => {
            this._refreshQueue.push((newToken) => {
              if (newToken) {
                options.headers = { ...options.headers, 'Authorization': `Bearer ${newToken}` };
                resolve(this.request(endpoint, options, true));
              } else {
                reject(new Error('Session expired'));
              }
            });
          });
        }
      } else {
        this.clearSession();
        window.dispatchEvent(new CustomEvent('session_expired'));
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
  },
  async signUp(email, password, name, savedRecipes) {
    const data = await this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, savedRecipes })
    });
    this.setSession(data.user, data.token, data.refreshToken);
    return data;
  },
  async signIn(email, password) {
    const data = await this.request('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setSession(data.user, data.token, data.refreshToken);
    return data;
  },
  async getMe() {
    const data = await this.request('/api/auth/me');
    if (data.user) {
      // Don't overwrite the refresh token here if it's not returned
      this.setSession(data.user, this.getToken(), this.getRefreshToken());
    }
    return data;
  },
  async forgotPassword(email) {
    return await this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  async sendVerification() {
    return await this.request('/api/auth/send-verification', {
      method: 'POST'
    });
  },
  async updateProfile({ name, currentPassword, newPassword }) {
    const data = await this.request('/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({ name, currentPassword, newPassword })
    });
    if (data.token) {
      this.setSession(data.user, data.token, data.refreshToken);
    }
    return data;
  },
  async deleteAccount(password) {
    const data = await this.request('/api/auth/delete-account', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    this.clearSession();
    return data;
  },
  async getSavedRecipes() {
    return await this.request('/api/user/saved-recipes');
  },
  async saveRecipes(savedRecipes) {
    return await this.request('/api/user/saved-recipes', {
      method: 'POST',
      body: JSON.stringify({ savedRecipes })
    });
  }
};


/* ===================================================================
   BITESIZE - SMART INGREDIENT RECIPE FINDER & MEAL PLANNER (APP.JS)
   =================================================================== */

function startApp() {

  // -------------------------------------------------------------------
  // 1. APPLICATION STATE
  // -------------------------------------------------------------------
  const state = {
    activeIngredients: ['chicken', 'onion', 'garlic', 'mustard oil'],
    savedRecipes: JSON.parse(localStorage.getItem('bitesize_saved_recipes') || '[]'),
    currentRecipes: [],
    activeTab: 'discover',
    activeRecipeDetail: null,
    user: null,
    cookMode: {
      active: false,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
      timerSeconds: 300,
      timerInitial: 300,
      timerInterval: null,
      isRunning: false,
      synth: window.speechSynthesis || null
    },
    virtualFridge: JSON.parse(localStorage.getItem('bitesize_virtual_fridge') || '["tomato", "eggs", "milk", "garlic", "chicken"]'),
    detectedIngredients: [],
    cameraStream: null,
    snapMode: 'camera', // 'camera' | 'upload'
    currentCapturedBase64: null
  };

  // -------------------------------------------------------------------
  // 2. DOM ELEMENTS
  // -------------------------------------------------------------------
  const ingredientInput = document.getElementById('ingredient-input');
  const addIngredientBtn = document.getElementById('add-ingredient-btn');
  const autocompleteList = document.getElementById('autocomplete-list');
  const activeChipsContainer = document.getElementById('active-chips-container');
  const activeChipCount = document.getElementById('active-chip-count');
  const clearAllChipsBtn = document.getElementById('clear-all-chips-btn');
  const presetTagsContainer = document.getElementById('preset-tags-container');
  const findRecipesBtn = document.getElementById('find-recipes-btn');

  // Navigation & Header
  const navDiscoverBtn = document.getElementById('nav-discover-btn');
  const navSnapBtn = document.getElementById('nav-snap-btn');
  const sidebarSnapBtn = document.getElementById('sidebar-snap-btn');
  const navSavedBtn = document.getElementById('nav-saved-btn');
  const savedCountBadge = document.getElementById('saved-count-badge');
  const canvasTitle = document.getElementById('canvas-title');
  const canvasSubtitle = document.getElementById('canvas-subtitle');
  const sortSelect = document.getElementById('sort-select');

  // Virtual Fridge & AI Snap Modal Elements
  const fridgeSnapModal = document.getElementById('fridge-snap-modal');
  const closeSnapModalBtn = document.getElementById('close-snap-modal-btn');
  const tabModeCamera = document.getElementById('tab-mode-camera');
  const tabModeUpload = document.getElementById('tab-mode-upload');
  const cameraStreamVideo = document.getElementById('camera-stream');
  const snapPreviewImg = document.getElementById('snap-preview-img');
  const snapshotCanvas = document.getElementById('snapshot-canvas');
  const uploadDropzone = document.getElementById('upload-dropzone');
  const fridgeFileInput = document.getElementById('fridge-file-input');
  const captureSnapBtn = document.getElementById('capture-snap-btn');
  const retakeSnapBtn = document.getElementById('retake-snap-btn');
  const scanningOverlay = document.getElementById('scanning-overlay');
  const snapResultsContainer = document.getElementById('snap-results-container');
  const detectedChipsContainer = document.getElementById('detected-chips-container');
  const detectedCount = document.getElementById('detected-count');
  const importToFridgeBtn = document.getElementById('import-to-fridge-btn');
  const virtualFridgeChips = document.getElementById('virtual-fridge-chips');
  const fridgeItemCount = document.getElementById('fridge-item-count');
  const fridgeAddInput = document.getElementById('fridge-add-input');
  const fridgeAddBtn = document.getElementById('fridge-add-btn');
  const cookFromFridgeBtn = document.getElementById('cook-from-fridge-btn');

  // UI States Containers

  const stateEmpty = document.getElementById('state-empty');
  const stateLoading = document.getElementById('state-loading');
  const stateNoMatch = document.getElementById('state-no-match');
  const recipeGrid = document.getElementById('recipe-grid');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');

  // Recipe Detail Modal
  const modalBackdrop = document.getElementById('recipe-modal-backdrop');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalCloseFooterBtn = document.getElementById('modal-close-footer-btn');
  const modalImage = document.getElementById('modal-image');
  const modalTitle = document.getElementById('modal-title');
  const modalPrepBadge = document.getElementById('modal-prep-badge');
  const modalServingsBadge = document.getElementById('modal-servings-badge');
  const modalDietaryContainer = document.getElementById('modal-dietary-container');
  const modalMacroCalories = document.getElementById('modal-macro-calories');
  const modalMacroProtein = document.getElementById('modal-macro-protein');
  const modalMacroCarbs = document.getElementById('modal-macro-carbs');
  const modalMacroFat = document.getElementById('modal-macro-fat');
  const modalIngredientsList = document.getElementById('modal-ingredients-list');
  const modalInstructionsList = document.getElementById('modal-instructions-list');
  const modalBookmarkBtn = document.getElementById('modal-bookmark-btn');
  const modalBookmarkText = document.getElementById('modal-bookmark-text');
  const copyShoppingListBtn = document.getElementById('copy-shopping-list-btn');

  // Auth Modal
  const authModalTrigger = document.getElementById('auth-modal-trigger');
  const authModalBackdrop = document.getElementById('auth-modal-backdrop');
  const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
  const authForm = document.getElementById('auth-form');
  const userDisplayName = document.getElementById('user-display-name');
  const toastContainer = document.getElementById('toast-container');
  const authToggleModeBtn = document.getElementById('auth-toggle-mode-btn');
  const authNameGroup = document.getElementById('auth-name-group');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authTitle = document.getElementById('auth-modal-title');
  const authSubtitle = document.getElementById('auth-modal-subtitle');
  const authNameInput = document.getElementById('auth-name-input');
  const authErrorMessage = document.getElementById('auth-error-message');
  const authForgotPasswordContainer = document.getElementById('auth-forgot-password-container');
  const authForgotPasswordBtn = document.getElementById('auth-forgot-password-btn');
  const authGoogleBtn = document.getElementById('auth-google-btn');
  let authMode = 'signin';

  // Profile Modal
  const profileModalBackdrop = document.getElementById('profile-modal-backdrop');
  const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
  const profileForm = document.getElementById('profile-form');
  const profileNameInput = document.getElementById('profile-name-input');
  const profilePasswordInput = document.getElementById('profile-password-input');
  const profileCurrentPasswordInput = document.getElementById('profile-current-password-input');
  const profileCurrentPasswordContainer = document.getElementById('profile-current-password-container');
  const profileErrorMessage = document.getElementById('profile-error-message');
  const profileSuccessMessage = document.getElementById('profile-success-message');
  const profileLogoutBtn = document.getElementById('profile-logout-btn');
  const headerAvatarLetter = document.getElementById('header-avatar-letter');
  const profileAvatarLetter = document.getElementById('profile-avatar-letter');
  const profileModalName = document.getElementById('profile-modal-name');
  const profileModalEmail = document.getElementById('profile-modal-email');
  const profileVerificationBanner = document.getElementById('profile-verification-banner');
  const profileResendVerificationBtn = document.getElementById('profile-resend-verification-btn');
  const profileDeleteBtn = document.getElementById('profile-delete-btn');
  const deleteConfirmPanel = document.getElementById('delete-confirm-panel');
  const deleteConfirmPassword = document.getElementById('delete-confirm-password');
  const deletePasswordWrapper = document.getElementById('delete-password-wrapper');
  const deleteErrorMsg = document.getElementById('delete-error-msg');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

  // Dietary Checkboxes
  const filterHalal = document.getElementById('filter-halal');
  const filterVeg = document.getElementById('filter-veg');
  const filterVegan = document.getElementById('filter-vegan');
  const filterGf = document.getElementById('filter-gf');

  // Cook Mode Elements
  const startCookModeBtn = document.getElementById('start-cook-mode-btn');
  const cookModeBackdrop = document.getElementById('cook-mode-backdrop');
  const closeCookModeBtn = document.getElementById('close-cook-mode-btn');
  const cookRecipeTitle = document.getElementById('cook-mode-recipe-title');
  const cookProgressBar = document.getElementById('cook-mode-progress-bar');
  const cookStepBadge = document.getElementById('cook-mode-step-badge');
  const cookStepText = document.getElementById('cook-mode-step-text');
  const cookSpeakBtn = document.getElementById('cook-speak-btn');
  const cookSpeakBtnText = document.getElementById('cook-speak-btn-text');
  const cookPauseBtn = document.getElementById('cook-pause-btn');
  const cookVoiceSpeed = document.getElementById('cook-voice-speed');
  const cookVoiceSelect = document.getElementById('cook-voice-select');
  const cookAutoRead = document.getElementById('cook-auto-read');
  const cookTimerDetected = document.getElementById('cook-timer-detected');
  const cookTimerDisplay = document.getElementById('cook-timer-display');
  const cookTimerStart = document.getElementById('cook-timer-start');
  const cookTimerPause = document.getElementById('cook-timer-pause');
  const cookTimerReset = document.getElementById('cook-timer-reset');
  const cookPrevBtn = document.getElementById('cook-prev-btn');
  const cookNextBtn = document.getElementById('cook-next-btn');

  // -------------------------------------------------------------------
  // 3. INITIALIZATION & EVENT LISTENERS
  // -------------------------------------------------------------------
  function init() {
    updateUserDisplay();
    updateSavedCountBadge();
    renderChips();
    syncPresetTags();
    renderVirtualFridge();
    // Auto-fetch default initial demo recipe set for rich initial experience
    fetchRecipes();

    // Listen for session expiry from authApi
    window.addEventListener('session_expired', () => {
      state.user = null;
      updateUserDisplay();
      showToast('Session expired, please sign in again.', 'error');
      closeProfileModal();
    });

    // Restore and validate session from BFF service
    const cachedUser = authApi.getCachedUser();
    const token = authApi.getToken();
    if (cachedUser && token) {
      state.user = cachedUser;
      updateUserDisplay();
      // Silently fetch fresh user profile & saved recipes from backend
      authApi.getMe().then(res => {
        if (res.user) {
          state.user = res.user;
          if (Array.isArray(res.savedRecipes)) {
            state.savedRecipes = res.savedRecipes;
            localStorage.setItem('bitesize_saved_recipes', JSON.stringify(state.savedRecipes));
            updateSavedCountBadge();
            if (state.activeTab === 'saved') renderSavedRecipesGrid();
            else renderCurrentRecipesGrid();
          }
          updateUserDisplay();
        }
      }).catch(err => {
        console.warn('Session expired or invalidated:', err.message);
        authApi.clearSession();
        state.user = null;
        updateUserDisplay();
      });
    } else {
      updateUserDisplay();
    }
    ingredientInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddIngredientFromInput();
      }
    });

    // AI Scanner & Virtual Fridge Listeners
    if (navSnapBtn) navSnapBtn.addEventListener('click', openFridgeSnapModal);
    if (sidebarSnapBtn) sidebarSnapBtn.addEventListener('click', openFridgeSnapModal);
    if (closeSnapModalBtn) closeSnapModalBtn.addEventListener('click', closeFridgeSnapModal);
    if (tabModeCamera) tabModeCamera.addEventListener('click', () => setSnapMode('camera'));
    if (tabModeUpload) tabModeUpload.addEventListener('click', () => setSnapMode('upload'));
    if (captureSnapBtn) captureSnapBtn.addEventListener('click', handleCaptureAndScan);
    if (retakeSnapBtn) retakeSnapBtn.addEventListener('click', resetSnapModalState);
    if (importToFridgeBtn) importToFridgeBtn.addEventListener('click', importDetectedToVirtualFridge);
    if (uploadDropzone) uploadDropzone.addEventListener('click', () => fridgeFileInput.click());
    if (fridgeFileInput) fridgeFileInput.addEventListener('change', handleFileUpload);
    if (fridgeAddBtn) fridgeAddBtn.addEventListener('click', handleAddVirtualFridgeInput);
    if (fridgeAddInput) {
      fridgeAddInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddVirtualFridgeInput();
        }
      });
    }
    if (cookFromFridgeBtn) cookFromFridgeBtn.addEventListener('click', cookFromFridge);

    // Cook Mode Listeners
    if (startCookModeBtn) startCookModeBtn.addEventListener('click', openCookMode);
    if (closeCookModeBtn) closeCookModeBtn.addEventListener('click', closeCookMode);
    if (cookSpeakBtn) cookSpeakBtn.addEventListener('click', speakCurrentStep);
    if (cookPauseBtn) cookPauseBtn.addEventListener('click', stopSpeaking);
    if (cookTimerStart) cookTimerStart.addEventListener('click', startCookTimer);
    if (cookTimerPause) cookTimerPause.addEventListener('click', pauseCookTimer);
    if (cookTimerReset) cookTimerReset.addEventListener('click', resetCookTimer);
    if (cookPrevBtn) cookPrevBtn.addEventListener('click', prevCookStep);
    if (cookNextBtn) cookNextBtn.addEventListener('click', nextCookStep);

    // Filter checkbox listeners
    if (filterHalal) filterHalal.addEventListener('change', renderCurrentRecipesGrid);
    if (filterVeg) filterVeg.addEventListener('change', renderCurrentRecipesGrid);
    if (filterVegan) filterVegan.addEventListener('change', renderCurrentRecipesGrid);
    if (filterGf) filterGf.addEventListener('change', renderCurrentRecipesGrid);

    document.querySelectorAll('.cook-timer-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const addedSecs = parseInt(e.target.dataset.seconds || 60, 10);
        addCookTimerTime(addedSecs);
      });
    });

    // Keyboard navigation for Cook Mode
    document.addEventListener('keydown', (e) => {
      if (!state.cookMode.active) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCookStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCookStep();
      } else if (e.key === ' ') {
        // Spacebar toggles voice speech or timer
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (state.cookMode.synth && state.cookMode.synth.speaking) {
            stopSpeaking();
          } else {
            speakCurrentStep();
          }
        }
      }
    });

    // Autocomplete input with debounce
    let autocompleteDebounceTimer;
    ingredientInput.addEventListener('input', (e) => {
      clearTimeout(autocompleteDebounceTimer);
      const query = e.target.value.trim();
      if (query.length < 2) {
        autocompleteList.classList.add('hidden');
        return;
      }
      autocompleteDebounceTimer = setTimeout(() => fetchAutocomplete(query), 200);
    });

    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (!ingredientInput.contains(e.target) && !autocompleteList.contains(e.target)) {
        autocompleteList.classList.add('hidden');
      }
    });

    clearAllChipsBtn.addEventListener('click', clearAllChips);
    findRecipesBtn.addEventListener('click', () => fetchRecipes());
    resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Preset tag clicks
    presetTagsContainer.addEventListener('click', (e) => {
      const tag = e.target.closest('.stitch-preset-tag');
      if (!tag) return;
      const ingredient = tag.dataset.ingredient;
      toggleIngredient(ingredient);
    });

    // Quick demo buttons
    document.addEventListener('click', (e) => {
      const demoBtn = e.target.closest('.quick-demo-btn');
      if (demoBtn) {
        const ingredients = demoBtn.dataset.preset.split(',');
        state.activeIngredients = [...ingredients];
        renderChips();
        syncPresetTags();
        fetchRecipes();
      }
    });

    // Navigation Tab Switching
    navDiscoverBtn.addEventListener('click', () => switchTab('discover'));
    navSavedBtn.addEventListener('click', () => switchTab('saved'));

    // Sorting Dropdown
    sortSelect.addEventListener('change', () => renderCurrentRecipesGrid());

    // Recipe Detail Modal Close
    closeModalBtn.addEventListener('click', closeModal);
    modalCloseFooterBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Copy Shopping List
    copyShoppingListBtn.addEventListener('click', copyShoppingListToClipboard);

    // Modal Bookmark Toggle
    modalBookmarkBtn.addEventListener('click', () => {
      if (state.activeRecipeDetail) {
        toggleBookmark(state.activeRecipeDetail);
        updateModalBookmarkBtnState();
      }
    });

    // Auth / Profile Modal Triggers
    authModalTrigger.addEventListener('click', () => {
      if (state.user && state.user.uid) openProfileModal();
      else openAuthModal();
    });
    closeAuthModalBtn.addEventListener('click', closeAuthModal);
    authModalBackdrop.addEventListener('click', (e) => {
      if (e.target === authModalBackdrop) closeAuthModal();
    });

    if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', closeProfileModal);
    if (profileModalBackdrop) profileModalBackdrop.addEventListener('click', (e) => {
      if (e.target === profileModalBackdrop) closeProfileModal();
    });

    // Auth mode toggle (Sign In ↔ Sign Up)
    if (authToggleModeBtn) {
      authToggleModeBtn.addEventListener('click', () => {
        authErrorMessage.classList.add('hidden');
        authMode = authMode === 'signin' ? 'signup' : 'signin';
        if (authMode === 'signup') {
          authTitle.textContent = 'Create an Account';
          authSubtitle.textContent = 'Join BiteSize to save your favorite recipes.';
          authNameGroup.classList.remove('hidden');
          authNameInput.required = true;
          authSubmitBtn.textContent = 'Sign Up';
          authToggleModeBtn.textContent = 'Already have an account? Sign in';
          if (authForgotPasswordContainer) authForgotPasswordContainer.classList.add('hidden');
        } else {
          authTitle.textContent = 'Welcome Back';
          authSubtitle.textContent = 'Sign in to sync your saved recipes across all your devices.';
          authNameGroup.classList.add('hidden');
          authNameInput.required = false;
          authSubmitBtn.textContent = 'Sign In';
          authToggleModeBtn.textContent = "Don't have an account? Sign up";
          if (authForgotPasswordContainer) authForgotPasswordContainer.classList.remove('hidden');
        }
      });
    }

    // Forgot Password
    if (authForgotPasswordBtn) {
      authForgotPasswordBtn.addEventListener('click', async () => {
        const email = document.getElementById('auth-email-input').value.trim();
        if (!email) {
          authErrorMessage.textContent = 'Please enter your email address first.';
          authErrorMessage.classList.remove('hidden');
          return;
        }
        try {
          await authApi.forgotPassword(email);
          authErrorMessage.classList.add('hidden');
          showToast('Password reset email sent!', 'success');
        } catch (err) {
          authErrorMessage.textContent = err.message;
          authErrorMessage.classList.remove('hidden');
        }
      });
    }

    // Email/Password Auth Form
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      authErrorMessage.classList.add('hidden');
      const email = document.getElementById('auth-email-input').value.trim();
      const password = document.getElementById('auth-password-input').value.trim();
      const name = authNameInput ? authNameInput.value.trim() || 'Chef' : 'Chef';
      const originalText = authSubmitBtn ? authSubmitBtn.textContent : 'Submit';
      if (authSubmitBtn) {
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Please wait...';
      }

      try {
        if (authMode === 'signin') {
          const res = await authApi.signIn(email, password);
          state.user = res.user;
          if (Array.isArray(res.savedRecipes)) {
            state.savedRecipes = res.savedRecipes;
            localStorage.setItem('bitesize_saved_recipes', JSON.stringify(state.savedRecipes));
            updateSavedCountBadge();
            if (state.activeTab === 'saved') renderSavedRecipesGrid();
            else renderCurrentRecipesGrid();
          }
          const n = state.user.name || state.user.displayName || 'User';
          showToast(`Welcome back, ${n}! 🚀`, 'success');
        } else {
          const res = await authApi.signUp(email, password, name, state.savedRecipes);
          state.user = res.user;
          showToast('Account created! Please check your email to verify.', 'success');
        }
        updateUserDisplay();
        closeAuthModal();
      } catch (err) {
        authErrorMessage.textContent = err.message || 'Authentication failed.';
        authErrorMessage.classList.remove('hidden');
      } finally {
        if (authSubmitBtn) {
          authSubmitBtn.disabled = false;
          authSubmitBtn.textContent = originalText;
        }
      }
    });

    // Profile: Logout
    if (profileLogoutBtn) {
      profileLogoutBtn.addEventListener('click', () => {
        authApi.clearSession();
        state.user = null;
        state.savedRecipes = [];
        localStorage.removeItem('bitesize_saved_recipes');
        updateSavedCountBadge();
        updateUserDisplay();
        if (state.activeTab === 'saved') renderSavedRecipesGrid();
        else renderCurrentRecipesGrid();
        closeProfileModal();
        showToast('Logged out.', 'info');
      });
    }

    // Profile: Resend email verification
    if (profileResendVerificationBtn) {
      profileResendVerificationBtn.addEventListener('click', async () => {
        try {
          await authApi.sendVerification();
          showToast('Verification email resent!', 'success');
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    }

    // Profile: Save changes (name + password)
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        profileErrorMessage.classList.add('hidden');
        profileSuccessMessage.classList.add('hidden');
        const newName = profileNameInput.value.trim();
        const newPassword = profilePasswordInput.value;
        const currentPassword = profileCurrentPasswordInput ? profileCurrentPasswordInput.value : '';

        if (!currentPassword) {
          profileErrorMessage.textContent = 'Please enter your current password to save changes.';
          profileErrorMessage.classList.remove('hidden');
          return;
        }

        const submitBtn = profileForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving...';
        }

        try {
          const res = await authApi.updateProfile({
            name: newName,
            currentPassword,
            newPassword: newPassword || undefined
          });
          state.user = res.user;
          updateUserDisplay();
          profileSuccessMessage.textContent = 'Profile updated successfully!';
          profileSuccessMessage.classList.remove('hidden');
          profilePasswordInput.value = '';
          if (profileCurrentPasswordInput) profileCurrentPasswordInput.value = '';
          setTimeout(() => closeProfileModal(), 1500);
        } catch (err) {
          profileErrorMessage.textContent = err.message || 'Failed to update profile.';
          profileErrorMessage.classList.remove('hidden');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
          }
        }
      });
    }

    // Delete account — inline panel flow
    function showDeleteError(msg) {
      if (!deleteErrorMsg) return;
      deleteErrorMsg.textContent = msg;
      deleteErrorMsg.classList.remove('hidden');
    }
    function hideDeleteError() {
      if (!deleteErrorMsg) return;
      deleteErrorMsg.textContent = '';
      deleteErrorMsg.classList.add('hidden');
    }
    function closeDeletePanel() {
      if (deleteConfirmPanel) deleteConfirmPanel.classList.add('hidden');
      if (deleteConfirmPassword) deleteConfirmPassword.value = '';
      hideDeleteError();
    }
    if (profileDeleteBtn) {
      profileDeleteBtn.addEventListener('click', () => {
        if (deletePasswordWrapper) deletePasswordWrapper.classList.remove('hidden');
        hideDeleteError();
        deleteConfirmPanel.classList.remove('hidden');
        if (deleteConfirmPassword) deleteConfirmPassword.focus();
      });
    }
    if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeletePanel);
    if (deleteConfirmBtn) {
      deleteConfirmBtn.addEventListener('click', async () => {
        hideDeleteError();
        const pwd = deleteConfirmPassword ? deleteConfirmPassword.value.trim() : '';
        if (!pwd) {
          showDeleteError('Please enter your password.');
          deleteConfirmPassword?.focus();
          return;
        }
        deleteConfirmBtn.disabled = true;
        deleteConfirmBtn.textContent = 'Deleting…';
        try {
          await authApi.deleteAccount(pwd);
          state.user = null;
          state.savedRecipes = [];
          localStorage.removeItem('bitesize_saved_recipes');
          updateSavedCountBadge();
          updateUserDisplay();
          if (state.activeTab === 'saved') renderSavedRecipesGrid();
          else renderCurrentRecipesGrid();
          closeDeletePanel();
          closeProfileModal();
          showToast('Account permanently deleted.', 'info');
        } catch (e) {
          deleteConfirmBtn.disabled = false;
          deleteConfirmBtn.textContent = 'Yes, Delete My Account';
          showDeleteError(e.message || 'Failed to delete account.');
        }
      });
    }

    // Escape Key Handler for Modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeAuthModal();
        closeProfileModal();
      }
    });
  }

  // -------------------------------------------------------------------
  // 4. INGREDIENT TAG & PRESET LOGIC
  // -------------------------------------------------------------------
  function handleAddIngredientFromInput() {
    const val = ingredientInput.value.trim().toLowerCase();
    if (!val) return;
    addIngredient(val);
    ingredientInput.value = '';
    autocompleteList.classList.add('hidden');
  }

  function addIngredient(name) {
    const clean = name.toLowerCase().trim();
    if (!state.activeIngredients.includes(clean)) {
      state.activeIngredients.push(clean);
      renderChips();
      syncPresetTags();
    }
  }

  function removeIngredient(name) {
    state.activeIngredients = state.activeIngredients.filter(i => i !== name);
    renderChips();
    syncPresetTags();
  }

  function toggleIngredient(name) {
    const clean = name.toLowerCase().trim();
    if (state.activeIngredients.includes(clean)) {
      removeIngredient(clean);
    } else {
      addIngredient(clean);
    }
  }

  function clearAllChips() {
    state.activeIngredients = [];
    renderChips();
    syncPresetTags();
    showEmptyState();
  }

  function renderChips() {
    const count = state.activeIngredients.length;
    activeChipCount.textContent = count;
    clearAllChipsBtn.classList.toggle('hidden', count === 0);

    activeChipsContainer.innerHTML = '';

    if (count === 0) {
      activeChipsContainer.innerHTML = `
        <span id="no-chips-placeholder" class="text-xs text-slate-400 italic">
          No ingredients added yet. Tap preset options below or type above!
        </span>
      `;
      return;
    }

    state.activeIngredients.forEach(ing => {
      const chip = document.createElement('div');
      chip.className = 'stitch-chip';
      chip.innerHTML = `
        <span>${ing}</span>
        <button type="button" class="chip-remove-btn" title="Remove ingredient">✕</button>
      `;
      chip.querySelector('.chip-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        removeIngredient(ing);
      });
      activeChipsContainer.appendChild(chip);
    });
  }

  function syncPresetTags() {
    const presetButtons = presetTagsContainer.querySelectorAll('.stitch-preset-tag');
    presetButtons.forEach(btn => {
      const ing = btn.dataset.ingredient.toLowerCase();
      if (state.activeIngredients.includes(ing)) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  // -------------------------------------------------------------------
  // 5. AUTOCOMPLETE FETCH
  // -------------------------------------------------------------------
  async function fetchAutocomplete(query) {
    try {
      const res = await fetch(`/api/ingredients/autocomplete?query=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const suggestions = await res.json();

      if (!suggestions || suggestions.length === 0) {
        autocompleteList.classList.add('hidden');
        return;
      }

      autocompleteList.innerHTML = suggestions.map(item => `
        <div class="px-4 py-2 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between autocomplete-item">
          <span>${item}</span>
          <span class="text-[10px] text-slate-400">+ Add</span>
        </div>
      `).join('');

      autocompleteList.classList.remove('hidden');

      autocompleteList.querySelectorAll('.autocomplete-item').forEach((el, index) => {
        el.addEventListener('click', () => {
          addIngredient(suggestions[index]);
          ingredientInput.value = '';
          autocompleteList.classList.add('hidden');
        });
      });
    } catch (err) {
      console.warn('Autocomplete fetch failed:', err);
    }
  }

  // -------------------------------------------------------------------
  // 6. RECIPE API FETCHING & FILTERING
  // -------------------------------------------------------------------
  async function fetchRecipes() {
    if (state.activeIngredients.length === 0) {
      showEmptyState();
      return;
    }

    showLoadingState();
    switchTab('discover');

    try {
      const queryStr = state.activeIngredients.join(',');
      const res = await fetch(`/api/recipes/search?ingredients=${encodeURIComponent(queryStr)}`);
      const payload = await res.json();

      if (!res.ok || !payload.data) {
        showNoMatchState();
        return;
      }

      state.currentRecipes = payload.data;

      if (payload.message) {
        console.log('[Notice]', payload.message);
      }

      renderCurrentRecipesGrid();
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
      showToast('Server error searching recipes. Please try again.', 'error');
      showNoMatchState();
    }
  }

  function renderCurrentRecipesGrid() {
    let recipes = [...state.currentRecipes];

    // Filter by Dietary checkboxes (only filter if dietary metadata is defined or if matches)
    if (filterHalal && filterHalal.checked) {
      recipes = recipes.filter(r => !r.dietary || r.dietary.includes('Halal'));
    }
    if (filterVeg && filterVeg.checked) {
      recipes = recipes.filter(r => !r.dietary || r.dietary.includes('Vegetarian'));
    }
    if (filterVegan && filterVegan.checked) {
      recipes = recipes.filter(r => !r.dietary || r.dietary.includes('Vegan'));
    }
    if (filterGf && filterGf.checked) {
      recipes = recipes.filter(r => !r.dietary || r.dietary.includes('Gluten-Free'));
    }

    // Apply Sorting
    const sortVal = sortSelect ? sortSelect.value : 'matched';
    if (sortVal === 'matched') {
      recipes.sort((a, b) => (b.usedIngredientCount || 0) - (a.usedIngredientCount || 0));
    } else if (sortVal === 'time') {
      recipes.sort((a, b) => (a.readyInMinutes || 30) - (b.readyInMinutes || 30));
    } else if (sortVal === 'calories') {
      recipes.sort((a, b) => (a.calories || 500) - (b.calories || 500));
    }

    if (recipes.length === 0) {
      showNoMatchState();
      return;
    }

    // Hide empty & loading states, show grid
    stateEmpty.classList.add('hidden');
    stateLoading.classList.add('hidden');
    stateNoMatch.classList.add('hidden');
    recipeGrid.classList.remove('hidden');

    recipeGrid.innerHTML = '';
    recipes.forEach(recipe => {
      const card = buildRecipeCardElement(recipe);
      recipeGrid.appendChild(card);
    });
  }

  // -------------------------------------------------------------------
  // 7. CARD BUILDER & INTERACTION
  // -------------------------------------------------------------------
  function buildRecipeCardElement(recipe) {
    const isBookmarked = state.savedRecipes.some(r => r.id === recipe.id);
    const card = document.createElement('div');
    card.className = 'stitch-card-elevated group cursor-pointer';

    const usedCount = recipe.usedIngredientCount || (recipe.usedIngredients ? recipe.usedIngredients.length : 2);
    const missedCount = recipe.missedIngredientCount || (recipe.missedIngredients ? recipe.missedIngredients.length : 1);
    const prepTime = recipe.readyInMinutes || 25;

    card.innerHTML = `
      <div class="stitch-card-image-wrapper">
        <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
        <div class="stitch-card-badge">
          <span>⏱️</span> ${prepTime}m
        </div>
        <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" title="${isBookmarked ? 'Remove from saved' : 'Save recipe'}">
          ${isBookmarked ? '❤️' : '🤍'}
        </button>
      </div>

      <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span class="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
              ✓ ${usedCount} Owned
            </span>
            <span class="text-[11px] font-bold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
              + ${missedCount} Missing
            </span>
          </div>

          <h3 class="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-snug">
            ${recipe.title}
          </h3>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>🔥 ${recipe.calories || 450} kcal</span>
          <span class="font-bold text-emerald-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
            View Recipe ➔
          </span>
        </div>
      </div>
    `;

    // Heart Bookmark Trigger
    const bookmarkBtn = card.querySelector('.bookmark-btn');
    bookmarkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmark(recipe);
      renderCurrentRecipesGrid();
    });

    // Card Click -> Open Detail Modal
    card.addEventListener('click', () => openRecipeModal(recipe.id, recipe));

    return card;
  }

  // -------------------------------------------------------------------
  // 8. SAVED RECIPES & TAB SWITCHING
  // -------------------------------------------------------------------
  function switchTab(tab) {
    state.activeTab = tab;

    if (tab === 'discover') {
      navDiscoverBtn.className = 'px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full bg-white text-emerald-700 shadow-sm transition-all flex items-center gap-1.5';
      navSavedBtn.className = 'px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5';
      canvasTitle.innerHTML = '<span>✨</span> Recommended Recipes';
      canvasSubtitle.textContent = 'Select ingredients on the left to match delicious dishes.';

      if (state.currentRecipes.length > 0) {
        renderCurrentRecipesGrid();
      } else {
        showEmptyState();
      }
    } else if (tab === 'saved') {
      navSavedBtn.className = 'px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full bg-white text-rose-600 shadow-sm transition-all flex items-center gap-1.5';
      navDiscoverBtn.className = 'px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5';
      canvasTitle.innerHTML = '<span>❤️</span> Your Saved Recipes';
      canvasSubtitle.textContent = `You have ${state.savedRecipes.length} recipes saved for later.`;

      renderSavedRecipesGrid();
    }
  }

  function renderSavedRecipesGrid() {
    stateEmpty.classList.add('hidden');
    stateLoading.classList.add('hidden');
    stateNoMatch.classList.add('hidden');

    if (state.savedRecipes.length === 0) {
      recipeGrid.classList.add('hidden');
      stateEmpty.innerHTML = `
        <div class="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-2">
          🤍
        </div>
        <h3 class="text-xl font-bold text-slate-900">No saved recipes yet</h3>
        <p class="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Tap the heart icon on any recipe card to save it here for easy meal planning!
        </p>
        <button id="saved-empty-discover-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow transition-all">
          Explore Recipes Now
        </button>
      `;
      stateEmpty.classList.remove('hidden');
      document.getElementById('saved-empty-discover-btn').addEventListener('click', () => switchTab('discover'));
      return;
    }

    recipeGrid.classList.remove('hidden');
    recipeGrid.innerHTML = '';
    state.savedRecipes.forEach(recipe => {
      const card = buildRecipeCardElement(recipe);
      recipeGrid.appendChild(card);
    });
  }

  function toggleBookmark(recipe) {
    const index = state.savedRecipes.findIndex(r => r.id === recipe.id);
    if (index > -1) {
      state.savedRecipes.splice(index, 1);
      showToast(`Removed "${recipe.title}" from saved recipes.`, 'info');
    } else {
      state.savedRecipes.push(recipe);
      showToast(`Saved "${recipe.title}" to favorites! ❤️`, 'success');
    }

    localStorage.setItem('bitesize_saved_recipes', JSON.stringify(state.savedRecipes));
    // Sync to backend if logged in
    if (state.user && state.user.uid && authApi.getToken()) {
      authApi.saveRecipes(state.savedRecipes)
        .catch(e => console.error('Error syncing saved recipes:', e));
    }
    updateSavedCountBadge();

    if (state.activeTab === 'saved') {
      renderSavedRecipesGrid();
    }
  }

  function updateSavedCountBadge() {
    savedCountBadge.textContent = state.savedRecipes.length;
  }

  // -------------------------------------------------------------------
  // 9. DETAILED RECIPE MODAL LOGIC (`stitch-dialog-full`)
  // -------------------------------------------------------------------
  async function openRecipeModal(recipeId, cachedRecipe = null) {
    showToast('Loading full recipe instructions...', 'info');

    let recipe = cachedRecipe;

    try {
      const res = await fetch(`/api/recipes/${recipeId}/information`);
      if (res.ok) {
        const payload = await res.json();
        if (payload.data) {
          recipe = { ...recipe, ...payload.data };
        }
      }
    } catch (err) {
      console.warn('Could not fetch extra recipe info, rendering basic recipe:', err);
    }

    if (!recipe) return;

    state.activeRecipeDetail = recipe;

    // Populate Modal Content
    modalImage.src = recipe.image;
    modalTitle.textContent = recipe.title;
    modalPrepBadge.textContent = `⏱️ ${recipe.readyInMinutes || 25} mins`;
    modalServingsBadge.textContent = `👥 ${recipe.servings || 4} Servings`;

    // Populate Dietary Badges
    modalDietaryContainer.innerHTML = '';
    const dietaryList = recipe.dietary || ['Healthy Choice'];
    dietaryList.forEach(d => {
      const badge = document.createElement('span');
      badge.className = 'px-2 py-0.5 bg-orange-500/80 text-white text-[10px] font-bold rounded-full backdrop-blur-sm';
      badge.textContent = d;
      modalDietaryContainer.appendChild(badge);
    });

    // Populate Macros
    modalMacroCalories.textContent = `${recipe.calories || 520} kcal`;
    modalMacroProtein.textContent = recipe.protein || '32g';
    modalMacroCarbs.textContent = recipe.carbs || '45g';
    modalMacroFat.textContent = recipe.fat || '18g';

    // Populate Ingredients List (Highlighting owned vs missing)
    modalIngredientsList.innerHTML = '';
    const allIngredients = [
      ...(recipe.usedIngredients || []),
      ...(recipe.missedIngredients || [])
    ];

    if (allIngredients.length === 0) {
      modalIngredientsList.innerHTML = '<p class="text-xs text-slate-400">Ingredients list unavailable.</p>';
    } else {
      allIngredients.forEach(item => {
        const nameClean = item.name ? item.name.toLowerCase() : '';
        const isOwned = state.activeIngredients.some(ing => nameClean.includes(ing) || ing.includes(nameClean));

        const itemEl = document.createElement('div');
        itemEl.className = `p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${isOwned
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          : 'bg-orange-50/80 border-orange-200 text-orange-950'
          }`;

        itemEl.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isOwned ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'
          }">
              ${isOwned ? '✓' : '!'}
            </span>
            <span>${item.original || item.name}</span>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-wider ${isOwned ? 'text-emerald-700' : 'text-orange-700'}">
            ${isOwned ? 'In Pantry' : 'To Buy'}
          </span>
        `;
        modalIngredientsList.appendChild(itemEl);
      });
    }

    // Populate Numbered Step-by-Step Instructions
    modalInstructionsList.innerHTML = '';
    let steps = [];
    if (Array.isArray(recipe.instructions)) {
      steps = recipe.instructions;
    } else if (typeof recipe.instructions === 'string' && recipe.instructions.trim()) {
      steps = recipe.instructions.split(/\r?\n|\.\s+/).map(s => s.trim()).filter(s => s.length > 5);
    }
    if (!steps || steps.length === 0) {
      steps = [
        'Prepare all ingredients by washing and chopping vegetables.',
        'Heat oil in a large skillet over medium-high heat.',
        'Add main ingredients and cook until golden brown and cooked through.',
        'Season with salt, pepper, and herbs before serving hot.'
      ];
    }

    steps.forEach((step, idx) => {
      const li = document.createElement('li');
      li.className = 'flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100';
      li.innerHTML = `
        <span class="w-6 h-6 rounded-full bg-emerald-600 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs">
          ${idx + 1}
        </span>
        <p class="pt-0.5 leading-relaxed">${step}</p>
      `;
      modalInstructionsList.appendChild(li);
    });

    updateModalBookmarkBtnState();

    // Show Dialog
    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateModalBookmarkBtnState() {
    if (!state.activeRecipeDetail) return;
    const isSaved = state.savedRecipes.some(r => r.id === state.activeRecipeDetail.id);
    modalBookmarkText.textContent = isSaved ? 'Saved to Favorites ❤️' : 'Save to Favorites';
  }

  function copyShoppingListToClipboard() {
    if (!state.activeRecipeDetail) return;
    const recipe = state.activeRecipeDetail;
    const allIngredients = [
      ...(recipe.usedIngredients || []),
      ...(recipe.missedIngredients || [])
    ];
    const text = `🛒 BiteSize Shopping List for ${recipe.title}:\n\n` +
      allIngredients.map(i => `- ${i.original || i.name}`).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      showToast('Shopping list copied to clipboard! 📋', 'success');
    }).catch(() => {
      showToast('Failed to copy list.', 'error');
    });
  }

  // -------------------------------------------------------------------
  // 10. AUTH MODAL LOGIC
  // -------------------------------------------------------------------
  function openAuthModal() {
    if (authErrorMessage) authErrorMessage.classList.add('hidden');
    authModalBackdrop.classList.add('open');
  }

  function closeAuthModal() {
    authModalBackdrop.classList.remove('open');
    if (authForm) authForm.reset();
  }

  function openProfileModal() {
    if (!state.user) return;
    const name = state.user.name || state.user.displayName || 'User';
    if (profileNameInput) profileNameInput.value = name;
    if (profilePasswordInput) profilePasswordInput.value = '';
    if (profileCurrentPasswordInput) profileCurrentPasswordInput.value = '';
    if (profileModalName) profileModalName.textContent = name;
    if (profileModalEmail) profileModalEmail.textContent = state.user.email || '';
    if (profileAvatarLetter) profileAvatarLetter.textContent = name.charAt(0).toUpperCase();
    if (profileErrorMessage) profileErrorMessage.classList.add('hidden');
    if (profileSuccessMessage) profileSuccessMessage.classList.add('hidden');
    if (profileVerificationBanner) {
      profileVerificationBanner.classList.toggle('hidden', !!state.user.emailVerified);
    }
    if (profileCurrentPasswordContainer) {
      profileCurrentPasswordContainer.classList.remove('hidden');
    }
    // Reset delete panel
    if (deleteConfirmPanel) deleteConfirmPanel.classList.add('hidden');
    if (deleteConfirmPassword) deleteConfirmPassword.value = '';
    if (deleteErrorMsg) { deleteErrorMsg.textContent = ''; deleteErrorMsg.classList.add('hidden'); }
    if (profileModalBackdrop) profileModalBackdrop.classList.add('open');
  }

  function closeProfileModal() {
    if (profileModalBackdrop) profileModalBackdrop.classList.remove('open');
    if (deleteConfirmPanel) deleteConfirmPanel.classList.add('hidden');
    if (deleteConfirmPassword) deleteConfirmPassword.value = '';
    if (deleteErrorMsg) { deleteErrorMsg.textContent = ''; deleteErrorMsg.classList.add('hidden'); }
  }

  function updateUserDisplay() {
    if (state.user && state.user.uid) {
      const name = state.user.name || state.user.displayName || 'User';
      userDisplayName.textContent = name;
      if (headerAvatarLetter) {
        headerAvatarLetter.textContent = name.charAt(0).toUpperCase();
        headerAvatarLetter.className = 'w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs';
      }
    } else {
      userDisplayName.textContent = 'Sign In';
      if (headerAvatarLetter) {
        headerAvatarLetter.textContent = '👤';
        headerAvatarLetter.className = 'w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs';
      }
    }
  }

  // -------------------------------------------------------------------
  // 11. UI STATE HELPERS & TOASTS
  // -------------------------------------------------------------------
  function showEmptyState() {
    stateEmpty.classList.remove('hidden');
    stateLoading.classList.add('hidden');
    recipeGrid.classList.add('hidden');
    stateNoMatch.classList.add('hidden');
  }

  function showLoadingState() {
    stateEmpty.classList.add('hidden');
    stateNoMatch.classList.add('hidden');
    recipeGrid.classList.add('hidden');

    stateLoading.classList.remove('hidden');
    stateLoading.innerHTML = '';
    const template = document.getElementById('skeleton-card-template');

    for (let i = 0; i < 6; i++) {
      if (template) {
        stateLoading.appendChild(template.content.cloneNode(true));
      } else {
        const div = document.createElement('div');
        div.className = 'stitch-skeleton-card space-y-3 p-4';
        div.innerHTML = `
          <div class="w-full h-44 rounded-xl skeleton-shimmer"></div>
          <div class="h-5 w-3/4 rounded skeleton-shimmer"></div>
          <div class="h-4 w-1/2 rounded skeleton-shimmer"></div>
          <div class="h-8 w-full rounded-lg skeleton-shimmer"></div>
        `;
        stateLoading.appendChild(div);
      }
    }
  }

  function showNoMatchState() {
    stateEmpty.classList.add('hidden');
    stateLoading.classList.add('hidden');
    recipeGrid.classList.add('hidden');
    stateNoMatch.classList.remove('hidden');
  }

  function resetAllFilters() {
    filterVeg.checked = false;
    filterVegan.checked = false;
    filterGf.checked = false;
    filterKeto.checked = false;
    state.activeIngredients = ['tomato', 'garlic', 'chicken', 'pasta'];
    renderChips();
    syncPresetTags();
    fetchRecipes();
  }

  // -------------------------------------------------------------------
  // 12. AI VISION FRIDGE SCANNER & VIRTUAL FRIDGE MANAGER
  // -------------------------------------------------------------------

  // Render Virtual Fridge Chips in Sidebar
  function renderVirtualFridge() {
    if (!virtualFridgeChips || !fridgeItemCount) return;

    virtualFridgeChips.innerHTML = '';
    fridgeItemCount.textContent = state.virtualFridge.length;

    if (state.virtualFridge.length === 0) {
      virtualFridgeChips.innerHTML = `<span class="text-xs text-slate-400 italic">No fridge items stored yet. Tap Scan!</span>`;
      return;
    }

    // Emoji mapping for common items
    const emojiMap = {
      tomato: '🍅', eggs: '🥚', egg: '🥚', milk: '🥛', garlic: '🧄', onion: '🧅',
      chicken: '🍗', cheese: '🧀', butter: '🧈', rice: '🍚', pasta: '🍝',
      spinach: '🥬', beef: '🥩', pork: '🥓', avocado: '🥑', pepper: '🫑',
      'bell pepper': '🫑', lemon: '🍋', mushroom: '🍄', carrot: '🥕', broccoli: '🥦'
    };

    state.virtualFridge.forEach(item => {
      const chip = document.createElement('span');
      chip.className = 'fridge-chip';

      const lower = item.toLowerCase().trim();
      const emoji = emojiMap[lower] || '🥦';

      chip.innerHTML = `
        <span>${emoji}</span>
        <span class="capitalize">${item}</span>
        <button class="chip-remove-btn" title="Remove item">✕</button>
      `;

      chip.querySelector('.chip-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        removeVirtualFridgeItem(item);
      });

      virtualFridgeChips.appendChild(chip);
    });

    // Save to LocalStorage
    localStorage.setItem('bitesize_virtual_fridge', JSON.stringify(state.virtualFridge));
  }

  function addVirtualFridgeItem(itemStr) {
    if (!itemStr) return;
    const cleanItem = itemStr.trim().toLowerCase();
    if (cleanItem && !state.virtualFridge.includes(cleanItem)) {
      state.virtualFridge.push(cleanItem);
      renderVirtualFridge();
    }
  }

  function removeVirtualFridgeItem(itemStr) {
    state.virtualFridge = state.virtualFridge.filter(i => i.toLowerCase() !== itemStr.toLowerCase());
    renderVirtualFridge();
    showToast(`Removed "${itemStr}" from Virtual Fridge`, 'info');
  }

  function handleAddVirtualFridgeInput() {
    if (!fridgeAddInput) return;
    const val = fridgeAddInput.value.trim();
    if (val) {
      addVirtualFridgeItem(val);
      fridgeAddInput.value = '';
      showToast(`Added "${val}" to Virtual Fridge!`, 'success');
    }
  }

  // 1-Click Cook From Fridge Action
  function cookFromFridge() {
    if (state.virtualFridge.length === 0) {
      showToast('Your Virtual Fridge is empty! Scan a photo or add items first.', 'error');
      openFridgeSnapModal();
      return;
    }

    state.activeIngredients = [...new Set([...state.virtualFridge])];
    renderChips();
    syncPresetTags();
    
    // Switch tab to Discover if on Saved
    if (state.activeTab !== 'discover') {
      switchTab('discover');
    }

    fetchRecipes();
    showToast(`Searching recipes matching ${state.virtualFridge.length} items in your fridge! 🍳`, 'success');
  }

  // Modal Control & Camera Handlers
  function openFridgeSnapModal() {
    if (!fridgeSnapModal) return;
    fridgeSnapModal.classList.add('open');
    resetSnapModalState();
    setSnapMode('camera');
  }

  function closeFridgeSnapModal() {
    if (!fridgeSnapModal) return;
    fridgeSnapModal.classList.remove('open');
    stopCamera();
  }

  function setSnapMode(mode) {
    state.snapMode = mode;

    if (mode === 'camera') {
      tabModeCamera.classList.add('bg-white', 'text-emerald-700', 'shadow-xs', 'font-bold');
      tabModeCamera.classList.remove('text-slate-600', 'font-medium');

      tabModeUpload.classList.remove('bg-white', 'text-emerald-700', 'shadow-xs', 'font-bold');
      tabModeUpload.classList.add('text-slate-600', 'font-medium');

      uploadDropzone.classList.add('hidden');
      
      if (state.currentCapturedBase64) {
        cameraStreamVideo.classList.add('hidden');
        snapPreviewImg.classList.remove('hidden');
        captureSnapBtn.innerHTML = `<span>⚡</span> Scan Selected Photo`;
      } else {
        snapPreviewImg.classList.add('hidden');
        cameraStreamVideo.classList.remove('hidden');
        captureSnapBtn.innerHTML = `<span>📸</span> Capture & Scan Photo`;
        startCamera();
      }
    } else {
      tabModeUpload.classList.add('bg-white', 'text-emerald-700', 'shadow-xs', 'font-bold');
      tabModeUpload.classList.remove('text-slate-600', 'font-medium');

      tabModeCamera.classList.remove('bg-white', 'text-emerald-700', 'shadow-xs', 'font-bold');
      tabModeCamera.classList.add('text-slate-600', 'font-medium');

      stopCamera();
      cameraStreamVideo.classList.add('hidden');

      if (state.currentCapturedBase64) {
        snapPreviewImg.classList.remove('hidden');
        uploadDropzone.classList.add('hidden');
        captureSnapBtn.innerHTML = `<span>⚡</span> Scan Selected Photo`;
      } else {
        snapPreviewImg.classList.add('hidden');
        uploadDropzone.classList.remove('hidden');
        captureSnapBtn.innerHTML = `<span>📁</span> Select / Take Photo`;
      }
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Live camera requires HTTPS on mobile. Switched to Photo Upload / Camera Take.', 'info');
      setSnapMode('upload');
      return;
    }

    try {
      stopCamera();

      // Constraint Attempt 1: Rear camera preferred on mobile
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (e1) {
        // Constraint Attempt 2: Generic video fallback
        console.warn('Environment camera constraint failed, trying standard camera:', e1);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      state.cameraStream = stream;
      cameraStreamVideo.srcObject = stream;
      cameraStreamVideo.muted = true;

      try {
        await cameraStreamVideo.play();
      } catch (playErr) {
        console.warn('Video play call error:', playErr);
      }

      // Check if video actually renders within 1.5s (e.g. mobile HTTP permission block)
      setTimeout(() => {
        if (state.snapMode === 'camera' && !state.currentCapturedBase64 && (!cameraStreamVideo.videoWidth || cameraStreamVideo.paused)) {
          console.warn('Camera stream active but video width is 0. Switching to Upload fallback.');
          showToast('Switched to Photo / Camera Upload mode.', 'info');
          setSnapMode('upload');
        }
      }, 1500);

    } catch (err) {
      console.warn('Camera access error:', err);
      showToast('Camera stream unavailable. Switched to Photo / Camera Upload.', 'info');
      setSnapMode('upload');
    }
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop());
      state.cameraStream = null;
    }
  }

  function resetSnapModalState() {
    state.currentCapturedBase64 = null;
    snapPreviewImg.src = '';
    snapPreviewImg.classList.add('hidden');
    snapResultsContainer.classList.add('hidden');
    scanningOverlay.classList.add('hidden');
    retakeSnapBtn.classList.add('hidden');
    captureSnapBtn.classList.remove('hidden');
    captureSnapBtn.disabled = false;
    
    if (state.snapMode === 'camera') {
      captureSnapBtn.innerHTML = `<span>📸</span> Capture & Scan Photo`;
      cameraStreamVideo.classList.remove('hidden');
      uploadDropzone.classList.add('hidden');
      startCamera();
    } else {
      captureSnapBtn.innerHTML = `<span>📁</span> Select / Take Photo`;
      cameraStreamVideo.classList.add('hidden');
      uploadDropzone.classList.remove('hidden');
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      state.currentCapturedBase64 = event.target.result;
      snapPreviewImg.src = state.currentCapturedBase64;
      snapPreviewImg.classList.remove('hidden');
      cameraStreamVideo.classList.add('hidden');
      uploadDropzone.classList.add('hidden');
      retakeSnapBtn.classList.remove('hidden');
      captureSnapBtn.innerHTML = `<span>⚡</span> Scan Selected Photo`;
      captureSnapBtn.classList.remove('hidden');
      captureSnapBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  async function handleCaptureAndScan() {
    let base64Image = state.currentCapturedBase64 || '';

    if (!base64Image && state.snapMode === 'camera') {
      // If camera stream is not active or video is paused/0px, open file/camera picker fallback!
      if (!cameraStreamVideo.videoWidth || cameraStreamVideo.paused) {
        showToast('Opening camera/file picker...', 'info');
        if (fridgeFileInput) fridgeFileInput.click();
        return;
      }

      snapshotCanvas.width = cameraStreamVideo.videoWidth || 640;
      snapshotCanvas.height = cameraStreamVideo.videoHeight || 480;
      const ctx = snapshotCanvas.getContext('2d');
      ctx.drawImage(cameraStreamVideo, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

      base64Image = snapshotCanvas.toDataURL('image/jpeg', 0.85);
      state.currentCapturedBase64 = base64Image;
      stopCamera();

      snapPreviewImg.src = base64Image;
      cameraStreamVideo.classList.add('hidden');
      snapPreviewImg.classList.remove('hidden');
    } else if (!base64Image) {
      if (fridgeFileInput) fridgeFileInput.click();
      return;
    }

    // Show Scanning State UI
    scanningOverlay.classList.remove('hidden');
    captureSnapBtn.disabled = true;
    captureSnapBtn.innerHTML = `<span>⏳</span> AI Scanning Image...`;
    retakeSnapBtn.classList.remove('hidden');

    try {
      const res = await fetch('/api/vision/scan-fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await res.json();
      scanningOverlay.classList.add('hidden');

      if (data.ingredients && Array.isArray(data.ingredients)) {
        state.detectedIngredients = data.ingredients;
        renderDetectedChips();
        snapResultsContainer.classList.remove('hidden');
        captureSnapBtn.classList.add('hidden');
        showToast(`AI Detected ${data.ingredients.length} items in your fridge! ✨`, 'success');
      } else {
        throw new Error('No ingredients detected');
      }
    } catch (err) {
      console.error('Vision scan error:', err);
      scanningOverlay.classList.add('hidden');
      captureSnapBtn.disabled = false;
      captureSnapBtn.innerHTML = `<span>📸</span> Try Scanning Again`;
      showToast('Could not analyze photo. Please try another clear picture.', 'error');
    }
  }

  function renderDetectedChips() {
    if (!detectedChipsContainer || !detectedCount) return;

    detectedChipsContainer.innerHTML = '';
    detectedCount.textContent = state.detectedIngredients.length;

    state.detectedIngredients.forEach(item => {
      const chip = document.createElement('span');
      chip.className = 'px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-full flex items-center gap-1 shadow-2xs';
      chip.innerHTML = `<span>✨</span> <span class="capitalize">${item}</span>`;
      detectedChipsContainer.appendChild(chip);
    });
  }

  function importDetectedToVirtualFridge() {
    if (state.detectedIngredients.length === 0) return;

    let addedCount = 0;
    state.detectedIngredients.forEach(item => {
      const clean = item.trim().toLowerCase();
      if (!state.virtualFridge.includes(clean)) {
        state.virtualFridge.push(clean);
        addedCount++;
      }
    });

    renderVirtualFridge();
    closeFridgeSnapModal();
    showToast(`Imported ${addedCount} new ingredients into your Virtual Fridge! 🧊`, 'success');
  }

  // -------------------------------------------------------------------
  // 12. HANDS-FREE COOK MODE & STEP TIMER LOGIC
  // -------------------------------------------------------------------
  function openCookMode() {
    if (!state.activeRecipeDetail) return;
    const recipe = state.activeRecipeDetail;

    let instructions = [];
    if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
      instructions = recipe.instructions;
    } else if (typeof recipe.instructions === 'string' && recipe.instructions.trim()) {
      instructions = recipe.instructions.split(/\r?\n|\.\s+/).map(s => s.trim()).filter(s => s.length > 5);
    }
    if (!instructions || instructions.length === 0) {
      instructions = [
        'Prepare all ingredients by washing, peeling, and chopping as needed.',
        'Heat skillet or cooking pot over medium heat with oil or butter.',
        'Add primary ingredients and cook according to recipe instructions until tender.',
        'Season generously and serve hot.'
      ];
    }

    state.cookMode.active = true;
    state.cookMode.steps = instructions;
    state.cookMode.totalSteps = instructions.length;
    state.cookMode.currentStep = 0;
    state.cookMode.recipeTitle = recipe.title;

    cookRecipeTitle.textContent = recipe.title;
    cookModeBackdrop.classList.add('open');

    renderCookStep();
    showToast('Entered Cook Mode. Press Spacebar or 🔊 button to read steps!', 'success');
  }

  function closeCookMode() {
    state.cookMode.active = false;
    stopSpeaking();
    pauseCookTimer();
    cookModeBackdrop.classList.remove('open');
  }

  function renderCookStep() {
    stopSpeaking();
    pauseCookTimer();

    const currentIdx = state.cookMode.currentStep;
    const total = state.cookMode.totalSteps;
    const stepText = state.cookMode.steps[currentIdx];

    cookStepBadge.textContent = `Step ${currentIdx + 1} of ${total}`;
    cookProgressBar.style.width = `${((currentIdx + 1) / total) * 100}%`;
    cookStepText.textContent = stepText;

    // Detect time from step text (e.g. "cook for 6-8 minutes" or "simmer 10 mins")
    const timeMatch = stepText.match(/(?:(\d+)\s*(?:-|to)?\s*(\d+)?\s*(?:mins|minutes|min))/i);
    let detectedMinutes = 5; // default fallback

    if (timeMatch) {
      if (timeMatch[2]) {
        // Range like 6-8 -> pick average 7
        detectedMinutes = Math.round((parseInt(timeMatch[1], 10) + parseInt(timeMatch[2], 10)) / 2);
      } else {
        detectedMinutes = parseInt(timeMatch[1], 10);
      }
      cookTimerDetected.textContent = `Detected: ${detectedMinutes} mins`;
    } else {
      cookTimerDetected.textContent = `Default: 5 mins`;
    }

    state.cookMode.timerSeconds = detectedMinutes * 60;
    state.cookMode.timerInitial = detectedMinutes * 60;
    updateTimerDisplay();

    // Navigation buttons state
    cookPrevBtn.disabled = currentIdx === 0;
    cookPrevBtn.style.opacity = currentIdx === 0 ? '0.4' : '1';

    if (currentIdx === total - 1) {
      cookNextBtn.innerHTML = '<span>Finish Cooking 🎉</span>';
      cookNextBtn.className = 'px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-900/50 flex items-center gap-2 active:scale-95';
    } else {
      cookNextBtn.innerHTML = '<span>Next Step</span> <span>➡️</span>';
      cookNextBtn.className = 'px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-emerald-900/50 flex items-center gap-2 active:scale-95';
    }

    // Auto read if enabled
    if (cookAutoRead && cookAutoRead.checked) {
      speakCurrentStep();
    }
  }

  function nextCookStep() {
    if (state.cookMode.currentStep < state.cookMode.totalSteps - 1) {
      state.cookMode.currentStep++;
      renderCookStep();
    } else {
      showToast('🎉 Congratulations! You completed cooking this dish!', 'success');
      playAlarmChime();
      closeCookMode();
    }
  }

  function prevCookStep() {
    if (state.cookMode.currentStep > 0) {
      state.cookMode.currentStep--;
      renderCookStep();
    }
  }

  // ElevenLabs AI Natural Female Voice Player (/api/tts integration)
  let activeAudioPlayer = null;

  function formatTextForNaturalSpeech(text) {
    if (!text) return '';
    return text
      .replace(/\b1\/2\b/g, 'one half')
      .replace(/\b1\/4\b/g, 'one quarter')
      .replace(/\b3\/4\b/g, 'three quarters')
      .replace(/\b1\/3\b/g, 'one third')
      .replace(/\b2\/3\b/g, 'two thirds')
      .replace(/\btbsp\.?\b/gi, 'tablespoons')
      .replace(/\btsp\.?\b/gi, 'teaspoons')
      .replace(/\bmins\.?\b/gi, 'minutes')
      .replace(/\bmin\.?\b/gi, 'minute')
      .replace(/\bkg\.?\b/gi, 'kilograms')
      .replace(/\bg\.?\b/gi, 'grams')
      .replace(/\boz\.?\b/gi, 'ounces')
      .replace(/\blb\.?\b/gi, 'pounds')
      .replace(/°C/gi, ' degrees Celsius ')
      .replace(/°F/gi, ' degrees Fahrenheit ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function speakCurrentStep() {
    stopSpeaking();

    const rawStepText = cookStepText ? cookStepText.textContent : '';
    const cleanStepText = formatTextForNaturalSpeech(rawStepText);
    const textToRead = `Step ${state.cookMode.currentStep + 1}. ${cleanStepText}`;

    const ttsUrl = `/api/tts?text=${encodeURIComponent(textToRead)}`;
    activeAudioPlayer = new Audio(ttsUrl);

    const speed = parseFloat(cookVoiceSpeed ? cookVoiceSpeed.value : 1.0);
    activeAudioPlayer.playbackRate = speed;

    cookSpeakBtn.classList.add('speaking-active');
    if (cookSpeakBtnText) cookSpeakBtnText.textContent = 'Speaking...';
    if (cookPauseBtn) cookPauseBtn.classList.remove('hidden');

    activeAudioPlayer.onended = activeAudioPlayer.onerror = () => {
      cookSpeakBtn.classList.remove('speaking-active');
      if (cookSpeakBtnText) cookSpeakBtnText.textContent = 'Read Step Aloud';
      if (cookPauseBtn) cookPauseBtn.classList.add('hidden');
    };

    activeAudioPlayer.play().catch(err => {
      console.warn('Audio playback error:', err);
      cookSpeakBtn.classList.remove('speaking-active');
      if (cookSpeakBtnText) cookSpeakBtnText.textContent = 'Read Step Aloud';
      if (cookPauseBtn) cookPauseBtn.classList.add('hidden');
    });
  }

  function stopSpeaking() {
    if (activeAudioPlayer) {
      activeAudioPlayer.pause();
      activeAudioPlayer.currentTime = 0;
      activeAudioPlayer = null;
    }
    if (state.cookMode.synth) {
      state.cookMode.synth.cancel();
    }
    if (cookSpeakBtn) cookSpeakBtn.classList.remove('speaking-active');
    if (cookSpeakBtnText) cookSpeakBtnText.textContent = 'Read Step Aloud';
    if (cookPauseBtn) cookPauseBtn.classList.add('hidden');
  }

  // Timer Control Functions
  function updateTimerDisplay() {
    const mins = Math.floor(state.cookMode.timerSeconds / 60);
    const secs = state.cookMode.timerSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    cookTimerDisplay.textContent = formatted;
  }

  function startCookTimer() {
    if (state.cookMode.isRunning) return;
    state.cookMode.isRunning = true;
    cookTimerStart.classList.add('hidden');
    cookTimerPause.classList.remove('hidden');
    cookTimerDisplay.classList.remove('timer-alarm-flash');

    state.cookMode.timerInterval = setInterval(() => {
      if (state.cookMode.timerSeconds > 0) {
        state.cookMode.timerSeconds--;
        updateTimerDisplay();
      } else {
        pauseCookTimer();
        cookTimerDisplay.classList.add('timer-alarm-flash');
        playAlarmChime();
        showToast('⏰ Step Timer Finished! Time to proceed to next step.', 'success');
      }
    }, 1000);
  }

  function pauseCookTimer() {
    state.cookMode.isRunning = false;
    clearInterval(state.cookMode.timerInterval);
    cookTimerStart.classList.remove('hidden');
    cookTimerPause.classList.add('hidden');
  }

  function resetCookTimer() {
    pauseCookTimer();
    cookTimerDisplay.classList.remove('timer-alarm-flash');
    state.cookMode.timerSeconds = state.cookMode.timerInitial;
    updateTimerDisplay();
  }

  function addCookTimerTime(addedSeconds) {
    state.cookMode.timerSeconds += addedSeconds;
    state.cookMode.timerInitial += addedSeconds;
    updateTimerDisplay();
  }

  // Synthetic Audio Chime using Web Audio API (No external sound file required!)
  function playAlarmChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.15); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.3); // D6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio Context chime error:', e);
    }
  }

  // Run app
  init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
