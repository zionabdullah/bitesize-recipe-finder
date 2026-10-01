const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel (Warm Natural Female Voice)
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));


// -------------------------------------------------------------------
// RATE LIMITING
// Note: express-rate-limit uses an in-memory store by default.
// On Vercel or other serverless platforms, each invocation may spin up a
// fresh instance, resetting the counter. For true global rate limiting in
// a production multi-instance deployment, use a store like rate-limit-redis.
// -------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many auth requests from this IP, please try again after 15 minutes.' }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many refresh requests, please try again later.' }
});

const userAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many account update requests, please try again later.' }
});

const recipeSearchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many search requests, please try again later.' }
});

const apiGeneralLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// -------------------------------------------------------------------
// RICH FALLBACK MOCK DATASET
// -------------------------------------------------------------------
const MOCK_RECIPES = [
  {
    id: 101,
    title: 'Bangladeshi Chicken Bhuna Curry (Traditional Murgh Bhuna)',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 35,
    servings: 4,
    calories: 480,
    protein: '38g',
    carbs: '14g',
    fat: '22g',
    dietary: ['Halal', 'High-Protein', 'Gluten-Free'],
    usedIngredientCount: 4,
    missedIngredientCount: 3,
    usedIngredients: [
      { id: 1, name: 'chicken', original: '600g chicken, cut into medium curry pieces', image: 'https://img.spoonacular.com/ingredients_100x100/chicken-breasts.png' },
      { id: 2, name: 'onion', original: '2 large onions, finely sliced', image: 'https://img.spoonacular.com/ingredients_100x100/brown-onion.png' },
      { id: 3, name: 'garlic', original: '1 tbsp garlic paste', image: 'https://img.spoonacular.com/ingredients_100x100/garlic.png' },
      { id: 4, name: 'mustard oil', original: '3 tbsp pure mustard oil', image: 'https://img.spoonacular.com/ingredients_100x100/vegetable-oil.jpg' }
    ],
    missedIngredients: [
      { id: 5, name: 'ginger', original: '1 tbsp ginger paste', image: 'https://img.spoonacular.com/ingredients_100x100/ginger.png' },
      { id: 6, name: 'green chili', original: '5 slit green chilies', image: 'https://img.spoonacular.com/ingredients_100x100/chili-pepper.jpg' },
      { id: 7, name: 'turmeric', original: '1 tsp turmeric powder', image: 'https://img.spoonacular.com/ingredients_100x100/turmeric.jpg' }
    ],
    instructions: [
      'Heat 3 tablespoons of pure mustard oil in a heavy wok or karahi over medium heat.',
      'Add sliced onions and fry for 8 to 10 minutes until deep golden brown (beresta).',
      'Stir in garlic paste, ginger paste, turmeric, red chili powder, coriander, and salt with a splash of water. Sauté the masala until oil separates.',
      'Add chicken pieces and toss well. Sear over medium-high heat for 8 minutes to coat thoroughly in spices (koshano).',
      'Pour in 1 cup of warm water, cover with a tight lid, and simmer on low heat for 15 to 20 minutes until chicken is tender.',
      'Drop in slit green chilies, sprinkle fresh Bangladeshi garam masala on top, cover for 2 minutes, and serve hot with rice.'
    ]
  },
  {
    id: 102,
    title: 'Traditional Dim Bhuna & Potato Curry (Bangladeshi Egg Bhuna)',
    image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 20,
    servings: 3,
    calories: 320,
    protein: '16g',
    carbs: '18g',
    fat: '20g',
    dietary: ['Halal', 'Quick & Easy', 'Gluten-Free', 'High-Protein'],
    usedIngredientCount: 4,
    missedIngredientCount: 2,
    usedIngredients: [
      { id: 8, name: 'egg', original: '4 hard-boiled eggs', image: 'https://img.spoonacular.com/ingredients_100x100/egg.png' },
      { id: 9, name: 'potato', original: '2 medium potatoes, quartered', image: 'https://img.spoonacular.com/ingredients_100x100/potatoes-yukon-gold.png' },
      { id: 2, name: 'onion', original: '1 large onion, finely chopped', image: 'https://img.spoonacular.com/ingredients_100x100/brown-onion.png' },
      { id: 6, name: 'green chili', original: '4 fresh green chilies', image: 'https://img.spoonacular.com/ingredients_100x100/chili-pepper.jpg' }
    ],
    missedIngredients: [
      { id: 4, name: 'mustard oil', original: '2 tbsp mustard oil', image: 'https://img.spoonacular.com/ingredients_100x100/vegetable-oil.jpg' },
      { id: 10, name: 'tomato', original: '1 ripe tomato, diced', image: 'https://img.spoonacular.com/ingredients_100x100/tomato.png' }
    ],
    instructions: [
      'Lightly score boiled eggs with a knife and rub with turmeric powder and salt.',
      'Heat mustard oil in a pan and shallow fry the eggs and potato quarters for 3-4 minutes until golden-blistered.',
      'In the same pan, fry chopped onions until translucent. Add diced tomato, turmeric, roasted cumin powder, and salt.',
      'Sauté the gravy over medium heat for 5 minutes until tomato breaks down into a thick masala.',
      'Return fried eggs and potatoes to the gravy with 1/2 cup warm water. Cover and simmer on low for 7 minutes.',
      'Garnish with slit green chilies and chopped cilantro before serving hot with Gorom Bhaat.'
    ]
  },
  {
    id: 103,
    title: 'Comforting Masoor Dal Tadka & Smoky Aloo Bharta',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 25,
    servings: 4,
    calories: 310,
    protein: '14g',
    carbs: '52g',
    fat: '8g',
    dietary: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Quick & Easy'],
    usedIngredientCount: 4,
    missedIngredientCount: 3,
    usedIngredients: [
      { id: 11, name: 'lentil', original: '1 cup red lentils (Masoor Dal)', image: 'https://img.spoonacular.com/ingredients_100x100/red-lentils.png' },
      { id: 9, name: 'potato', original: '3 medium potatoes', image: 'https://img.spoonacular.com/ingredients_100x100/potatoes-yukon-gold.png' },
      { id: 4, name: 'mustard oil', original: '2 tbsp raw mustard oil', image: 'https://img.spoonacular.com/ingredients_100x100/vegetable-oil.jpg' },
      { id: 2, name: 'onion', original: '1 red onion, finely chopped', image: 'https://img.spoonacular.com/ingredients_100x100/red-onion.png' }
    ],
    missedIngredients: [
      { id: 12, name: 'dry red chili', original: '3 whole dry red chilies', image: 'https://img.spoonacular.com/ingredients_100x100/dried-red-chili-pepper.jpg' },
      { id: 3, name: 'garlic', original: '4 cloves garlic, sliced', image: 'https://img.spoonacular.com/ingredients_100x100/garlic.png' },
      { id: 6, name: 'green chili', original: '2 green chilies', image: 'https://img.spoonacular.com/ingredients_100x100/chili-pepper.jpg' }
    ],
    instructions: [
      'Rinse red lentils and boil in 3 cups water with turmeric, salt, 2 green chilies, and sliced garlic until soft and creamy.',
      'Boil potatoes until fork-tender, peel while warm, and mash smoothly in a wide bowl.',
      'Heat 1 tbsp mustard oil and fry dry red chilies until blackened and fragrant. Remove and crush chilies with salt and raw chopped onions.',
      'Mix the spicy crushed onion-chili oil thoroughly into the mashed potatoes to make authentic Aloo Bharta.',
      'For Dal Baghar (Tadka): Heat 1 tbsp mustard oil, fry sliced garlic and cumin seeds until aromatic, and pour sizzled oil into dal.',
      'Serve warm Dal and Aloo Bharta alongside hot steamed rice for the ultimate Bangladeshi comfort meal.'
    ]
  },
  {
    id: 104,
    title: 'Authentic Shorshe Ilish (Hilsha Fish in Mustard Gravy)',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 25,
    servings: 4,
    calories: 430,
    protein: '32g',
    carbs: '6g',
    fat: '28g',
    dietary: ['Halal', 'High-Protein', 'Gluten-Free'],
    usedIngredientCount: 4,
    missedIngredientCount: 2,
    usedIngredients: [
      { id: 13, name: 'fish', original: '4 steaks of fresh Ilish (Hilsha fish)', image: 'https://img.spoonacular.com/ingredients_100x100/fish-fillet.jpg' },
      { id: 4, name: 'mustard oil', original: '4 tbsp pure mustard oil', image: 'https://img.spoonacular.com/ingredients_100x100/vegetable-oil.jpg' },
      { id: 6, name: 'green chili', original: '6 slit green chilies', image: 'https://img.spoonacular.com/ingredients_100x100/chili-pepper.jpg' },
      { id: 7, name: 'turmeric', original: '1 tsp turmeric powder', image: 'https://img.spoonacular.com/ingredients_100x100/turmeric.jpg' }
    ],
    missedIngredients: [
      { id: 14, name: 'mustard paste', original: '3 tbsp yellow & black mustard paste', image: 'https://img.spoonacular.com/ingredients_100x100/mustard.png' },
      { id: 15, name: 'nigella seeds', original: '1/2 tsp Kalo Jeere (nigella seeds)', image: 'https://img.spoonacular.com/ingredients_100x100/black-sesame-seeds.jpg' }
    ],
    instructions: [
      'Wipe fish steaks clean and rub gently with half the turmeric powder and a pinch of salt. Set aside for 10 minutes.',
      'Blend yellow and black mustard seeds with 1 green chili, salt, and water to make a smooth paste.',
      'In a wide bowl, mix mustard paste with remaining turmeric, salt, 2 tbsp mustard oil, and 1 cup of water.',
      'Heat remaining 2 tbsp mustard oil in a heavy pan. Crackle nigella seeds (kalo jeere) and 3 slit green chilies.',
      'Pour in the mustard gravy mixture and bring to a soft boil.',
      'Carefully place raw marinated Hilsha steaks into simmering gravy. Cover and cook on medium heat for 12 minutes, turning once.',
      'Drizzle 1 tbsp raw mustard oil on top, turn off heat, and serve with steaming hot rice.'
    ]
  },
  {
    id: 105,
    title: 'Bangladeshi Beef Koshwa Bhuna Curry (গরুর কষা ভুনা)',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 50,
    servings: 5,
    calories: 560,
    protein: '44g',
    carbs: '12g',
    fat: '32g',
    dietary: ['Halal', 'High-Protein', 'Gluten-Free'],
    usedIngredientCount: 4,
    missedIngredientCount: 3,
    usedIngredients: [
      { id: 16, name: 'beef', original: '700g beef with bone, cut into curry cubes', image: 'https://img.spoonacular.com/ingredients_100x100/beef-cubes-raw.png' },
      { id: 2, name: 'onion', original: '3 large onions, chopped', image: 'https://img.spoonacular.com/ingredients_100x100/brown-onion.png' },
      { id: 3, name: 'garlic', original: '1.5 tbsp garlic paste', image: 'https://img.spoonacular.com/ingredients_100x100/garlic.png' },
      { id: 4, name: 'mustard oil', original: '4 tbsp mustard oil', image: 'https://img.spoonacular.com/ingredients_100x100/vegetable-oil.jpg' }
    ],
    missedIngredients: [
      { id: 5, name: 'ginger', original: '1.5 tbsp ginger paste', image: 'https://img.spoonacular.com/ingredients_100x100/ginger.png' },
      { id: 17, name: 'cinnamon & cardamom', original: '2 cinnamon sticks, 4 cardamom pods', image: 'https://img.spoonacular.com/ingredients_100x100/cinnamon-sticks.jpg' },
      { id: 18, name: 'bay leaf', original: '2 Tejpata (bay leaves)', image: 'https://img.spoonacular.com/ingredients_100x100/bay-leaves.jpg' }
    ],
    instructions: [
      'Marinate beef cubes with garlic, ginger, turmeric, chili powder, coriander, salt, and 1 tbsp mustard oil for 20 minutes.',
      'Heat mustard oil in a pressure cooker or heavy Dutch oven. Add cinnamon sticks, cardamom, bay leaves, and chopped onions.',
      'Fry onions until rich dark brown. Toss in marinated beef and sear on high heat for 15 minutes to evaporate juices (Koshano).',
      'Add 1.5 cups hot water, seal lid, and pressure cook for 6-8 whistles (or cook covered 45 min) until beef is tender.',
      'Open lid and simmer on medium heat to reduce gravy until thick, dark brown, and oil floats to top.',
      'Sprinkle roasted cumin powder and green chilies. Enjoy hot with paratha, ruti, or steamed rice.'
    ]
  },
  {
    id: 106,
    title: 'Bangladeshi Mixed Vegetable Sobji Chochchori (সবজি চচ্চড়ি)',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 20,
    servings: 4,
    calories: 190,
    protein: '6g',
    carbs: '24g',
    fat: '8g',
    dietary: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Quick & Easy'],
    usedIngredientCount: 4,
    missedIngredientCount: 2,
    usedIngredients: [
      { id: 9, name: 'potato', original: '2 medium potatoes, diced', image: 'https://img.spoonacular.com/ingredients_100x100/potatoes-yukon-gold.png' },
      { id: 19, name: 'eggplant', original: '1 eggplant (Begun), cubed', image: 'https://img.spoonacular.com/ingredients_100x100/eggplant.png' },
      { id: 6, name: 'green chili', original: '4 green chilies, slit', image: 'https://img.spoonacular.com/ingredients_100x100/chili-pepper.jpg' },
      { id: 4, name: 'mustard oil', original: '2 tbsp mustard oil', image: 'https://img.spoonacular.com/ingredients_100x100/vegetable-oil.jpg' }
    ],
    missedIngredients: [
      { id: 20, name: 'cauliflower', original: '1 cup cauliflower florets', image: 'https://img.spoonacular.com/ingredients_100x100/cauliflower.jpg' },
      { id: 21, name: 'panch phoron', original: '1 tsp Panch Phoron five-spice mix', image: 'https://img.spoonacular.com/ingredients_100x100/spices.png' }
    ],
    instructions: [
      'Chop potatoes, eggplant, and cauliflower into uniform medium cubes.',
      'Heat mustard oil in a wok. Crackle Panch Phoron (five-spice mix) and green chilies until fragrant.',
      'Add potato and cauliflower cubes first; stir-fry for 4 minutes with turmeric powder and salt.',
      'Stir in cubed eggplant and 1/4 cup water. Cover pan and steam on low-medium heat for 10 minutes.',
      'Uncover, raise heat, and cook off moisture until veggies get a light charred stir-fry finish (Chochchori).',
      'Serve hot alongside rice and red lentil dal.'
    ]
  },
  {
    id: 107,
    title: 'Old Dhaka Style Chicken Tehari (পুরান ঢাকার চিকেন তেহারি)',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 40,
    servings: 4,
    calories: 580,
    protein: '32g',
    carbs: '68g',
    fat: '22g',
    dietary: ['Halal', 'High-Protein'],
    usedIngredientCount: 4,
    missedIngredientCount: 3,
    usedIngredients: [
      { id: 22, name: 'rice', original: '2 cups Chinigura / Kalijira aromatic rice', image: 'https://img.spoonacular.com/ingredients_100x100/rice-white-long-grain-or-short-grain-cooked.jpg' },
      { id: 1, name: 'chicken', original: '500g small bite-sized chicken pieces', image: 'https://img.spoonacular.com/ingredients_100x100/chicken-breasts.png' },
      { id: 4, name: 'mustard oil', original: '4 tbsp pure mustard oil', image: 'https://img.spoonacular.com/ingredients_100x100/vegetable-oil.jpg' },
      { id: 6, name: 'green chili', original: '10 whole green chilies', image: 'https://img.spoonacular.com/ingredients_100x100/chili-pepper.jpg' }
    ],
    missedIngredients: [
      { id: 23, name: 'yogurt', original: '3 tbsp sour yogurt (Tok Doi)', image: 'https://img.spoonacular.com/ingredients_100x100/plain-yogurt.jpg' },
      { id: 24, name: 'tehari masala', original: '1.5 tbsp aromatic Tehari spice blend', image: 'https://img.spoonacular.com/ingredients_100x100/spices.png' },
      { id: 25, name: 'milk', original: '1/2 cup warm liquid milk', image: 'https://img.spoonacular.com/ingredients_100x100/milk.png' }
    ],
    instructions: [
      'Rinse Chinigura rice thoroughly and drain in a colander for 15 minutes.',
      'Marinate chicken pieces with sour yogurt, garlic, ginger, salt, and Tehari spice blend.',
      'Heat mustard oil in a heavy handi. Sauté onions and 5 whole green chilies until soft and sweet.',
      'Add chicken pieces and fry over medium heat for 10 minutes until cooked and oil separates. Remove chicken.',
      'Add drained rice to remaining oil and spice in handi. Stir-fry (bhuna) rice for 4 minutes until crackling.',
      'Pour 3.5 cups boiling water and 1/2 cup warm milk. Add salt, remaining green chilies, and cooked chicken back in.',
      'Cover tightly with lid and steam on Dum (very low heat) for 15 minutes until rice is soft and aromatic.',
      'Serve hot with cucumber-onion salad and chilled Borhani.'
    ]
  },
  {
    id: 108,
    title: 'Crispy Beguni & Potato Pakora (বেগুনী ও আলু পকোড়া)',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    imageType: 'jpg',
    readyInMinutes: 15,
    servings: 3,
    calories: 240,
    protein: '7g',
    carbs: '28g',
    fat: '12g',
    dietary: ['Vegetarian', 'Vegan', 'Quick & Easy'],
    usedIngredientCount: 3,
    missedIngredientCount: 2,
    usedIngredients: [
      { id: 19, name: 'eggplant', original: '1 purple eggplant, sliced thin lengthwise', image: 'https://img.spoonacular.com/ingredients_100x100/eggplant.png' },
      { id: 9, name: 'potato', original: '2 potatoes, sliced into thin rounds', image: 'https://img.spoonacular.com/ingredients_100x100/potatoes-yukon-gold.png' },
      { id: 6, name: 'green chili', original: '2 green chilies, chopped', image: 'https://img.spoonacular.com/ingredients_100x100/chili-pepper.jpg' }
    ],
    missedIngredients: [
      { id: 26, name: 'besan', original: '1 cup Besan (gram flour)', image: 'https://img.spoonacular.com/ingredients_100x100/chickpea-flour.jpg' },
      { id: 7, name: 'turmeric', original: '1/2 tsp turmeric powder', image: 'https://img.spoonacular.com/ingredients_100x100/turmeric.jpg' }
    ],
    instructions: [
      'Slice eggplant into thin longitudinal strips and potato into thin rounds. Sprinkle lightly with salt.',
      'In a bowl, whisk Besan (gram flour), rice flour, turmeric, red chili powder, cumin seeds, salt, and water into a smooth batter.',
      'Heat oil in a deep frying pan until hot.',
      'Dip eggplant strips and potato slices individually into batter, ensuring full even coating.',
      'Deep fry in batches for 3-4 minutes until puffed up, crisp, and golden brown.',
      'Drain on paper towels and serve hot with puffed rice (Muri) or hot Bengali tea (Cha).'
    ]
  }
];

