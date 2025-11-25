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
    <div className="sticky lg:static top-0 navbar min-h-0 shrink-0 justify-between z-20 px-4 sm:px-6 py-4 bg-[#F4F4F4] border-b border-[#2D2D2D]">
      {/* Logo Section */}
      <div className="navbar-start">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            {/* Logo */}
            <div className="relative bg-[#E8E8E8] border border-[#2D2D2D] p-2">
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
          <span className="text-lg font-bold text-[#A38025] hidden sm:block">
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
