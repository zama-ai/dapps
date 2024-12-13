import Link from "next/link"
import { ConnectButton } from "./ConnectButton"

export default function Header() {
  return (
    <header className="bg-[#ffd209] border-b border-black">
      <div className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Link href="/" className="text-3xl font-bold font-telegraf-bold uppercase text-gray-800">
          Zama dApps
        </Link>
        <ConnectButton />
      </div>
    </header>
  )
}

