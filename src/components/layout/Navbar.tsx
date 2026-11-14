import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, ArrowRight, Home } from 'lucide-react';
import { useEstate } from '../../context/EstateContext';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme, currency, toggleCurrency } = useEstate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { label: 'Overview', to: '/' },
    { label: 'Predict Price', to: '/predict' },
    { label: 'Analytics', to: '/analytics' },
    { label: 'Model Insights', to: '/insights' },
    { label: 'History', to: '/history' },
    { label: 'About', to: '/about' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#11151C]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-[#78879B]/20 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title with Coral House Icon */}
        <NavLink
          to="/"
          className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#11151C] dark:text-[#F1F5F9] whitespace-nowrap shrink-0 font-display"
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF7A45] to-[#FF5520] text-white flex items-center justify-center shadow-sm shadow-[#FF632B]/25">
            <Home className="w-4 h-4" />
          </span>
          <span>
            ESTATIQ <span className="text-[#FF632B]">AI</span>
          </span>
        </NavLink>

        {/* Zone 2: Clean single-line typography navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  isActive
                    ? 'text-[#11151C] dark:text-white font-semibold border-[#FF632B]'
                    : 'text-[#5E6D82] dark:text-[#94A3B8] border-transparent hover:text-[#11151C] dark:hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Right-side actions (Currency switch, Sun/Moon pill toggle, Coral Get Started button) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleCurrency}
            className="px-2.5 py-1.5 rounded-full text-xs font-mono font-semibold text-[#11151C] dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 hover:border-[#FF632B] transition-colors whitespace-nowrap shrink-0"
            title="Switch Display Currency (BDT / USD)"
          >
            {currency === 'BDT' ? '৳ BDT' : '$ USD'}
          </button>

          {/* Dual Sun/Moon Theme Pill Toggle matching mockup */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="inline-flex items-center gap-1.5 p-1 rounded-full bg-slate-100 dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 transition-colors shrink-0"
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                theme === 'light'
                  ? 'bg-white text-[#11151C] shadow-sm'
                  : 'text-[#78879B]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </span>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                theme === 'dark'
                  ? 'bg-[#11151C] text-white shadow-sm'
                  : 'text-[#11151C] bg-slate-800/90 text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/predict')}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#FF7A45] to-[#FF5520] hover:from-[#FF632B] hover:to-[#E84310] transition-all whitespace-nowrap shrink-0 shadow-md shadow-[#FF632B]/25"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="p-2 rounded-lg text-[#11151C] dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#FF632B]" />
            ) : (
              <Moon className="w-4 h-4 text-[#5E6D82]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg text-[#11151C] dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-[#78879B]/20 bg-white dark:bg-[#181E27] px-4 py-4 space-y-3">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#FF632B]/15 text-[#FF632B]'
                      : 'text-[#11151C] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#11151C]/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-[#78879B]/20 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleCurrency}
              className="px-3 py-2 rounded-lg text-xs font-mono font-medium text-[#11151C] dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#11151C] border border-slate-200 dark:border-[#78879B]/30"
            >
              Currency: {currency === 'BDT' ? '৳ BDT' : '$ USD'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/predict');
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#FF7A45] to-[#FF5520]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
