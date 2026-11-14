import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6">
      <div className="text-6xl font-extrabold font-mono text-[#FF6B4A]">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-[#11151C] dark:text-[#F1F5F9] font-display">
        Property Coordinate Not Found
      </h1>
      <p className="text-sm text-[#5E6D82] dark:text-[#94A3B8] max-w-md mx-auto">
        The route you requested does not exist in the ESTATIQ AI valuation platform. Return to the
        command overview or launch a new property valuation.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#11151C] dark:text-slate-200 bg-slate-100 dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF6B4A] hover:bg-[#E85838]"
        >
          <Home className="w-4 h-4" />
          <span>Return to Overview</span>
        </button>
      </div>
    </div>
  );
};
