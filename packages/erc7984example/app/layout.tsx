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
 * - ThemeProvider (dark/light mode)
 * - AppProviders (Privy, Wagmi, FHEVM, React Query)
 *
 * Note: Relayer SDK script is automatically loaded by FhevmProvider
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        <ThemeProvider enableSystem>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
