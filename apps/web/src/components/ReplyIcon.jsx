/* BolKe Reply Icon Component
 * 160dp animated icon display — design.md §2.3, §2.4
 * Shows large, recognizable icons for each intent
 * Uses CSS-animated SVG icons (Lottie can be added later for custom animations)
 */

import React from 'react';
import { ICON_MAP } from '../utils/constants';

// SVG Icons — rounded, filled, high-contrast — design.md §2.3
const IconSvgs = {
  hospital: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#FDECEA" />
      <rect x="30" y="40" width="60" height="50" rx="6" fill="#D9342B" />
      <rect x="25" y="80" width="70" height="10" rx="3" fill="#B22A23" />
      <rect x="52" y="48" width="16" height="34" rx="2" fill="white" />
      <rect x="43" y="57" width="34" height="16" rx="2" fill="white" />
      <polygon points="60,25 80,40 40,40" fill="#D9342B" />
    </svg>
  ),
  ration: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#FFF3E0" />
      <rect x="32" y="38" width="56" height="52" rx="8" fill="#FF7A29" />
      <rect x="38" y="44" width="44" height="40" rx="4" fill="#FFA05C" />
      <circle cx="50" cy="60" r="5" fill="white" opacity="0.8" />
      <circle cx="65" cy="55" r="4" fill="white" opacity="0.6" />
      <circle cx="58" cy="70" r="6" fill="white" opacity="0.7" />
      <circle cx="72" cy="68" r="3" fill="white" opacity="0.5" />
      <rect x="48" y="30" width="8" height="14" rx="2" fill="#E5651E" />
      <rect x="64" y="30" width="8" height="14" rx="2" fill="#E5651E" />
    </svg>
  ),
  bank: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#E8F5E9" />
      <rect x="28" y="48" width="64" height="38" rx="8" fill="#0E8C5B" />
      <rect x="34" y="54" width="52" height="26" rx="4" fill="#12B174" />
      <text x="60" y="73" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">₹</text>
      <circle cx="80" cy="78" r="6" fill="#0E8C5B" opacity="0.5" />
      <rect x="40" y="40" width="40" height="12" rx="6" fill="#0E8C5B" />
    </svg>
  ),
  transport: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#E3F2FD" />
      <rect x="28" y="35" width="64" height="45" rx="10" fill="#1976D2" />
      <rect x="34" y="40" width="52" height="22" rx="4" fill="#BBDEFB" />
      <rect x="28" y="75" width="64" height="8" rx="3" fill="#1565C0" />
      <circle cx="40" cy="85" r="7" fill="#333" />
      <circle cx="40" cy="85" r="3" fill="#999" />
      <circle cx="80" cy="85" r="7" fill="#333" />
      <circle cx="80" cy="85" r="3" fill="#999" />
    </svg>
  ),
  pension: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#F3E5F5" />
      <circle cx="55" cy="40" r="14" fill="#7B1FA2" />
      <rect x="38" y="52" width="34" height="28" rx="6" fill="#7B1FA2" />
      <circle cx="78" cy="55" r="12" fill="#0E8C5B" />
      <text x="78" y="61" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="sans-serif">₹</text>
      <rect x="42" y="82" width="12" height="12" rx="2" fill="#7B1FA2" />
      <rect x="60" y="82" width="12" height="12" rx="2" fill="#7B1FA2" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#E8EAF6" />
      <rect x="35" y="25" width="50" height="70" rx="6" fill="white" stroke="#3F51B5" strokeWidth="3" />
      <rect x="44" y="40" width="32" height="4" rx="2" fill="#3F51B5" opacity="0.6" />
      <rect x="44" y="50" width="24" height="4" rx="2" fill="#3F51B5" opacity="0.4" />
      <rect x="44" y="60" width="28" height="4" rx="2" fill="#3F51B5" opacity="0.4" />
      <circle cx="60" cy="80" r="8" fill="#3F51B5" opacity="0.2" />
      <path d="M57 80 L59 82 L63 78" stroke="#3F51B5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#E8F5E9" />
      <path d="M42 35c-2 0-4 2-5 4-3 8 2 22 14 34s26 17 34 14c2-1 4-3 4-5l-8-8c-1-1-3-1-4 0l-6 4c-1 1-3 1-4 0L53 64c-1-1-1-3 0-4l4-6c1-1 1-3 0-4l-8-8c-1-1-2-1-3-1l-4-6z"
        fill="#0E8C5B" />
    </svg>
  ),
  unknown: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#FFF8E1" />
      <circle cx="60" cy="60" r="30" fill="#FF7A29" opacity="0.15" />
      <text x="60" y="70" textAnchor="middle" fill="#FF7A29" fontSize="40" fontWeight="bold" fontFamily="sans-serif">?</text>
    </svg>
  ),
};

export function ReplyIcon({ icon, size = 160 }) {
  const iconData = ICON_MAP[icon] || ICON_MAP.unknown;
  const SvgIcon = IconSvgs[icon] || IconSvgs.unknown;

  return (
    <div
      className="reply-icon-container"
      style={{ width: size, height: size }}
      role="img"
      aria-label={iconData.label}
    >
      {SvgIcon}
    </div>
  );
}