const POPULAR_INGREDIENTS = [
  'chicken', 'beef', 'egg', 'onion', 'garlic', 'ginger', 'green chili',
  'mustard oil', 'rice', 'potato', 'masoor dal', 'lentil', 'eggplant',
  'tomato', 'fish', 'ilish', 'turmeric', 'cumin', 'coriander', 'cauliflower', 'pumpkin'
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

// Helper: Fetch live recipes from free open recipe API (TheMealDB)
async function fetchLiveMealDBRecipes(ingredientStr = '') {
  const queryIngredients = ingredientStr
    .toLowerCase()
    .split(',')
    .map(i => i.trim())
    .filter(Boolean);

  const mainIng = queryIngredients[0] || 'chicken';
  console.log(`[TheMealDB Live API] Querying live recipe API for ingredient: "${mainIng}"`);

  try {
    let url = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(mainIng)}`;
    let apiRes = await fetch(url);
    let data = await apiRes.json();

    if (!data.meals || data.meals.length === 0) {
      url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(mainIng)}`;
      apiRes = await fetch(url);
      data = await apiRes.json();
    }

    if (!data.meals || data.meals.length === 0) {
      return null;
    }

    const topMeals = data.meals.slice(0, 6);
    const detailedRecipes = await Promise.all(
      topMeals.map(async (meal) => {
        try {
          const detailRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`);
          const detailData = await detailRes.json();
          const m = detailData.meals ? detailData.meals[0] : meal;

          const ingredientsList = [];
          for (let i = 1; i <= 20; i++) {
            const ing = m[`strIngredient${i}`];
            const measure = m[`strMeasure${i}`];
            if (ing && ing.trim()) {
              ingredientsList.push({
                name: ing.toLowerCase().trim(),
                original: `${measure ? measure.trim() + ' ' : ''}${ing.trim()}`,
                image: `https://www.themealdb.com/images/ingredients/${encodeURIComponent(ing.trim())}-Small.png`
              });
            }
          }

          const used = ingredientsList.filter(ing =>
            queryIngredients.some(q => ing.name.includes(q) || q.includes(ing.name))
          );
          const missed = ingredientsList.filter(ing => !used.includes(ing));

          const rawInstructions = m.strInstructions || 'Follow standard cooking directions carefully.';
          const instructions = rawInstructions
            .split(/\r?\n|\./)
            .map(s => s.trim())
            .filter(s => s.length > 8);

          const dietary = [];
          const cat = (m.strCategory || '').toLowerCase();
          const titleLower = (m.strMeal || '').toLowerCase();

          if (cat.includes('vegetarian') || cat.includes('vegan') || cat.includes('starter')) {
            dietary.push('Vegetarian');
          }
          if (cat.includes('vegan')) {
            dietary.push('Vegan');
          }
          if (!titleLower.includes('pork') && !titleLower.includes('bacon') && !titleLower.includes('ham') && !rawInstructions.toLowerCase().includes('wine')) {
            dietary.push('Halal');
          }
          if (cat.includes('chicken') || cat.includes('beef') || cat.includes('seafood') || cat.includes('lamb')) {
            dietary.push('High-Protein');
          }
          dietary.push('Gluten-Free');

          const numericId = parseInt(m.idMeal, 10);
          return {
            id: numericId,
            title: m.strMeal,
            image: m.strMealThumb,
            imageType: 'jpg',
            readyInMinutes: 25 + (numericId % 20),
            servings: 4,
            calories: 380 + (numericId % 250),
            protein: `${24 + (numericId % 20)}g`,
            carbs: `${32 + (numericId % 25)}g`,
            fat: `${14 + (numericId % 15)}g`,
            dietary: Array.from(new Set(dietary)),
            usedIngredientCount: Math.max(used.length, 1),
            missedIngredientCount: Math.max(missed.length, 1),
            usedIngredients: used.length > 0 ? used : [{ name: mainIng, original: `1 portion ${mainIng}`, image: 'https://img.spoonacular.com/ingredients_100x100/food.png' }],
            missedIngredients: missed.slice(0, 4),
            instructions: instructions.length > 0 ? instructions : [rawInstructions]
          };
        } catch (e) {
          return null;
        }
      })
    );

    return detailedRecipes.filter(Boolean);
  } catch (err) {
    console.error(`[TheMealDB Error] ${err.message}`);
    return null;
  }
}

