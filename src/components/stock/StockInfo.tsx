import { Stock } from '@/types/stock';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';

interface StockInfoProps {
  stock: Stock;
}

export default function StockInfo({ stock }: StockInfoProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Company Information</h2>
      
      {stock.description && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h3>
          <p className="text-sm">{stock.description}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <InfoItem label="Market Cap" value={formatCurrency(stock.market_cap)} />
        {stock.industry && <InfoItem label="Industry" value={stock.industry} />}
        {stock.exchange && <InfoItem label="Exchange" value={stock.exchange} />}
        {stock.employees > 0 && <InfoItem label="Employees" value={formatNumber(stock.employees)} />}
        {stock.ceo && <InfoItem label="CEO" value={stock.ceo} />}
        {stock.country && <InfoItem label="Country" value={stock.country} />}
        {stock.ipo_date && <InfoItem label="IPO Date" value={new Date(stock.ipo_date).toLocaleDateString()} />}
      </div>
      
      {stock.website && (
        <div className="pt-4">
          <a 
            href={stock.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center"
          >
            Visit Website
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</h3>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
} 