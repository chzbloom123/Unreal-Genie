# Unreal Genie

A personal comic and graphic novel hosting platform built with React, TypeScript, and Firebase.

## Features

### Public Viewer
- **Browse Comics**: View all series with filtering by format (Graphic Novel / 4-Panel)
- **Series Landing Pages**: Cover images, descriptions, status badges, and page counts
- **Dual Display Modes**:
  - **Graphic Novel Mode**: Full-width, vertically centered for high-resolution spreads
  - **4-Panel Strip Mode**: Constrained horizontal container for classic strip aspect ratio
- **Page Navigation**:
  - Previous/Next buttons with boundary detection
  - Jump-to-Page input with validation
  - Keyboard navigation (Arrow keys)
  - Touch swipe gestures on mobile
- **Mobile Experience**: Vertical scroll mode for graphic novels on small screens
- **Deep Linking**: Every page has a unique URL (`/comic/{series-id}/{page-number}`)
- **Accessibility**: Alt text and transcripts for screen readers and SEO
- **Performance**: Image pre-fetching, WebP compression, skeleton loading states

### Admin Dashboard
- **Firebase Authentication**: Secure login for site owner
- **Series Management**:
  - Create new series with auto-generated URL slugs
  - Edit series details (title, description, format, status, content warnings)
  - Upload cover images (auto-converted to WebP)
  - Delete series with confirmation
  - Series ID locked after first page publication
- **Page Management**:
  - Single page upload with metadata (alt text, transcript, artist notes)
  - Bulk upload with filename-based auto-sorting
  - Drag-and-drop page reordering
  - Page deletion with confirmation
  - Thumbnail grid view

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router v6
- **Backend**: Firebase
  - Firestore (database)
  - Storage (image hosting)
  - Authentication (admin access)
- **Drag & Drop**: @dnd-kit

## Project Structure

```
src/
├── admin/              # Admin dashboard components
│   ├── AdminLayout.tsx
│   ├── AdminDashboard.tsx
│   ├── SeriesManager.tsx
│   ├── PageManager.tsx
│   └── LoginPage.tsx
├── viewer/             # Public viewer components
│   ├── ViewerLayout.tsx
│   ├── HomePage.tsx
│   ├── SeriesLandingPage.tsx
│   └── ComicViewerPage.tsx
├── services/           # Firebase services
│   ├── firebase.config.ts
│   ├── series.service.ts
│   └── pages.service.ts
├── hooks/              # Custom React hooks
│   └── useAuth.tsx
├── types/              # TypeScript types
│   └── index.ts
├── components/ui/      # shadcn/ui components
└── App.tsx            # Main app with routing
```

## Setup Instructions

### 1. Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable the following services:
   - **Firestore Database**: Create database in production mode
   - **Storage**: Create default bucket
   - **Authentication**: Enable Email/Password provider

3. Create an admin user in Firebase Authentication

4. Get your Firebase config from Project Settings → General → Your apps

### 2. Local Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd unreal-genie

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase credentials

# Run development server
npm run dev
```

### 3. Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Firebase Security Rules

#### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access to all series and pages
    match /series/{seriesId} {
      allow read: if true;
      allow write: if request.auth != null;
      
      match /pages/{pageId} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
  }
}
```

#### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /comics/{seriesId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 5. Build and Deploy

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy
```

## Data Schema

### Series Document

```typescript
{
  series_id: string;           // URL-safe slug (document ID)
  title: string;               // Display title
  description: string;         // Series synopsis
  formatType: 'graphic_novel' | '4_panel';
  coverImageUrl: string;       // Firebase Storage URL
  status: 'ongoing' | 'completed';
  totalPageCount: number;
  contentWarnings?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Page Document (sub-collection)

```typescript
{
  page_id: string;             // Auto-generated (document ID)
  pageNumber: number;          // Sequential page number
  imageUrl: string;            // Firebase Storage URL (WebP)
  altText?: string;            // Accessibility description
  transcript?: string;         // Text content for SEO/screen readers
  artistNotes?: string;        // Private notes
  uploadedAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Storage Structure

```
/comics
  /{series_id}
    /cover.webp
    /001.webp
    /002.webp
    /003.webp
    ...
```

## URL Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with all series |
| `/series/:seriesId` | Series landing page |
| `/comic/:seriesId/:pageNumber` | Comic viewer |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard |
| `/admin/series` | Series management |
| `/admin/pages` | Page management |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` | Previous page |
| `→` | Next page |

## Mobile Gestures

| Gesture | Action |
|---------|--------|
| Swipe Left | Next page |
| Swipe Right | Previous page |

## Development Notes

- Images are automatically converted to WebP format on upload
- Page numbers are automatically assigned but can be overridden
- Series ID cannot be changed after the first page is published
- Drag-and-drop page reordering automatically renumbers all affected pages

## License

MIT License - feel free to use this project as a template for your own comic hosting site.