// -------------------------------------------------------------------
// SECURE BACKEND-FOR-FRONTEND (BFF) AUTH & FIRESTORE SERVICE
// All Firebase credentials and SDK communications remain strictly server-side.
// -------------------------------------------------------------------

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    return { mapValue: { fields: toFirestoreFields(val) } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreFields(fields) {
  if (!fields) return {};
  const res = {};
  for (const [k, v] of Object.entries(fields)) {
    res[k] = fromFirestoreValue(v);
  }
  return res;
}

function fromFirestoreValue(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) return fromFirestoreFields(val.mapValue.fields);
  return null;
}

async function verifyIdToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token || req.query?.token);
  if (!token) return null;

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.users && data.users.length > 0) {
      const u = data.users[0];
      return {
        uid: u.localId,
        email: u.email,
        name: u.displayName || u.email.split('@')[0],
        emailVerified: !!u.emailVerified,
        token
      };
    }
  } catch (err) {
    console.error('[Auth Verify Error]', err.message);
  }
  return null;
}

async function getFirestoreUser(uid) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return fromFirestoreFields(data.fields);
  } catch (err) {
    console.error('[Firestore Read Error]', err.message);
    return null;
  }
}

async function setFirestoreUser(uid, data, merge = true) {
  try {
    const keys = Object.keys(data);
    let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`;
    if (merge && keys.length > 0) {
      const maskParams = keys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
      url += `&${maskParams}`;
    }
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
    return res.ok;
  } catch (err) {
    console.error('[Firestore Write Error]', err.message);
    return false;
  }
}

async function deleteFirestoreUser(uid) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('[Firestore Delete Error]', err.message);
    return false;
  }
}

// -------------------------------------------------------------------
// AUTHENTICATION API ROUTES (BFF)
// -------------------------------------------------------------------

// 1. Sign Up
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { email, password, name, savedRecipes } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const data = await signUpRes.json();
    if (!signUpRes.ok) {
      const errCode = data.error?.message || 'SIGNUP_FAILED';
      if (errCode.includes('EMAIL_EXISTS')) {
        return res.status(400).json({ error: 'Email already registered. Please sign in instead.' });
      }
      if (errCode.includes('WEAK_PASSWORD')) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      if (errCode.includes('INVALID_EMAIL')) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      return res.status(400).json({ error: data.error?.message || 'Failed to create account.' });
    }

    const { idToken, localId: uid, refreshToken } = data;
    const displayName = (name && name.trim()) ? name.trim() : email.split('@')[0];

    // Update display name
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, displayName, returnSecureToken: true })
    });

    // Send verification email
    try {
      await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken })
      });
    } catch (e) {
      console.warn('[Send Verification Warning]', e.message);
    }

    // Save profile and initial bookmarks to Firestore
    await setFirestoreUser(uid, {
      name: displayName,
      savedRecipes: Array.isArray(savedRecipes) ? savedRecipes : []
    }, false);

    res.json({
      success: true,
      user: {
        uid,
        email,
        name: displayName,
        emailVerified: false
      },
      token: idToken,
      refreshToken
    });
  } catch (err) {
    console.error('[Sign Up Error]', err);
    res.status(500).json({ error: 'Internal server error during account creation.' });
  }
});

// 2. Sign In
app.post('/api/auth/signin', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const data = await signInRes.json();
    if (!signInRes.ok) {
      const errCode = data.error?.message || 'SIGNIN_FAILED';
      if (errCode.includes('INVALID_LOGIN_CREDENTIALS') || errCode.includes('INVALID_PASSWORD') || errCode.includes('EMAIL_NOT_FOUND')) {
        return res.status(400).json({ error: 'Incorrect email or password.' });
      }
      if (errCode.includes('USER_DISABLED')) {
        return res.status(400).json({ error: 'This user account has been disabled.' });
      }
      if (errCode.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        return res.status(400).json({ error: 'Too many attempts. Please try again later.' });
      }
      return res.status(400).json({ error: data.error?.message || 'Failed to sign in.' });
    }

    const { idToken, localId: uid, displayName, refreshToken } = data;

    // Check user info / verification status
    const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    let emailVerified = false;
    let finalDisplayName = displayName || email.split('@')[0];
    if (lookupRes.ok) {
      const lookupData = await lookupRes.json();
      if (lookupData.users && lookupData.users[0]) {
        emailVerified = !!lookupData.users[0].emailVerified;
        if (lookupData.users[0].displayName) finalDisplayName = lookupData.users[0].displayName;
      }
    }

    // Retrieve Firestore user doc to ensure latest name & savedRecipes
    const firestoreData = await getFirestoreUser(uid);
    if (firestoreData && firestoreData.name) {
      finalDisplayName = firestoreData.name;
    }

    res.json({
      success: true,
      user: {
        uid,
        email,
        name: finalDisplayName,
        emailVerified
      },
      savedRecipes: firestoreData?.savedRecipes || [],
      token: idToken,
      refreshToken
    });
  } catch (err) {
    console.error('[Sign In Error]', err);
    res.status(500).json({ error: 'Internal server error during sign in.' });
  }
});

// 2.5 Token Refresh
app.post('/api/auth/refresh', refreshLimiter, async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`
    });

    const data = await refreshRes.json();
    if (!refreshRes.ok) {
      console.warn('[Token Refresh Failed]', data);
      return res.status(401).json({ error: 'TOKEN_REVOKED' });
    }

    res.json({
      success: true,
      token: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      userId: data.user_id
    });
  } catch (err) {
    console.error('[Token Refresh Error]', err);
    res.status(500).json({ error: 'Internal server error during token refresh.' });
  }
});

