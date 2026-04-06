# Filely - iOS App (Expo/React Native)

> The most affordable AI Finance Tracker in the UAE. VAT compliance for the price of a Karak.

## Quick Start

### Prerequisites
1. **Node.js 18+** installed on your computer
2. **Expo Go** app installed on your iPhone (free from App Store)
3. **Expo account** - Sign up at https://expo.dev

### Step 1: Install Expo CLI
```bash
npm install -g eas-cli expo-cli
```

### Step 2: Setup the project
```bash
cd filely-mobile
npm install
```

### Step 3: Login to Expo
```bash
eas login
```

### Step 4: Test on your iPhone
```bash
npx expo start
```
- Scan the QR code with your iPhone camera
- It opens in **Expo Go** app
- Test all features live!

---

## Deploy to App Store

### Prerequisites for App Store
1. **Apple Developer Account** ($99/year) - https://developer.apple.com
2. **Expo account** (free) - https://expo.dev

### Step 1: Configure your app
Edit `app.json`:
- Change `expo.ios.bundleIdentifier` to your unique ID (e.g., `com.yourcompany.filely`)
- Update `expo.name` and `expo.slug`

Edit `eas.json`:
- Replace `appleId` with your Apple ID email
- Replace `appleTeamId` with your Apple Developer Team ID
- Replace `ascAppId` with your App Store Connect app ID

### Step 2: Build for iOS (No Mac needed!)
```bash
eas build --platform ios --profile production
```
This builds your app **in the cloud** using EAS Build. No Mac required!

### Step 3: Submit to App Store
```bash
eas submit --platform ios --profile production
```
This submits directly to App Store Connect for review.

---

## Project Structure
```
filely-mobile/
├── App.js                          # Entry point + Tab Navigation
├── app.json                        # Expo configuration
├── eas.json                        # EAS Build/Submit config
├── package.json                    # Dependencies
├── babel.config.js                 # Babel config
├── assets/                         # App icon & splash screen
│   ├── icon.png                    # App icon (1024x1024)
│   ├── splash.png                  # Splash screen (1284x2778)
│   └── adaptive-icon.png           # Android adaptive icon
└── src/
    ├── api/
    │   └── client.js               # API client (connects to backend)
    ├── screens/
    │   ├── HomeScreen.js            # Dashboard + Fili mascot
    │   ├── ChatScreen.js            # AI Chat + Receipt scanner
    │   ├── TeamScreen.js            # Team Hub + Chat room
    │   ├── FilesScreen.js           # Files Vault + Export
    │   └── SettingsScreen.js        # Settings + Model switcher
    └── theme/
        └── colors.js               # Color system (light/dark)
```

## Features
- **5-Tab Navigation**: Home, Chat, Team, Files, Settings
- **AI Chat**: Gemini-powered expense parsing & receipt OCR
- **Camera Integration**: Scan receipts with iPhone camera
- **Files Vault**: Edit name/category/amount, view edit history
- **PDF Export**: Filter by date, amount, category
- **Team Hub**: Activity feed + real-time team chat
- **Dark Mode**: Automatic or manual toggle
- **Fili Mascot**: 🦅 AI falcon companion

## Backend API
The app connects to your hosted backend at:
```
https://vat-tracker-ae.preview.emergentagent.com/api
```

To change the API URL, edit `src/api/client.js`:
```javascript
const API_BASE = 'https://your-backend-url.com/api';
```

## App Store Assets Needed
Before submitting, you'll need to create:
1. **App Icon** (1024x1024px) - Replace `assets/icon.png`
2. **Splash Screen** (1284x2778px) - Replace `assets/splash.png`
3. **Screenshots** (6.7" and 5.5" iPhone) for App Store listing
4. **App Description** for App Store Connect

### Suggested App Store Description:
> **Filely - UAE Finance Tracker**
>
> The most affordable AI Finance Tracker in the UAE. VAT compliance for the price of a Karak.
>
> Features:
> • AI-powered receipt scanning (just snap a photo!)
> • Automatic 5% UAE VAT calculation
> • Smart expense categorization
> • Team collaboration & shared chat
> • Audit-ready PDF export
> • 5-year data vault for UAE compliance
>
> Plans:
> • Basic: 6.99 AED/mo - 50 AI Scans
> • Elite: 9.99 AED/mo - 150 AI Scans + Team + Export

## Important Notes
- The app requires an internet connection to communicate with the backend API
- Camera permissions are requested for receipt scanning
- All financial data is stored securely on your backend server
- The app supports iOS 15+ and iPad
