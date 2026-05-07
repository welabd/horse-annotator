#!/usr/bin/env node
// Generates PWA icon PNG placeholders
// Run: node generate-icons.js
const { createCanvas } = require('canvas')
const fs = require('fs')

function generateIcon(size, outPath) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const r = size * 0.22

  // Background
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#f97316')
  grad.addColorStop(1, '#ea580c')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, r)
  ctx.fill()

  // Horse emoji text
  ctx.font = `${size * 0.55}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🐴', size / 2, size / 2 + size * 0.04)

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'))
  console.log(`Generated: ${outPath}`)
}

try {
  generateIcon(192, 'public/pwa-192x192.png')
  generateIcon(512, 'public/pwa-512x512.png')
  generateIcon(180, 'public/apple-touch-icon.png')
} catch (e) {
  console.log('canvas module not available, using placeholder icons')
  // Create minimal 1x1 PNGs as fallbacks
  const minimal = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
  fs.writeFileSync('public/pwa-192x192.png', minimal)
  fs.writeFileSync('public/pwa-512x512.png', minimal)
  fs.writeFileSync('public/apple-touch-icon.png', minimal)
}
