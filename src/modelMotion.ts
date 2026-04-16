import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export type ScrollMotionTarget = {
  modelX: number
  modelY: number
  modelZ: number
  rotX: number
  rotY: number
  rotZ: number
  scale: number
  floatAmplitude: number
  cameraOffsetX: number
  cameraOffsetY: number
  cameraOffsetZ: number
  lookAtOffsetY: number
  pointerInfluence: number
}

export type Vec3 = [number, number, number]

export type MotionKeyframe = {
  at: number
  modelPosition?: Vec3
  rotation?: Vec3
  scale?: number
  floatAmplitude?: number
  cameraOffset?: Vec3
  lookAtOffsetY?: number
  pointerInfluence?: number
}

// Edit these keyframes to control where the model moves in each section.
// `at` is timeline progress from 0 to 1 for that section.
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

function keyframeToTweenVars(frame: MotionKeyframe) {
  const vars: Partial<ScrollMotionTarget> & { ease: 'none' } = {
    ease: 'none',
  }

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

function applySectionKeyframes(
  timeline: gsap.core.Timeline,
  motionTarget: ScrollMotionTarget,
  keyframes: MotionKeyframe[],
) {
  keyframes.forEach((frame) => {
    timeline.to(motionTarget, keyframeToTweenVars(frame), frame.at)
  })
}

export function createDefaultScrollMotionTarget(): ScrollMotionTarget {
  return {
    modelX: 0.6,
    modelY: -1.5,
    modelZ: 0,
    rotX: 0.12,
    rotY: 0.2,
    rotZ: 0,
    scale: 0.35,
    floatAmplitude: 0.06,
    cameraOffsetX: 0,
    cameraOffsetY: 0,
    cameraOffsetZ: 0,
    lookAtOffsetY: 0,
    pointerInfluence: 1,
  }
}

export function setCharTimeline(
  motionTarget: ScrollMotionTarget,
): () => void {
  const isDesktop = window.innerWidth > 1024
  const timelines: gsap.core.Timeline[] = []
  const triggers: ScrollTrigger[] = []

  const tl1 = gsap.timeline({
    scrollTrigger: {
      trigger: '.landing-section',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      invalidateOnRefresh: true,
    },
  })
  applySectionKeyframes(tl1, motionTarget, LANDING_KEYFRAMES)
  timelines.push(tl1)

  const tl2 = gsap.timeline({
    scrollTrigger: {
      trigger: '.about-section',
      start: 'top 75%',
      end: 'center center',
      scrub: true,
      invalidateOnRefresh: true,
    },
  })

  if (isDesktop) {
    applySectionKeyframes(tl2, motionTarget, ABOUT_KEYFRAMES_DESKTOP)
  } else {
    applySectionKeyframes(tl2, motionTarget, ABOUT_KEYFRAMES_MOBILE)
  }
  timelines.push(tl2)

  const pauseTrigger = ScrollTrigger.create({
    trigger: '.about-section',
    start: 'center center',
    end: '+=200%',
    pin: '.about-section',
    pinSpacing: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onEnter: () => {
      motionTarget.floatAmplitude = 0
      motionTarget.pointerInfluence = 0
    },
    onEnterBack: () => {
      motionTarget.floatAmplitude = 0
      motionTarget.pointerInfluence = 0
    },
  })
  triggers.push(pauseTrigger)

  const tl3 = gsap.timeline({
    scrollTrigger: {
      trigger: '.whatIDO',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      invalidateOnRefresh: true,
    },
  })

  if (isDesktop) {
    applySectionKeyframes(tl3, motionTarget, WHAT_IDO_KEYFRAMES_DESKTOP)
  } else {
    applySectionKeyframes(tl3, motionTarget, WHAT_IDO_KEYFRAMES_MOBILE)
  }
  timelines.push(tl3)

  ScrollTrigger.refresh()

  return () => {
    timelines.forEach((timeline) => {
      timeline.scrollTrigger?.kill()
      timeline.kill()
    })
    triggers.forEach((trigger) => trigger.kill())
  }
}
