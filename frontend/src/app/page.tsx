'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Hero } from '../components/hero/hero'
import { Footer } from '../components/footer/footer'
import { PageContainer } from '../components/layout/PageContainer'
import { Box } from '@mui/material'

// Dynamically import components that are not immediately visible
const KeyFeatures = dynamic(() => import('../components/features/key-features').then(mod => mod.KeyFeatures), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-64 bg-white/5 rounded-lg" />
        ))}
      </div>
    </div>
  )
})

const ProtocolStats = dynamic(() => import('../components/stats/protocol-stats').then(mod => mod.ProtocolStats), {
  ssr: false
})

const HowItWorks = dynamic(() => import('../components/how-it-works/how-it-works').then(mod => mod.HowItWorks), {
  ssr: false
})

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5
    }
  }
}

export default function HomePage() {
  return (
    <PageContainer>
      <Box 
        sx={{ 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '8rem',
        }}
      >
        {/* Hero */}
        <motion.section
          style={{ width: '100%' }}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.5 }}
        >
          <Hero />
        </motion.section>

        {/* Protocol Stats */}
        <motion.section
          style={{ width: '100%' }}
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          variants={sectionVariants}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <ProtocolStats />
        </motion.section>

        {/* How It Works */}
        <motion.section
          style={{ width: '100%' }}
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          variants={sectionVariants}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <HowItWorks />
        </motion.section>

        {/* Key Features */}
        <motion.section
          style={{ width: '100%' }}
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          variants={sectionVariants}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <KeyFeatures />
        </motion.section>

        {/* Footer */}
        <Footer />
      </Box>
    </PageContainer>
  )
} 