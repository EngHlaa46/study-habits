"use client"

import { motion } from "framer-motion"
import { pageVariants } from "@/lib/motion"

export default function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}
