# 🍳 BiteSize: Smart Ingredient Recipe Finder & Meal Planner

[![Live Demo](https://img.shields.io/badge/Live%20Demo-bitesize--recipe--finder.vercel.app-16a34a?style=for-the-badge&logo=vercel&logoColor=white)](https://bitesize-recipe-finder.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-zionabdullah%2Fbitesize--recipe--finder-0f172a?style=for-the-badge&logo=github&logoColor=white)](https://github.com/zionabdullah/bitesize-recipe-finder)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-v4.19.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg?style=for-the-badge)](LICENSE)

> **BiteSize** is an ingredient-first, AI-augmented culinary web application engineered to eliminate household food waste. Rather than asking *"what do you want to cook?"*, BiteSize asks *"what do you already have?"* — matching pantry items with chef-crafted recipes, utilizing Google Gemini AI computer vision for fridge scanning, offering step-by-step hands-free voice assistance, and syncing favorites via Firebase Cloud Authentication.

---

## 📌 Quick Access Links

| Resource | URL |
| :--- | :--- |
| 🌐 **Live Website** | [https://bitesize-recipe-finder.vercel.app](https://bitesize-recipe-finder.vercel.app) |
| 📂 **GitHub Repository** | [https://github.com/zionabdullah/bitesize-recipe-finder](https://github.com/zionabdullah/bitesize-recipe-finder) |
| 📑 **Full User Manual** | [Jump to Step-by-Step User Manual](#-step-by-step-user-manual) |
| 💻 **Local Installation** | [Jump to Localhost Installation Guide](#-localhost-installation--setup-guide) |
| 🖥️ **Browser Compatibility** | [Jump to Browser Compatibility Matrix](#-live-website-access--browser-compatibility) |

---

## 📋 Table of Contents

1. [Overview & Core Value](#-overview--core-value)
2. [Live Website Access & Browser Compatibility](#-live-website-access--browser-compatibility)
3. [Localhost Installation & Setup Guide](#-localhost-installation--setup-guide)
   - [Required Software & Version Specifications](#required-software--version-specifications)
   - [Step-by-Step Localhost Setup](#step-by-step-localhost-setup)
   - [Environment Variables Configuration](#environment-variables-configuration)
   - [Zero-Config Fallback Mode (Works with 0 API Keys)](#zero-config-fallback-mode-works-with-0-api-keys)
4. [Step-by-Step User Manual (Feature Guide)](#-step-by-step-user-manual)
   - [1. Ingredient Discovery & Smart Autocomplete](#1-ingredient-discovery--smart-autocomplete)
   - [2. AI Smart Fridge Vision Scanner (Gemini Multimodal)](#2-ai-smart-fridge-vision-scanner-gemini-multimodal)
   - [3. Virtual Fridge Inventory Management](#3-virtual-fridge-inventory-management)
   - [4. Dietary Preferences & Intelligent Sorting](#4-dietary-preferences--intelligent-sorting)
   - [5. Recipe Details, Macros & Shopping List](#5-recipe-details-macros--shopping-list)
   - [6. Hands-Free Cook Mode (Audio Narration & Smart Timer)](#6-hands-free-cook-mode-audio-narration--smart-timer)
   - [7. User Authentication & Cloud Synchronization](#7-user-authentication--cloud-synchronization)
5. [System Architecture & Data Flow](#-system-architecture--data-flow)
6. [API Endpoints & Security Specifications](#-api-endpoints--security-specifications)
7. [Project Directory Structure](#-project-directory-structure)
8. [Presentation Checklist (Course Evaluation)](#-presentation-checklist-course-evaluation)
9. [License & Acknowledgments](#-license--acknowledgments)

---

## 💡 Overview & Core Value

According to global environmental statistics, more than one-third of household groceries end up in landfills simply because consumers lack immediate ideas for leftover items. **BiteSize v2.0** solves this by:

- **Targeted Ingredient Matching:** Prioritizes recipes maximizing items you already possess (`usedIngredients`) while minimizing extra grocery runs (`missedIngredients`).
- **AI Fridge Vision (Gemini):** Takes camera snaps of fridge or pantry shelves and automatically parses ingredients using multimodal vision AI.
- **Hands-Free Cooking Experience:** Built-in Web Speech & ElevenLabs voice narration so home cooks never have to touch oily or wet phone screens while cooking.
- **Robust Fallbacks:** Designed with a zero-failure philosophy — if external APIs (Spoonacular, Gemini, Firebase) are offline or keys are absent, the application gracefully falls back to authentic curated datasets (including traditional South Asian & global favorites).

---

## 🌐 Live Website Access & Browser Compatibility

The live application is hosted globally on Vercel's high-speed edge network:
👉 **[https://bitesize-recipe-finder.vercel.app](https://bitesize-recipe-finder.vercel.app)**

### Supported Browsers & Tested Versions

BiteSize leverages modern web standards including HTML5 Canvas, WebRTC (`navigator.mediaDevices`), Web Speech API (`SpeechSynthesis`), CSS Grid, and Fetch API. It has been tested and certified on the following browser versions:

| Browser | Desktop Version | Mobile Version | Support Status | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Google Chrome** | v120.0 or newer | v120.0+ (Android) |  **Full Support** | Recommended for fastest AI Vision & Speech synthesis |
| **Mozilla Firefox** | v120.0 or newer | v120.0+ (Android) |  **Full Support** | Full audio & camera support enabled |
| **Apple Safari** | v17.0 or newer (macOS) | v17.0+ (iOS/iPadOS) |  **Full Support** | Camera permission prompt required for Fridge Snap |
| **Microsoft Edge** | v120.0 or newer | v120.0+ (Android/iOS) |  **Full Support** | Chromium-based; optimal performance |
| **Opera / Brave** | Latest Stable | Latest Stable |  **Full Support** | Ensure shields allow camera access for Fridge Snap |

### Required Device Permissions
When using the live website, your browser may request the following standard permissions:
1. **Camera Permission (`video` capture):** Used exclusively when opening the *AI Fridge Scanner* in live camera mode. No video feed is recorded or stored; snapshots are processed purely in-memory.
2. **Audio Output:** Used by *Hands-Free Cook Mode* to read cooking steps aloud.

---

## 💻 Localhost Installation & Setup Guide

If you wish to inspect, develop, or grade the application locally on your computer, follow the comprehensive setup instructions below.

### Required Software & Version Specifications

To run BiteSize locally, the following software must be installed on your system:

| Software | Minimum Version Required | Recommended Version | Verification Command | Download Link |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | `v18.0.0` | `v20.x` (LTS) | `node -v` | [nodejs.org](https://nodejs.org/) |
| **npm** | `v9.0.0` | `v10.x` | `npm -v` | Bundled with Node.js |
| **Git** | `v2.30.0` | Latest | `git --version` | [git-scm.com](https://git-scm.com/) |
| **Web Browser** | Chrome 120+ / Edge 120+ / Firefox 120+ / Safari 17+ | Latest | — | — |

*Operating System Compatibility:* Fully supported on **macOS (Apple Silicon & Intel)**, **Windows 10/11 (Command Prompt, PowerShell, or WSL2)**, and **Linux (Ubuntu 20.04+, Debian, Fedora)**.

---

### Step-by-Step Localhost Setup

#### Step 1: Clone the Repository
Open your terminal (macOS/Linux) or PowerShell/Command Prompt (Windows) and run:
```bash
git clone https://github.com/zionabdullah/bitesize-recipe-finder.git
cd bitesize-recipe-finder
```

#### Step 2: Install Node Dependencies
Install the required project dependencies listed in `package.json`:
```bash
npm install
```
*(Dependencies installed: `express`, `cors`, `dotenv`, `express-rate-limit`, `vercel`)*

#### Step 3: Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
*(On Windows Command Prompt: `copy .env.example .env`)*

Open the `.env` file in your preferred code editor. (See the next section for configuration details).

#### Step 4: Run the Application
You can run the application in either **Development Mode** (with automatic hot-reloading) or **Production Mode**:

- **Option A: Development Mode (Auto-reload on file changes)**
  ```bash
  npm run dev
  ```
  *(Uses Node.js native `--watch` mode)*

- **Option B: Production Mode**
  ```bash
  npm start
  ```

#### Step 5: Open in Your Browser
Once the terminal displays the startup banner:
```text
=======================================================
  BiteSize Web App is running live on http://localhost:3000
  API Proxy Status: Connected
=======================================================
```
Open your web browser and navigate to:
👉 **`http://localhost:3000`**

---

### Environment Variables Configuration

Here is an explanation of all variables available in `.env`:

```env
# Application Port
PORT=3000

# Spoonacular API Key (Optional)
# Obtain a free key from: https://spoonacular.com/food-api
SPOONACULAR_API_KEY=your_spoonacular_key_here

# Google Gemini API Key for AI Fridge Vision (Optional)
# Obtain a free key from: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# ElevenLabs API Key for Neural Voice Synthesis (Optional)
# Defaults to Web Speech API if omitted
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Firebase Web Configuration for Cloud Auth & User Sync (Optional)
# Obtain from your Firebase Console (Project Settings -> General)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### Zero-Config Fallback Mode (Works with 0 API Keys!)
> [!NOTE]
> **No API keys? No problem!**
> The application is engineered with an intelligent **Mock Data Engine**. If you leave the `.env` keys empty:
> 1. Recipe search automatically utilizes the rich, authentic South Asian & Continental mock database (Chicken Bhuna, Dim Bhuna, Masoor Dal, Shorshe Ilish, Garlic Parmesan Pasta, etc.).
> 2. AI Fridge Vision automatically supplies intelligent recognized mock pantry detections.
> 3. Voice guidance falls back to the native browser `window.speechSynthesis`.
> 4. Authentication operates in safe demo fallback or local state.
> 
> **You can test 100% of BiteSize features immediately upon cloning without registering for any third-party service!**

---

## 📖 Step-by-Step User Manual

Welcome to the BiteSize user guide. Follow these step-by-step instructions to explore all primary capabilities.

```
       ┌────────────────────────────────────────────────────────┐
       │                 BiteSize User Workflow                 │
       └──────────────────────────┬─────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
  [Input Ingredients]                               [AI Fridge Snap]
  Type items, select tags,                        Take live photo or upload;
  or click pantry presets                        Gemini auto-detects items
         │                                                 │
         └────────────────────────┬────────────────────────┘
                                  ▼
                     [Smart Virtual Fridge Storage]
                     Items saved to your fridge panel
                                  │
                                  ▼
                   [Find Recipes & Apply Filters]
                   Halal, Vegan, GF + Sort by match %
                                  │
                                  ▼
                   [View Recipe & Macro Breakdown]
                   Calories, protein, ingredients list
                                  │
                                  ▼
                   [Hands-Free Cook Mode (Audio)]
                   Step-by-step voice guidance & timer
```

---

### 1. Ingredient Discovery & Smart Autocomplete
**Purpose:** Quickly tell BiteSize what food items or leftovers you have in your kitchen.

1. Locate the **"My Ingredients"** card in the left sidebar.
2. In the input box (*e.g., "Tomato, Garlic, Eggs..."*), begin typing the name of an item.
3. An **Autocomplete Dropdown** will appear with instant suggestions.
4. Press **Enter**, click the suggestion, or click the **"Add"** button.
5. The ingredient appears as an active interactive chip.
6. **Quick Pantry Presets:** Click any of the one-tap pantry chips (Egg, Onion, Green Chili, Potato, Chicken, Beef, Mustard Oil, Rice, Masoor Dal, etc.) to add staples instantly.
7. To remove an ingredient tag, simply click the small **"×"** icon on any chip, or click **"Clear All"**.

---

### 2. AI Smart Fridge Vision Scanner (Gemini Multimodal)
**Purpose:** Scan your actual refrigerator or pantry shelves using computer vision instead of typing.

1. Click the **"📸 AI Snap"** button in the top navigation bar or the **"Scan"** button in the *Virtual Fridge* card.
2. The **AI Fridge Scanner Modal** will open.
3. Choose your input mode:
   - **Live Camera:** Grants camera stream inside the viewfinder. Aim at your fridge shelf and click **"Capture & Scan Photo"**.
   - **Upload Photo:** Click the upload tab to pick an existing grocery or fridge photo from your device.
4. Watch the laser scanning animation as Google Gemini analyzes the visual scene.
5. Detected ingredients appear under **"Recognized Ingredients"** with confidence tags.
6. Click **"Save Items to My Virtual Fridge"** to automatically import all detected items into your inventory!

---

### 3. Virtual Fridge Inventory Management
**Purpose:** Keep a persistent digital twin of your refrigerator on your device.

1. View the **"My Virtual Fridge"** widget in the sidebar.
2. Items scanned from the camera or manually entered via `+ Add fridge item` are stored here.
3. Click the **"🍳 Cook Now with Fridge Items"** button at any time.
4. BiteSize will instantly populate your active search with everything currently inside your fridge and query recipes that use the highest proportion of your stored food.

---

### 4. Dietary Preferences & Intelligent Sorting
**Purpose:** Tailor meal suggestions to dietary lifestyle and nutritional goals.

1. **Dietary Checkboxes:** Check any combination of preferences:
   - ☪️ **Halal:** Filters for certified halal proteins and preparations.
   - 🌱 **Vegetarian:** Meat-free recipes.
   - 🥬 **Vegan:** 100% plant-based recipes without dairy or eggs.
   - 🌾 **Gluten-Free:** Recipes free from wheat, gluten, or barley.
2. Click **"🍳 Find Recipes Now"**.
3. **Sorting Options:** Use the sort dropdown at the top right of the recipe canvas:
   - **Most Ingredients Matched:** Puts recipes where you own the highest % of ingredients first (minimizes food waste).
   - **Fastest Preparation Time:** Puts 15–20 minute quick meals first.
   - **Lowest Calories:** Sorts by lightest caloric footprint for health-conscious users.

---

### 5. Recipe Details, Macros & Shopping List
**Purpose:** Inspect full recipe guidelines, cooking times, and nutritional breakdowns.

1. Click on any recipe card in the results grid.
2. The **Recipe Details Full Modal** opens with high-resolution imagery and badges.
3. Review the **Nutritional Breakdown Bar:**
   - Total Calories (kcal), Protein (g), Carbohydrates (g), and Healthy Fats (g).
4. Review the **Ingredients Checklist:**
   - Green items represent ingredients you already have.
   - Missed items represent what you need from the grocery store.
   - Click **"📋 Copy List"** to copy the missing ingredients directly to your clipboard for easy grocery shopping.

---

### 6. Hands-Free Cook Mode (Audio Narration & Smart Timer)
**Purpose:** Cook comfortably without touching your screen with messy, floury, or wet hands.

1. Inside any open recipe modal, click **"👨‍🍳 Start Cook Mode (Hands-Free)"**.
2. The application enters the high-contrast, distraction-free **Cook Mode Overlay**.
3. **Audio Voice Assistant:**
   - Click **"🔊 Read Step Aloud"** (or press the **Spacebar**) to have the digital chef narrate the step.
   - Adjust playback speed (0.8x, 1.0x, 1.2x) or select voice accent.
   - Toggle **"Auto-read step change"** for seamless hands-free progression.
4. **Smart Cooking Timer Widget:**
   - BiteSize automatically detects time expressions in the instruction (e.g., *"Simmer on low heat for 15 minutes"*).
   - The timer automatically presets itself to the detected duration.
   - Click **Start (▶)**, **Pause (⏸)**, or add extra time with **+1m** and **+5m** buttons. An audio chime rings upon completion.
5. **Keyboard Navigation:**
   - Press **`→` (Right Arrow)** to go to the next step.
   - Press **`←` (Left Arrow)** to revisit previous steps.
   - Press **`Spacebar`** to pause/resume voice reading.
   - Press **`Esc`** to exit Cook Mode.

---

### 7. User Authentication & Cloud Synchronization
**Purpose:** Save favorite dishes and synchronize your pantry inventory across multiple devices.

1. Click **"👤 Sign In"** in the top navigation bar.
2. In the modal, enter your email and password, or toggle to **"Don't have an account? Sign up"**.
3. Fill in your display name and register.
4. **Email Verification & Password Reset:**
   - Verification emails can be resent directly from the profile screen.
   - Forgot your password? Click **"Forgot password?"** to receive a secure Firebase reset link.
5. **Saving Recipes:**
   - Click the heart icon (❤️) on any recipe card or modal.
   - Click **"❤️ Saved"** in the top navigation to view your collection.
   - Your saved recipes automatically sync with the cloud.
6. **Account Management:**
   - Click your profile avatar to view user details, update your display name, change your password, or permanently delete your account with confirmation.

---

## 🏗️ System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER (SPA)                            │
│   HTML5 Canvas • Tailwind CSS / Stitch Tokens • ES6 Modular JS         │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
          User Actions / REST APIs             Camera / Canvas Stream
                    │                                │
                    ▼                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS.JS PROXY SERVER (Node.js)                  │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Middleware Layer:                                              │   │
│   │ • express-rate-limit (Auth, Search, API limits)                │   │
│   │ • CORS cross-origin configuration                              │   │
│   │ • Body parsers (JSON & URL-encoded up to 10MB)                 │   │
│   │ • Static assets server (public/)                               │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌───────────────────┬───────────────────┬────────────────────────┐   │
│   │  Auth Services    │ Recipe Controller │ AI Vision Controller   │   │
│   │  (Firebase Auth)  │ (Spoonacular)     │ (Google Gemini Vision) │   │
│   └─────────┬─────────┴─────────┬─────────┴────────────┬───────────┘   │
└─────────────┼───────────────────┼──────────────────────┼───────────────┘
              │                   │                      │
              ▼                   ▼                      ▼
     ┌─────────────────┐ ┌─────────────────┐  ┌─────────────────────┐
     │  Firebase Auth  │ │ Spoonacular API │  │ Google Gemini API   │
     │  Cloud Engine   │ │ (or Mock Data)  │  │ (or Mock AI Vision) │
     └─────────────────┘ └─────────────────┘  └─────────────────────┘
```

---

## 📡 API Endpoints & Security Specifications

All backend endpoints are hosted securely on `/api/*` and guarded by **express-rate-limit** to prevent abuse:

| HTTP Method | Route | Rate Limit | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/recipes/search` | 40 req / min | Searches recipes matching query `ingredients` parameter |
| `GET` | `/api/recipes/:id/information` | 40 req / min | Retrieves complete recipe details, nutrition, and steps |
| `GET` | `/api/ingredients/autocomplete` | 120 req / min | Fast ingredient autocomplete based on search query |
| `POST` | `/api/vision/scan-fridge` | 120 req / min | Accepts base64 image data and runs Gemini Vision scan |
| `GET` | `/api/tts` | 40 req / min | Audio voice synthesis stream (ElevenLabs / Web Speech) |
| `POST` | `/api/auth/signup` | 10 req / 15 min | Secure user registration via Firebase Identity Platform |
| `POST` | `/api/auth/signin` | 10 req / 15 min | User authentication returning ID token & refresh token |
| `POST` | `/api/auth/forgot-password` | 10 req / 15 min | Sends password reset email to user |
| `POST` | `/api/auth/update-profile` | 15 req / 15 min | Updates display name or password (requires current pass) |
| `POST` | `/api/auth/delete-account` | 15 req / 15 min | Permanently removes user account from Firebase Auth |
| `GET` | `/api/user/saved-recipes` | 120 req / min | Fetches user's bookmarked recipes |
| `POST` | `/api/user/saved-recipes` | 120 req / min | Syncs / saves a recipe to user profile |

---

## 📁 Project Directory Structure

```text
bitesize-recipe-finder/
├── .env.example              # Template for environment variables
├── .gitignore                # Git exclusion specifications
├── package.json              # Project dependencies, scripts, and engine specs
├── package-lock.json         # Pinned dependency tree
├── server.js                 # Express application, API routes, rate-limits & mock datasets
├── vercel.json               # Serverless deployment configuration for Vercel
├── Design.md                 # UI/UX design specifications & Stitch design tokens
├── README.md                 # Complete project documentation & user manual (This file)
└── public/                   # Static frontend client files
    ├── index.html            # Main semantic HTML5 markup & dialog structures
    ├── style.css             # Stitch Material 3 design tokens & animations
    └── app.js                # Core frontend controller (State, Auth, Speech, AI Vision)
```

---

## 📊 Presentation Checklist (Course Evaluation)

> [!IMPORTANT]
> **Faculty Evaluation Requirement (Carries 10% Mark):**
> 
> When presenting this project in class, ensure the **very last slide** of your presentation includes the following verified links:
> 
> 1. **GitHub Repository Link:**  
>    `https://github.com/zionabdullah/bitesize-recipe-finder`
> 2. **Live Deployed Website Link:**  
>    `https://bitesize-recipe-finder.vercel.app`
> 
> *(Tip: Include a QR code on the final slide linking directly to the live Vercel URL for audience members and faculty to open on their smartphones!)*

---

## 📄 License & Acknowledgments

- **License:** Open-source under the [MIT License](LICENSE).
- **Design Framework:** Google Stitch Material 3 UI Guidelines.
- **Recipe Data & APIs:** Powered by Spoonacular API and Google Gemini Vision.
- **Fonts & Icons:** Google Fonts (Inter) and native UI emojis.

---

<div align="center">
  <b>Built with ❤️ to inspire sustainable home cooking and reduce food waste.</b><br>
  <sub>BiteSize v2.0 • Created by Zion Abdullah & Team Incrip Pyre</sub>
</div>