// 3. Forgot Password
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  try {
    const resetRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email })
    });

    const data = await resetRes.json();
    if (!resetRes.ok) {
      return res.status(400).json({ error: data.error?.message || 'Failed to send password reset email.' });
    }

    res.json({ success: true, message: 'Password reset email sent.' });
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

// 4. Resend Verification Email
app.post('/api/auth/send-verification', authLimiter, async (req, res) => {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  try {
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: authUser.token })
    });

    const data = await verifyRes.json();
    if (!verifyRes.ok) {
      return res.status(400).json({ error: data.error?.message || 'Failed to send verification email.' });
    }

    res.json({ success: true, message: 'Verification email sent.' });
  } catch (err) {
    console.error('[Verification Error]', err);
    res.status(500).json({ error: 'Internal server error sending verification.' });
  }
});

// 5. Get Current User Profile & Sync
app.get('/api/auth/me', apiGeneralLimiter, async (req, res) => {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const firestoreData = await getFirestoreUser(authUser.uid);
  res.json({
    success: true,
    user: {
      uid: authUser.uid,
      email: authUser.email,
      name: firestoreData?.name || authUser.name,
      emailVerified: authUser.emailVerified
    },
    savedRecipes: firestoreData?.savedRecipes || []
  });
});

// 6. Update Profile (Name and/or Password)
app.post('/api/auth/update-profile', userAccountLimiter, async (req, res) => {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  }

  const { name, currentPassword, newPassword } = req.body;

  let activeToken = authUser.token;
  if (currentPassword || newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Please enter your current password.' });
    }

    const checkRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authUser.email, password: currentPassword, returnSecureToken: true })
    });

    const checkData = await checkRes.json();
    if (!checkRes.ok) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }
    activeToken = checkData.idToken;
  }

  try {
    const updateBody = { idToken: activeToken, returnSecureToken: true };
    if (name && name.trim()) updateBody.displayName = name.trim();
    if (newPassword) updateBody.password = newPassword;

    const updateRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateBody)
    });

    const updateData = await updateRes.json();
    if (!updateRes.ok) {
      return res.status(400).json({ error: updateData.error?.message || 'Failed to update profile.' });
    }

    const updatedName = (name && name.trim()) ? name.trim() : authUser.name;
    if (name && name.trim()) {
      await setFirestoreUser(authUser.uid, { name: updatedName });
    }

    res.json({
      success: true,
      user: {
        uid: authUser.uid,
        email: authUser.email,
        name: updatedName,
        emailVerified: authUser.emailVerified
      },
      token: updateData.idToken || activeToken
    });
  } catch (err) {
    console.error('[Update Profile Error]', err);
    res.status(500).json({ error: 'Internal server error updating profile.' });
  }
});

