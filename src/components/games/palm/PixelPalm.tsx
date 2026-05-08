"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import {
  STAGE_CONFIGS,
  FROND_ANGLES,
  DATE_CLUSTER_OFFSETS,
  TRUNK_SEGMENT_H,
  TRUNK_W,
  GROUND_Y,
  TRUNK_X,
  getCrownY,
  type PalmAnimationState,
} from "./palmData";

interface PixelPalmProps {
  stage: number;                    // 1-6
  health: number;                   // 0-100
  animationState?: PalmAnimationState;
  dateCount?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  onAnimationComplete?: () => void;
}

const SIZE_MAP = { sm: 80, md: 120, lg: 180 };

// Trunk brown shades (alternating per segment for texture)
const TRUNK_COLORS = ["#8B5E3C", "#7A5030"];
const TRUNK_HIGHLIGHT = "#A0703C";

// Frond colors
const FROND_FULL = "#2D8B1F";         // healthy green
const FROND_FULL_LIGHT = "#3DAD2B";   // highlight
const FROND_CRACKED = "#8B7040";      // damaged brown
const FROND_CRACK_LINE = "#5A4020";   // crack line

// Date colors
const DATE_COLOR = "#C85A14";
const DATE_LEGENDARY = "#D4A017";
const DATE_LEGENDARY_GLOW = "#FFD700";

// Ground / dirt mound colors
const DIRT_DARK = "#5C3A1A";
const DIRT_MID = "#7A4F28";
const DIRT_LIGHT = "#9B6638";

// Frond heart-like path — elongated, pointing up from origin
// Width ~20px, height ~32px (at scale=1)
function frondPath(scale: number): string {
  const w = 10 * scale;
  const h = 30 * scale;
  const hw = 8 * scale;
  const mh = 20 * scale;
  return `
    M 0,0
    C ${-w},-${h * 0.1} ${-hw},-${h * 0.4} ${-hw},-${mh}
    C ${-hw},-${h * 0.85} ${-w * 0.4},-${h} 0,-${h * 0.93}
    C ${w * 0.4},-${h} ${hw},-${h * 0.85} ${hw},-${mh}
    C ${hw},-${h * 0.4} ${w},-${h * 0.1} 0,0
    Z
  `;
}

// Crack overlay on a frond
function crackPath(scale: number): string {
  const h = 30 * scale;
  return `M ${-2 * scale},-${h * 0.3} L ${3 * scale},-${h * 0.55} L ${-1 * scale},-${h * 0.75}`;
}

interface WaterDrop {
  id: number;
  x: number;
}

