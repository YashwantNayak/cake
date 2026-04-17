import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  createDefaultScrollMotionTarget,
  setCharTimeline,
} from './modelMotion'
import { HomeVideoMotion } from './videomotion'
import cakefloatImg from './assets/cakefloat.png'
import './App.css'

/**
 * HeroCakeModel Component
 * Renders a 3D cake model using Three.js with interactive controls
 * Features:
 * - Loads a GLTF model from /cake.glb
 * - Responds to scroll events and mouse movement
 * - Uses GSAP timeline for smooth animations
 * - Properly handles cleanup and memory management
 */
function HeroCakeModel() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) {
      return
    }

    // Initialize Three.js scene and camera
    const scene = new THREE.Scene()
    const targetLookAt = new THREE.Vector3()
    const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 200)
    camera.position.set(0, 0.2, 6)

    // Setup WebGL renderer with optimized settings for visual quality
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Limit pixel ratio for performance
    renderer.outputColorSpace = THREE.SRGBColorSpace // Correct color space
    renderer.toneMapping = THREE.ACESFilmicToneMapping // Professional tone mapping
    renderer.toneMappingExposure = 1.15 // Adjust brightness
    renderer.setClearColor(0x000000, 0) // Transparent background
    container.appendChild(renderer.domElement)

    // Setup professional 3-point lighting system
    // Ambient: Overall illumination
    const ambient = new THREE.AmbientLight(0xffffff, 1.0)
    // Hemisphere: Sky dome lighting for natural feel
    const hemi = new THREE.HemisphereLight(0xfff5db, 0xffffff, 0.7)
    // Key Light: Main directional light from front-right
    const keyLight = new THREE.DirectionalLight(0xfff1d1, 1.9)
    // Fill Light: Softens shadows from left
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.85)
    // Rim Light: Backlight for model definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.65)
    keyLight.position.set(4, 6, 6)
    fillLight.position.set(-5, 2, 4)
    rimLight.position.set(0, 2, -5)
    scene.add(ambient, hemi, keyLight, fillLight, rimLight)

    // Model state management
    let model: THREE.Object3D | null = null
    const rightAnchorX = 0.85 // Position offset for model (anchored to the right)
    const modelSize = new THREE.Vector3(2, 2, 2) // Will be updated after model loads
    let baseModelScale = 1
    const cameraBase = { x: rightAnchorX * 0.32, y: 0.2, z: 6 }
    const cameraCurrent = { x: cameraBase.x, y: cameraBase.y, z: cameraBase.z }
    const scrollTarget = createDefaultScrollMotionTarget()
    const cleanupTimelines = setCharTimeline(scrollTarget)
    
    // Smooth animation state - tracks current values, animates towards targets
    const motionCurrent = {
      posX: 0,
      posY: 0,
      posZ: 0,
      rotX: 0.12,
      rotY: 0.2,
      rotZ: 0,
      scale: 1,
      floatAmplitude: 0.06,
    }
    // Mouse interaction tracking
    const interactiveSurface = container.parentElement ?? container
    const mouseTarget = { x: 0, y: 0 } // Target position from pointer
    const mouseCurrent = { x: 0, y: 0 } // Smoothly interpolated pointer position

    // Tracks user mouse movement to rotate model
    const handlePointerMove = (event: PointerEvent) => {
      const rect = interactiveSurface.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }

      // Normalize pointer position to -1 to 1 range
      const normX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const normY = ((event.clientY - rect.top) / rect.height) * 2 - 1
      // Convert normalized coordinates to rotation amounts (with clamp to prevent extreme rotations)
      mouseTarget.y = THREE.MathUtils.clamp(normX, -1, 1) * 0.14
      mouseTarget.x = THREE.MathUtils.clamp(-normY, -1, 1) * 0.08
    }

    // Reset pointer rotation when mouse leaves the interactive area
    const resetPointer = () => {
      mouseTarget.x = 0
      mouseTarget.y = 0
    }

    interactiveSurface.addEventListener('pointermove', handlePointerMove)
    interactiveSurface.addEventListener('pointerleave', resetPointer)
    
    // Calculate optimal camera position to frame the entire model in view
    const fitCameraToModel = () => {
      const width = Math.max(container.clientWidth, 1)
      const height = Math.max(container.clientHeight, 1)

      // Calculate field of view angles
      const vFov = THREE.MathUtils.degToRad(camera.fov)
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (width / height))

      // Compute required camera distance to frame model completely
      const fitHeightDistance = modelSize.y / (2 * Math.tan(vFov / 2))
      const fitWidthDistance = modelSize.x / (2 * Math.tan(hFov / 2))
      const baseDistance = Math.max(fitHeightDistance, fitWidthDistance)
      const distance = baseDistance * 0.96 + modelSize.z * 0.28 // Add slight padding and depth offset

      // Update camera clipping planes for optimal depth precision
      camera.near = Math.max(0.01, distance / 120)
      camera.far = distance * 80
      // Reset camera base position
      cameraBase.x = rightAnchorX * 0.32
      cameraBase.y = modelSize.y * 0.1
      cameraBase.z = distance
      cameraCurrent.x = cameraBase.x
      cameraCurrent.y = cameraBase.y
      cameraCurrent.z = cameraBase.z
      camera.position.set(cameraBase.x, cameraBase.y, cameraBase.z)
      targetLookAt.set(rightAnchorX, scrollTarget.lookAtOffsetY, 0)
      camera.lookAt(targetLookAt)
      camera.updateProjectionMatrix()
    }

    // Load 3D model from GLB file
    const loader = new GLTFLoader()
    loader.load(
      '/cake.glb',
      (gltf: GLTF) => {
        model = gltf.scene

        // Configure all meshes in the model for proper rendering
        model.traverse((child: THREE.Object3D) => {
          const mesh = child as THREE.Mesh
          if (!mesh.isMesh) {
            return
          }
          // Disable shadows for performance
          mesh.castShadow = false
          mesh.receiveShadow = false
          // Render both sides of the geometry (prevents backface culling)
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              mat.side = THREE.DoubleSide
            })
          } else {
            mesh.material.side = THREE.DoubleSide
          }
        })

        // Calculate model dimensions and scale appropriately
        let bounds = new THREE.Box3().setFromObject(model)
        const size = bounds.getSize(new THREE.Vector3())
        const maxAxis = Math.max(size.x, size.y, size.z, 0.001)
        const scale = 3.55 / maxAxis // Scale model to standard size
        model.scale.setScalar(scale)
        baseModelScale = scale

        // Center the model at origin
        bounds.setFromObject(model)
        const centered = bounds.getCenter(new THREE.Vector3())
        model.position.sub(centered)

        // Store final model dimensions for camera fitting
        bounds = new THREE.Box3().setFromObject(model)
        const centeredSize = bounds.getSize(new THREE.Vector3())
        modelSize.copy(centeredSize)

        model.position.set(0, 0, 0)

        scene.add(model)
        fitCameraToModel() // Adjust camera to frame the loaded model
      },
      undefined,
      (error: unknown) => {
        console.error('Failed to load /cake.glb:', error)
      },
    )

    // Handle container resize events
    const resize = () => {
      const width = Math.max(container.clientWidth, 1)
      const height = Math.max(container.clientHeight, 1)
      camera.aspect = width / height // Update camera aspect ratio
      fitCameraToModel() // Recalculate camera position
      renderer.setSize(width, height) // Update canvas resolution
    }

    // Monitor container size changes
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    window.addEventListener('resize', resize)
    resize() // Initial sizing

    // Animation loop setup
    const clock = new THREE.Clock()
    let frameId = 0

    // Main render loop - runs every frame
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime() // Time in seconds since animation started

      if (model) {
        // Smooth mouse cursor tracking (lerp = linear interpolation for smooth following)
        mouseCurrent.x = THREE.MathUtils.lerp(mouseCurrent.x, mouseTarget.x, 0.06)
        mouseCurrent.y = THREE.MathUtils.lerp(mouseCurrent.y, mouseTarget.y, 0.06)

        // Smoothly animate model position from scroll timeline
        motionCurrent.posX = THREE.MathUtils.lerp(
          motionCurrent.posX,
          scrollTarget.modelX,
          0.05,
        )
        motionCurrent.posY = THREE.MathUtils.lerp(
          motionCurrent.posY,
          scrollTarget.modelY,
          0.05,
        )
        motionCurrent.posZ = THREE.MathUtils.lerp(
          motionCurrent.posZ,
          scrollTarget.modelZ,
          0.05,
        )

        // Smoothly animate model rotation from scroll timeline
        motionCurrent.rotX = THREE.MathUtils.lerp(
          motionCurrent.rotX,
          scrollTarget.rotX,
          0.05,
        )
        motionCurrent.rotY = THREE.MathUtils.lerp(
          motionCurrent.rotY,
          scrollTarget.rotY,
          0.05,
        )
        motionCurrent.rotZ = THREE.MathUtils.lerp(
          motionCurrent.rotZ,
          scrollTarget.rotZ,
          0.05,
        )

        // Smoothly animate scale and floating amplitude
        motionCurrent.scale = THREE.MathUtils.lerp(
          motionCurrent.scale,
          scrollTarget.scale,
          0.05,
        )
        motionCurrent.floatAmplitude = THREE.MathUtils.lerp(
          motionCurrent.floatAmplitude,
          scrollTarget.floatAmplitude,
          0.05,
        )

        // Apply rotation: scroll timeline rotation + mouse pointer influence
        const pointerMix = scrollTarget.pointerInfluence
        model.rotation.x = motionCurrent.rotX + mouseCurrent.x * pointerMix
        model.rotation.y = motionCurrent.rotY + mouseCurrent.y * pointerMix
        model.rotation.z = motionCurrent.rotZ

        // Apply position: set from scroll timeline + floating bobbing animation
        model.position.x = motionCurrent.posX
        model.position.y =
          motionCurrent.posY + Math.sin(t * 1.2) * motionCurrent.floatAmplitude // Sine wave for gentle bobbing
        model.position.z = motionCurrent.posZ
        model.position.x += rightAnchorX // Anchor to right side of screen
        model.scale.setScalar(baseModelScale * motionCurrent.scale)

        // Smoothly animate camera position based on scroll timeline
        cameraCurrent.x = THREE.MathUtils.lerp(
          cameraCurrent.x,
          cameraBase.x + scrollTarget.cameraOffsetX,
          0.06,
        )
        cameraCurrent.y = THREE.MathUtils.lerp(
          cameraCurrent.y,
          cameraBase.y + scrollTarget.cameraOffsetY,
          0.06,
        )
        cameraCurrent.z = THREE.MathUtils.lerp(
          cameraCurrent.z,
          cameraBase.z + scrollTarget.cameraOffsetZ,
          0.06,
        )
        // Update camera position and make it look at the model
        camera.position.set(cameraCurrent.x, cameraCurrent.y, cameraCurrent.z)
        targetLookAt.set(rightAnchorX, scrollTarget.lookAtOffsetY, 0)
        camera.lookAt(targetLookAt)
      }

      // Render the scene with the camera
      renderer.render(scene, camera)
    }

    // Start the animation loop
    animate()

    // Cleanup function - runs when component unmounts
    return () => {
      cancelAnimationFrame(frameId) // Stop animation loop
      cleanupTimelines() // Clean up GSAP timelines
      resizeObserver.disconnect() // Stop observing container size
      window.removeEventListener('resize', resize) // Remove resize listener
      interactiveSurface.removeEventListener('pointermove', handlePointerMove)
      interactiveSurface.removeEventListener('pointerleave', resetPointer)

      // Properly dispose of all Three.js resources to prevent memory leaks
      scene.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) {
          return
        }

        mesh.geometry.dispose()
        const material = mesh.material
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose())
        } else {
          material.dispose()
        }
      })

      renderer.dispose()
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div className="three-model-layer" ref={mountRef} aria-hidden="true" />
}

