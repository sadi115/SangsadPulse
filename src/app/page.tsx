import { MonitoringDashboard } from '@/components/monitoring-dashboard';
import { ParliamentLogo } from '@/components/parliament-logo';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <ParliamentLogo className="h-12 w-12" />
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Bangladesh Parliament Web Services Monitoring Dashboard
              </h1>
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
