import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-[#78879B]/20 bg-white dark:bg-[#11151C] py-10 mt-16 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-[#5E6D82] dark:text-[#94A3B8]">
          <span className="font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
            ESTATIQ <span className="text-[#FF6B4A]">AI</span>
          </span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>Predict Smarter. Invest Better.</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="text-xs">Trained on 545 Residential Property Records</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#5E6D82] dark:text-[#94A3B8]">
          <Link to="/" className="hover:text-[#FF6B4A] dark:hover:text-[#FF6B4A] transition-colors">
            Overview
          </Link>
          <Link to="/predict" className="hover:text-[#FF6B4A] dark:hover:text-[#FF6B4A] transition-colors">
            Predict Price
          </Link>
          <Link to="/results" className="hover:text-[#FF6B4A] dark:hover:text-[#FF6B4A] transition-colors">
            Valuation Results
          </Link>
          <Link to="/analytics" className="hover:text-[#FF6B4A] dark:hover:text-[#FF6B4A] transition-colors">
            Dataset Analytics
          </Link>
          <Link to="/insights" className="hover:text-[#FF6B4A] dark:hover:text-[#FF6B4A] transition-colors">
            Model Insights
          </Link>
          <Link to="/history" className="hover:text-[#FF6B4A] dark:hover:text-[#FF6B4A] transition-colors">
            History
          </Link>
          <Link to="/about" className="hover:text-[#FF6B4A] dark:hover:text-[#FF6B4A] transition-colors">
            About
          </Link>
        </div>
      </div>
    </footer>
  );
};
