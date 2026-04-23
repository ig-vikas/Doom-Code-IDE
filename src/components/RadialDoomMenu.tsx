import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { defaultMenus } from '../config/defaultMenus';
import { executeCommand } from '../services/commandService';
import type { MenuDefinition } from '../types';

import appIcon from '/src-tauri/icons/icon.png';

// Icons for each menu category
const MENU_ICONS: Record<string, JSX.Element> = {
  File: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  View: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Build: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Docs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
};

const EXTRA_ITEMS = [{ label: 'Docs', command: 'help.openDocs' }];

// --- Geometry (bigger for good visibility) ---
// Arc: 0° = right, 90° = down. Quarter circle from icon.
const INNER_R = 55;
const OUTER_R = 180;
const SUB_INNER_R = 188;
const SUB_OUTER_R = 340;
const SEG_GAP = 1.5; // degrees gap

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function polarXY(r: number, deg: number) {
  const rad = toRad(deg);
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

function arcPath(innerR: number, outerR: number, startDeg: number, endDeg: number) {
  const s1 = polarXY(outerR, startDeg);
  const s2 = polarXY(outerR, endDeg);
  const s3 = polarXY(innerR, endDeg);
  const s4 = polarXY(innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M${s1.x},${s1.y}`,
    `A${outerR},${outerR} 0 ${large} 1 ${s2.x},${s2.y}`,
    `L${s3.x},${s3.y}`,
    `A${innerR},${innerR} 0 ${large} 0 ${s4.x},${s4.y}`,
    'Z',
  ].join(' ');
}

interface SegInfo {
  label: string;
  command?: string;
  hasSubmenu: boolean;
  startDeg: number;
  endDeg: number;
  midDeg: number;
  d: string;
  centerPt: { x: number; y: number };
}

export default function RadialDoomMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allItems = useMemo(() => {
    const menus = defaultMenus.map((m) => ({ label: m.label, hasSubmenu: true, command: undefined as string | undefined }));
    const extras = EXTRA_ITEMS.map((e) => ({ label: e.label, hasSubmenu: false, command: e.command }));
    return [...menus, ...extras];
  }, []);

  // Build primary segments
  const segments: SegInfo[] = useMemo(() => {
    const n = allItems.length;
    const totalArc = 90;
    const totalGaps = SEG_GAP * (n - 1);
    const segAngle = (totalArc - totalGaps) / n;
    return allItems.map((item, i) => {
      const start = i * (segAngle + SEG_GAP);
      const end = start + segAngle;
      const mid = (start + end) / 2;
      const centerR = (INNER_R + OUTER_R) / 2;
      return {
        label: item.label,
        command: item.command,
        hasSubmenu: item.hasSubmenu,
        startDeg: start,
        endDeg: end,
        midDeg: mid,
        d: arcPath(INNER_R, OUTER_R, start, end),
        centerPt: polarXY(centerR, mid),
      };
    });
  }, [allItems]);

  // Active submenu
  const activeMenu = hovered ? defaultMenus.find((m) => m.label === hovered) : null;
  const activeSeg = hovered ? segments.find((s) => s.label === hovered) : null;

  const subSegs = useMemo(() => {
    if (!activeMenu || !activeSeg) return [];
    const items = activeMenu.submenu.filter((i) => i.type !== 'separator');
    const n = items.length;
    if (!n) return [];

    const maxArc = 90;
    const subGap = 0.8;
    const subSegAngle = Math.min(8, (maxArc - subGap * (n - 1)) / n);
    const totalSub = n * subSegAngle + (n - 1) * subGap;
    let subStart = activeSeg.midDeg - totalSub / 2;
    // ADJUST HERE: If the top submenus (like File/Edit) clip out of the screen, 
    // increase this value (e.g., to 2, 5, or 10) to rotate them further clockwise.
    if (subStart < 0) subStart = 0;
    // ADJUST HERE: If the bottom submenus clip, decrease '96' to rotate them counter-clockwise.
    if (subStart + totalSub > 96) subStart = 96 - totalSub;

    return items.map((item, i) => {
      const start = subStart + i * (subSegAngle + subGap);
      const end = start + subSegAngle;
      const mid = (start + end) / 2;
      const centerR = (SUB_INNER_R + SUB_OUTER_R) / 2;
      return {
        id: item.id || `sub-${i}`,
        label: item.label || '',
        command: item.command,
        keybinding: item.keybinding,
        startDeg: start,
        endDeg: end,
        midDeg: mid,
        d: arcPath(SUB_INNER_R, SUB_OUTER_R, start, end),
        centerPt: polarXY(centerR, mid),
      };
    });
  }, [activeMenu, activeSeg]);

  // --- Timers ---
  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setIsOpen(false);
      setHovered(null);
    }, 350);
  }, [cancelClose]);

  // --- Handlers ---
  const onTriggerEnter = useCallback(() => { cancelClose(); setIsOpen(true); }, [cancelClose]);
  const onTriggerLeave = useCallback(() => { scheduleClose(); }, [scheduleClose]);
  const onTriggerClick = useCallback(() => {
    setIsOpen((p) => { if (p) setHovered(null); return !p; });
  }, []);

  const onArcEnter = useCallback(() => { cancelClose(); }, [cancelClose]);
  const onArcLeave = useCallback(() => { scheduleClose(); }, [scheduleClose]);

  const onSegEnter = useCallback((label: string) => { cancelClose(); setHovered(label); }, [cancelClose]);

  const onItemClick = useCallback((cmd?: string) => {
    setIsOpen(false);
    setHovered(null);
    if (cmd) executeCommand(cmd);
  }, []);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHovered(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const svgSize = SUB_OUTER_R + 20;

  return (
    <div className="radial-doom-container" ref={containerRef}>
      {/* Doom Icon */}
      <div
        className={`radial-doom-trigger ${isOpen ? 'active' : ''}`}
        onClick={onTriggerClick}
        onMouseEnter={onTriggerEnter}
        onMouseLeave={onTriggerLeave}
      >
        <img src={appIcon} alt="Doom Code" className="radial-doom-icon" />
        <div className="radial-doom-glow" />
      </div>

      {/* Quarter Arc Menu */}
      {isOpen && (
        <svg
          className="radial-arc-svg"
          width={svgSize}
          height={svgSize}
          viewBox={`${-16} ${-16} ${svgSize + 16} ${svgSize + 16}`}
          style={{
            position: 'absolute',
            top: 'calc(50% - 16px)',
            left: 'calc(50% - 16px)',
            pointerEvents: 'auto',
            zIndex: 10000,
          }}
          onMouseEnter={onArcEnter}
          onMouseLeave={onArcLeave}
        >
          <defs>
            <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feComposite in="SourceGraphic" in2="b" operator="over" />
            </filter>
            <filter id="arcShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="rgba(0,0,0,0.65)" />
            </filter>
          </defs>

          <g>
            {/* Invisible hover bridge: fills gap from origin to inner arc */}
            <path
              d={arcPath(0, INNER_R, -2, 92)}
              fill="transparent"
              stroke="none"
              style={{ pointerEvents: 'auto' }}
            />

            {/* Main ring background */}
            <path
              d={arcPath(INNER_R - 3, OUTER_R + 3, -0.5, 90.5)}
              fill="var(--bg-surface)"
              stroke="var(--border-subtle)"
              strokeWidth="1.5"
              style={{ filter: 'url(#arcShadow)', pointerEvents: 'auto' }}
            />

            {/* Divider lines between segments */}
            {segments.map((seg, i) => {
              if (i === 0) return null;
              const angle = seg.startDeg - SEG_GAP / 2;
              const p1 = polarXY(INNER_R - 2, angle);
              const p2 = polarXY(OUTER_R + 2, angle);
              return (
                <line
                  key={`div-${i}`}
                  x1={p1.x} y1={p1.y}
                  x2={p2.x} y2={p2.y}
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}

            {/* Primary segments */}
            {segments.map((seg, i) => {
              const isActive = hovered === seg.label;
              const iconSize = 20;
              const iconR = INNER_R + (OUTER_R - INNER_R) * 0.25;
              const iconPt = polarXY(iconR, seg.midDeg);
              const labelR = INNER_R + (OUTER_R - INNER_R) * 0.65;
              const labelPt = polarXY(labelR, seg.midDeg);

              return (
                <g
                  key={seg.label}
                  style={{
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    opacity: 0,
                    animation: `arcFadeIn 280ms ${i * 50}ms cubic-bezier(0.22,1,0.36,1) forwards`,
                  }}
                  onMouseEnter={() => onSegEnter(seg.label)}
                  onClick={() => {
                    if (!seg.hasSubmenu && seg.command) onItemClick(seg.command);
                  }}
                >
                  {/* Segment hit area + highlight */}
                  <path
                    d={seg.d}
                    fill={isActive ? 'var(--accent-glow)' : 'transparent'}
                    stroke={isActive ? 'var(--border-accent)' : 'transparent'}
                    strokeWidth="1.5"
                    style={{
                      transition: 'fill 180ms ease, stroke 180ms ease',
                      filter: isActive ? 'url(#arcGlow)' : 'none',
                    }}
                  />

                  {/* Icon — positioned along the radial line */}
                  <foreignObject
                    x={iconPt.x - iconSize / 2}
                    y={iconPt.y - iconSize / 2}
                    width={iconSize}
                    height={iconSize}
                    style={{ overflow: 'visible', pointerEvents: 'none' }}
                  >
                    <div style={{
                      width: iconSize,
                      height: iconSize,
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      transition: 'color 180ms ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {MENU_ICONS[seg.label] || null}
                    </div>
                  </foreignObject>

                  {/* Label — rotated along the radial line from center */}
                  <text
                    x={labelPt.x}
                    y={labelPt.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isActive ? '#ffffff' : 'var(--text-secondary)'}
                    fontSize="12.5"
                    fontWeight={isActive ? 700 : 500}
                    fontFamily="Inter, system-ui, sans-serif"
                    letterSpacing="0.8px"
                    transform={`rotate(${seg.midDeg}, ${labelPt.x}, ${labelPt.y})`}
                    style={{ transition: 'fill 180ms ease', pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {seg.label}
                  </text>
                </g>
              );
            })}

            {/* Nested submenu arc ring */}
            {activeMenu && subSegs.length > 0 && (
              <g style={{
                opacity: 0,
                animation: 'arcFadeIn 300ms cubic-bezier(0.22,1,0.36,1) forwards',
              }}>
                {/* Hover bridge between main ring and sub-ring */}
                <path
                  d={arcPath(
                    OUTER_R,
                    SUB_INNER_R,
                    Math.max(-6, subSegs[0].startDeg - 3),
                    Math.min(97, subSegs[subSegs.length - 1].endDeg + 3),
                  )}
                  fill="transparent"
                  stroke="none"
                  style={{ pointerEvents: 'auto' }}
                />

                {/* Sub-ring background */}
                <path
                  d={arcPath(
                    SUB_INNER_R - 3,
                    SUB_OUTER_R + 3,
                    Math.max(-6, subSegs[0].startDeg - 1.5),
                    Math.min(97, subSegs[subSegs.length - 1].endDeg + 1.5),
                  )}
                  fill="var(--bg-elevated)"
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                  style={{ filter: 'url(#arcShadow)', pointerEvents: 'auto' }}
                />

                {/* Sub-segment divider lines */}
                {subSegs.map((sub, i) => {
                  if (i === 0) return null;
                  const angle = sub.startDeg - 0.5;
                  const p1 = polarXY(SUB_INNER_R - 1, angle);
                  const p2 = polarXY(SUB_OUTER_R + 1, angle);
                  return (
                    <line
                      key={`sdiv-${i}`}
                      x1={p1.x} y1={p1.y}
                      x2={p2.x} y2={p2.y}
                      stroke="var(--border-subtle)"
                      strokeWidth="0.6"
                      style={{ pointerEvents: 'none' }}
                    />
                  );
                })}

                {/* Sub-segments */}
                {subSegs.map((sub, i) => {
                  const subRingWidth = SUB_OUTER_R - SUB_INNER_R;
                  const labelR = SUB_INNER_R + subRingWidth * 0.35;
                  const labelPt = polarXY(labelR, sub.midDeg);
                  const kbR = SUB_INNER_R + subRingWidth * 0.72;
                  const kbPt = polarXY(kbR, sub.midDeg);

                  return (
                    <g
                      key={sub.id}
                      style={{
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        opacity: 0,
                        animation: `arcFadeIn 220ms ${i * 30}ms ease forwards`,
                      }}
                      onClick={() => onItemClick(sub.command)}
                    >
                      <path
                        d={sub.d}
                        fill="transparent"
                        stroke="transparent"
                        strokeWidth="0.8"
                        className="radial-sub-path"
                      />

                      {/* Label — rotated along radial line */}
                      <text
                        x={labelPt.x}
                        y={labelPt.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="var(--text-primary)"
                        fontSize="9.5"
                        fontWeight="450"
                        fontFamily="Inter, system-ui, sans-serif"
                        letterSpacing="0.3px"
                        className="radial-sub-label"
                        transform={`rotate(${sub.midDeg}, ${labelPt.x}, ${labelPt.y})`}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {sub.label.length > 18 ? sub.label.slice(0, 16) + '…' : sub.label}
                      </text>

                      {/* Keybinding */}
                      {sub.keybinding && (
                        <text
                          x={kbPt.x}
                          y={kbPt.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="var(--text-muted)"
                          fontSize="7"
                          fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                          className="radial-sub-key"
                          transform={`rotate(${sub.midDeg}, ${kbPt.x}, ${kbPt.y})`}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {sub.keybinding}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