function App() {
  return (
    <main className="page">
      <header className="navbar">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">
            {/* Logo icon placeholder */}
          </span>
          <span className="brand-text">LOGO</span>
        </div>
        {/* <nav aria-label="Primary navigation">
          <ul className="nav-list">
            <li>
              <a href="#">home</a>
            </li>
            <li>
              <a href="#">about</a>
            </li>
            <li>
              <a href="#">product</a>
            </li>
            <li>
              <a href="#">login</a>
            </li>
          </ul>
        </nav> */}
      </header>

      <section className="hero-section section-grid landing-section">
        {/* Hero Text Content */}
        <div className="hero-copy">
          <h3>The</h3>
          <h1>Preety</h1>
          <h2>Bakes</h2>
          <p>
            A cake bakery is a specialized culinary establishment producing
            premium baked goods, including customizable celebration cakes,
            cupcakes, pastries, and artisanal desserts, often featuring rich
            ingredients like buttercream, chocolate, and fruits.
          </p>
        </div>
        
        {/* Scroll-triggered frame animation sequence */}
        <HomeVideoMotion />
        
        {/* 3D model with scroll and pointer interaction */}
        <HeroCakeModel />
        
        {/* Floating chocolate/cake image with 3D hover effect */}
        <div className="hero-floating-bg">
          <div className="floating-image">
            <img 
              src={cakefloatImg}
              alt="Floating chocolate and cake pieces" 
            />
          </div>
        </div>
      </section>

      {/* Gallery Section - Photo gallery */}
      <section className="gallery-section section-grid about-section">
        <div className="gallery-visual" aria-hidden="true">
          {/* Visual area for gallery - can be used for animations or backgrounds */}
        </div>
        <div className="gallery-content">
          <div className="photo-grid" aria-label="Gallery placeholders">
            <div className="photo-card large" />
            <div className="photo-card" />
            <div className="photo-card" />
          </div>
          <p className="script-label">photo</p>
        </div>
      </section>

      {/* Products Section - Showcase baked goods */}
      <section className="products-section whatIDO">
        <div className="product-grid">
          <article className="product">
            <div className="product-card" />
            <div className="product-pill" aria-hidden="true" />
          </article>

          <article className="product">
            <div className="product-card" />
            <div className="product-pill" aria-hidden="true" />
          </article>

          <article className="product">
            <div className="product-card" />
            <div className="product-pill" aria-hidden="true" />
          </article>
        </div>
      </section>
    </main>
  )
}

export default App
