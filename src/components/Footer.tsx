'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-gray-200 text-gray-600 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Description */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="ImageKit Logo"
                width={120}
                height={28}
                className="h-7 w-auto object-contain"
              />
              <span className="font-bold text-gray-900 text-sm tracking-tight">ImageKit</span>
            </Link>
            <span className="hidden sm:inline text-gray-300">|</span>
            <p className="text-gray-500 text-xs max-w-sm">
              Free, private in-browser image tools. No file uploads or server tracking.
            </p>
          </div>

          {/* Quick Tool Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium">
            <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
              Image Enhancer
            </Link>
            <Link href="/convert" className="text-gray-600 hover:text-blue-600 transition-colors">
              Image Converter
            </Link>
            <Link href="/crop" className="text-gray-600 hover:text-blue-600 transition-colors">
              Crop Image
            </Link>
            <Link href="/resize" className="text-gray-600 hover:text-blue-600 transition-colors">
              Resize Image
            </Link>
          </nav>

          {/* Copyright & Legal */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>© 2026 ImageKit</span>
            <span className="text-gray-300">•</span>
            <span className="hover:text-gray-600 cursor-pointer">Privacy</span>
            <span className="text-gray-300">•</span>
            <span className="hover:text-gray-600 cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
