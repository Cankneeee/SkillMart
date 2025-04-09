# SkillMart

## The Skills Sharing and Marketplace Platform

A peer-to-peer skills and knowledge web application built with Next.js, React.js and Supabase with OpenAI integration.

## 📋 Project Overview

This repository contains a complete web application with the following components:
- Frontend interface built with Next.js
- Database backend powered by Supabase
- OpenAI API integration for AI features
- Comprehensive documentation and diagrams

## 📊 Documentation

All project documentation can be found in the respective directories:

- **Design Documents**: `/diagrams`
  - Low-fidelity prototype
  - Use case diagrams
  - Entity relationship diagrams
  - Design stage documentation
  - Sequence diagrams

- **Database**: `/schema.sql`
  - Complete database schema for Supabase setup

## 🚀 Getting Started

### Prerequisites

- Node.js and npm installed
- Git
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd my-app
   ```

2. Initialize the project
   ```bash
   pnpm init
   ```

3. Install dependencies
   ```bash
   pnpm install
   ```

4. Set up the database
   ```bash
   # Create a Supabase database using the schema
   # Import the schema from /schema.sql to your Supabase project
   ```

5. Configure environment variables
   ```bash
   # Create a .env.local file
   touch .env.local
   ```

6. Add your API keys to the `.env.local` file
   ```
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## 💻 Development

Start the development server:

```bash
pnpm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000)

## 🏗️ Build

Create a production build:

```bash
pnpm run build
```

## 🌐 Deployment

Start the production server:

```bash
pnpm run start
```

## ⚠️ Important Notes

- Environment files containing API keys are automatically ignored via `.gitignore`
- Never commit sensitive API keys to the repository
- Make sure to set up proper environment variables in your deployment environment


