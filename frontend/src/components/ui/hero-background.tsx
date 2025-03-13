'use client'

import { motion } from 'framer-motion'

export function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-400/10 dark:from-primary/5 dark:to-purple-400/5 rounded-3xl blur-3xl" />
      
      {/* Abstract Shapes */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <svg
          className="absolute w-full h-full"
          viewBox="0 0 1000 1000"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Animated Circle */}
          <motion.circle
            cx="500"
            cy="500"
            r="150"
            fill="none"
            stroke="url(#gradient1)"
            strokeWidth="2"
            initial={{ scale: 0.8, opacity: 0.3 }}
            animate={{ 
              scale: [0.8, 1.2, 0.8],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Animated Hexagon */}
          <motion.path
            d="M600 400 L700 450 L700 550 L600 600 L500 550 L500 450 Z"
            fill="none"
            stroke="url(#gradient2)"
            strokeWidth="2"
            initial={{ rotate: 0, opacity: 0.2 }}
            animate={{ 
              rotate: 360,
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* Animated Wave */}
          <motion.path
            d="M100 500 Q 250 400 400 500 T 700 500 T 1000 500"
            fill="none"
            stroke="url(#gradient3)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{ 
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="text-primary" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
              <stop offset="100%" className="text-purple-400" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className="text-purple-400" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
              <stop offset="100%" className="text-primary" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradient3" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" className="text-primary" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
              <stop offset="50%" className="text-purple-400" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
              <stop offset="100%" className="text-primary" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Floating Particles */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </motion.div>
    </div>
  )
} 