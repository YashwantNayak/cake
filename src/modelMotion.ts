/**
 * Model Motion Control System
 * Manages scroll-linked animations for the 3D cake model using GSAP ScrollTrigger
 * 
 * How it works:
 * 1. Define keyframes for each page section (landing, about, products)
 * 2. Create GSAP timelines that sync to scroll position
 * 3. Animate the model's position, rotation, scale, and camera based on scroll
 * 4. Support different keyframes for mobile vs desktop
 * 
 * Keyframes define:
 * - modelPosition: X, Y, Z position of the 3D model
 * - rotation: X, Y, Z rotation (in radians)
 * - scale: Model scale factor
 * - cameraOffset: Offset from base camera position
 * - floatAmplitude: Amount of bobbing animation
 * - pointerInfluence: How much mouse movement affects rotation (0-1)
 */

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * ScrollMotionTarget: The target values for model animation
 * These values are animated by GSAP timelines based on scroll position
 */
export type ScrollMotionTarget = {
  modelX: number // Horizontal position (-left, +right)
  modelY: number // Vertical position (-down, +up)
  modelZ: number // Depth position (-away, +toward camera)
  rotX: number // X-axis rotation in radians
  rotY: number // Y-axis rotation in radians
  rotZ: number // Z-axis rotation in radians
  scale: number // Model scale (0.5 = half size, 2 = double size)
  floatAmplitude: number // Amplitude of vertical bobbing animation
  cameraOffsetX: number // Camera offset from base X
  cameraOffsetY: number // Camera offset from base Y
  cameraOffsetZ: number // Camera offset from base Z (zoom)
  lookAtOffsetY: number // Where camera looks (vertical offset)
  pointerInfluence: number // Mouse influence on rotation (0 = none, 1 = full)
}

// 3D vector type: [x, y, z]
export type Vec3 = [number, number, number]

/**
 * MotionKeyframe: Defines animation target at a specific timeline position
 * The `at` value (0-1) represents progress through a scroll section
 * Only specified properties are animated; others maintain their current values
 */
export type MotionKeyframe = {
  at: number // Timeline progress (0 = section start, 1 = section end)
  modelPosition?: Vec3 // Target position
  rotation?: Vec3 // Target rotation (in radians)
  scale?: number // Target scale
  floatAmplitude?: number // Target floating amplitude
  cameraOffset?: Vec3 // Target camera offset
  lookAtOffsetY?: number // Target look-at position
  pointerInfluence?: number // Target mouse influence
}

/**
 * Landing Section Animation
 * Animates the model entering from the left side with rotation
 * Timeline: scrolls through the entire landing section
 */
export const LANDING_KEYFRAMES: MotionKeyframe[] = [
  {
    at: 0, // Start of landing section
    modelPosition: [-1.6, -1.5, 0], // Model on left side
    rotation: [0.12, 0.2, 0], // Slight tilt and rotation
    floatAmplitude: 0.06, // Gentle bobbing
  },
  {
    at: 1, // End of landing section
    modelPosition: [-2.4, -1.5, 0], // Model moves further left
    rotation: [0.3, 0.2, 0], // More rotation
    floatAmplitude: 0.03, // Reduced bobbing
  },
]

/**
 * About Section - Desktop
 * Shows the model turning towards camera with camera movement
 * Timeline: from section start to section center
 */
export const ABOUT_KEYFRAMES_DESKTOP: MotionKeyframe[] = [
  {
    at: 0,
    modelPosition: [-2.4, -1.5, 0], // Model on left side
    cameraOffset: [-0.22, 1.1, 0.5], // Camera moves left and up
    pointerInfluence: 0, // Disable mouse control
  },
  {
    at: 0.3, // About 30% through the section
    modelPosition: [-0.6, -1.5, 0], // Model rotates toward center
    rotation: [0.12, 0.92, 0], // Almost facing camera
    lookAtOffsetY: 0.5, // Camera looks slightly up
    floatAmplitude: 0.00, // No bobbing
  },
]

/**
 * About Section - Mobile
 * Simplified mobile animation with minimal camera movement
 */
