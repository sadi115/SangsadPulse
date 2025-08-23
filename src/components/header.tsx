'use client';

import Image from 'next/image';
import { LiveClock } from './live-clock';
import { ThemeToggle } from './theme-toggle';

export function Header() {
    return (
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
    )
}
