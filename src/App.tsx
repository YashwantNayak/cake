import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  createDefaultScrollMotionTarget,
  setCharTimeline,
} from './modelMotion'
import './App.css'

// const landscapePlaceholder = `data:image/svg+xml;utf8,${encodeURIComponent(
//   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420">
//     <rect width="800" height="420" fill="#bfe4f9"/>
//     <path d="M0 250 C110 170 180 250 290 220 C380 200 460 250 560 230 C660 210 710 250 800 200 L800 420 L0 420 Z" fill="#b8d58b"/>
//     <path d="M0 300 C90 270 160 330 260 300 C360 270 430 320 540 290 C640 260 710 320 800 290 L800 420 L0 420 Z" fill="#7ea300"/>
//     <circle cx="120" cy="84" r="22" fill="#f2f2f2"/>
//     <circle cx="148" cy="86" r="16" fill="#f2f2f2"/>
//     <circle cx="598" cy="84" r="18" fill="#f2f2f2"/>
//     <circle cx="620" cy="88" r="14" fill="#f2f2f2"/>
//     <circle cx="330" cy="58" r="20" fill="#f2f2f2"/>
//     <circle cx="356" cy="64" r="15" fill="#f2f2f2"/>
//   </svg>`,
// )}`

// const kawaiiCake = `data:image/svg+xml;utf8,${encodeURIComponent(
//   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420">
//     <rect width="420" height="420" fill="none"/>
//     <ellipse cx="210" cy="325" rx="132" ry="34" fill="#efefef" stroke="#4a4a4a" stroke-width="4"/>
//     <path d="M120 170 C130 130 290 130 300 170 L286 284 C276 316 144 316 134 284 Z" fill="#ffe9b8" stroke="#232323" stroke-width="6"/>
//     <path d="M128 194 C180 214 240 214 292 194" stroke="#ff8fb0" stroke-width="8" fill="none"/>
//     <path d="M124 236 C178 256 242 256 296 236" stroke="#ff8fb0" stroke-width="8" fill="none"/>
//     <path d="M100 178 C108 132 312 132 320 178 C328 222 94 222 100 178 Z" fill="#fff" stroke="#232323" stroke-width="6"/>
//     <path d="M110 170 C128 138 294 138 310 170 C286 204 134 204 110 170 Z" fill="#ffbad6"/>
//     <path d="M148 146 C168 122 252 122 272 146 C260 172 160 172 148 146 Z" fill="#8fe9ff"/>
//     <circle cx="210" cy="116" r="16" fill="#ffd24d" stroke="#232323" stroke-width="5"/>
//     <rect x="204" y="90" width="12" height="28" rx="6" fill="#ffa552"/>
//     <circle cx="176" cy="246" r="7" fill="#1d1d1d"/>
//     <circle cx="244" cy="246" r="7" fill="#1d1d1d"/>
//     <path d="M190 274 Q210 288 230 274" stroke="#1d1d1d" stroke-width="6" fill="none" stroke-linecap="round"/>
//     <circle cx="150" cy="154" r="7" fill="#ff6b9f"/>
//     <circle cx="272" cy="160" r="6" fill="#88d94f"/>
//     <circle cx="230" cy="152" r="5" fill="#ffd93d"/>
//     <circle cx="191" cy="160" r="5" fill="#8a8dff"/>
//   </svg>`,
// )}`

// const chocolateCake = `data:image/svg+xml;utf8,${encodeURIComponent(
//   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420">
//     <rect width="420" height="420" fill="none"/>
//     <ellipse cx="210" cy="320" rx="140" ry="36" fill="#e8e8e8" stroke="#82736a" stroke-width="4"/>
//     <path d="M110 170 C120 120 300 120 310 170 L298 270 C288 306 132 306 122 270 Z" fill="#fff6ea" stroke="#6f4f43" stroke-width="5"/>
//     <path d="M106 168 C120 126 300 126 314 168 C300 198 120 198 106 168 Z" fill="#4d2b20"/>
//     <path d="M112 172 C140 222 164 180 184 220 C198 248 220 180 236 214 C248 238 276 182 308 200" stroke="#6a3829" stroke-width="18" fill="none" stroke-linecap="round"/>
//     <path d="M110 274 C160 294 260 294 310 274" stroke="#dfa16f" stroke-width="16" fill="none"/>
//     <path d="M152 162 C178 136 202 136 226 162" stroke="#f3e8db" stroke-width="18" fill="none" stroke-linecap="round"/>
//     <path d="M208 154 C234 130 262 132 286 158" stroke="#f3e8db" stroke-width="18" fill="none" stroke-linecap="round"/>
//     <circle cx="170" cy="136" r="13" fill="#cf312e"/>
//     <circle cx="208" cy="126" r="12" fill="#e03a37"/>
//     <circle cx="244" cy="138" r="12" fill="#c83533"/>
//     <ellipse cx="272" cy="132" rx="16" ry="10" fill="#6a8e33"/>
//     <ellipse cx="188" cy="148" rx="14" ry="9" fill="#7ea84a"/>
//   </svg>`,
// )}`

