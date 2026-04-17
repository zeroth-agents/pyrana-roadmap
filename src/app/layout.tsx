import type { Metadata } from "next";
import { Archivo, Archivo_Black, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";
import { auth } from "../../auth";
import { Sidebar } from "@/components/sidebar";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Pyrana Roadmap",
  description: "Internal roadmap management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth().catch(() => null);

  return (
    <html
      lang="en"
      className={`${archivo.variable} ${archivoBlack.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon-light.svg" type="image/svg+xml" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon-dark.svg" type="image/svg+xml" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="h-full">
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
          {session ? (
            <div className="flex h-full">
              <Sidebar
                openIdeaCount={0}
                userName={session?.user?.name ?? null}
                userEmail={session?.user?.email ?? null}
              />
              <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
            </div>
          ) : (
            children
          )}
        </ThemeProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
