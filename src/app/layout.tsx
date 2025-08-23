import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/header';


export const metadata: Metadata = {
  title: 'Jatiya Sangsad Digital Service Monitor',
  description: 'Monitor your websites with AI-powered diagnostics.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full">
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
        >
            <div className="flex flex-col min-h-screen bg-secondary/50 dark:bg-background">
                <Header />
                <main className="flex-1">
                 {children}
                </main>
                 <footer className="bg-card border-t py-4">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
                    <p>Developed by Network &amp; Operation Section, Bangladesh Parliament Secretariat</p>
                    </div>
                </footer>
            </div>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
