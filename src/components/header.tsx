
'use client';

import Image from 'next/image';
import { LiveClock } from './live-clock';
import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';

export function Header() {
    return (
        <header className="bg-card border-b sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-4">
                <Link href="https://www.parliament.gov.bd/" target="_blank" rel="noopener noreferrer">
                    <Image 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Emblem_of_the_Jatiya_Sangsad.svg/500px-Emblem_of_the_Jatiya_Sangsad.svg.png"
                        alt="Parliament Logo"
                        width={40}
                        height={40}
                        className="h-10 w-10"
                        data-ai-hint="emblem"
                    />
                </Link>
                <div className="hidden md:flex flex-col">
                    <h1 className="text-xl font-bold text-foreground leading-tight">
                        SangsadPulse
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Bangladesh Parliament Uptime Monitor
                    </p>
                </div>
                </div>
                <div className="flex items-center gap-4">
                    <LiveClock />
                    <ThemeToggle />
                </div>
            </div>
            </div>
        </header>
    )
}
