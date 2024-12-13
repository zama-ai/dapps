import './globals.css'


export const metadata = {
  title: 'Zama dApps',
  description: 'Explore decentralized applications on Zama',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" >
      <body className={`bg-[#ffd209] font-telegraf`}>
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}