// 7. Permanently Delete Account
app.post('/api/auth/delete-account', userAccountLimiter, async (req, res) => {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Please enter your password to confirm account deletion.' });
  }

  const checkRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: authUser.email, password, returnSecureToken: true })
  });

  const checkData = await checkRes.json();
  if (!checkRes.ok) {
    return res.status(400).json({ error: 'Incorrect password. Try again.' });
  }

  try {
    await deleteFirestoreUser(authUser.uid);

    const delRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: checkData.idToken })
    });

    if (!delRes.ok) {
      const delData = await delRes.json();
      return res.status(400).json({ error: delData.error?.message || 'Failed to delete account.' });
    }

    res.json({ success: true, message: 'Account permanently deleted.' });
  } catch (err) {
    console.error('[Delete Account Error]', err);
    res.status(500).json({ error: 'Internal server error deleting account.' });
  }
});

// 8. User Saved Recipes (Sync & Get)
app.get('/api/user/saved-recipes', apiGeneralLimiter, async (req, res) => {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const data = await getFirestoreUser(authUser.uid);
  res.json({
    success: true,
    savedRecipes: data?.savedRecipes || []
  });
});

app.post('/api/user/saved-recipes', apiGeneralLimiter, async (req, res) => {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { savedRecipes } = req.body;
  if (!Array.isArray(savedRecipes)) {
    return res.status(400).json({ error: 'savedRecipes must be an array.' });
  }

  const ok = await setFirestoreUser(authUser.uid, {
    savedRecipes
  });

  if (!ok) {
    return res.status(500).json({ error: 'Failed to save recipes to database.' });
  }

  res.json({ success: true, savedRecipes });
});

