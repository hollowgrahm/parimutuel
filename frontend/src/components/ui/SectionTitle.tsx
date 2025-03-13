'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export const SectionTitle = memo(({ children }: { children: React.ReactNode }) => (
  <motion.h2 
    className="text-4xl font-bold text-center mb-12 flex items-center justify-center gap-3 w-full"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.8 }}
    transition={{ duration: 0.5 }}
  >
    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-primary animate-gradient bg-[length:200%_auto]">
      {children}
    </span>
    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
  </motion.h2>
))

SectionTitle.displayName = 'SectionTitle' 