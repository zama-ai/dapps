import Link from 'next/link'
import Image from 'next/image'

interface DAppCardProps {
  title: string
  slug: string
}

export default function DAppCard({ title, slug }: DAppCardProps) {
  return (
    <Link href={`/dapps/${slug}`} className="block">
      <div className="w-64 h-64 border border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-none p-4 flex flex-col justify-between relative overflow-hidden transition-shadow">
        <Image
          src="/test.png"
          alt="Background pattern"
          width={256}
          height={256}
          
          className="absolute inset-0 object-cover opacity-10"
        />
        <h2 className="text-xl font-semibold font-telegraf-bold text-gray-800 relative z-10">{title}</h2>
        <div className="flex items-center text-black relative z-10">
          <span className="text-sm">Explore</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

