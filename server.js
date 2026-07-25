const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || '';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------------
// RICH FALLBACK MOCK DATASET
// -------------------------------------------------------------------
const MOCK_RECIPES = [
  {
    id: 101,
    title: 'Creamy Garlic Parmesan Chicken & Tomato Pasta',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 25,
    servings: 4,
    calories: 520,
    protein: '38g',
    carbs: '42g',
    fat: '22g',
    dietary: ['High-Protein'],
    usedIngredientCount: 4,
    missedIngredientCount: 2,
    usedIngredients: [
      { id: 1, name: 'chicken breast', original: '500g chicken breast, diced', image: 'https://img.spoonacular.com/ingredients_100x100/chicken-breasts.png' },
      { id: 2, name: 'garlic', original: '4 cloves garlic, minced', image: 'https://img.spoonacular.com/ingredients_100x100/garlic.png' },
      { id: 3, name: 'tomato', original: '2 ripe tomatoes, chopped', image: 'https://img.spoonacular.com/ingredients_100x100/tomato.png' },
      { id: 4, name: 'pasta', original: '300g penne pasta', image: 'https://img.spoonacular.com/ingredients_100x100/penne.png' }
    ],
    missedIngredients: [
      { id: 5, name: 'heavy cream', original: '1/2 cup heavy cream', image: 'https://img.spoonacular.com/ingredients_100x100/fluid-cream.png' },
      { id: 6, name: 'parmesan cheese', original: '1/2 cup grated parmesan', image: 'https://img.spoonacular.com/ingredients_100x100/parmesan.png' }
    ],
    instructions: [
      'Boil penne pasta in salted water according to package directions until al dente.',
      'Heat olive oil in a large skillet over medium-high heat. Season diced chicken breast with salt and pepper and sear until golden brown (6-8 minutes). Remove chicken.',
      'In the same skillet, saute minced garlic and chopped tomatoes until softened (3 minutes).',
      'Lower heat and stir in heavy cream and parmesan cheese until a smooth creamy sauce forms.',
      'Toss in cooked penne pasta and seared chicken until thoroughly coated in garlic sauce.',
      'Garnish with fresh parsley and extra parmesan before serving hot.'
    ]
  },
  {
    id: 102,
    title: 'Rustic Egg & Tomato Shakshuka with Feta',
    image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 20,
    servings: 2,
    calories: 340,
    protein: '18g',
    carbs: '16g',
    fat: '24g',
    dietary: ['Vegetarian', 'Gluten-Free', 'Low-Carb'],
    usedIngredientCount: 3,
    missedIngredientCount: 2,
    usedIngredients: [
      { id: 7, name: 'eggs', original: '4 large eggs', image: 'https://img.spoonacular.com/ingredients_100x100/egg.png' },
      { id: 3, name: 'tomato', original: '1 can (400g) crushed tomatoes', image: 'https://img.spoonacular.com/ingredients_100x100/tomato.png' },
      { id: 8, name: 'onion', original: '1 medium yellow onion, diced', image: 'https://img.spoonacular.com/ingredients_100x100/brown-onion.png' }
    ],
    missedIngredients: [
      { id: 9, name: 'bell pepper', original: '1 red bell pepper, sliced', image: 'https://img.spoonacular.com/ingredients_100x100/red-pepper.png' },
      { id: 10, name: 'feta cheese', original: '50g crumbled feta cheese', image: 'https://img.spoonacular.com/ingredients_100x100/feta-cheese.png' }
    ],
    instructions: [
      'Heat olive oil in a heavy cast-iron skillet. Saute chopped onion and bell pepper until soft and fragrant.',
      'Add minced garlic, cumin, paprika, and crushed tomatoes. Simmer for 10 minutes until thickened into a rich sauce.',
      'Use a spoon to create 4 small wells in the sauce. Crack an egg directly into each well.',
      'Cover the skillet and cook on low heat for 5-8 minutes until egg whites are set but yolks remain runny.',
      'Crumble fresh feta cheese and chopped cilantro over top. Serve hot with crusty bread.'
    ]
  },
  {
    id: 103,
    title: 'Savory Egg Fried Rice with Garlic & Green Onion',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 15,
    servings: 3,
    calories: 410,
    protein: '14g',
    carbs: '58g',
    fat: '14g',
    dietary: ['Vegetarian', 'Quick & Easy'],
    usedIngredientCount: 4,
    missedIngredientCount: 1,
    usedIngredients: [
      { id: 11, name: 'rice', original: '3 cups chilled cooked jasmine rice', image: 'https://img.spoonacular.com/ingredients_100x100/rice-white-long-grain-or-short-grain-cooked.jpg' },
      { id: 7, name: 'eggs', original: '3 large eggs, beaten', image: 'https://img.spoonacular.com/ingredients_100x100/egg.png' },
      { id: 2, name: 'garlic', original: '3 cloves garlic, minced', image: 'https://img.spoonacular.com/ingredients_100x100/garlic.png' },
      { id: 8, name: 'onion', original: '1/2 onion, finely chopped', image: 'https://img.spoonacular.com/ingredients_100x100/brown-onion.png' }
    ],
    missedIngredients: [
      { id: 12, name: 'soy sauce', original: '2 tbsp low sodium soy sauce', image: 'https://img.spoonacular.com/ingredients_100x100/soy-sauce.jpg' }
    ],
    instructions: [
      'Heat 1 tbsp oil in a large wok over high heat. Add beaten eggs and scramble quickly. Remove eggs and set aside.',
      'Add another tablespoon of oil, then toss in minced garlic and chopped onion. Stir-fry for 1 minute until fragrant.',
      'Add chilled day-old cooked rice, breaking up clumps with a spatula. Stir-fry vigorously for 3-4 minutes.',
      'Drizzle with soy sauce and sesame oil. Fold scrambled eggs back in along with green onions.',
      'Stir-fry for 1 final minute and serve piping hot.'
    ]
  },
  {
    id: 104,
    title: 'Cheesy Garlic Butter Loaded Toast',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 10,
    servings: 2,
    calories: 290,
    protein: '11g',
    carbs: '28g',
    fat: '15g',
    dietary: ['Vegetarian', 'Quick & Easy'],
    usedIngredientCount: 3,
    missedIngredientCount: 1,
    usedIngredients: [
      { id: 13, name: 'cheese', original: '1 cup shredded mozzarella cheese', image: 'https://img.spoonacular.com/ingredients_100x100/shredded-cheese-white.jpg' },
      { id: 2, name: 'garlic', original: '2 cloves garlic, finely grated', image: 'https://img.spoonacular.com/ingredients_100x100/garlic.png' },
      { id: 14, name: 'butter', original: '2 tbsp softened butter', image: 'https://img.spoonacular.com/ingredients_100x100/butter-sliced.jpg' }
    ],
    missedIngredients: [
      { id: 15, name: 'bread', original: '4 thick slices sourdough bread', image: 'https://img.spoonacular.com/ingredients_100x100/white-bread.jpg' }
    ],
    instructions: [
      'Mix softened butter, grated garlic, and pinch of salt in a bowl.',
      'Spread garlic butter generously on slices of sourdough bread.',
      'Top with a mound of shredded mozzarella cheese.',
      'Bake or air-fry at 200°C (400°F) for 6-8 minutes until cheese is melted, bubbly, and golden-brown.',
      'Slice diagonally and enjoy warm.'
    ]
  },
  {
    id: 105,
    title: 'Golden Honey Garlic Chicken Skewers',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 30,
    servings: 4,
    calories: 460,
    protein: '40g',
    carbs: '26g',
    fat: '20g',
    dietary: ['High-Protein', 'Gluten-Free'],
    usedIngredientCount: 3,
    missedIngredientCount: 2,
    usedIngredients: [
      { id: 1, name: 'chicken', original: '600g chicken thighs, cubed', image: 'https://img.spoonacular.com/ingredients_100x100/chicken-breasts.png' },
      { id: 2, name: 'garlic', original: '5 cloves garlic, crushed', image: 'https://img.spoonacular.com/ingredients_100x100/garlic.png' },
      { id: 14, name: 'butter', original: '3 tbsp melted butter', image: 'https://img.spoonacular.com/ingredients_100x100/butter-sliced.jpg' }
    ],
    missedIngredients: [
      { id: 16, name: 'honey', original: '3 tbsp raw honey', image: 'https://img.spoonacular.com/ingredients_100x100/honey.png' },
      { id: 12, name: 'soy sauce', original: '2 tbsp soy sauce', image: 'https://img.spoonacular.com/ingredients_100x100/soy-sauce.jpg' }
    ],
    instructions: [
      'Thread cubed chicken thighs tightly onto bamboo skewers.',
      'Whisk together melted butter, minced garlic, honey, soy sauce, and black pepper.',
      'Grill or pan-sear chicken skewers for 10-12 minutes, turning occasionally.',
      'Brush generously with honey garlic glaze during the final 3 minutes of cooking until caramelized.',
      'Garnish with toasted sesame seeds and fresh scallions.'
    ]
  },
  {
    id: 106,
    title: 'Mediterranean Tomato & Olive Garden Salad',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 12,
    servings: 2,
    calories: 220,
    protein: '6g',
    carbs: '12g',
    fat: '17g',
    dietary: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Low-Carb'],
    usedIngredientCount: 3,
    missedIngredientCount: 2,
    usedIngredients: [
      { id: 3, name: 'tomato', original: '3 vine ripe tomatoes, wedged', image: 'https://img.spoonacular.com/ingredients_100x100/tomato.png' },
      { id: 8, name: 'onion', original: '1/2 red onion, thinly sliced', image: 'https://img.spoonacular.com/ingredients_100x100/red-onion.png' },
      { id: 17, name: 'olive oil', original: '3 tbsp extra virgin olive oil', image: 'https://img.spoonacular.com/ingredients_100x100/olive-oil.jpg' }
    ],
    missedIngredients: [
      { id: 18, name: 'cucumber', original: '1 English cucumber, sliced', image: 'https://img.spoonacular.com/ingredients_100x100/cucumber.jpg' },
      { id: 19, name: 'kalamata olives', original: '1/2 cup pitted kalamata olives', image: 'https://img.spoonacular.com/ingredients_100x100/calamata-or-kalamata-olives.jpg' }
    ],
    instructions: [
      'Combine wedged tomatoes, sliced cucumber, red onion rings, and olives in a bowl.',
      'Drizzle generously with extra virgin olive oil and fresh lemon juice.',
      'Season with dried oregano, sea salt, and freshly cracked black pepper.',
      'Toss gently and let sit 5 minutes to let flavors meld before serving.'
    ]
  }
];

