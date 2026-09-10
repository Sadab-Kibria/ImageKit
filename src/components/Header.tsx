'use client';

import React, { useState } from 'react';
import { ShieldCheck, Upload, RefreshCw, RefreshCcw, Crop, Scaling, Wand2, Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  hasImage: boolean;
  onNewImageClick?: () => void;
  onResetClick?: () => void;
}

const NAV_ITEMS = [
  { href: '/', label: 'Image Enhancer', shortLabel: 'Enhance', icon: Wand2 },
  { href: '/convert', label: 'Image Converter', shortLabel: 'Convert', icon: RefreshCcw },
  { href: '/crop', label: 'Crop Image', shortLabel: 'Crop', icon: Crop },
  { href: '/resize', label: 'Resize Image', shortLabel: 'Resize', icon: Scaling },
];

export const Header: React.FC<HeaderProps> = ({
  hasImage,
  onNewImageClick,
  onResetClick,
}) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isCurrentActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/enhance';
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Brand Logo with Placeholder Image */}
        <Link href="/" className="flex items-center space-x-2.5 flex-shrink-0 group">
          <div className="relative h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="ImageKit Logo"
              width={36}
              height={36}
              priority
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base sm:text-lg tracking-tight text-gray-900 leading-tight">
              Image<span className="text-blue-600">Kit</span>
            </span>
          </div>
        </Link>

        {/* Center / Right: Desktop Navigation Structure */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {NAV_ITEMS.map((item) => {
            const active = isCurrentActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer ${active
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Quick Actions & Privacy Indicator */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* 100% Local Privacy Badge */}
          <div
            className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs cursor-default font-medium group relative"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Local Privacy</span>
          </div>

          {/* Quick Actions when image is loaded */}
          {hasImage && (
            <div className="flex items-center space-x-2">
              {onResetClick && (
                <button
                  onClick={onResetClick}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
                  title="Reset tool adjustments"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}

              {onNewImageClick && (
                <button
                  onClick={onNewImageClick}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                  title="Choose a different image"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>New Image</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1 shadow-md">
          {NAV_ITEMS.map((item) => {
            const active = isCurrentActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${active
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