function HeroCakeModel() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) {
      return
    }

    const scene = new THREE.Scene()
    const targetLookAt = new THREE.Vector3()
    const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 200)
    camera.position.set(0, 0.2, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, 1.0)
    const hemi = new THREE.HemisphereLight(0xfff5db, 0xffffff, 0.7)
    const keyLight = new THREE.DirectionalLight(0xfff1d1, 1.9)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.85)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.65)
    keyLight.position.set(4, 6, 6)
    fillLight.position.set(-5, 2, 4)
    rimLight.position.set(0, 2, -5)
    scene.add(ambient, hemi, keyLight, fillLight, rimLight)

    let model: THREE.Object3D | null = null
    const rightAnchorX = 0.85
    const modelSize = new THREE.Vector3(2, 2, 2)
    let baseModelScale = 1
    const cameraBase = { x: rightAnchorX * 0.32, y: 0.2, z: 6 }
    const cameraCurrent = { x: cameraBase.x, y: cameraBase.y, z: cameraBase.z }
    const scrollTarget = createDefaultScrollMotionTarget()
    const cleanupTimelines = setCharTimeline(scrollTarget)
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
    const interactiveSurface = container.parentElement ?? container
    const mouseTarget = { x: 0, y: 0 }
    const mouseCurrent = { x: 0, y: 0 }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = interactiveSurface.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }

      const normX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const normY = ((event.clientY - rect.top) / rect.height) * 2 - 1
      mouseTarget.y = THREE.MathUtils.clamp(normX, -1, 1) * 0.14
      mouseTarget.x = THREE.MathUtils.clamp(-normY, -1, 1) * 0.08
    }

    const resetPointer = () => {
      mouseTarget.x = 0
      mouseTarget.y = 0
    }

    interactiveSurface.addEventListener('pointermove', handlePointerMove)
    interactiveSurface.addEventListener('pointerleave', resetPointer)
    const fitCameraToModel = () => {
      const width = Math.max(container.clientWidth, 1)
      const height = Math.max(container.clientHeight, 1)

      const vFov = THREE.MathUtils.degToRad(camera.fov)
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (width / height))

      const fitHeightDistance = modelSize.y / (2 * Math.tan(vFov / 2))
      const fitWidthDistance = modelSize.x / (2 * Math.tan(hFov / 2))
      const baseDistance = Math.max(fitHeightDistance, fitWidthDistance)
      const distance = baseDistance * 0.96 + modelSize.z * 0.28

      camera.near = Math.max(0.01, distance / 120)
      camera.far = distance * 80
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

    const loader = new GLTFLoader()
    loader.load(
      '/cake.glb',
      (gltf: GLTF) => {
        model = gltf.scene

        model.traverse((child: THREE.Object3D) => {
          const mesh = child as THREE.Mesh
          if (!mesh.isMesh) {
            return
          }
          mesh.castShadow = false
          mesh.receiveShadow = false
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              mat.side = THREE.DoubleSide
            })
          } else {
            mesh.material.side = THREE.DoubleSide
          }
        })

        let bounds = new THREE.Box3().setFromObject(model)
        const size = bounds.getSize(new THREE.Vector3())
        const maxAxis = Math.max(size.x, size.y, size.z, 0.001)
        const scale = 3.55 / maxAxis
        model.scale.setScalar(scale)
        baseModelScale = scale

        bounds.setFromObject(model)
        const centered = bounds.getCenter(new THREE.Vector3())
        model.position.sub(centered)

        bounds = new THREE.Box3().setFromObject(model)
        const centeredSize = bounds.getSize(new THREE.Vector3())
        modelSize.copy(centeredSize)

        model.position.set(0, 0, 0)

        scene.add(model)
        fitCameraToModel()
      },
      undefined,
      (error: unknown) => {
        console.error('Failed to load /cake.glb:', error)
      },
    )

    const resize = () => {
      const width = Math.max(container.clientWidth, 1)
      const height = Math.max(container.clientHeight, 1)
      camera.aspect = width / height
      fitCameraToModel()
      renderer.setSize(width, height)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    window.addEventListener('resize', resize)
    resize()

    const clock = new THREE.Clock()
    let frameId = 0

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      if (model) {
        mouseCurrent.x = THREE.MathUtils.lerp(mouseCurrent.x, mouseTarget.x, 0.06)
        mouseCurrent.y = THREE.MathUtils.lerp(mouseCurrent.y, mouseTarget.y, 0.06)

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

        const pointerMix = scrollTarget.pointerInfluence
        model.rotation.x = motionCurrent.rotX + mouseCurrent.x * pointerMix
        model.rotation.y = motionCurrent.rotY + mouseCurrent.y * pointerMix
        model.rotation.z = motionCurrent.rotZ

        model.position.x = motionCurrent.posX
        model.position.y =
          motionCurrent.posY + Math.sin(t * 1.2) * motionCurrent.floatAmplitude
        model.position.z = motionCurrent.posZ
        model.position.x += rightAnchorX
        model.scale.setScalar(baseModelScale * motionCurrent.scale)

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
        camera.position.set(cameraCurrent.x, cameraCurrent.y, cameraCurrent.z)
        targetLookAt.set(rightAnchorX, scrollTarget.lookAtOffsetY, 0)
        camera.lookAt(targetLookAt)
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      cleanupTimelines()
      resizeObserver.disconnect()
      window.removeEventListener('resize', resize)
      interactiveSurface.removeEventListener('pointermove', handlePointerMove)
      interactiveSurface.removeEventListener('pointerleave', resetPointer)

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
            <textarea name="yash" id=""></textarea>
          </span>
          <span className="brand-text">LOGO</span>
        </div>
        <nav aria-label="Primary navigation">
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
        </nav>
      </header>

      <section className="hero-section section-grid landing-section">
        <div className="hero-copy">
          <h1>
            The
            <br />
            Pretty
            <br />
            Bakes
          </h1>
          <p>
            A cake bakery is a specialized culinary establishment producing
            premium baked goods, including customizable celebration cakes,
            cupcakes, pastries, and artisanal desserts, often featuring rich
            ingredients like buttercream, chocolate, and fruits.
          </p>
        </div>
        {/* <div className="hero-visual" aria-hidden="true">
          THREE.JS MOUNT POINT: Hero right column large 3D animation area
          <div className="blob blob-right" />
          <HeroCakeModel />
        </div> */}
        <HeroCakeModel />
      </section>

      <section className="gallery-section section-grid about-section">
        <div className="gallery-visual" aria-hidden="true">
          {/* THREE.JS MOUNT POINT: Photo section left column large 3D animation area */}
          {/* <div className="blob blob-left" /> */}
        </div>
        <div className="gallery-content">
          <div className="photo-grid" aria-label="Gallery placeholders">
            <div
              className="photo-card large"
              // style={{ backgroundImage: `url("${landscapePlaceholder}")` }}
            />
            <div
              className="photo-card"
              // style={{ backgroundImage: `url("${landscapePlaceholder}")` }}
            />
            <div
              className="photo-card"
              // style={{ backgroundImage: `url("${landscapePlaceholder}")` }}
            />
          </div>
          <p className="script-label">photo</p>
        </div>
      </section>

      <section className="products-section whatIDO">
        <div className="product-grid">
          <article className="product">
            <div className="product-card">
              {/* <img src={kawaiiCake} alt="Kawaii birthday cake illustration" /> */}
            </div>
            <div className="product-pill" aria-hidden="true" />
          </article>

          <article className="product">
            <div className="product-card" />
            <div className="product-pill" aria-hidden="true" />
          </article>

          <article className="product">
            <div className="product-card">
              {/* <img
                // src={chocolateCake}
                alt="Chocolate cake with cherries illustration"
              /> */}
            </div>
            <div className="product-pill" aria-hidden="true" />
          </article>
        </div>
      </section>
    </main>
  )
}

export default App
