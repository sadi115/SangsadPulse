import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { LiveClock } from '@/components/live-clock';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';


export const metadata: Metadata = {
  title: 'Bangladesh Parliament - Web Services Status',
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
                 <header className="bg-card border-b sticky top-0 z-10">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                        <Image 
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Emblem_of_the_Jatiya_Sangsad.svg/500px-Emblem_of_the_Jatiya_Sangsad.svg.png"
                            alt="Parliament Logo"
                            width={40}
                            height={40}
                            className="h-10 w-10"
                            data-ai-hint="emblem"
                        />
                        <h1 className="text-xl font-bold text-foreground hidden md:block">
                            Bangladesh Parliament Web Service Monitor System
                        </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <LiveClock />
                            <ThemeToggle />
                        </div>
                    </div>
                    </div>
                </header>
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
