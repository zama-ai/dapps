"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { RainbowKitCustomConnectButton } from "~~/components/helper";
import { useOutsideClick } from "~~/hooks/helper";

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar min-h-0 shrink-0 justify-between z-20 px-4 sm:px-6 py-4 glass-card backdrop-blur-xl">
      {/* Logo Section */}
      <div className="navbar-start">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 bg-[#FFD60A]/20 blur-lg rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            {/* Logo */}
            <div className="relative glass-card p-2 rounded-xl">
              <Image
                src="/favicon.png"
                alt="Zama Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
            </div>
          </div>
          {/* Optional: Zama text */}
          <span className="text-lg font-bold text-[#1d1d1f] hidden sm:block">
            Zama
          </span>
        </Link>
      </div>

      {/* Connect Button */}
      <div className="navbar-end">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
