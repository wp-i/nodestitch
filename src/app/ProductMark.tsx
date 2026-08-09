export function ProductMark() {
  return (
    <svg className="product-mark" viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <linearGradient id="nodestitch-mark-gradient" x1="4" y1="2" x2="16" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#191B1D" />
          <stop offset="1" stopColor="#0D0F10" />
        </linearGradient>
      </defs>
      <rect x="1.2" y="1.2" width="17.6" height="17.6" rx="5" fill="url(#nodestitch-mark-gradient)" stroke="#3B3E41" strokeWidth="0.8" />
      <path d="M6.2 5.2v9.6" stroke="#D3D4D2" strokeOpacity="0.58" strokeWidth="1.05" strokeLinecap="round" />
      <circle cx="6.2" cy="5.35" r="1.15" fill="#F7F7F4" />
      <circle cx="6.2" cy="10" r="1.15" fill="#F7F7F4" />
      <circle cx="6.2" cy="14.65" r="1.15" fill="#F7F7F4" />
      <path d="M9.2 5.35h5.1M9.2 10h3.9M9.2 14.65h5.6" stroke="#F7F7F4" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
