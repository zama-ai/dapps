import Script from "next/script";
import { AppProviders } from "~~/app/providers";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/helper/getMetadata";

export const metadata = getMetadata({
  title: "Zama Template",
  description: "Built with FHEVM",
});

/**
 * Root Layout
 *
 * Sets up the HTML shell with:
 * - Zama Relayer SDK script (required for FHE operations)
 * - ThemeProvider (dark/light mode)
 * - AppProviders (Privy, Wagmi, FHEVM, React Query)
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        <Script src="https://cdn.zama.org/relayer-sdk-js/0.4.0-4/relayer-sdk-js.umd.cjs" strategy="beforeInteractive" />
        <ThemeProvider enableSystem>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
