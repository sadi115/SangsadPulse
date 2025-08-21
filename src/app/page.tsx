import { MonitoringDashboard } from '@/components/monitoring-dashboard';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import { LiveClock } from '@/components/live-clock';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-center h-24">
            <div className="absolute top-1/2 left-0 -translate-y-1/2">
                <LiveClock />
            </div>
            <div className="flex flex-col items-center gap-2">
               <Image 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Emblem_of_the_Jatiya_Sangsad.svg/500px-Emblem_of_the_Jatiya_Sangsad.svg.png"
                alt="Parliament Logo"
                width={40}
                height={40}
                className="h-10 w-10"
                data-ai-hint="emblem"
              />
              <h1 className="text-lg md:text-xl font-bold text-foreground text-center">
                Bangladesh Parliament Web Services Monitoring Dashboard
              </h1>
            </div>
            <div className="absolute top-1/2 right-0 -translate-y-1/2">
                <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <MonitoringDashboard />
      </main>
      <footer className="bg-card border-t py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>Developed by Network & Operation Section, Bangladesh Parliament</p>
        </div>
      </footer>
    </div>
  );
}
