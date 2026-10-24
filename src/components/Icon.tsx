import type { ReactNode } from 'react'

export type IconName =
  | 'home'
  | 'book'
  | 'tasks'
  | 'calendar'
  | 'bell'
  | 'timer'
  | 'settings'
  | 'plus'
  | 'search'
  | 'close'
  | 'trash'
  | 'edit'
  | 'check'
  | 'play'
  | 'pause'
  | 'reset'
  | 'sun'
  | 'moon'
  | 'download'
  | 'upload'
  | 'menu'
  | 'left'
  | 'right'
  | 'link'
  | 'grip'

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

const paths: Record<IconName, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1z" />,
  book: (
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 5.5V21" />
    </>
  ),
  tasks: (
    <>
      <path d="M9 7h11M9 12h11M9 17h11" />
      <path d="m4 7 1.2 1.2L7.5 6M4 12l1.2 1.2L7.5 11M4 17l1.2 1.2L7.5 16" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5L19 18H5z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 13V9.5M9.5 3.5h5M12 3.5V6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3V20.5M4.8 6.8l1.6 1.6M17.6 15.6l1.6 1.6M3.5 12h2.2M18.3 12H20.5M4.8 17.2l1.6-1.6M17.6 8.4l1.6-1.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  trash: (
    <>
      <path d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l11-11-4-4L4 16z" />
      <path d="m13 7 4 4" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  play: <path d="M8 5.5v13l11-6.5z" />,
  pause: <path d="M8 6v12M16 6v12" />,
  reset: (
    <>
      <path d="M4 12a8 8 0 1 0 2.2-5.5" />
      <path d="M4 4.5V9h4.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </>
  ),
  moon: <path d="M16 3.5A8.2 8.2 0 1 0 20.5 14 6.4 6.4 0 0 1 16 3.5z" />,
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 19h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="m8 9 4-4 4 4" />
      <path d="M5 19h14" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  left: <path d="m14.5 6-6 6 6 6" />,
  right: <path d="m9.5 6 6 6-6 6" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.2.3l2-2a4.2 4.2 0 0 0-6-6l-1.1 1" />
      <path d="M14 11a5 5 0 0 0-7.2-.3l-2 2a4.2 4.2 0 0 0 6 6l1.1-1" />
    </>
  ),
  grip: <path d="M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01" />,
}
