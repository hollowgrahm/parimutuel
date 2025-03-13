'use client'

import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Matrix characters (mix of katakana and numbers)
    const chars = 'ｦｱｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890'
    const charArray = chars.split('')

    // Configure columns
    const fontSize = 16
    const columns = canvas.width / fontSize

    // Initialize drops
    const drops: number[] = []
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100
    }

    // Animation settings
    const frameRate = 30
    const interval = 1000 / frameRate

    // Draw function
    const draw = () => {
      // Semi-transparent black background for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Set text style
      ctx.fillStyle = '#7c3aed' // Primary purple color
      ctx.font = `${fontSize}px monospace`

      // Draw characters
      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = charArray[Math.floor(Math.random() * charArray.length)]
        
        // Calculate position
        const x = i * fontSize
        const y = drops[i] * fontSize

        // Add gradient effect
        const gradient = ctx.createLinearGradient(x, y - fontSize * 5, x, y)
        gradient.addColorStop(0, 'rgba(124, 58, 237, 0)') // Fade out at top
        gradient.addColorStop(0.8, 'rgba(124, 58, 237, 0.8)') // Primary color
        gradient.addColorStop(1, 'rgba(168, 85, 247, 1)') // Secondary purple
        ctx.fillStyle = gradient

        // Draw character
        ctx.fillText(char, x, y)

        // Reset drop when it reaches bottom or randomly
        if (y > canvas.height || Math.random() > 0.99) {
          drops[i] = 0
        }

        // Move drop down
        drops[i]++
      }
    }

    // Animation loop
    let lastTime = 0
    const animate = (currentTime: number) => {
      if (!canvas.parentElement) return // Stop if canvas is removed

      const deltaTime = currentTime - lastTime
      
      if (deltaTime >= interval) {
        draw()
        lastTime = currentTime - (deltaTime % interval)
      }

      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        opacity: 0.3,
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </Box>
  )
} 