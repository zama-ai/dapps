import Header from '@/components/Header'
import Link from 'next/link'
import Image from 'next/image'

export default function DAppPage({ params }: { params: { slug: string } }) {
  const dAppTitle = params.slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

  return (
    <>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-16">
        <Link href="/" className="text-black hover:underline mb-4 inline-block">
          &larr; Back to dApps
        </Link>
        <div className="w-full max-w-2xl mx-auto mt-8">
          <div className="bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-8 relative overflow-hidden">
            <h1 className="text-4xl font-bold mb-4 text-gray-800 font-telegraf relative z-10">{dAppTitle}</h1>
            <p className="text-gray-600 relative z-10">
              This is the page for the {dAppTitle} dApp. More details and functionality can be added here.
            </p>
          </div>
        </div>
      </main>
      <footer className="bg-yellow-400 py-6 text-center text-gray-800">
        <p>&copy; 2023 Zama dApps. All rights reserved.</p>
      </footer>
    </>
  )
}

