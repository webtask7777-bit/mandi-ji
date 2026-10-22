const GREEN = '#244f3b';
const GOLD = '#c79b46';
const CREAM = '#f5edda';

/** Small, deliberately geometric agricultural marks for the calendar stages. */
export default function CalendarActivityIcon({ type, size = 32, ...props }) {
  let artwork;

  switch (type) {
    case 'sowing':
      artwork = <>
        <path d="M5 31c7-5 13-5 20-1s12 4 18 0v10H5Z" fill={CREAM} stroke="none" />
        <path d="M6 32c7-5 13-5 20-1s11 4 16 0M6 39c7-5 13-5 20-1s11 4 16 0" />
        <path d="M14 11c5 1 7 5 3 9-5-1-7-5-3-9ZM31 8c5 1 7 5 3 9-5-1-7-5-3-9ZM24 22c5 1 7 5 3 9-5-1-7-5-3-9Z" fill={GOLD} stroke={GOLD} />
        <path d="m15 23 1 2m17-5 1 2" stroke={GOLD} />
      </>;
      break;
    case 'harvest':
      artwork = <>
        <path d="m10 39 11-28" />
        <path d="M18 19c-5 0-7-3-6-7 5 0 7 3 6 7ZM16 26c-5 0-7-3-6-7 5 0 7 3 6 7ZM14 33c-5 0-7-3-6-7 5 0 7 3 6 7ZM20 17c5 2 8 0 9-4-5-2-8 0-9 4ZM18 24c5 2 8 0 9-4-5-2-8 0-9 4Z" fill={GOLD} stroke={GOLD} strokeWidth="1.4" />
        <path d="M33 7c7 4 10 11 7 17-2 5-6 7-11 7 5-4 7-9 6-14-1-4-2-7-2-10Z" fill={CREAM} />
        <path d="m29 31-5 8" strokeWidth="4.5" />
        <path d="m25 38-2 3" stroke={GOLD} strokeWidth="4.5" />
      </>;
      break;
    case 'arrival':
      artwork = <>
        <path d="M9 26c-1-5 1-9 5-9 4 0 6 4 5 9M20 26c-1-5 2-8 5-8s6 3 5 8" fill={GOLD} stroke={GOLD} />
        <path d="m14 17-1-4m12 5 2-3" />
        <path d="M7 25h34l-3 16H10Z" fill={CREAM} />
        <path d="M9 32h30m-23-6 1 14m7-14v14m8-14-1 14" />
        <path d="M29 10h13m-5-5 5 5-5 5" stroke={GOLD} strokeWidth="2.6" />
      </>;
      break;
    case 'growing':
    default:
      artwork = <>
        <path d="M7 35c10-4 24-4 34 0v6H7Z" fill={CREAM} stroke="none" />
        <path d="M24 35V19" />
        <path d="M24 24C13 24 8 18 9 10c10 0 16 5 15 14Z" fill={CREAM} />
        <path d="M24 19c0-9 5-14 15-14 0 9-5 14-15 14Z" fill={GOLD} />
        <path d="m16 17 8 7m0-5 8-7M7 36c10-4 24-4 34 0" />
        <path d="m15 41 2-1m14 0 2 1" stroke={GOLD} />
      </>;
  }

  return <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    stroke={GREEN}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >{artwork}</svg>;
}
