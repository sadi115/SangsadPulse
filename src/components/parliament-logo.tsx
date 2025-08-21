import * as React from 'react';

export function ParliamentLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="100"
      height="100"
      {...props}
    >
      <path
        fill="#006a4e"
        d="M50 2a48 48 0 100 96 48 48 0 000-96zm0 8a40 40 0 110 80 40 40 0 010-80z"
      />
      <circle cx="50" cy="50" r="28" fill="#f42a41" />
      <path
        fill="#ffffff"
        d="M50 25l-5.3 10.9-12 .4 9.8 7.3-3.6 11.4L50 48.2l9.1 6.8-3.6-11.4 9.8-7.3-12-.4z"
      />
      <path
        fill="#ffffff"
        d="M39.3 62.1l-2.6-4.5-5.2.9 4.2 3.5-1.4 5.2 4.8-2.8 4.8 2.8-1.4-5.2 4.2-3.5-5.2-.9zM60.7 62.1l-2.6-4.5-5.2.9 4.2 3.5-1.4 5.2 4.8-2.8 4.8 2.8-1.4-5.2 4.2-3.5-5.2-.9z"
      />
    </svg>
  );
}
