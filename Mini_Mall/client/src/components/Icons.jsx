export function Icon({ name, size = 20 }) {
  const paths = {
    home: 'M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z',
    grid: 'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z',
    bag: 'M6 8V6a6 6 0 0 1 12 0v2h3l-1 13H4L3 8zm2 0h8V6a4 4 0 0 0-8 0z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5',
    check: 'M4 12.5 9 18 20 6',
    arrow: 'M5 12h14M13 6l6 6-6 6',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}