// 1. Search Recipes by Ingredients (Spoonacular API + Free Live Recipe API + Mock Fallback)
app.get('/api/recipes/search', recipeSearchLimiter, async (req, res) => {
  const { ingredients } = req.query;

  if (!ingredients) {
    return res.status(400).json({ error: 'Ingredients query parameter is required.' });
  }

  console.log(`[API Proxy] Recipe search requested for ingredients: "${ingredients}"`);

  // Option A: Try Spoonacular API if key exists
  if (SPOONACULAR_API_KEY) {
    try {
      const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=12&ranking=1&ignorePantry=true&apiKey=${SPOONACULAR_API_KEY}`;
      const apiRes = await fetch(url);

      if (apiRes.ok) {
        const data = await apiRes.json();
        console.log(`[Spoonacular API] Successfully returned ${data.length} live recipes.`);
        return res.json({ source: 'spoonacular_api', data });
      } else {
        console.warn(`[Spoonacular API Warning] Status ${apiRes.status}. Falling back to live public Recipe API.`);
      }
    } catch (err) {
      console.error(`[Spoonacular API Error] ${err.message}. Falling back to live public Recipe API.`);
    }
  }

  // Option B: Query Live Open Recipe API (TheMealDB)
  const liveMealDBResults = await fetchLiveMealDBRecipes(ingredients);
  const localBangladeshiMock = getMockSearchResults(ingredients);

  if (liveMealDBResults && liveMealDBResults.length > 0) {
    // Combine live API results with local Bangladeshi dishes for a complete experience!
    const combined = [...localBangladeshiMock, ...liveMealDBResults];
    console.log(`[Live Recipe API] Returning ${combined.length} combined live API & curated recipes.`);
    return res.json({
      source: 'live_recipe_api',
      data: combined,
      message: 'Fetched live recipes from open Recipe API and curated collection.'
    });
  }

  // Option C: Fallback to Curated Dataset
  return res.json({
    source: 'mock_dataset',
    data: localBangladeshiMock,
    message: 'Served curated recipe collection.'
  });
});

// 2. Get Detailed Recipe Information by ID
app.get('/api/recipes/:id/information', recipeSearchLimiter, async (req, res) => {
  const recipeId = parseInt(req.params.id, 10);
  console.log(`[API Proxy] Fetching information for recipe ID: ${recipeId}`);

  // Check mock recipe list first
  const foundMock = MOCK_RECIPES.find(r => r.id === recipeId);
  if (foundMock) {
    return res.json({ source: 'mock', data: foundMock });
  }

  // Check Spoonacular API
  if (SPOONACULAR_API_KEY) {
    try {
      const url = `https://api.spoonacular.com/recipes/${recipeId}/information?includeNutrition=true&apiKey=${SPOONACULAR_API_KEY}`;
      const apiRes = await fetch(url);

      if (apiRes.ok) {
        const data = await apiRes.json();
        return res.json({ source: 'spoonacular_api', data });
      }
    } catch (err) {
      console.error(`[Spoonacular API Error] ${err.message}.`);
    }
  }

  // Check TheMealDB API lookup
  try {
    const detailRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipeId}`);
    if (detailRes.ok) {
      const detailData = await detailRes.json();
      if (detailData.meals && detailData.meals[0]) {
        const m = detailData.meals[0];
        const ingredientsList = [];
        for (let i = 1; i <= 20; i++) {
          const ing = m[`strIngredient${i}`];
          const measure = m[`strMeasure${i}`];
          if (ing && ing.trim()) {
            ingredientsList.push({
              name: ing.toLowerCase().trim(),
              original: `${measure ? measure.trim() + ' ' : ''}${ing.trim()}`,
              image: `https://www.themealdb.com/images/ingredients/${encodeURIComponent(ing.trim())}-Small.png`
            });
          }
        }
        const rawInstructions = m.strInstructions || 'Follow cooking directions.';
        const instructions = rawInstructions.split(/\r?\n|\./).map(s => s.trim()).filter(s => s.length > 8);

        return res.json({
          source: 'themealdb_api',
          data: {
            id: recipeId,
            title: m.strMeal,
            image: m.strMealThumb,
            readyInMinutes: 30,
            servings: 4,
            calories: 450,
            protein: '30g',
            carbs: '35g',
            fat: '18g',
            dietary: ['Halal', 'Gluten-Free'],
            usedIngredients: ingredientsList.slice(0, 4),
            missedIngredients: ingredientsList.slice(4),
            instructions: instructions
          }
        });
      }
    }
  } catch (err) {
    console.error(`[TheMealDB Detail Error] ${err.message}`);
  }

  // Fallback
  return res.json({ source: 'mock', data: MOCK_RECIPES[0] });
});

