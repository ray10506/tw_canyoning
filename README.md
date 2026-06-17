# Vue App

A blank Vue 3 + Vite + TypeScript project with Docker support.

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

### Docker Deployment

```bash
docker-compose up
```

The app will be available at [http://localhost:5174](http://localhost:5174).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Configuration

- `VITE_WRA_API_BASE` - Base URL for WRA HydroInfoMobile requests. Defaults to `/api/wra` during Vite dev and `https://gweb.wra.gov.tw/HydroInfoMobile` in production builds. Set this to a production proxy URL if direct WRA requests are blocked by CORS.

## Project Structure

```
├── src/
│   ├── main.ts       # Application entry point
│   ├── App.vue       # Root component
│   └── style.css     # Global styles
├── index.html        # HTML template
├── package.json      # Dependencies
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
├── Dockerfile        # Docker configuration
└── docker-compose.yml # Docker Compose configuration
```

## Technology Stack

- Vue 3
- Vite
- TypeScript
- Tailwind CSS (ready to add)

## License

MIT