export const ABOUT_KEYFRAMES_MOBILE: MotionKeyframe[] = [
  {
    at: 0,
    pointerInfluence: 0.2, // Less mouse influence on mobile
    floatAmplitude: 0.02, // Subtle bobbing
  },
]

/**
 * What I Do Section - Desktop
 * Shows model shrinking and moving down as user scrolls
 * Timeline: from section start to end
 */
export const WHAT_IDO_KEYFRAMES_DESKTOP: MotionKeyframe[] = [
  {
    at: 0,
    modelPosition: [-0.6, -1.5, 0], // Model centered
  },
  {
    at: 1, // End of products section
    modelPosition: [-0.6, -4.2, 0], // Model moves far down
    rotation: [-0.04, 0.92, 0], // Slight tilt
    scale: 0.32, // Shrink to 32% size
    floatAmplitude: 0, // No bobbing
  },
]

/**
 * What I Do Section - Mobile
 * Simplified mobile version with less extreme scaling
 */
export const WHAT_IDO_KEYFRAMES_MOBILE: MotionKeyframe[] = [
  {
    at: 0,
    modelPosition: [0.6, -1.5, 0], // Slightly offset for mobile
  },
  {
    at: 1,
    modelPosition: [0.6, -1.8, 0], // Subtle downward movement
    floatAmplitude: 0,
  },
]

/**
 * Convert a MotionKeyframe to GSAP tween variables
 * Extracts only the defined properties and formats them for GSAP animation
 */
function keyframeToTweenVars(frame: MotionKeyframe) {
  // Start with no easing (linear interpolation)
  const vars: Partial<ScrollMotionTarget> & { ease: 'none' } = {
    ease: 'none',
  }

  // Only animate properties that were specified in the keyframe
  if (frame.modelPosition) {
    vars.modelX = frame.modelPosition[0]
    vars.modelY = frame.modelPosition[1]
    vars.modelZ = frame.modelPosition[2]
  }

  if (frame.rotation) {
    vars.rotX = frame.rotation[0]
    vars.rotY = frame.rotation[1]
    vars.rotZ = frame.rotation[2]
  }

  if (frame.cameraOffset) {
    vars.cameraOffsetX = frame.cameraOffset[0]
    vars.cameraOffsetY = frame.cameraOffset[1]
    vars.cameraOffsetZ = frame.cameraOffset[2]
  }

  if (frame.scale !== undefined) {
    vars.scale = frame.scale
  }

  if (frame.floatAmplitude !== undefined) {
    vars.floatAmplitude = frame.floatAmplitude
  }

  if (frame.lookAtOffsetY !== undefined) {
    vars.lookAtOffsetY = frame.lookAtOffsetY
  }

  if (frame.pointerInfluence !== undefined) {
    vars.pointerInfluence = frame.pointerInfluence
  }

  return vars
}

/**
 * Apply keyframe animations to a GSAP timeline
 * Creates animation tweens between keyframes that will be controlled by ScrollTrigger
 */
function applySectionKeyframes(
  timeline: gsap.core.Timeline,
  motionTarget: ScrollMotionTarget,
  keyframes: MotionKeyframe[],
) {
  // For each keyframe, create a tween that animates to that keyframe's values
  // The `at` value determines when in the timeline each keyframe occurs
  keyframes.forEach((frame) => {
    timeline.to(motionTarget, keyframeToTweenVars(frame), frame.at)
  })
}

/**
 * Create the default motion target with initial values
 * These are the starting values for all animations
 */
export function createDefaultScrollMotionTarget(): ScrollMotionTarget {
  return {
    modelX: 0.6, // Slightly right of center
    modelY: -1.5, // Below center
    modelZ: 0,
    rotX: 0.12, // Slight forward tilt
    rotY: 0.2, // Slight left tilt
    rotZ: 0,
    scale: 0.35, // 35% of full size
    floatAmplitude: 0.06, // Gentle bobbing
    cameraOffsetX: 0,
    cameraOffsetY: 0,
    cameraOffsetZ: 0,
    lookAtOffsetY: 0,
    pointerInfluence: 1, // Full mouse control enabled
  }
}

