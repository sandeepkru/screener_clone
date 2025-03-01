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

## Tech Stack

- **Frontend**:
  - Next.js 15 with App Router
  - TypeScript
  - Zustand for state management
  - ShadCN UI + TailwindCSS for styling
  - Recharts for interactive charts

- **API Integration**:
  - Polygon.io API for stock data (with fallback to mock data)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

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
   NEXT_PUBLIC_POLYGON_API_KEY=your_polygon_api_key
   NEXT_PUBLIC_API_BASE_URL=https://api.polygon.io
   NEXT_PUBLIC_APP_NAME=StockScreener
   NEXT_PUBLIC_APP_DESCRIPTION=Stock analysis and screening tool for investors in India.
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
├── components/           # React components
│   ├── stock/            # Stock-specific components
│   └── ui/               # UI components (ShadCN)
├── lib/                  # Utility functions and API clients
│   ├── api/              # API service functions
│   └── utils/            # Helper utilities
├── store/                # Zustand state management
└── types/                # TypeScript type definitions
```

## Future Enhancements

- Backend implementation with FastAPI
- PostgreSQL with TimescaleDB for time-series data
- Redis for caching
- User authentication and portfolio tracking
- Advanced stock screening with custom filters
- Fundamental analysis tools

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Polygon.io](https://polygon.io/) for providing stock market data API
- [Screener.in](https://www.screener.in/) for inspiration
