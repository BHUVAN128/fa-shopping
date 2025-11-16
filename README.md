# FA Shopping - Modern Shop Management System

A complete shop management system built with React, TypeScript, and Supabase.

## Features

- 📊 Dashboard with real-time statistics
- 👥 Customer management with purchase history
- 📦 Product inventory with stock tracking
- 💰 Sales tracking and reporting
- 🔐 Secure authentication with Supabase Auth

## Technologies

- **Frontend**: Vite + React + TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router
- **State Management**: React Query

## Getting Started

### Prerequisites

- Node.js 18+ (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://ghslhaunestutrbthopk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoc2xoYXVuZXN0dXRyYnRob3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNzU0NDUsImV4cCI6MjA3ODg1MTQ0NX0.tUF2kisaRgJaKtLsvr6zNOow3NRjN6BR8InrNAVW3Sc
```

4. Start the development server:
```sh
npm run dev
```

The app will be available at `http://localhost:8080`

### Building for Production

```sh
npm run build
```

The built files will be in the `dist` directory.

### Database Schema

The project uses the following Supabase tables:
- `customers` - Customer information
- `products` - Product inventory
- `sales` - Sales transactions
- `sale_items` - Individual items in each sale

See `supabase/migrations/` for the complete schema definition.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── lib/           # Utilities and Supabase client
├── hooks/         # Custom React hooks
└── integrations/  # Third-party integrations
```
