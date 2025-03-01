'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Company } from '@/types';

interface CompanyDetailsProps {
  company: Company;
}

export const CompanyDetails: React.FC<CompanyDetailsProps> = ({ company }) => {
  // Format market cap for display
  const formatMarketCap = (marketCap: number | undefined) => {
    if (!marketCap) return 'N/A';
    
    if (marketCap >= 1_000_000_000_000) {
      return `$${(marketCap / 1_000_000_000_000).toFixed(2)}T`;
    } else if (marketCap >= 1_000_000_000) {
      return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
    } else if (marketCap >= 1_000_000) {
      return `$${(marketCap / 1_000_000).toFixed(2)}M`;
    } else {
      return `$${marketCap.toLocaleString()}`;
    }
  };
  
  // Format employees for display
  const formatEmployees = (employees: number | undefined) => {
    if (!employees) return 'N/A';
    return employees.toLocaleString();
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Company Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold">{company.name}</h3>
            <p className="text-sm text-gray-500">{company.symbol} • {company.exchange}</p>
          </div>
          
          <div>
            <p className="text-sm leading-relaxed">{company.description || 'No description available.'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Sector</h4>
              <p>{company.sector || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Industry</h4>
              <p>{company.industry || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Market Cap</h4>
              <p>{formatMarketCap(company.marketCap)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Employees</h4>
              <p>{formatEmployees(company.employees)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">CEO</h4>
              <p>{company.ceo || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Website</h4>
              <p>
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  'N/A'
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 