export function PixelPalm({
  stage,
  health,
  animationState = "idle",
  dateCount = 0,
  size = "md",
  className = "",
  onAnimationComplete,
}: PixelPalmProps) {
  const filterId = useId().replace(/:/g, "");
  const glowId = useId().replace(/:/g, "");
  const s = Math.max(1, Math.min(6, stage));
  const cfg = STAGE_CONFIGS[s - 1];
  const crownY = getCrownY(cfg.trunkSegments);
  const frondAngles = FROND_ANGLES[cfg.frondCount] ?? FROND_ANGLES[2];
  const px = SIZE_MAP[size];

  // How many fronds are healthy vs cracked (sorted by angle extremity)
  const sortedByExtreme = [...frondAngles].sort((a, b) => Math.abs(b) - Math.abs(a));
  const healthyCount = Math.round((health / 100) * cfg.frondCount);
  const crackedSet = new Set(sortedByExtreme.slice(healthyCount).map(String));

  const controls = useAnimation();
  const crownControls = useAnimation();
  const [waterDrops, setWaterDrops] = useState<WaterDrop[]>([]);
  const dropId = useRef(0);

  // Idle: gentle perpetual sway
  useEffect(() => {
    controls.start({
      rotate: [0, 1.2, -1.2, 0.6, -0.6, 0],
      transition: { duration: 6, ease: "easeInOut", repeat: Infinity, repeatType: "loop" },
    });
  }, [controls]);

  useEffect(() => {
    const run = async () => {
      if (animationState === "sway") {
        await controls.start({
          rotate: [0, -4, 4, -3, 3, -1.5, 1.5, 0],
          transition: { duration: 1.2, ease: "easeInOut" },
        });
        onAnimationComplete?.();

      } else if (animationState === "glow") {
        await crownControls.start({
          filter: [
            "drop-shadow(0 0 0px #4ade80)",
            "drop-shadow(0 0 12px #4ade80)",
            "drop-shadow(0 0 6px #4ade80)",
            "drop-shadow(0 0 14px #4ade80)",
            "drop-shadow(0 0 0px #4ade80)",
          ],
          transition: { duration: 1.4, ease: "easeInOut" },
        });
        onAnimationComplete?.();

      } else if (animationState === "wilt") {
        await crownControls.start({
          y: [0, 5, 3],
          rotate: [0, 3, 2],
          transition: { duration: 0.6, ease: "easeOut" },
        });
        setTimeout(() => {
          crownControls.start({ y: 0, rotate: 0, transition: { duration: 1, ease: "easeInOut" } });
        }, 800);
        onAnimationComplete?.();

      } else if (animationState === "waterDrip") {
        const newDrops: WaterDrop[] = Array.from({ length: 3 }, (_, i) => ({
          id: dropId.current++,
          x: TRUNK_X + (i - 1) * 6,
        }));
        setWaterDrops((prev) => [...prev, ...newDrops]);
        setTimeout(() => {
          setWaterDrops((prev) => prev.filter((d) => !newDrops.find((nd) => nd.id === d.id)));
        }, 1200);
        await crownControls.start({
          filter: ["drop-shadow(0 0 0px #38bdf8)", "drop-shadow(0 0 10px #38bdf8)", "drop-shadow(0 0 0px #38bdf8)"],
          transition: { duration: 0.8 },
        });
        onAnimationComplete?.();

      } else if (animationState === "flicker") {
        await controls.start({
          opacity: [1, 0.6, 1, 0.7, 1, 0.5, 1],
          transition: { duration: 0.8, ease: "linear" },
        });

      } else if (animationState === "dateBurst") {
        await crownControls.start({
          scale: [1, 1.15, 1],
          filter: [
            "drop-shadow(0 0 0px #fbbf24)",
            "drop-shadow(0 0 18px #fbbf24)",
            "drop-shadow(0 0 8px #fbbf24)",
            "drop-shadow(0 0 0px #fbbf24)",
          ],
          transition: { duration: 1.0, ease: "easeOut" },
        });
        onAnimationComplete?.();
      }
    };
    run();
  }, [animationState, controls, crownControls, onAnimationComplete]);

  return (
    <motion.div
      className={`inline-flex items-end justify-center ${className}`}
      style={{ width: px, height: Math.round(px * 1.3), originX: "50%", originY: "100%" }}
      animate={controls}
    >
      <svg
        viewBox="0 0 80 130"
        width={px}
        height={Math.round(px * 1.3)}
        shapeRendering="crispEdges"
        style={{ imageRendering: "pixelated", overflow: "visible" }}
      >
        <defs>
          {/* Legendary golden glow filter */}
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Scan-line texture for trunk */}
          <pattern id={`${filterId}-tp`} width="2" height="2" patternUnits="userSpaceOnUse">
            <rect width="2" height="2" fill="none" />
            <rect width="1" height="1" fill="rgba(0,0,0,0.08)" />
          </pattern>
        </defs>

        {/* Legendary aura */}
        {cfg.legendary && (
          <motion.ellipse
            cx={TRUNK_X}
            cy={crownY}
            rx={28}
            ry={20}
            fill={DATE_LEGENDARY_GLOW}
            opacity={0.12}
            animate={{ opacity: [0.08, 0.18, 0.08], rx: [26, 30, 26] }}
            transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
          />
        )}

        {/* Dirt mound at base */}
        <rect x={TRUNK_X - 16} y={GROUND_Y + 2} width={32} height={6} fill={DIRT_DARK} />
        <rect x={TRUNK_X - 13} y={GROUND_Y} width={26} height={4} fill={DIRT_MID} />
        <rect x={TRUNK_X - 10} y={GROUND_Y - 2} width={20} height={4} fill={DIRT_LIGHT} />

        {/* Trunk segments */}
        {cfg.trunkSegments === 0 ? (
          // Stage 1: just a thin sprout stem
          <>
            <rect x={TRUNK_X - 2} y={crownY} width={4} height={GROUND_Y - crownY} fill={TRUNK_COLORS[0]} />
            <rect x={TRUNK_X - 1} y={crownY} width={1} height={GROUND_Y - crownY} fill={TRUNK_HIGHLIGHT} opacity={0.5} />
          </>
        ) : (
          Array.from({ length: cfg.trunkSegments }).map((_, i) => {
            const segY = GROUND_Y - (i + 1) * TRUNK_SEGMENT_H;
            const color = TRUNK_COLORS[i % 2];
            const w = Math.max(6, TRUNK_W - Math.floor(i / 3)); // trunk tapers slightly
            return (
              <g key={i}>
                <rect
                  x={TRUNK_X - w / 2}
                  y={segY}
                  width={w}
                  height={TRUNK_SEGMENT_H}
                  fill={color}
                />
                {/* highlight strip */}
                <rect
                  x={TRUNK_X - w / 2}
                  y={segY}
                  width={2}
                  height={TRUNK_SEGMENT_H}
                  fill={TRUNK_HIGHLIGHT}
                  opacity={0.4}
                />
                {/* segment divider line */}
                {i < cfg.trunkSegments - 1 && (
                  <rect
                    x={TRUNK_X - w / 2}
                    y={segY + TRUNK_SEGMENT_H - 1}
                    width={w}
                    height={1}
                    fill="rgba(0,0,0,0.25)"
                  />
                )}
              </g>
            );
          })
        )}

        {/* Crown + fronds + dates (all animated together) */}
        <motion.g
          animate={crownControls}
          style={{ originX: TRUNK_X, originY: crownY }}
        >
          {/* Date clusters (behind fronds) */}
          {cfg.hasDates &&
            DATE_CLUSTER_OFFSETS.slice(0, cfg.dateClusters).map((offset, ci) => (
              <g key={ci} transform={`translate(${TRUNK_X + offset.x}, ${crownY + offset.y})`}>
                {/* cluster of date dots */}
                {Array.from({ length: 5 }).map((_, di) => {
                  const dx = (di % 3 - 1) * (cfg.dateSize * 1.6);
                  const dy = Math.floor(di / 3) * (cfg.dateSize * 1.6);
                  return (
                    <g key={di}>
                      <circle
                        cx={dx}
                        cy={dy}
                        r={cfg.dateSize}
                        fill={cfg.legendary ? DATE_LEGENDARY : DATE_COLOR}
                      />
                      <circle
                        cx={dx - cfg.dateSize * 0.3}
                        cy={dy - cfg.dateSize * 0.3}
                        r={cfg.dateSize * 0.4}
                        fill={cfg.legendary ? DATE_LEGENDARY_GLOW : "rgba(255,180,100,0.5)"}
                      />
                    </g>
                  );
                })}
              </g>
            ))}

          {/* Fronds */}
          {frondAngles.map((angle, fi) => {
            const isHealthy = !crackedSet.has(String(angle));
            const fill = isHealthy ? FROND_FULL : FROND_CRACKED;
            const highlight = isHealthy ? FROND_FULL_LIGHT : "#A09060";
            const path = frondPath(cfg.frondScale);
            const crack = crackPath(cfg.frondScale);

            return (
              <g
                key={fi}
                transform={`translate(${TRUNK_X}, ${crownY}) rotate(${angle})`}
              >
                {/* Main heart frond */}
                <path d={path} fill={fill} />
                {/* Highlight edge */}
                <path
                  d={path}
                  fill="none"
                  stroke={highlight}
                  strokeWidth={1}
                  opacity={0.5}
                />
                {/* Crack overlay if damaged */}
                {!isHealthy && (
                  <path
                    d={crack}
                    fill="none"
                    stroke={FROND_CRACK_LINE}
                    strokeWidth={1.5}
                    strokeLinecap="square"
                  />
                )}
                {/* Legendary sparkle dot on healthy frond tips */}
                {cfg.legendary && isHealthy && (
                  <motion.circle
                    cx={0}
                    cy={-30 * cfg.frondScale * 0.9}
                    r={1.5}
                    fill={DATE_LEGENDARY_GLOW}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{
                      duration: 1.8,
                      delay: fi * 0.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Crown cap (where trunk meets fronds) */}
          <rect
            x={TRUNK_X - 5}
            y={crownY - 3}
            width={10}
            height={6}
            fill={cfg.legendary ? DATE_LEGENDARY : TRUNK_COLORS[0]}
          />
          {cfg.legendary && (
            <motion.rect
              x={TRUNK_X - 5}
              y={crownY - 3}
              width={10}
              height={6}
              fill={DATE_LEGENDARY_GLOW}
              opacity={0.4}
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </motion.g>

        {/* Water drop animations */}
        {waterDrops.map((drop) => (
          <motion.ellipse
            key={drop.id}
            cx={drop.x}
            cy={crownY - 5}
            rx={2}
            ry={3}
            fill="#38bdf8"
            opacity={0.9}
            initial={{ y: 0, opacity: 0.9 }}
            animate={{ y: GROUND_Y - crownY + 5, opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeIn" }}
          />
        ))}

        {/* Date count badge */}
        {dateCount > 0 && (
          <g transform={`translate(${TRUNK_X + 18}, ${crownY + 5})`}>
            <rect x={-8} y={-8} width={16} height={14} rx={3} fill="#1a1a26" opacity={0.85} />
            <text
              x={0}
              y={2}
              textAnchor="middle"
              fontSize={7}
              fill={DATE_COLOR}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {dateCount > 99 ? "99+" : dateCount}
            </text>
          </g>
        )}
      </svg>
    </motion.div>
  );
}