const POPULAR_INGREDIENTS = [
  'chicken', 'tomato', 'garlic', 'onion', 'eggs', 'rice', 'cheese', 'butter',
  'pasta', 'olive oil', 'salt', 'milk', 'flour', 'potato', 'spinach', 'beef',
  'pork', 'bell pepper', 'lemon', 'mushroom', 'carrot', 'broccoli', 'avocado'
];

// Helper: Filter mock recipes by user ingredients
function getMockSearchResults(ingredientStr = '') {
  const queryIngredients = ingredientStr
    .toLowerCase()
    .split(',')
    .map(i => i.trim())
    .filter(Boolean);

  if (queryIngredients.length === 0) {
    return MOCK_RECIPES;
  }

  // Score recipes by how many query ingredients match recipe ingredients
  const scored = MOCK_RECIPES.map(recipe => {
    const allIngredients = [
      ...recipe.usedIngredients.map(i => i.name.toLowerCase()),
      ...recipe.missedIngredients.map(i => i.name.toLowerCase())
    ];

    let matchCount = 0;
    const matchedUsed = [];
    const missed = [];

    allIngredients.forEach(ingName => {
      const isMatched = queryIngredients.some(q => ingName.includes(q) || q.includes(ingName));
      if (isMatched) {
        matchCount++;
        matchedUsed.push({ name: ingName, original: ingName, image: 'https://img.spoonacular.com/ingredients_100x100/food.png' });
      } else {
        missed.push({ name: ingName, original: ingName, image: 'https://img.spoonacular.com/ingredients_100x100/food.png' });
      }
    });

    return {
      ...recipe,
      usedIngredientCount: Math.max(matchCount, 1),
      missedIngredientCount: Math.max(recipe.missedIngredients.length, 1),
      score: matchCount
    };
  });

  // Sort recipes with highest match score first
  return scored.sort((a, b) => b.score - a.score);
}