/**
 * Setup all scroll-linked animation timelines
 * Creates GSAP timelines for each page section with ScrollTrigger
 * 
 * Returns a cleanup function to kill all timelines when component unmounts
 */
export function setCharTimeline(
  motionTarget: ScrollMotionTarget,
): () => void {
  // Detect device type for different animations
  const isDesktop = window.innerWidth > 1024
  
  // Track all timelines and triggers so we can clean them up later
  const timelines: gsap.core.Timeline[] = []
  const triggers: ScrollTrigger[] = []

  /**
   * Timeline 1: Landing Section
   * Plays while scrolling through the hero section at the top
   */
  const tl1 = gsap.timeline({
    scrollTrigger: {
      trigger: '.landing-section', // The element that triggers this animation
      start: 'top top', // Start when section top reaches viewport top
      end: 'bottom top', // End when section bottom leaves viewport
      scrub: true, // Sync animation directly to scrollbar
      invalidateOnRefresh: true, // Recalculate on resize
    },
  })
  applySectionKeyframes(tl1, motionTarget, LANDING_KEYFRAMES)
  timelines.push(tl1)

  /**
   * Timeline 2: About Section
   * Plays while scrolling through the about/gallery section
   * Uses different keyframes for mobile vs desktop
   */
  const tl2 = gsap.timeline({
    scrollTrigger: {
      trigger: '.about-section',
      start: 'top 75%', // Start when section top reaches 75% from top
      end: 'center center', // End when section center reaches viewport center
      scrub: true,
      invalidateOnRefresh: true,
    },
  })

  // Use different animation for mobile vs desktop
  if (isDesktop) {
    applySectionKeyframes(tl2, motionTarget, ABOUT_KEYFRAMES_DESKTOP)
  } else {
    applySectionKeyframes(tl2, motionTarget, ABOUT_KEYFRAMES_MOBILE)
  }
  timelines.push(tl2)

  /**
   * Pause Trigger: About Section Pin
   * Pins the about section to the viewport while user scrolls
   * Disables model animation while pinned
   */
  const pauseTrigger = ScrollTrigger.create({
    trigger: '.about-section',
    start: 'center center ', // Pin when section center reaches viewport center
    end: '+=200%', // Keep pinned for 200% of container's height
    pin: '.about-section', // Pin this element
    pinSpacing: true, // Add spacing for pinned section
    anticipatePin: 1, // Smooth pinning transition
    invalidateOnRefresh: true,
    onEnter: () => {
      // Disable animation when entering pinned area
      motionTarget.floatAmplitude = 0
      motionTarget.pointerInfluence = 0
    },
    onEnterBack: () => {
      // Also disable when scrolling back into pinned area
      motionTarget.floatAmplitude = 0
      motionTarget.pointerInfluence = 0
    },
  })
  triggers.push(pauseTrigger)

  /**
   * Timeline 3: Products (What I Do) Section
   * Plays while scrolling through the products section at the bottom
   * Model shrinks and moves down as user scrolls
   */
  const tl3 = gsap.timeline({
    scrollTrigger: {
      trigger: '.whatIDO',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      invalidateOnRefresh: true,
    },
  })

  // Use different animation for mobile vs desktop
  if (isDesktop) {
    applySectionKeyframes(tl3, motionTarget, WHAT_IDO_KEYFRAMES_DESKTOP)
  } else {
    applySectionKeyframes(tl3, motionTarget, WHAT_IDO_KEYFRAMES_MOBILE)
  }
  timelines.push(tl3)

  // Refresh ScrollTrigger to recalculate all trigger positions
  ScrollTrigger.refresh()

  /**
   * Return cleanup function
   * Kills all timelines and triggers to prevent memory leaks when component unmounts
   */
  return () => {
    timelines.forEach((timeline) => {
      timeline.scrollTrigger?.kill() // Kill the ScrollTrigger instance
      timeline.kill() // Kill the timeline animation
    })
    triggers.forEach((trigger) => trigger.kill()) // Kill standalone triggers
  }
}
