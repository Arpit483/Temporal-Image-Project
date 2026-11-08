import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Satellite,
  PlaySquare,
  BarChart2,
  ListOrdered,
  FileQuestion,
  HelpCircle,
  Menu,
  X,
  SplitSquareVertical,
  Sun,
  Moon,
} from 'lucide-react';
import type { HealthInfo } from '../types';

interface NavbarProps {
  health?: HealthInfo;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, theme = 'dark', onToggleTheme }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Predict', icon: Satellite },
    { to: '/viewer', label: 'Viewer', icon: PlaySquare },
    { to: '/difference', label: 'Difference Map', icon: SplitSquareVertical },
    { to: '/results', label: 'Results', icon: BarChart2 },
    { to: '/sequence', label: 'Sequence', icon: ListOrdered },
    { to: '/insat', label: 'INSAT', icon: FileQuestion },
    { to: '/about', label: 'About', icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ff-border)] bg-[var(--ff-workspace)] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Operational Identifier */}
          <div className="flex items-center gap-3.5">
            <NavLink
              to="/"
              className="flex items-center gap-2.5 focus:outline-none group"
              aria-label="FrameFill Home"
            >
              <div className="w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-xs bg-[var(--ff-panel)] border border-[var(--ff-border)] text-[var(--ff-accent)] group-hover:border-[var(--ff-accent)] transition-colors">
                FF
              </div>
              <span className="font-semibold text-base tracking-tight text-[var(--ff-text)]">
                FrameFill
              </span>
            </NavLink>
            <div className="h-4 w-px bg-[var(--ff-border)] hidden sm:block" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ff-text-secondary)]">
              <span className="w-2 h-2 rounded-full bg-[var(--ff-observed)]" />
              GOES-19 ABI Band 13 (10.3 µm)
            </span>
          </div>

          {/* Desktop Navigation - Clean workstation tab bar with comfortable font size */}
          <nav className="hidden md:flex items-center h-full space-x-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `h-full flex items-center gap-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                      isActive
                        ? 'border-[var(--ff-accent)] text-[var(--ff-text)] bg-[var(--ff-panel-subtle)] font-semibold'
                        : 'border-transparent text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)] hover:bg-[var(--ff-panel-subtle)]/60'
                    }`
                  }
                >
                  <Icon size={15} className="shrink-0 opacity-80" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Status Bar & Theme Controls (AI removed here, kept down) */}
          <div className="flex items-center gap-2.5">
            {health && (
              <div
                className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono border border-[var(--ff-border)] bg-[var(--ff-panel)] text-[var(--ff-text-secondary)]"
                title={`Device: ${health.device} | Engine: ${health.rife_available ? 'RIFE v4.22 + DIS' : 'DIS only'}`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: health.status === 'ok' ? 'var(--ff-observed)' : 'var(--ff-error)',
                  }}
                />
                <span className="font-medium">{health.device.toUpperCase()}</span>
                <span className="text-[var(--ff-border)]">·</span>
                <span style={{ color: health.rife_available ? 'var(--ff-observed)' : 'var(--ff-synthetic)' }}>
                  {health.rife_available ? 'RIFE+DIS' : 'DIS'}
                </span>
              </div>
            )}

            {/* Theme Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-2 rounded text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)] hover:bg-[var(--ff-panel)] border border-[var(--ff-border)] transition-colors focus:outline-none"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)] border border-[var(--ff-border)]"
              aria-label="Open mobile menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--ff-border)] bg-[var(--ff-panel)] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded text-sm ${
                    isActive
                      ? 'bg-[var(--ff-workspace)] text-[var(--ff-accent)] font-semibold border border-[var(--ff-border)]'
                      : 'text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)]'
                  }`
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Navbar;