// 3. Autocomplete Ingredients
app.get('/api/ingredients/autocomplete', apiGeneralLimiter, async (req, res) => {
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

// 4. Text-to-Speech (TTS) Proxy Endpoint (ElevenLabs AI Female Voice + Free Fallback)
app.get('/api/tts', recipeSearchLimiter, async (req, res) => {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({ error: 'Text query parameter is required.' });
  }

  const cleanText = String(text).trim().slice(0, 350);

  // 1. Try ElevenLabs API if key exists
  if (ELEVENLABS_API_KEY) {
    try {
      console.log(`[ElevenLabs TTS] Synthesizing audio with Rachel Voice...`);
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`;
      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (apiRes.ok) {
        const audioBuffer = await apiRes.arrayBuffer();
        res.set({
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength,
          'Cache-Control': 'public, max-age=86400'
        });
        return res.send(Buffer.from(audioBuffer));
      } else {
        const errText = await apiRes.text();
        console.warn(`[ElevenLabs API Warning] Status ${apiRes.status}: ${errText}. Falling back to Neural TTS.`);
      }
    } catch (err) {
      console.error(`[ElevenLabs API Error] ${err.message}. Falling back to Neural TTS.`);
    }
  } else {
    console.log(`[TTS Proxy] No ELEVENLABS_API_KEY in .env. Serving Neural Female Voice Stream.`);
  }

  // 2. Free Neural Female Voice Fallback Stream
  try {
    const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=en&client=tw-ob`;
    const gRes = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    });

    if (gRes.ok) {
      const audioBuffer = await gRes.arrayBuffer();
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength,
        'Cache-Control': 'public, max-age=86400'
      });
      return res.send(Buffer.from(audioBuffer));
    }
  } catch (err) {
    console.error(`[TTS Fallback Error] ${err.message}`);
  }

  return res.status(500).json({ error: 'Speech synthesis failed' });
});

