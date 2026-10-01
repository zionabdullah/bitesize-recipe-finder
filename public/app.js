import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, sendPasswordResetEmail, sendEmailVerification, deleteUser, GoogleAuthProvider, signInWithPopup, EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Fetch Firebase config dynamically from server environment variables (.env)
let firebaseConfig = {};
try {
  const configRes = await fetch('/api/firebase-config');
  if (configRes.ok) {
    firebaseConfig = await configRes.json();
  }
} catch (err) {
  console.error('Could not fetch /api/firebase-config:', err);
}

let app = null;
let auth = null;
let db = null;

try {
  if (firebaseConfig && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (err) {
  console.error('Firebase initialization error:', err);
}

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
    }
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
  const navSavedBtn = document.getElementById('nav-saved-btn');
  const savedCountBadge = document.getElementById('saved-count-badge');
  const canvasTitle = document.getElementById('canvas-title');
  const canvasSubtitle = document.getElementById('canvas-subtitle');
  const sortSelect = document.getElementById('sort-select');

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
    // Auto-fetch default initial demo recipe set for rich initial experience
    fetchRecipes();

    // Firebase auth state listener
    if (auth) {
      onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Logged in — set up real-time Firestore sync for savedRecipes
        if (window.unsubFirestore) window.unsubFirestore();
        window.unsubFirestore = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.name) state.user = { ...state.user, name: data.name };
            if (data.savedRecipes) {
              state.savedRecipes = data.savedRecipes;
              localStorage.setItem('bitesize_saved_recipes', JSON.stringify(state.savedRecipes));
              updateSavedCountBadge();
              if (state.activeTab === 'saved') renderSavedRecipesGrid();
              else renderCurrentRecipesGrid();
            }
          } else {
            // First login — push local savedRecipes to Firestore
            setDoc(doc(db, 'users', user.uid), {
              name: user.displayName || user.email.split('@')[0],
              savedRecipes: state.savedRecipes
            }, { merge: true });
          }
          updateUserDisplay();
        }, (e) => console.error('Firestore sync error:', e));

        state.user = {
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          uid: user.uid
        };
      } else {
        // Logged out
        if (window.unsubFirestore) { window.unsubFirestore(); window.unsubFirestore = null; }
        state.user = null;
        state.savedRecipes = [];
        localStorage.removeItem('bitesize_saved_recipes');
        updateSavedCountBadge();
        if (state.activeTab === 'saved') renderSavedRecipesGrid();
        else renderCurrentRecipesGrid();
      }
      updateUserDisplay();
    });
    }
    ingredientInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddIngredientFromInput();
      }
    });

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
          await sendPasswordResetEmail(auth, email);
          authErrorMessage.classList.add('hidden');
          showToast('Password reset email sent!', 'success');
        } catch (err) {
          authErrorMessage.textContent = err.message.replace('Firebase:', '').trim();
          authErrorMessage.classList.remove('hidden');
        }
      });
    }

    // Google Sign-In
    if (authGoogleBtn) {
      authGoogleBtn.addEventListener('click', async () => {
        authErrorMessage.classList.add('hidden');
        try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          const user = result.user;
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            await setDoc(docRef, {
              name: user.displayName || user.email.split('@')[0],
              savedRecipes: state.savedRecipes
            });
          }
          closeAuthModal();
          showToast('Logged in with Google! 🚀', 'success');
        } catch (err) {
          authErrorMessage.textContent = err.message.replace('Firebase:', '').trim();
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
      try {
        if (authMode === 'signin') {
          await signInWithEmailAndPassword(auth, email, password);
          showToast('Logged in successfully! 🚀', 'success');
        } else {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await setDoc(doc(db, 'users', cred.user.uid), {
            name,
            savedRecipes: state.savedRecipes
          }, { merge: true });
          await sendEmailVerification(cred.user);
          showToast('Account created! Check your email to verify.', 'success');
        }
        closeAuthModal();
      } catch (err) {
        const codes = {
          'auth/invalid-login-credentials': 'Incorrect email or password.',
          'auth/invalid-credential': 'Incorrect email or password.',
          'auth/wrong-password': 'Incorrect email or password.',
          'auth/user-not-found': 'Incorrect email or password.',
          'auth/email-already-in-use': 'Email already registered. Please sign in instead.',
          'auth/weak-password': 'Password must be at least 6 characters.',
          'auth/invalid-email': 'Please enter a valid email address.',
          'auth/network-request-failed': 'Network error. Check your connection.',
          'auth/too-many-requests': 'Too many attempts. Try again later.'
        };
        authErrorMessage.textContent = codes[err.code] || err.message.replace('Firebase:', '').trim();
        authErrorMessage.classList.remove('hidden');
      }
    });

    // Profile: Logout
    if (profileLogoutBtn) {
      profileLogoutBtn.addEventListener('click', async () => {
        await signOut(auth);
        closeProfileModal();
        showToast('Logged out.', 'info');
      });
    }

    // Profile: Resend email verification
    if (profileResendVerificationBtn) {
      profileResendVerificationBtn.addEventListener('click', async () => {
        if (auth.currentUser) {
          try {
            await sendEmailVerification(auth.currentUser);
            showToast('Verification email resent!', 'success');
          } catch (e) { showToast(e.message.replace('Firebase:', '').trim(), 'error'); }
        }
      });
    }

    // Profile: Save changes (name + password)
    async function reauthenticateUser() {
      const user = auth.currentUser;
      if (!user) throw new Error('No user.');
      const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
      if (isGoogle) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        const pwd = profileCurrentPasswordInput ? profileCurrentPasswordInput.value : '';
        if (!pwd) throw { message: 'auth/missing-current-password' };
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pwd));
      }
    }

    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        profileErrorMessage.classList.add('hidden');
        profileSuccessMessage.classList.add('hidden');
        const newName = profileNameInput.value.trim();
        const newPassword = profilePasswordInput.value;
        const isGoogle = auth.currentUser.providerData.some(p => p.providerId === 'google.com');
        try {
          if (newName !== state.user.name || newPassword) {
            if (!isGoogle) await reauthenticateUser();
          }
          if (newName !== state.user.name) {
            await setDoc(doc(db, 'users', state.user.uid), { name: newName }, { merge: true });
            state.user.name = newName;
            updateUserDisplay();
          }
          if (newPassword) await updatePassword(auth.currentUser, newPassword);
          profileSuccessMessage.textContent = 'Profile updated successfully!';
          profileSuccessMessage.classList.remove('hidden');
          profilePasswordInput.value = '';
          if (profileCurrentPasswordInput) profileCurrentPasswordInput.value = '';
          setTimeout(() => closeProfileModal(), 1500);
        } catch (err) {
          const msg = err.message === 'auth/missing-current-password'
            ? 'Please enter your current password.'
            : err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
            ? 'Incorrect current password.'
            : err.code === 'auth/requires-recent-login'
            ? 'Please log out and log back in.'
            : (err.message || '').replace('Firebase:', '').trim();
          profileErrorMessage.textContent = msg;
          profileErrorMessage.classList.remove('hidden');
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
        const isGoogle = auth.currentUser?.providerData.some(p => p.providerId === 'google.com');
        if (deletePasswordWrapper) deletePasswordWrapper.classList.toggle('hidden', !!isGoogle);
        hideDeleteError();
        deleteConfirmPanel.classList.remove('hidden');
        if (!isGoogle && deleteConfirmPassword) deleteConfirmPassword.focus();
      });
    }
    if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeletePanel);
    if (deleteConfirmBtn) {
      deleteConfirmBtn.addEventListener('click', async () => {
        hideDeleteError();
        const user = auth.currentUser;
        if (!user) return;
        const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
        if (!isGoogle) {
          const pwd = deleteConfirmPassword ? deleteConfirmPassword.value.trim() : '';
          if (!pwd) { showDeleteError('Please enter your password.'); deleteConfirmPassword?.focus(); return; }
        }
        deleteConfirmBtn.disabled = true;
        deleteConfirmBtn.textContent = 'Deleting…';
        try {
          if (isGoogle) {
            await reauthenticateWithPopup(user, new GoogleAuthProvider());
          } else {
            await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, deleteConfirmPassword.value.trim()));
          }
          await deleteDoc(doc(db, 'users', user.uid));
          await deleteUser(user);
          closeDeletePanel();
          closeProfileModal();
          showToast('Account deleted.', 'info');
        } catch (e) {
          deleteConfirmBtn.disabled = false;
          deleteConfirmBtn.textContent = 'Yes, Delete My Account';
          const msg = e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'
            ? 'Incorrect password. Try again.'
            : e.code === 'auth/requires-recent-login' ? 'Session expired. Log out and back in.'
            : e.code === 'auth/popup-closed-by-user' ? 'Google sign-in was cancelled.'
            : (e.message || '').replace('Firebase:', '').trim();
          showDeleteError(msg);
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
    // Sync to Firestore if logged in
    if (state.user && state.user.uid) {
      setDoc(doc(db, 'users', state.user.uid), { savedRecipes: state.savedRecipes }, { merge: true })
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
    const steps = recipe.instructions || [
      'Prepare all ingredients by washing and chopping vegetables.',
      'Heat oil in a large skillet over medium-high heat.',
      'Add main ingredients and cook until golden brown and cooked through.',
      'Season with salt, pepper, and herbs before serving hot.'
    ];

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
  }

  function openProfileModal() {
    if (!auth.currentUser) return;
    if (profileNameInput) profileNameInput.value = state.user.name || '';
    if (profilePasswordInput) profilePasswordInput.value = '';
    if (profileCurrentPasswordInput) profileCurrentPasswordInput.value = '';
    if (profileModalName) profileModalName.textContent = state.user.name || '';
    if (profileModalEmail) profileModalEmail.textContent = state.user.email || '';
    if (profileAvatarLetter) profileAvatarLetter.textContent = state.user.name ? state.user.name.charAt(0).toUpperCase() : '👤';
    if (profileErrorMessage) profileErrorMessage.classList.add('hidden');
    if (profileSuccessMessage) profileSuccessMessage.classList.add('hidden');
    if (profileVerificationBanner) {
      profileVerificationBanner.classList.toggle('hidden', !!auth.currentUser.emailVerified);
    }
    const isGoogle = auth.currentUser.providerData.some(p => p.providerId === 'google.com');
    if (profileCurrentPasswordContainer) {
      profileCurrentPasswordContainer.classList.toggle('hidden', isGoogle);
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
      userDisplayName.textContent = state.user.name;
      if (headerAvatarLetter) {
        headerAvatarLetter.textContent = state.user.name.charAt(0).toUpperCase();
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

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 300ms ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // -------------------------------------------------------------------
  // 12. HANDS-FREE COOK MODE & STEP TIMER LOGIC
  // -------------------------------------------------------------------
  function openCookMode() {
    if (!state.activeRecipeDetail) return;
    const recipe = state.activeRecipeDetail;

    const instructions = recipe.instructions && recipe.instructions.length > 0
      ? recipe.instructions
      : [
        'Prepare all ingredients by washing, peeling, and chopping as needed.',
        'Heat skillet or cooking pot over medium heat with oil or butter.',
        'Add primary ingredients and cook according to recipe instructions until tender.',
        'Season generously and serve hot.'
      ];

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
