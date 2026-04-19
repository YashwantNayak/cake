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
 * FULL PAGE KEYFRAME SYSTEM
 * Unified animation progression from page start (0) to end (1)
 * As user scrolls through entire website, model animates smoothly across all these keyframes
 * 
 * Progress Map:
 * 0.0   = Landing section start (hero)
 * 0.25  = Landing section end (model moving left)
 * 0.35  = About section start (model repositioning)
 * 0.5   = About section middle (model turning toward camera)
 * 0.65  = About section end (model facing camera, paused state)
 * 0.75  = Products section start (model begins shrinking)
 * 1.0   = Products section end (model fully shrunk, at bottom)
 */
export const FULL_PAGE_KEYFRAMES_DESKTOP: MotionKeyframe[] = [
  // ===== STAGE 0: LANDING SECTION START (Hero Introduction) =====
  {
    at: 0,
    modelPosition: [-1.6, -1.0, 0], // Model enters from left side
    rotation: [0.12, 0.2, 0], // Slight forward tilt and left rotation
    scale: 0.03, // Normal size
    floatAmplitude: 0.06, // Gentle bobbing
    cameraOffset: [0, 0, 0], // Camera center
    pointerInfluence: 1, // Mouse control enabled
  },

  // ===== STAGE 0.25: LANDING SECTION END (Transition) =====
  {
    at: 0.25,
    modelPosition: [-1.4, -1.5, 0], // Model moves further left
    rotation: [0.3, 0.2, 0], // More rotation
    floatAmplitude: 0.03, // Reduced bobbing
    pointerInfluence: 0.8, // Beginning to disable mouse control
  },

  // ===== STAGE 0.35: ABOUT SECTION START (Gallery/About Entry) =====
  {
    at: 0.35,
    modelPosition: [-2.0, -1.5, 0], // Model repositioning
    cameraOffset: [0, 0, 0], // Camera begins moving
    pointerInfluence: 0.5, // Further disable mouse influence
    floatAmplitude: 0.02,
  },

  // ===== STAGE 0.5: ABOUT SECTION MIDDLE (Turning toward Camera) =====
  {
    at: 0.5,
    modelPosition: [-0.6, -1.5, 0], // Model moves toward center
    rotation: [0.12, 0.92, 0], // Almost facing camera (Y rotation ~90°)
    cameraOffset: [-0.22, 1.1, 0.5], // Camera fully positioned
    lookAtOffsetY: 0.5, // Camera looks slightly up at face
    floatAmplitude: 0, // No bobbing
    pointerInfluence: 0, // Disable all mouse control
  },

  // ===== STAGE 0.65: ABOUT SECTION END (Paused/Pinned State) =====
  {
    at: 0.65,
    modelPosition: [-0.6, -1.5, 0], // Model stays centered, facing camera
    rotation: [0.12, 0.92, 0], // Maintains same rotation
    cameraOffset: [-0.22, 1.1, 0.5], // Camera stable
    floatAmplitude: 0, // Completely still
    pointerInfluence: 0, // No mouse influence
  },

  // ===== STAGE 0.75: PRODUCTS SECTION START (Transition Down) =====
  {
    at: 0.75,
    modelPosition: [-0.6, -2.0, 0], // Model begins moving down
    rotation: [-0.04, 0.92, 0], // Slight tilt
    scale: 0.33, // Start shrinking
    floatAmplitude: 0,
    pointerInfluence: 0,
    cameraOffset: [0, 0, 0], // Camera returns to normal
  },

  // ===== STAGE 1.0: PRODUCTS SECTION END (Full Page Bottom) =====
  {
    at: 1.0,
    modelPosition: [-0.6, -4.2, 0], // Model moves to far bottom
    rotation: [-0.04, 0.92, 0], // Slight tilt maintained
    scale: 0.32, // Fully shrunk
    floatAmplitude: 0, // No movement
    pointerInfluence: 0, // No mouse influence
    cameraOffset: [0, 0, 0], // Camera returns to normal
  },
]

/**
 * FULL PAGE KEYFRAME SYSTEM - MOBILE VERSION
 * Simplified animation for mobile devices with less dramatic changes
 */