// -------------------------------------------------------------------
// API PROXY ENDPOINTS
// -------------------------------------------------------------------

// 1. Search Recipes by Ingredients
app.get('/api/recipes/search', async (req, res) => {
  const { ingredients } = req.query;

  if (!ingredients) {
    return res.status(400).json({ error: 'Ingredients query parameter is required.' });
  }

  console.log(`[API Proxy] Recipe search requested for ingredients: "${ingredients}"`);

  // Try Spoonacular API if key exists
  if (SPOONACULAR_API_KEY) {
    try {
      const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=12&ranking=1&ignorePantry=true&apiKey=${SPOONACULAR_API_KEY}`;
      const apiRes = await fetch(url);

      if (apiRes.ok) {
        const data = await apiRes.json();
        console.log(`[Spoonacular API] Returned ${data.length} recipes.`);
        return res.json({ source: 'spoonacular', data });
      } else {
        console.warn(`[Spoonacular API Warning] Status ${apiRes.status}. Falling back to mock data.`);
      }
    } catch (err) {
      console.error(`[Spoonacular API Error] ${err.message}. Falling back to mock data.`);
    }
  } else {
    console.log(`[API Proxy] No SPOONACULAR_API_KEY found in .env. Using mock dataset.`);
  }

  // Fallback to Smart Mock Dataset
  const mockResults = getMockSearchResults(ingredients);
  return res.json({
    source: 'mock',
    data: mockResults,
    message: SPOONACULAR_API_KEY ? 'Rate limit exceeded or API error. Served mock recipes.' : 'Operating in demo mode with sample recipes.'
  });
});

// 2. Get Detailed Recipe Information by ID
app.get('/api/recipes/:id/information', async (req, res) => {
  const recipeId = parseInt(req.params.id, 10);
  console.log(`[API Proxy] Fetching information for recipe ID: ${recipeId}`);

  // Check if mock recipe exists in our list first
  const foundMock = MOCK_RECIPES.find(r => r.id === recipeId);

  if (SPOONACULAR_API_KEY && !foundMock) {
    try {
      const url = `https://api.spoonacular.com/recipes/${recipeId}/information?includeNutrition=true&apiKey=${SPOONACULAR_API_KEY}`;
      const apiRes = await fetch(url);

      if (apiRes.ok) {
        const data = await apiRes.json();
        return res.json({ source: 'spoonacular', data });
      } else {
        console.warn(`[Spoonacular API Warning] Status ${apiRes.status}. Falling back to mock info.`);
      }
    } catch (err) {
      console.error(`[Spoonacular API Error] ${err.message}.`);
    }
  }

  // Return mock detail
  if (foundMock) {
    return res.json({ source: 'mock', data: foundMock });
  }

  // Generic fallback if unknown ID
  const genericMock = {
    ...MOCK_RECIPES[0],
    id: recipeId,
    title: `Chef's Choice Special Recipe #${recipeId}`,
  };
  return res.json({ source: 'mock', data: genericMock });
});

// 3. Autocomplete Ingredients
app.get('/api/ingredients/autocomplete', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);

  const q = query.toLowerCase();

  if (SPOONACULAR_API_KEY) {
    try {
      const url = `https://api.spoonacular.com/food/ingredients/autocomplete?query=${encodeURIComponent(query)}&number=6&apiKey=${SPOONACULAR_API_KEY}`;
      const apiRes = await fetch(url);
      if (apiRes.ok) {
        const data = await apiRes.json();
        return res.json(data.map(item => item.name));
      }
    } catch (err) {
      console.warn(`[Autocomplete Error] ${err.message}`);
    }
  }

  // Mock autocomplete search
  const filtered = POPULAR_INGREDIENTS.filter(item => item.includes(q)).slice(0, 6);
  return res.json(filtered);
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  BiteSize Web App is running live on http://localhost:${PORT}`);
  console.log(`  API Proxy Status: ${SPOONACULAR_API_KEY ? 'Connected (Spoonacular Key Active)' : 'Demo Mode (Mock Data Active)'}`);
  console.log(`=======================================================`);
});
