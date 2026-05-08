"use client"

import { motion } from "framer-motion"

const orbs = [
  {
    className: "w-[600px] h-[600px] top-[-10%] left-[-8%]",
    color: "rgba(56,189,248,0.18)",
    animate: { x: [0, 40, -20, 0], y: [0, -30, 30, 0] },
    duration: 14,
  },
  {
    className: "w-[500px] h-[500px] bottom-[-8%] right-[-6%]",
    color: "rgba(74,222,128,0.13)",
    animate: { x: [0, -35, 20, 0], y: [0, 30, -25, 0] },
    duration: 11,
  },
  {
    className: "w-[400px] h-[400px] top-[35%] right-[5%]",
    color: "rgba(168,85,247,0.11)",
    animate: { x: [0, 25, -15, 0], y: [0, -20, 20, 0] },
    duration: 9,
  },
]

export default function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[80px] ${orb.className}`}
          style={{ background: orb.color }}
          animate={orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