export const FULL_PAGE_KEYFRAMES_MOBILE: MotionKeyframe[] = [
  // ===== STAGE 0: LANDING SECTION START =====
  {
    at: 0,
    modelPosition: [0.6, -1.5, 0],
    rotation: [0.12, 0.2, 0],
    scale: 0.35,
    floatAmplitude: 0.04,
    pointerInfluence: 0.3, // Reduced mouse influence on mobile
  },

  // ===== STAGE 0.25: LANDING SECTION END =====
  {
    at: 0.25,
    modelPosition: [1.4, -1.5, 0],
    rotation: [0.14, 0.3, 0],
    floatAmplitude: 0.02,
    pointerInfluence: 0.2,
  },

  // ===== STAGE 0.35: ABOUT SECTION START =====
  {
    at: 0.35,
    modelPosition: [1.2, -1.5, 0],
    floatAmplitude: 0.01,
    pointerInfluence: 0.1,
  },

  // ===== STAGE 0.5: ABOUT SECTION MIDDLE =====
  {
    at: 0.5,
    modelPosition: [0, -1.5, 0],
    rotation: [0.12, 0.45, 0], // Less extreme rotation on mobile
    floatAmplitude: 0,
    pointerInfluence: 0,
  },

  // ===== STAGE 0.65: ABOUT SECTION END =====
  {
    at: 0.65,
    modelPosition: [0, -1.5, 0],
    floatAmplitude: 0,
    pointerInfluence: 0,
  },

  // ===== STAGE 0.75: PRODUCTS SECTION START =====
  {
    at: 0.75,
    modelPosition: [0, -1.8, 0],
    scale: 0.34,
    floatAmplitude: 0,
  },

  // ===== STAGE 1.0: PRODUCTS SECTION END =====
  {
    at: 1.0,
    modelPosition: [0, -2.0, 0],
    scale: 0.32,
    floatAmplitude: 0,
    pointerInfluence: 0,
  },
]

// Legacy keyframes (kept for backward compatibility reference)
export const LANDING_KEYFRAMES: MotionKeyframe[] = [
  {
    at: 0,
    modelPosition: [-1.6, -1.5, 0],
    rotation: [0.12, 0.2, 0],
    floatAmplitude: 0.06,
  },
  {
    at: 1,
    modelPosition: [-2.4, -1.5, 0],
    rotation: [0.3, 0.2, 0],
    floatAmplitude: 0.03,
  },
]

export const ABOUT_KEYFRAMES_DESKTOP: MotionKeyframe[] = [
  {
    at: 0,
    modelPosition: [-2.4, -1.5, 0],
    cameraOffset: [-0.22, 1.1, 0.5],
    pointerInfluence: 0,
  },
  {
    at: 0.3,
    modelPosition: [-0.6, -1.5, 0],
    rotation: [0.12, 0.92, 0],
    lookAtOffsetY: 0.5,
    floatAmplitude: 0.00,
  },
]

export const ABOUT_KEYFRAMES_MOBILE: MotionKeyframe[] = [
  {
    at: 0,
    pointerInfluence: 0.2,
    floatAmplitude: 0.02,
  },
]

export const WHAT_IDO_KEYFRAMES_DESKTOP: MotionKeyframe[] = [
  {
    at: 0,
    modelPosition: [-0.6, -1.5, 0],
  },
  {
    at: 1,
    modelPosition: [-0.6, -4.2, 0],
    rotation: [-0.04, 0.92, 0],
    scale: 0.32,
    floatAmplitude: 0,
  },
]

export const WHAT_IDO_KEYFRAMES_MOBILE: MotionKeyframe[] = [
  {
    at: 0,
    modelPosition: [0.6, -1.5, 0],
  },
  {
    at: 1,
    modelPosition: [0.6, -1.8, 0],
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
 * Setup unified scroll-linked animation timeline
 * Creates ONE single GSAP timeline that controls the model animation across entire page scroll
 * Progress: 0 (top of page) → 1 (bottom of page)
 * 
 * As user scrolls from top to bottom, the model:
 * - Enters from left side (0 → 0.25)
 * - Repositions and turns toward camera (0.25 → 0.5)
 * - Stays centered and paused (0.5 → 0.65)
 * - Shrinks and moves down (0.65 → 1.0)
 * 
 * Returns a cleanup function to kill the timeline when component unmounts
 */
export function setCharTimeline(
  motionTarget: ScrollMotionTarget,
): () => void {
  // Detect device type for different animations
  const isDesktop = window.innerWidth > 1024
  
  // Select keyframes based on device
  const keyframes = isDesktop ? FULL_PAGE_KEYFRAMES_DESKTOP : FULL_PAGE_KEYFRAMES_MOBILE

  /**
   * Create ONE unified timeline for entire page scroll
   * Triggers on the document scrolling from top to bottom
   */
  const mainTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: 'body', // Track entire body scroll
      start: 'top top', // Start when body top is at viewport top
      end: 'bottom bottom', // End when body bottom reaches viewport bottom
      scrub: true, // Sync animation directly to scroll position
      invalidateOnRefresh: true, // Recalculate on window resize
      markers: false, // Set to true for debugging progress
    },
  })

  // Apply all keyframes to the single timeline
  // Each keyframe's `at` value (0-1) maps to scroll progress
  applySectionKeyframes(mainTimeline, motionTarget, keyframes)

  // Refresh ScrollTrigger to recalculate all positions and triggers
  ScrollTrigger.refresh()

  /**
   * Return cleanup function
   * Kills the timeline to prevent memory leaks when component unmounts
   */
  return () => {
    mainTimeline.scrollTrigger?.kill() // Kill the ScrollTrigger
    mainTimeline.kill() // Kill the timeline animation
  }
}
