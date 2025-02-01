# Nema X

## Prerequisites

- Node.js >= 23
- npm
- Twitter Developer Account with OAuth 2.0 credentials

## Setup

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd <project-directory>
npm install
```

2. Copy the .env.example file to .env and fill in the values:
```bash
cp .env.example .env
```

3. Initialize the database:
```bash
npx prisma generate
npx prisma migrate deploy
```

## Development

Start the development server with hot reload:
```bash
npm run dev
```

The first time you run the service:
1. Visit the link in the console to twitter OAuth url
2. Complete the Twitter OAuth flow
3. The service will automatically start posting after authentication

Other useful commands:
```bash
# Run ESLint
npm run lint

# Run ESLint with auto-fix
npm run lint:fix

# Open Prisma Studio (database GUI)
npx prisma studio
```

## Production Build

1. Build the TypeScript code:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run clean` - Clean build directory

## License

MIT
