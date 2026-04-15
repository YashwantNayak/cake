export type Vec3 = [number, number, number]

export type ModelMotionKeyframe = {
  progress: number
  position: Vec3
  rotation: Vec3
  scale: number
  floatAmplitude: number
}

export type ModelMotionState = {
  position: Vec3
  rotation: Vec3
  scale: number
  floatAmplitude: number
}

// Edit these keyframes to control model movement across full-page scroll.
// progress: 0 = page top, 1 = page bottom
export const MODEL_MOTION_KEYFRAMES: ModelMotionKeyframe[] = [
  {
    progress: 0,
    position: [0.6, -1.50, 0],
    rotation: [0.12, 0.2, 0],
    scale: 0.35,
    floatAmplitude: 0.06,
  },
  {
    progress: 0.2,
    position: [-2.6, -1.50, 0],
    rotation: [0.12, 0.2, 0],
    scale: 0.35,
    floatAmplitude: 0.06,
  },
  {
    progress: 0.4,
    position: [-2.6, -1.50, 0],
    rotation: [0.12, 0.2, 0],
    scale: 0.35,
    floatAmplitude: 0.06,
  },
  {
    progress: 0.8,
    position: [-2.6, -1.50, 0],
    rotation: [0.12, 0.2, 0],
    scale: 0.35,
    floatAmplitude: 0.06,
  },
  {
    progress: 0.9,
    position: [0.6, -1.50, 0],
    rotation: [0.12, 0.2, 0],
    scale: 0.35,
    floatAmplitude: 0.00,
  },
   {
    progress: 1,
    position: [0.6, -1.50, 0],
    rotation: [0.12, 0.2, 0],
    scale: 0.35,
    floatAmplitude: 0.00,
  },
 
 
]

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

export function getPageScrollProgress(): number {
  const scrollable = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    1,
  )
  return clamp01(window.scrollY / scrollable)
}

export function getMotionFromProgress(progressInput: number): ModelMotionState {
  const progress = clamp01(progressInput)
  const frames = MODEL_MOTION_KEYFRAMES

  if (frames.length === 0) {
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
      floatAmplitude: 0,
    }
  }

  if (progress <= frames[0].progress) {
    return frames[0]
  }

  const last = frames[frames.length - 1]
  if (progress >= last.progress) {
    return last
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i]
    const next = frames[i + 1]
    if (progress >= current.progress && progress <= next.progress) {
      const segment = Math.max(next.progress - current.progress, 0.0001)
      const t = (progress - current.progress) / segment
      return {
        position: lerpVec3(current.position, next.position, t),
        rotation: lerpVec3(current.rotation, next.rotation, t),
        scale: lerp(current.scale, next.scale, t),
        floatAmplitude: lerp(current.floatAmplitude, next.floatAmplitude, t),
      }
    }
  }

  return last
}
