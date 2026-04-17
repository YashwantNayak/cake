/**
 * HomeVideoMotion Component
 * Renders an optimized frame sequence as a scroll-triggered animation
 * 
 * Features:
 * - Loads 240 frames from /frames/ directory with smart preloading
 * - Responsive: skips frames on mobile (2x skip) vs desktop (no skip)
 * - Efficient: uses priority loading (load visible frames first)
 * - Smooth: interpolates between frames for fluid animation
 * - Shows progress bar and loading indicator
 */

import { createElement, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Configuration constants for frame loading optimization
const SOURCE_TOTAL_FRAMES = 240 // Total frames in the sequence
const FRAME_START_OFFSET = 40 // Skip first 30 frames (empty/placeholder frames)
const MOBILE_FRAME_STEP = 2 // Skip every 2nd frame on mobile (120 frames total)
const DESKTOP_FRAME_STEP = 1 // Load all frames on desktop (240 frames)
const MAX_CONCURRENT = 8 // Maximum simultaneous image loads (bandwidth optimization)
const PRIORITY_LOAD_RATIO = 0.72 // Load 72% of frames first (visible frames first)
const MIN_READY_FRAMES_DESKTOP = 28 // Minimum frames to load before showing animation on desktop
const MIN_READY_FRAMES_MOBILE = 16 // Minimum frames to load before showing animation on mobile

/**
 * Linear interpolation helper
 * Smoothly transitions from start value to end value based on alpha (0 to 1)
 */
function lerp(start: number, end: number, alpha: number) {
  return start + (end - start) * alpha
}

/**
 * Constructs the file path for a frame image
 * Skips first FRAME_START_OFFSET frames and loads from frame 31 onwards
 * Example: buildFramePath(0, 1) → "/frames/frame_0031.webp" (frame 30 + offset 1 + sequenceIndex 0)
 */
function buildFramePath(sequenceIndex: number, frameStep: number) {
  // Calculate actual frame number: add offset to skip first empty frames, then multiply by step
  const sourceIndex = FRAME_START_OFFSET + sequenceIndex * frameStep + 1
  // Pad with zeros for consistent file naming (0001, 0002, etc.)
  const padded = String(sourceIndex).padStart(4, '0')
  return `/frames/frame_${padded}.webp`
}

export function HomeVideoMotion() {
  // DOM element references for canvas and UI components
  const shellRef = useRef<HTMLDivElement>(null) // Container for the entire animation
  const canvasRef = useRef<HTMLCanvasElement>(null) // Canvas element for frame rendering
  const progressFillRef = useRef<HTMLDivElement>(null) // Scroll progress bar visual
  const progressLabelRef = useRef<HTMLSpanElement>(null) // Scroll progress percentage text
  const loadingRef = useRef<HTMLDivElement>(null) // Loading indicator container
  const loadingTextRef = useRef<HTMLSpanElement>(null) // Loading progress text

  useEffect(() => {
    // Get references to DOM elements
    const shell = shellRef.current
    const canvas = canvasRef.current

    if (!shell || !canvas) {
      return
    }

    // Get 2D canvas context for drawing frames
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    // Detect device type and adjust frame loading accordingly
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const frameStep = isMobile ? MOBILE_FRAME_STEP : DESKTOP_FRAME_STEP
    // Calculate total frames: total available minus offset, then adjust for frame step
    const totalFrames = Math.max(1, Math.floor((SOURCE_TOTAL_FRAMES - FRAME_START_OFFSET) / frameStep))
    const minReadyFrames = Math.min(
      totalFrames,
      isMobile ? MIN_READY_FRAMES_MOBILE : MIN_READY_FRAMES_DESKTOP,
    )

    // Animation and loading state variables
    let trigger: ScrollTrigger | null = null // GSAP ScrollTrigger instance
    let rafId = 0 // Request animation frame ID
    let resizeRaf = 0 // Resize debounce animation frame ID
    let preloadStarted = false // Flag to prevent duplicate preload starts
    let disposed = false // Flag for cleanup (component unmounted)
    let activeLoads = 0 // Number of currently loading images
    let queueCursor = 0 // Current position in load queue
    let loadedCount = 0 // Total frames successfully loaded
    let targetFrame = 0 // Frame number to display (from scroll position)
    let currentFrame = 0 // Currently displayed frame (smoothly interpolated)
    let scrollVelocity = 0 // Current scroll speed (affects frame interpolation smoothing)

    // Frame storage: array of loaded HTMLImageElement objects
    const frames: Array<HTMLImageElement | null> = new Array(totalFrames).fill(null)
    
    // Loading strategy: load priority frames first, then remaining frames
    // Priority frames are the first 72% of the sequence (visible in typical first scroll)
    const priorityCount = Math.max(1, Math.floor(totalFrames * PRIORITY_LOAD_RATIO))
    const loadQueue = [
      // First: load priority frames (0 to priorityCount-1)
      ...Array.from({ length: priorityCount }, (_, i) => i),
      // Then: load remaining frames (priorityCount to totalFrames-1)
      ...Array.from({ length: totalFrames - priorityCount }, (_, i) => i + priorityCount),
    ]

    // Resize canvas to match container size with device pixel ratio adjustment
    // Higher DPR on desktop (1.5x) for sharper images, lower on mobile (1.25x) for performance
    const resizeCanvas = () => {
      const rect = shell.getBoundingClientRect()
      // Higher DPR on desktop for visual quality, lower on mobile for memory/performance
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5)
      const width = Math.max(2, Math.round(rect.width * dpr))
      const height = Math.max(2, Math.round(rect.height * dpr))

      // Only update canvas if size actually changed (prevents unnecessary redraws)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }

    // Draw image to canvas with proper aspect ratio handling ("cover" mode)
    // Fills the canvas while maintaining image aspect ratio, cropping excess
    const drawCoverImage = (img: HTMLImageElement) => {
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height

      if (!canvasWidth || !canvasHeight || !img.width || !img.height) {
        return
      }

      // Calculate aspect ratios
      const canvasAspect = canvasWidth / canvasHeight
      const imageAspect = img.width / img.height

      // Source region coordinates (what part of image to draw)
      let sx = 0
      let sy = 0
      let sw = img.width
      let sh = img.height

      // Adjust source region to maintain aspect ratio (crop to fill canvas)
      if (imageAspect > canvasAspect) {
        // Image is wider than canvas: crop left/right
        sh = img.height
        sw = sh * canvasAspect
        sx = (img.width - sw) * 0.5 // Center the source region
      } else {
        // Image is taller than canvas: crop top/bottom
        sw = img.width
        sh = sw / canvasAspect
        sy = (img.height - sh) * 0.5 // Center the source region
      }

      // Clear canvas and draw image
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight)
    }

    // Find the closest loaded frame when requested frame isn't ready yet
    // Searches radially outward from preferred frame to find a nearby loaded one
    const findAvailableFrame = (preferredIndex: number) => {
      // Start with the preferred frame
      const safeIndex = gsap.utils.clamp(0, totalFrames - 1, preferredIndex)
      if (frames[safeIndex]) {
        return frames[safeIndex]
      }

      // If preferred frame not loaded, search outward (prev, next, prev-1, next+1, ...)
      for (let gap = 1; gap < totalFrames; gap += 1) {
        const lower = safeIndex - gap // Try frame before
        const upper = safeIndex + gap // Try frame after
        if (lower >= 0 && frames[lower]) {
          return frames[lower]
        }
        if (upper < totalFrames && frames[upper]) {
          return frames[upper]
        }
      }

      return null // No frames loaded yet
    }

    // Render a specific frame to the canvas
    // If the exact frame isn't loaded, use the closest available frame
    const renderFrame = (index: number) => {
      const frame = findAvailableFrame(index)
      if (!frame) {
        return // No frames loaded, can't render
      }

      drawCoverImage(frame)
    }

    // Update the scroll progress bar and percentage text
    const updateProgressUi = (progress: number) => {
      const normalized = gsap.utils.clamp(0, 1, progress)
      // Scale progress bar width from 0 to 100%
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${normalized})`
      }

      // Update percentage text
      if (progressLabelRef.current) {
        progressLabelRef.current.textContent = `${Math.round(normalized * 100)}%`
      }
    }

    // Update the loading indicator with progress percentage
    // Hide loading screen once minimum frames are ready
    const updateLoadingUi = () => {
      const ratio = loadedCount / totalFrames
      if (loadingTextRef.current) {
        loadingTextRef.current.textContent = `Loading frames ${Math.round(ratio * 100)}%`
      }

      // Fade out loading indicator when enough frames are loaded
      if (loadingRef.current && loadedCount >= minReadyFrames) {
        loadingRef.current.style.opacity = '0'
      }
    }

    // Load a single frame image and store it in the frames array
    const loadFrameAtIndex = (sequenceIndex: number) => {
      const src = buildFramePath(sequenceIndex, frameStep)
      const img = new Image()
      img.decoding = 'async' // Decode image asynchronously (doesn't block main thread)
      img.src = src

      const onDone = async () => {
        if (disposed) {
          // Component unmounted, abort
          activeLoads -= 1
          return
        }

        // Wait for image decoding to complete if available
        if (typeof img.decode === 'function') {
          try {
            await img.decode()
          } catch {
            // Fallback: image is already rendered by onload event
          }
        }

        // Store loaded image and update counters
        frames[sequenceIndex] = img
        loadedCount += 1
        updateLoadingUi()

        // Render frame when first frame loads or when minimum frames ready
        if (loadedCount === 1 || loadedCount === minReadyFrames) {
          renderFrame(Math.round(currentFrame))
        }

        // Load next frame in queue
        activeLoads -= 1
        queueMicrotask(pumpQueue)
      }

      // Handle load errors by continuing to next frame
      const onError = () => {
        activeLoads -= 1
        queueMicrotask(pumpQueue)
      }

      img.onload = () => {
        void onDone()
      }
      img.onerror = onError
    }

    // Process frame load queue while respecting MAX_CONCURRENT limit
    // Ensures we don't exceed browser bandwidth/memory limits
    const pumpQueue = () => {
      if (disposed) {
        return
      }

      // Start loading frames until we hit the concurrent limit
      while (activeLoads < MAX_CONCURRENT && queueCursor < loadQueue.length) {
        const sequenceIndex = loadQueue[queueCursor]
        queueCursor += 1
        activeLoads += 1
        loadFrameAtIndex(sequenceIndex)
      }
    }

    // Start the frame preloading process (called on mount)
    const preloadFrames = () => {
      if (preloadStarted) {
        return // Already started
      }

      preloadStarted = true
      updateLoadingUi()
      pumpQueue() // Begin loading frames
    }

    // Update animation frame based on scroll position
    const updateScrollProgress = () => {
      // Calculate scroll progress (0 to 1)
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
      const progress = gsap.utils.clamp(0, 1, window.scrollY / maxScroll)
      // Map progress to frame number
      targetFrame = progress * (totalFrames - 1)
      updateProgressUi(progress)
    }

    // Main render loop - animates to frame based on scroll position
    // Adjusts smoothing based on scroll velocity for responsive feel
    const renderLoop = () => {
      const delta = targetFrame - currentFrame
      // Faster scrolling = less smoothing (snap to frame faster)
      const velocityFactor = gsap.utils.clamp(0, 1, scrollVelocity / 2600)
      // Large frame jumps = less smoothing
      const distanceFactor = gsap.utils.clamp(0, 1, Math.abs(delta) / 20)
      // Interpolate smoothing between 0.09 (fast) and 0.22 (slow) based on velocity/distance
      const smoothing = gsap.utils.interpolate(0.09, 0.22, Math.max(velocityFactor, distanceFactor))

      // Smoothly interpolate current frame toward target frame
      currentFrame = lerp(currentFrame, targetFrame, smoothing)
      // Snap to target when close enough (prevents floating point drift)
      if (Math.abs(delta) < 0.01) {
        currentFrame = targetFrame
      }

      renderFrame(Math.round(currentFrame))
      rafId = requestAnimationFrame(renderLoop)
    }

    // Handle window resize events with debouncing
    const onResize = () => {
      if (resizeRaf) {
        cancelAnimationFrame(resizeRaf) // Cancel previous pending resize
      }

      // Debounce: only process resize after frame's worth of time
      resizeRaf = requestAnimationFrame(() => {
        resizeCanvas()
        renderFrame(Math.round(currentFrame))
        ScrollTrigger.refresh() // Recalculate scroll trigger positions
      })
    }

    // Create GSAP ScrollTrigger for scroll-linked animation
    trigger = ScrollTrigger.create({
      trigger: '.page', // Trigger element
      start: 'top top', // Start when page top reaches viewport top
      end: 'max', // End at bottom of page
      scrub: true, // Link animation to scrollbar directly
      invalidateOnRefresh: true, // Recalculate on window resize
      onUpdate: (self) => {
        // Update target frame based on scroll progress (0 to 1)
        targetFrame = self.progress * (totalFrames - 1)
        // Track scroll velocity for adaptive smoothing
        scrollVelocity = Math.abs(self.getVelocity())
        updateProgressUi(self.progress)
      },
    })

    // Initialize animation
    resizeCanvas()
    updateScrollProgress()
    preloadFrames()
    renderLoop()

    // Setup event listeners
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    window.addEventListener('resize', onResize)

    // Cleanup function - runs when component unmounts
    return () => {
      disposed = true // Signal all async operations to stop
      cancelAnimationFrame(rafId) // Stop main render loop
      cancelAnimationFrame(resizeRaf) // Stop resize handler
      trigger?.kill() // Cleanup GSAP ScrollTrigger
      window.removeEventListener('scroll', updateScrollProgress)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // Render component structure using createElement for performance
  return createElement(
    'div',
    { className: 'video-motion-shell', ref: shellRef, 'aria-hidden': 'true' },
    // Canvas for rendering frame sequence
    createElement('canvas', {
      className: 'video-motion-canvas',
      ref: canvasRef,
    }),
    // Progress bar showing scroll position
    createElement(
      'div',
      { className: 'video-motion-progress', 'aria-hidden': 'true' },
      createElement('div', {
        className: 'video-motion-progress-fill',
        ref: progressFillRef,
      }),
      createElement('span', { className: 'video-motion-progress-text', ref: progressLabelRef }, '0%'),
    ),
    // Loading indicator (fades out when animation is ready)
    createElement(
      'div',
      { className: 'video-motion-loading', ref: loadingRef, 'aria-hidden': 'true' },
      createElement('span', { className: 'video-motion-loading-text', ref: loadingTextRef }, 'Loading frames 0%'),
    ),
  )
}
