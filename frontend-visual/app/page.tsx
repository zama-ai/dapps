import Header from '@/components/Header'
import DAppCard from '@/components/DAppCard'

const dApps = [
  { title: 'EIP-712', slug: 'eip-712' },
  { title: 'ERC-20', slug: 'erc-20' },
  { title: 'Blind auction', slug: 'blind-auction' },
]

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-16">
        <h1 className="text-5xl font-bold mb-16 text-center text-gray-800 font-telegraf-bold">
          Explore <span className="font-telegraf-light">Decentralized Applications</span>
        </h1>
        <div className="max-w-screen-lg mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-16 justify-items-center">
          {dApps.map((dApp) => (
            <DAppCard key={dApp.slug} title={dApp.title} slug={dApp.slug} />
          ))}
        </div>
      </main>
      <footer className="bg-[#ffd209] py-6 text-center text-gray-800 border-t border-black">
        <p>&copy; 2024 Zama dApps. All rights reserved.</p>
      </footer>
    </>
  )
}

