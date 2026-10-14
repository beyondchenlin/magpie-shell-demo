type Props = { name: string };

export function NavIcon({ name }: Props) {
  const common = {
    className: "nav-ic",
    viewBox: "0 0 20 20",
    width: 16,
    height: 16,
    "aria-hidden": true as const,
  };
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "agents":
      return (
        <svg {...common}>
          <g {...stroke}>
            <path d="M4 6l4 4-4 4M10 14h6" />
          </g>
        </svg>
      );
    case "sessions":
      return (
        <svg {...common}>
          <g {...stroke}>
            <path d="M4 5h12v8H9l-4 3v-3H4z" />
          </g>
        </svg>
      );
    case "library":
      return (
        <svg {...common}>
          <g {...stroke}>
            <path d="M5 3.5h9v13H5a1.5 1.5 0 0 1 0-3h9" />
          </g>
        </svg>
      );
    case "providers":
      return (
        <svg {...common}>
          <g {...stroke}>
            <circle cx="7" cy="10" r="3" />
            <path d="M10 10h7M14 10v3M16.5 10v2" />
          </g>
        </svg>
      );
    case "routing":
      return (
        <svg {...common}>
          <g {...stroke}>
            <path d="M3 10h5l4-5h5M8 10l4 5h5M14.5 3l2.5 2-2.5 2M14.5 13l2.5 2-2.5 2" />
          </g>
        </svg>
      );
    case "gateway":
      return (
        <svg {...common}>
          <g {...stroke}>
            <rect x="3" y="4" width="14" height="5" rx="1.5" />
            <rect x="3" y="11" width="14" height="5" rx="1.5" />
            <path d="M6 6.5h.01M6 13.5h.01" />
          </g>
        </svg>
      );
    case "usage":
      return (
        <svg {...common}>
          <g {...stroke}>
            <path d="M4 16V9M8 16V5M12 16v-5M16 16V7" />
          </g>
        </svg>
      );
    case "plugins":
      return (
        <svg {...common}>
          <g {...stroke}>
            <path d="M8 3.5h4v2.5a1.5 1.5 0 0 0 3 0V3.5h1.5v13H4v-4h2.5a1.5 1.5 0 0 0 0-3H4v-6z" />
          </g>
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}
