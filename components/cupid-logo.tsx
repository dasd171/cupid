export function CupidLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 28S4 19.5 4 11.8C4 7.6 7.3 4.5 11.2 4.5c2 0 3.7 1 4.8 2.6 1.1-1.6 2.8-2.6 4.8-2.6 3.9 0 7.2 3.1 7.2 7.3C28 19.5 16 28 16 28Z"
        fill="url(#cupidHeart)"
      />
      <path
        d="M22.5 9.5 27 5m0 0h-3.2M27 5v3.2"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="cupidHeart"
          x1="4"
          y1="4.5"
          x2="28"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fb7185" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
      </defs>
    </svg>
  );
}
