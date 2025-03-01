# StockScreener

> **Note:** This project was 100% generated using [Cursor IDE](https://cursor.sh/) Agent Mode. The entire codebase, including all components, styling, and functionality, was created through AI pair programming.

A modern stock analysis and screening tool for investors, similar to Screener.in. This application allows users to search for stocks, view interactive charts with different time ranges, and access detailed company information.

## Screenshots

### Home Page
![StockScreener Home Page](https://dl.dropboxusercontent.com/scl/fi/26bm0nkmouwk1cpe8vfi0/Screenshot-2025-03-01-at-8.39.02-AM.png?rlkey=qz77g27ioato3a1xu8b2w6xnu)

### Stock Detail Page
![StockScreener Stock Detail](https://dl.dropboxusercontent.com/scl/fi/60evqcvcg5960gthge2ii/Screenshot-2025-03-01-at-8.38.36-AM.png?rlkey=leo8wkcax8dtl9tpevquv6rjj)

## Features

- **Stock Search**: Search for stocks with autocomplete functionality
- **Interactive Charts**: View stock price charts with multiple time ranges (1D, 1W, 1M, 3M, 1Y, 5Y)
- **Company Information**: Access detailed company data including description, sector, market cap, etc.
- **Responsive Design**: Fully responsive UI that works on desktop and mobile devices
- **Redis Caching**: Efficient caching system to reduce API calls and improve performance
- **S3 Backup**: Periodic snapshots of cache data to S3 for persistence and recovery

## Tech Stack

- **Frontend**:
  - Next.js 15 with App Router
  - TypeScript
  - Zustand for state management
  - ShadCN UI + TailwindCSS for styling
  - Recharts for interactive charts

- **API Integration**:
  - Polygon.io API for stock data (with fallback to mock data)

- **Caching & Storage**:
  - Redis for high-performance caching
  - AWS S3 for cache snapshot storage
  - Local filesystem fallback for development

- **CI/CD**:
  - GitHub Actions for continuous integration and deployment
  - Vercel for hosting and production deployment

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Redis server (local or remote)
- AWS account with S3 access (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sandeepkru/screener_clone.git
   cd screener_clone
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   # API Configuration
   NEXT_PUBLIC_POLYGON_API_KEY=your_polygon_api_key
   NEXT_PUBLIC_API_BASE_URL=https://api.polygon.io
   
   # App Configuration
   NEXT_PUBLIC_APP_NAME=StockScreener
   NEXT_PUBLIC_APP_DESCRIPTION=Stock analysis and screening tool for investors.
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # Redis Cache Configuration
   REDIS_URL=redis://localhost:6379
   CACHE_TTL=86400
   SNAPSHOT_INTERVAL=0 0 * * *
   LOCAL_SNAPSHOT_DIR=/tmp/stockscreener-cache
   
   # AWS S3 Configuration (Optional)
   # S3_BUCKET=your-bucket-name
   # S3_REGION=us-east-1
   # AWS_ACCESS_KEY_ID=your_aws_access_key
   # AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   ```

4. Start Redis server (if using local Redis):
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 --name stockscreener-redis redis
   
   # Or use your system's Redis service
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Caching System

The application uses a sophisticated caching system to improve performance and reduce API calls:

- **Redis Cache**: All stock data is cached in Redis with appropriate TTLs based on data type
- **Automatic Snapshots**: Cache data is automatically saved to the filesystem or S3 at configured intervals
- **Cache Recovery**: On startup, the application loads the latest cache snapshot to warm the cache
- **Fallback Mechanism**: If Redis is unavailable, the application falls back to API calls

### Cache Configuration

You can configure the caching behavior through environment variables:

- `REDIS_URL`: Connection string for Redis server
- `CACHE_TTL`: Default TTL for cached items in seconds
- `SNAPSHOT_INTERVAL`: Cron expression for snapshot schedule
- `LOCAL_SNAPSHOT_DIR`: Directory for local cache snapshots
- `S3_BUCKET`: S3 bucket for cache snapshots (optional)
- `S3_REGION`: AWS region for S3 bucket (optional)

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
├── components/           # React components
│   ├── stock/            # Stock-specific components
│   └── ui/               # UI components (ShadCN)
├── lib/                  # Utility functions and API clients
│   ├── api/              # API service functions
│   ├── cache/            # Redis caching system
│   └── utils/            # Helper utilities
├── store/                # Zustand state management
└── types/                # TypeScript type definitions
```

## Future Enhancements

- Backend implementation with FastAPI
- PostgreSQL with TimescaleDB for time-series data
- User authentication and portfolio tracking
- Advanced stock screening with custom filters
- Fundamental analysis tools
- Distributed caching with Redis Cluster
- Real-time data with WebSockets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Polygon.io](https://polygon.io/) for providing stock market data API
- [Screener.in](https://www.screener.in/) for inspiration

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment to Vercel:

### Continuous Integration

On every push to the `main` branch and pull requests:
- Code is checked out
- Dependencies are installed
- Application is built to ensure no build errors

### Continuous Deployment

On every push to the `main` branch:
- Code is automatically deployed to Vercel
- Environment variables are securely passed from GitHub Secrets

### Setting Up Vercel Deployment

1. Create a Vercel account and link your GitHub repository
2. Generate a Vercel token from your account settings
3. Add the following secrets to your GitHub repository:
   - `VERCEL_TOKEN`: Your Vercel API token
   - `NEXT_PUBLIC_POLYGON_API_KEY`: Your Polygon.io API key
   - `NEXT_PUBLIC_API_BASE_URL`: The Polygon.io API base URL
