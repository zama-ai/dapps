"use client";

import dynamic from "next/dynamic";

const ERC7984Demo = dynamic(() => import("./_components/ERC7984Demo").then(m => m.ERC7984Demo), { ssr: false });

export default function Home() {
  return (
    <div className="flex flex-col gap-8 items-center sm:items-start w-full px-3 md:px-0">
      <ERC7984Demo />
    </div>
  );
}