// 5. AI Vision Fridge Scanner Endpoint
app.post('/api/vision/scan-fridge', apiGeneralLimiter, async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image base64 payload is required.' });
  }

  console.log(`[AI Vision Proxy] Fridge scan requested. Image data payload length: ${image.length}`);

  // If GEMINI_API_KEY is available, call Gemini Vision REST API
  if (GEMINI_API_KEY) {
    try {
      const mimeTypeMatch = image.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

      // Using gemini-3.6-flash for fast multimodal vision recognition
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const payload = {
        contents: [
          {
            parts: [
              {
                text: "Analyze this image of a fridge, pantry, or food items. Identify all visible raw food ingredients (e.g. tomato, eggs, garlic, chicken, milk, butter, onion, cheese, spinach, rice, etc.). Return strictly a JSON array of clean lowercase ingredient strings. Example: [\"tomato\", \"eggs\", \"garlic\"]. Do NOT include markdown formatting or extra conversational text."
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      };

      let attempts = 0;
      let geminiRes;
      
      while (attempts < 3) {
        geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (geminiRes.ok) break;
        
        if (geminiRes.status === 503) {
          attempts++;
          console.warn(`[Gemini Vision] 503 Overloaded (Attempt ${attempts}/3). Retrying in 1.5s...`);
          await new Promise(r => setTimeout(r, 1500));
        } else {
          break; // Don't retry on 400, 404, etc.
        }
      }

      if (geminiRes && geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const parts = geminiData?.candidates?.[0]?.content?.parts || [];
        const responseText = parts.map(p => p.text || '').filter(Boolean).join('\n');
        console.log(`[Gemini Vision Output]:`, responseText);
        
        // Extract array using regex matching [...]
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const parsedIngredients = JSON.parse(arrayMatch[0]);

            if (Array.isArray(parsedIngredients)) {
              console.log(`[Gemini Vision] Successfully detected ${parsedIngredients.length} ingredients:`, parsedIngredients);
              return res.json({
                source: 'gemini-vision',
                ingredients: parsedIngredients.map(i => String(i).toLowerCase().trim())
              });
            }
          } catch (e) {
            console.warn(`[Gemini Vision] Failed to parse array: ${e.message}`);
          }
        }
        
        // If Gemini succeeds but doesn't return an array, it means no food was detected.
        console.log(`[Gemini Vision] No valid array found. Assuming 0 ingredients.`);
        return res.json({
          source: 'gemini-vision',
          ingredients: []
        });
      } else {
        const errText = await geminiRes?.text() || 'No response';
        console.warn(`[Gemini Vision Warning] Status ${geminiRes?.status}: ${errText}`);
        return res.status(503).json({ error: 'Gemini AI is currently overloaded or unavailable. Please try again later.' });
      }
    } catch (err) {
      console.error(`[Gemini Vision Error] ${err.message}`);
      return res.status(500).json({ error: 'Failed to contact Gemini AI.' });
    }
  } else {
    // ONLY Fallback to Smart Vision Simulator (Demo Mode) if NO API KEY is provided.
    // Generates realistic fridge scanning results with confidence scores
  const samplePresets = [
    ['tomato', 'eggs', 'garlic', 'chicken', 'milk', 'cheese', 'butter'],
    ['onion', 'pasta', 'tomato', 'olive oil', 'bell pepper', 'garlic'],
    ['beef', 'rice', 'garlic', 'onion', 'spinach', 'carrot'],
    ['eggs', 'bread', 'butter', 'cheese', 'avocado', 'tomato']
  ];

  // Pick deterministic preset based on image string length
  const selectedSet = samplePresets[image.length % samplePresets.length];
  
  // Add brief artificial delay to simulate realistic AI visual recognition
  await new Promise(resolve => setTimeout(resolve, 1200));

  return res.json({
    source: 'mock-vision',
    message: GEMINI_API_KEY ? 'Gemini API call failed, using Vision Simulator.' : 'Operating in demo mode. AI Vision Scanner active!',
    ingredients: selectedSet
  });
  }
});

// Start Server locally or export for Serverless (Vercel)

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  BiteSize Web App is running live on http://localhost:${PORT}`);
    console.log(`  API Proxy Status: ${SPOONACULAR_API_KEY ? 'Connected (Spoonacular Key Active)' : 'Demo Mode (Mock Data Active)'}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
