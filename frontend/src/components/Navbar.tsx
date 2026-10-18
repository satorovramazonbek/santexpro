import React, { useState, useRef, useEffect } from 'react';
import { 
  Flame, 
  FolderKanban, 
  Calculator, 
  LogOut, 
  LogIn, 
  FileSpreadsheet, 
  Layers, 
  ShieldCheck, 
  ChevronDown,
  User as UserIcon,
  Sparkles,
  Menu,
  X,
  Compass
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenLogin,
  onLogout
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Position and dimension of the sliding liquid glass capsule
  const [capsuleStyle, setCapsuleStyle] = useState({
    left: 0,
    width: 0,
    height: 0,
    opacity: 0,
  });

  // Map sub-pages to primary nav tabs
  const primaryTab = ['projects', 'project-detail', 'room-editor', 'materials'].includes(activeTab) 
    ? 'projects' 
    : activeTab;

  const updateCapsulePosition = () => {
    const btn = buttonRefs.current[primaryTab];
    const container = navContainerRef.current;
    if (btn && container) {
      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setCapsuleStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
        height: btnRect.height,
        opacity: 1,
      });
    }
  };

  useEffect(() => {
    updateCapsulePosition();
    window.addEventListener('resize', updateCapsulePosition);
    return () => window.removeEventListener('resize', updateCapsulePosition);
  }, [primaryTab, currentUser]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { key: 'dashboard', label: 'Boshqaruv paneli', icon: FolderKanban },
    { key: 'projects', label: 'Loyihalar', icon: Layers },
    { key: 'quick-calc', label: 'Tezkor hisoblagich', icon: Calculator },
    { key: 'catalog', label: 'Каталог оборудования', icon: FileSpreadsheet },
  ];


  if (currentUser && (currentUser.is_staff || currentUser.is_superuser)) {
    navItems.push({ key: 'admin', label: 'Sayt Admin Paneli', icon: ShieldCheck });
  }

  return (
    <header className="liquid-glass-header sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none group" 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-amber-300 fill-amber-300/40" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Santex<span className="text-blue-600">Pro</span>
                </span>
                <span className="text-[10px] font-bold bg-blue-100/80 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200/60 shadow-2xs">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Professional HVAC & Santexnika Loyihalash
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (with Sliding Liquid Glass Capsule) */}
          <nav 
            ref={navContainerRef}
            className="hidden md:flex items-center p-1 rounded-full liquid-glass-nav-track relative"
          >
            {/* Sliding Liquid Glass Capsule (Spring glide animation) */}
            <div
              className={`absolute rounded-full pointer-events-none transition-all duration-300 ease-out ${
                primaryTab === 'admin' ? 'liquid-glass-capsule-admin' : 'liquid-glass-capsule'
              }`}
              style={{
                transform: `translateX(${capsuleStyle.left}px)`,
                width: `${capsuleStyle.width}px`,
                height: `${capsuleStyle.height}px`,
                opacity: capsuleStyle.opacity,
              }}
            />

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = primaryTab === item.key;
              const isAdminTab = item.key === 'admin';

              return (
                <button
                  key={item.key}
                  ref={(el) => {
                    buttonRefs.current[item.key] = el;
                  }}
                  onClick={() => setActiveTab(item.key)}
                  className={`relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 select-none ${
                    isActive
                      ? isAdminTab
                        ? 'text-white'
                        : 'text-blue-700'
                      : isAdminTab
                        ? 'text-indigo-700 hover:text-indigo-900'
                        : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? (isAdminTab ? 'text-white' : 'text-blue-600') : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Controls & Liquid Glass Dropdown Menu */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full liquid-glass-nav-track hover:bg-white/80 transition-all cursor-pointer group shadow-2xs"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {(currentUser.first_name || currentUser.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left text-xs leading-tight">
                    <div className="font-bold text-slate-800 line-clamp-1 max-w-[110px]">
                      {currentUser.first_name || currentUser.username}
                    </div>
                    <div className="text-[10px] text-blue-600 font-semibold">
                      {currentUser.is_superuser || currentUser.is_staff ? "Admin" : "Usta-muhandis"}
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Liquid Glass Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 rounded-2xl liquid-glass-menu p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2.5 border-b border-slate-200/60 mb-1">
                      <div className="font-bold text-slate-900 text-sm">
                        {currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}` : currentUser.username}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">@{currentUser.username}</div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {currentUser.is_superuser || currentUser.is_staff ? "Tizim Administratori" : "Faol Usta-Muhandis"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5 text-xs font-medium text-slate-700">
                      <button
                        onClick={() => { setActiveTab('projects'); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/80 text-left transition-colors"
                      >
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span>Mening loyihalarim</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('quick-calc'); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/80 text-left transition-colors"
                      >
                        <Calculator className="w-4 h-4 text-blue-600" />
                        <span>Tezkor hisoblagich</span>
                      </button>

                      {currentUser && (currentUser.is_staff || currentUser.is_superuser) && (
                        <button
                          onClick={() => { setActiveTab('admin'); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-indigo-50 text-indigo-800 font-semibold text-left transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>Sayt Admin Paneli</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-1 pt-1 border-t border-slate-200/60">
                      <button
                        onClick={() => { onLogout(); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 font-semibold text-left text-xs transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Tizimdan chiqish</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-full transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Kirish</span>
              </button>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl liquid-glass-nav-track text-slate-700 hover:text-slate-900 transition-colors"
              aria-label="Menyu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer (Liquid Glass) */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col gap-1 p-2 rounded-2xl liquid-glass-menu">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = primaryTab === item.key;
                const isAdminTab = item.key === 'admin';

                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveTab(item.key);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? isAdminTab
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-blue-600 text-white shadow-xs'
                        : isAdminTab
                          ? 'text-indigo-700 hover:bg-indigo-50 font-bold'
                          : 'text-slate-700 hover:bg-white/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
