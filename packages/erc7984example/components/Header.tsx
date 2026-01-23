"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { PrivyConnectButton } from "~~/components/helper/PrivyConnectButton";
import { useOutsideClick } from "~~/hooks/helper";

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  const navLinks = [
    { href: "/", label: "ERC7984" },
    { href: "/public-decrypt", label: "Public Decrypt" },
    { href: "/benchmark", label: "Benchmark" },
  ];

  return (
    <div className="sticky lg:static top-0 navbar min-h-0 shrink-0 justify-between z-20 px-4 sm:px-6 py-4 bg-[#F4F4F4] border-b border-[#2D2D2D]">
      {/* Logo Section */}
      <div className="navbar-start">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            {/* Logo */}
            <div className="relative bg-[#E8E8E8] border border-[#2D2D2D] p-2">
              <Image src="/favicon.png" alt="Zama Logo" width={32} height={32} className="w-8 h-8" />
            </div>
          </div>
          {/* Optional: Zama text */}
          <span className="text-lg font-bold text-[#A38025] hidden sm:block">Zama</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal px-1 gap-2">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-medium hover:bg-[#E8E8E8] px-3 py-2 rounded"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Connect Button */}
      <div className="navbar-end">
        <PrivyConnectButton />
      </div>
    </div>
  );
};
