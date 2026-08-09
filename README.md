# 🍳 BiteSize: Smart Ingredient Recipe Finder & Meal Planner

A modern web application that helps reduce household food waste by finding recipes based on ingredients you already have. Search by the items in your fridge, get personalized recipe recommendations, and plan meals efficiently.

**Live Demo:** [https://bitesize-recipe-finder.vercel.app](https://bitesize-recipe-finder.vercel.app)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [API Endpoints](#api-endpoints)
- [Design System](#design-system)
- [Development](#development)
- [Deployment](#deployment)

---

## 🎯 Overview

**BiteSize** is an ingredient-first recipe finder engineered to reduce household food waste. The design philosophy centers on **speed, clarity, and visual appetite**, helping users make the most of available ingredients and discover new meals.

The application intelligently bridges the gap between users' pantries and recipe discovery, with built-in fallback mechanisms for reliable operation even when external APIs are unavailable.

---

## ✨ Features

- **Ingredient-Based Search** - Find recipes by searching for ingredients you have on hand
- **Smart Fallback System** - Built-in mock dataset ensures the app works without API keys
- **Detailed Recipe Information** - View complete recipes with ingredients, instructions, and nutritional data
- **Autocomplete Suggestions** - Intelligent ingredient autocomplete based on popular items
- **Nutritional Information** - Calorie counts, protein, carbs, and fat breakdowns
- **Prep Time & Servings** - Quick reference for cooking duration and portion sizes
- **Dietary Filters** - Vegetarian, Vegan, Gluten-Free, Low-Carb, and High-Protein options
- **Responsive Design** - Optimized for mobile, tablet, and desktop viewing
- **CORS-Enabled API** - Secure cross-origin requests for frontend flexibility

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js (v4.19.2)
- **Middleware:**
  - CORS (v2.8.5) - Cross-Origin Resource Sharing
  - Dotenv (v16.4.5) - Environment variable management
- **API Integration:** Spoonacular API (with intelligent fallback to mock data)
- **Deployment:** Vercel (Serverless)

### Frontend
- **HTML/CSS/JavaScript** - Vanilla web technologies
- **Design System:** Google Stitch (Material 3 Design Tokens)
- **Styling:** Custom CSS with Stitch Material 3 color tokens
- **Font:** Inter / Roboto (Google Web Fonts)

### External Services
- **Recipe Data:** Spoonacular API
- **Hosting:** Vercel
- **Images:** Unsplash, Spoonacular CDN

### DevOps & Tools
- **Package Manager:** npm
- **Environment:** CommonJS modules
- **Watch Mode:** Node.js `--watch` flag for development

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (SPA)                          │
│              (HTML/CSS/JavaScript - Public/)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │       Express.js Backend (server.js)                │   │
│  │                                                     │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  API Proxy & Middleware                      │  │   │
│  │  │  • CORS handling                             │  │   │
│  │  │  • Static file serving (public/)             │  │   │
│  │  │  • JSON body parsing                         │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  Recipe Endpoints                            │  │   │
│  │  │  • GET /api/recipes/search                   │  │   │
│  │  │  • GET /api/recipes/:id/information          │  │   │
│  │  │  • GET /api/ingredients/autocomplete         │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  Data Sources                                │  │   │
│  │  │  ├─ Spoonacular API (Primary)               │  │   │
│  │  │  └─ Mock Dataset (Fallback)                 │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Frontend collects ingredient selections
2. **API Request** → Frontend sends request to Express backend
3. **Backend Processing** → 
   - Attempts to fetch from Spoonacular API
   - Falls back to mock dataset on error or missing API key
   - Returns unified response format
4. **Response** → Frontend displays results with source metadata

### Key Design Patterns

- **API Proxy Pattern** - Backend acts as intermediary between frontend and Spoonacular
- **Graceful Degradation** - Mock data ensures functionality without external dependencies
- **Serverless Compatible** - Express app exports for Vercel deployment

---

## 📁 Project Structure

```
bitesize-recipe-finder/
├── server.js                 # Express application & API endpoints
├── package.json              # Project dependencies & metadata
├── package-lock.json         # Locked dependency versions
├── vercel.json               # Vercel deployment configuration
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules
├── Design.md                 # Design system & UI specifications
├── README.md                 # This file
└── public/                   # Static frontend files (HTML, CSS, JS, images)
    ├── index.html
    ├── styles.css
    ├── app.js
    └── assets/               # Images and brand materials
```

### Key Files Explained

| File | Purpose |
|------|---------|
| `server.js` | Main application server - contains all API endpoints and mock data |
| `package.json` | Project metadata and dependencies (Express, CORS, Dotenv) |
| `vercel.json` | Serverless function configuration for Vercel |
| `.env.example` | Template for required environment variables |
| `Design.md` | Complete design system, color palette, typography, and UI patterns |
| `public/` | Frontend assets served as static files |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm (included with Node.js)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/zionabdullah/bitesize-recipe-finder.git
   cd bitesize-recipe-finder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Add Spoonacular API Key (optional)**
   - Get a free API key from [spoonacular.com](https://spoonacular.com/food-api)
   - Add to `.env`:
     ```
     SPOONACULAR_API_KEY=your_api_key_here
     ```
   - The app works without it using the mock dataset

---

## 🔧 Environment Setup

### `.env` Variables

```env
# Spoonacular API Configuration
SPOONACULAR_API_KEY=your_spoonacular_api_key_here

# Server Configuration
PORT=3000
```

**Note:** The application works in **demo mode** without an API key, using a rich mock dataset included in `server.js`.

---

## 📡 API Endpoints

### 1. Search Recipes by Ingredients

**Endpoint:** `GET /api/recipes/search?ingredients=chicken,garlic,tomato`

**Query Parameters:**
- `ingredients` (required) - Comma-separated ingredient list

**Response:**
```json
{
  "source": "spoonacular" | "mock",
  "data": [
    {
      "id": 101,
      "title": "Creamy Garlic Parmesan Chicken & Tomato Pasta",
      "image": "https://...",
      "readyInMinutes": 25,
      "servings": 4,
      "calories": 520,
      "protein": "38g",
      "carbs": "42g",
      "fat": "22g",
      "dietary": ["High-Protein"],
      "usedIngredientCount": 4,
      "missedIngredientCount": 2,
      "usedIngredients": [...],
      "missedIngredients": [...],
      "instructions": [...]
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing required `ingredients` parameter

---

### 2. Get Detailed Recipe Information

**Endpoint:** `GET /api/recipes/:id/information`

**Path Parameters:**
- `id` (required) - Recipe ID number

**Response:**
```json
{
  "source": "spoonacular" | "mock",
  "data": {
    "id": 101,
    "title": "...",
    "image": "...",
    "readyInMinutes": 25,
    "servings": 4,
    "instructions": [...],
    "usedIngredients": [...],
    "missedIngredients": [...]
  }
}
```

---

### 3. Autocomplete Ingredients

**Endpoint:** `GET /api/ingredients/autocomplete?query=chic`

**Query Parameters:**
- `query` (optional) - Ingredient search term

**Response:**
```json
[
  "chicken",
  "chicken breast",
  "chicken thighs",
  "chicken wing",
  "chickpea",
  "chickpeas"
]
```

---

## 🎨 Design System

The application follows **Google Stitch Material 3** design tokens. Complete specifications are in [`Design.md`](Design.md).

### Color Palette

| Token | Hex Code | Usage |
|-------|----------|-------|
| `primary` | `#006b2c` | Primary buttons, active ingredients |
| `secondary` | `#9d4300` | Highlight tags, cooking time badges |
| `surface` | `#FAFAFA` | Main background |
| `surface-container` | `#FFFFFF` | Cards, modals |
| `outline` | `#E5E7EB` | Borders, dividers |
| `text-primary` | `#0F172A` | Headlines, body text |

### Typography

- **Font:** Inter / Roboto
- **Headline Large:** 32px, Bold - Landing page hero
- **Title Medium:** 20px, Semi-Bold - Recipe titles
- **Body Medium:** 14px, Regular - Instructions, ingredients
- **Label Small:** 12px, Medium - Badges, tags

### Responsive Layout

- **Mobile** (< 640px) - Single column, collapsible sidebar
- **Tablet** (640px - 1024px) - 2-column recipe grid
- **Desktop** (> 1024px) - Sidebar (30%) + Content (70%)

---

## 👨‍💻 Development

### Run Development Server

```bash
npm run dev
```

Starts the server with file watching enabled. Server runs on `http://localhost:3000`.

### Run Production Server

```bash
npm start
```

Starts the Express server in production mode.

### Server Output

```
=======================================================
  BiteSize Web App is running live on http://localhost:3000
  API Proxy Status: Connected (Spoonacular Key Active)
=======================================================
```

### Debug Logging

The application includes console logging for:
- Recipe search requests
- API proxy calls and responses
- Fallback to mock data
- API errors and status codes

---

## 🌐 Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import the GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy automatically on each push

3. **Configuration**
   - `vercel.json` automatically configures the Vercel serverless environment
   - Express app exports as a serverless function

### Environment Variables in Vercel

Add in Vercel project settings:
```
SPOONACULAR_API_KEY=your_api_key_here
```

**Current Deployment:** https://bitesize-recipe-finder.vercel.app

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

---

## 🙋 Support

For issues, feature requests, or questions:
- Open a GitHub Issue
- Check existing issues first
- Provide detailed reproduction steps

---

## 📚 Additional Resources

- [Spoonacular API Documentation](https://spoonacular.com/food-api)
- [Express.js Documentation](https://expressjs.com/)
- [Design System (Design.md)](Design.md)
- [Material 3 Design](https://m3.material.io/)
- [Vercel Documentation](https://vercel.com/docs)

---

**Built with ❤️ to reduce food waste and inspire home cooking.**
