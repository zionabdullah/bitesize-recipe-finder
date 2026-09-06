/* ===================================================================
   BITESIZE - SMART INGREDIENT RECIPE FINDER & MEAL PLANNER (APP.JS)
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // -------------------------------------------------------------------
  // 1. APPLICATION STATE
  // -------------------------------------------------------------------
  const state = {
    activeIngredients: ['tomato', 'garlic', 'chicken', 'pasta'],
    savedRecipes: JSON.parse(localStorage.getItem('bitesize_saved_recipes') || '[]'),
    currentRecipes: [],
    activeTab: 'discover', // 'discover' | 'saved'
    activeRecipeDetail: null,
    user: JSON.parse(localStorage.getItem('bitesize_user') || '{"name":"Guest User","email":""}'),
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

  // Dietary Checkboxes
  const filterVeg = document.getElementById('filter-veg');
  const filterVegan = document.getElementById('filter-vegan');
  const filterGf = document.getElementById('filter-gf');
  const filterKeto = document.getElementById('filter-keto');

  // -------------------------------------------------------------------
  // 3. INITIALIZATION & EVEN LISTENERS
  // -------------------------------------------------------------------
  function init() {
    updateUserDisplay();
    updateSavedCountBadge();
    renderChips();
    syncPresetTags();
    renderVirtualFridge();
    
    // Auto-fetch default initial demo recipe set for rich initial experience
    fetchRecipes();

    // Event listeners
    addIngredientBtn.addEventListener('click', handleAddIngredientFromInput);
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

    // Auth Modal Triggers
    authModalTrigger.addEventListener('click', openAuthModal);
    closeAuthModalBtn.addEventListener('click', closeAuthModal);
    authModalBackdrop.addEventListener('click', (e) => {
      if (e.target === authModalBackdrop) closeAuthModal();
    });

    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('auth-name-input').value.trim() || 'Chef';
      const email = document.getElementById('auth-email-input').value.trim();
      state.user = { name, email };
      localStorage.setItem('bitesize_user', JSON.stringify(state.user));
      updateUserDisplay();
      closeAuthModal();
      showToast(`Welcome back, ${name}! Saved recipes synced.`, 'success');
    });

    // Escape Key Handler for Modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeAuthModal();
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

    // Filter by Dietary checkboxes
    if (filterVeg.checked) {
      recipes = recipes.filter(r => r.dietary && r.dietary.includes('Vegetarian'));
    }
    if (filterVegan.checked) {
      recipes = recipes.filter(r => r.dietary && r.dietary.includes('Vegan'));
    }
    if (filterGf.checked) {
      recipes = recipes.filter(r => r.dietary && r.dietary.includes('Gluten-Free'));
    }
    if (filterKeto.checked) {
      recipes = recipes.filter(r => r.dietary && r.dietary.includes('Low-Carb'));
    }

    // Apply Sorting
    const sortVal = sortSelect.value;
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

    // Hide other state elements
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
        itemEl.className = `p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
          isOwned 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
            : 'bg-orange-50/80 border-orange-200 text-orange-950'
        }`;

        itemEl.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              isOwned ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'
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
    document.getElementById('auth-name-input').value = state.user.name || 'Guest User';
    document.getElementById('auth-email-input').value = state.user.email || '';
    authModalBackdrop.classList.add('open');
  }

  function closeAuthModal() {
    authModalBackdrop.classList.remove('open');
  }

  function updateUserDisplay() {
    userDisplayName.textContent = state.user.name || 'Guest User';
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
      cameraStreamVideo.classList.remove('hidden');
      startCamera();
    } else {
      tabModeUpload.classList.add('bg-white', 'text-emerald-700', 'shadow-xs', 'font-bold');
      tabModeUpload.classList.remove('text-slate-600', 'font-medium');

      tabModeCamera.classList.remove('bg-white', 'text-emerald-700', 'shadow-xs', 'font-bold');
      tabModeCamera.classList.add('text-slate-600', 'font-medium');

      stopCamera();
      cameraStreamVideo.classList.add('hidden');
      uploadDropzone.classList.remove('hidden');
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Camera not supported on this browser/device. Switched to upload mode.', 'info');
      setSnapMode('upload');
      return;
    }

    try {
      stopCamera();
      state.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      cameraStreamVideo.srcObject = state.cameraStream;
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      showToast('Could not access camera. Please upload a photo instead.', 'info');
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
    snapPreviewImg.classList.add('hidden');
    snapResultsContainer.classList.add('hidden');
    scanningOverlay.classList.add('hidden');
    retakeSnapBtn.classList.add('hidden');
    captureSnapBtn.classList.remove('hidden');
    captureSnapBtn.disabled = false;
    captureSnapBtn.innerHTML = `<span>📸</span> Capture & Scan Photo`;

    if (state.snapMode === 'camera') {
      cameraStreamVideo.classList.remove('hidden');
      startCamera();
    } else {
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
      uploadDropzone.classList.add('hidden');
      captureSnapBtn.innerHTML = `<span>⚡</span> Scan Uploaded Photo`;
    };
    reader.readAsDataURL(file);
  }

  async function handleCaptureAndScan() {
    let base64Image = '';

    if (state.snapMode === 'camera') {
      if (!cameraStreamVideo.videoWidth) {
        showToast('Camera feed loading... Please try again in a moment.', 'info');
        return;
      }

      snapshotCanvas.width = cameraStreamVideo.videoWidth;
      snapshotCanvas.height = cameraStreamVideo.videoHeight;
      const ctx = snapshotCanvas.getContext('2d');
      ctx.drawImage(cameraStreamVideo, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

      base64Image = snapshotCanvas.toDataURL('image/jpeg', 0.8);
      stopCamera();

      snapPreviewImg.src = base64Image;
      cameraStreamVideo.classList.add('hidden');
      snapPreviewImg.classList.remove('hidden');
    } else {
      base64Image = state.currentCapturedBase64;
      if (!base64Image) {
        showToast('Please choose an image file to scan first.', 'error');
        return;
      }
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

  // Run app
  init();
});

