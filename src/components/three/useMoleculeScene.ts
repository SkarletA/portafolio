import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GROUP_COLORS } from '@portfolio-data/groups'
import { MOLECULE_ATOMS } from './moleculeAtoms'
import { MOLECULE_EDGES, MOLECULE_POSITIONS, TREE_EDGES, TREE_POSITIONS } from './moleculeData'
import { advanceProgress, interpolatePositions, normalizeAngle, smoothstep } from './morph'
import { createTileTexture } from './tileTexture'

const PARTICLE_COUNT = 220
const PARTICLE_COLORS = ['#2dd4bf', '#ff4d5e', '#fbbf24']
const UP = new Vector3(0, 1, 0)

interface TooltipRefs {
  containerRef: RefObject<HTMLDivElement | null>
  titleRef: RefObject<HTMLElement | null>
  descriptionRef: RefObject<HTMLElement | null>
}

interface UseMoleculeSceneOptions {
  enabled: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  containerRef: RefObject<HTMLElement | null>
  compiled: boolean
  tooltip: TooltipRefs
  onInteractionStart?: () => void
}

interface UseMoleculeSceneResult {
  contextLost: boolean
}

export function useMoleculeScene({
  enabled,
  canvasRef,
  containerRef,
  compiled,
  tooltip,
  onInteractionStart,
}: UseMoleculeSceneOptions): UseMoleculeSceneResult {
  const [contextLost, setContextLost] = useState(false)
  const compiledRef = useRef(compiled)

  useEffect(() => {
    compiledRef.current = compiled
  }, [compiled])

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let cancelled = false
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const scene = new Scene()
    const camera = new PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0, 10.8)
    const group = new Group()
    scene.add(group)

    const disposableMaterials: { dispose: () => void }[] = []
    const disposableGeometries: { dispose: () => void }[] = []

    // Los sprites se reconstruyen cuando document.fonts.ready resuelve (la
    // primera tanda de texturas se dibuja con la fuente de respaldo). Se
    // gestionan aparte del resto porque, a diferencia de todo lo demás en
    // esta escena, se liberan y se vuelven a crear más de una vez.
    let sprites: Sprite[] = []
    function disposeSprites() {
      sprites.forEach((sprite) => {
        group.remove(sprite)
        const material = sprite.material as SpriteMaterial
        material.map?.dispose()
        material.dispose()
      })
      sprites = []
    }
    function buildSprites() {
      disposeSprites()
      sprites = MOLECULE_ATOMS.map((atom, i) => {
        const texture = createTileTexture(atom.symbol, atom.name, i, GROUP_COLORS[atom.group])
        const material = new SpriteMaterial({ map: texture, transparent: true })
        const sprite = new Sprite(material)
        sprite.scale.set(0.95, 0.95, 1)
        sprite.userData.index = i
        group.add(sprite)
        return sprite
      })
    }
    buildSprites()

    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          if (!cancelled) buildSprites()
        })
        .catch(() => undefined)
    }

    const cylinderGeometry = new CylinderGeometry(1, 1, 1, 10)
    disposableGeometries.push(cylinderGeometry)

    function makeCylinder(color: number) {
      const material = new MeshBasicMaterial({ color, transparent: true, opacity: 0 })
      disposableMaterials.push(material)
      const mesh = new Mesh(cylinderGeometry, material)
      group.add(mesh)
      return mesh
    }

    const moleculeCylinders = MOLECULE_EDGES.map(() => makeCylinder(0x9fb4cc))
    const moleculeSecondBondCylinders = MOLECULE_EDGES.map((edge) => (edge.double ? makeCylinder(0x9fb4cc) : null))
    const treeCylinders = TREE_EDGES.map(() => makeCylinder(0xff4d5e))

    const tmpA = new Vector3()
    const tmpB = new Vector3()
    const tmpDirection = new Vector3()
    const tmpMid = new Vector3()
    const tmpPerp = new Vector3()

    function placeCylinder(mesh: Mesh, a: Vector3, b: Vector3, radius: number, offset: Vector3 | null) {
      tmpA.copy(a)
      tmpB.copy(b)
      if (offset) {
        tmpA.add(offset)
        tmpB.add(offset)
      }
      tmpDirection.subVectors(tmpB, tmpA)
      const distance = tmpDirection.length()
      const length = Math.max(distance - 0.95, 0.01)
      tmpMid.addVectors(tmpA, tmpB).multiplyScalar(0.5)
      mesh.position.copy(tmpMid)
      mesh.scale.set(radius, length, radius)
      mesh.quaternion.setFromUnitVectors(UP, tmpDirection.normalize())
    }

    const torusGeometry = new TorusGeometry(0.98, 0.045, 16, 80)
    const torusGeometry2 = new TorusGeometry(0.98, 0.16, 16, 80)
    disposableGeometries.push(torusGeometry, torusGeometry2)
    const torusMaterial = new MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    const torusMaterial2 = new MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.08,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    disposableMaterials.push(torusMaterial, torusMaterial2)
    const torus = new Mesh(torusGeometry, torusMaterial)
    const torus2 = new Mesh(torusGeometry2, torusMaterial2)
    group.add(torus, torus2)

    const electronGeometry = new SphereGeometry(0.07, 12, 12)
    disposableGeometries.push(electronGeometry)
    const electronMaterial = new MeshBasicMaterial({ color: 0xbffcf3 })
    disposableMaterials.push(electronMaterial)
    const electrons = Array.from({ length: 4 }, () => {
      const mesh = new Mesh(electronGeometry, electronMaterial)
      group.add(mesh)
      return mesh
    })

    const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
    const particleColors = new Float32Array(PARTICLE_COUNT * 3)
    const paletteColors = PARTICLE_COLORS.map((hex) => new Color(hex))
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const radius = 3.2 + Math.random() * 4.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.8
      particlePositions[i * 3 + 2] = radius * Math.cos(phi) - 1
      const color = paletteColors[i % paletteColors.length]
      particleColors[i * 3] = color.r
      particleColors[i * 3 + 1] = color.g
      particleColors[i * 3 + 2] = color.b
    }
    const particleGeometry = new BufferGeometry()
    particleGeometry.setAttribute('position', new BufferAttribute(particlePositions, 3))
    particleGeometry.setAttribute('color', new BufferAttribute(particleColors, 3))
    disposableGeometries.push(particleGeometry)
    const particleMaterial = new PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    disposableMaterials.push(particleMaterial)
    const particles = new Points(particleGeometry, particleMaterial)
    scene.add(particles)

    function resize() {
      const width = container.clientWidth
      const height = container.clientHeight
      if (width === 0 || height === 0) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    let sceneVisible = true
    const intersectionObserver = new IntersectionObserver((entries) => {
      sceneVisible = entries[0]?.isIntersecting ?? true
    })
    intersectionObserver.observe(container)

    let pageVisible = !document.hidden
    function handleVisibilityChange() {
      pageVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    function handleContextLost(event: Event) {
      event.preventDefault()
      lost = true
      setContextLost(true)
    }
    canvas.addEventListener('webglcontextlost', handleContextLost)

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    let target = compiledRef.current ? 1 : 0
    let previousCompiled = compiledRef.current
    let progress = target
    let rotationY = 0
    let rotationX = 0
    let velocityY = 0
    let dragging = false
    let lastClientX = 0
    let lastClientY = 0
    let pointerNormalizedX = 0
    let pointerNormalizedY = 0
    let hoveredIndex = -1
    let hasInteracted = false
    let lost = false

    function handlePointerDown(event: PointerEvent) {
      dragging = true
      lastClientX = event.clientX
      lastClientY = event.clientY
      canvas.style.cursor = 'grabbing'
      if (!hasInteracted) {
        hasInteracted = true
        onInteractionStart?.()
      }
      try {
        canvas.setPointerCapture(event.pointerId)
      } catch {
        // Algunos navegadores en pruebas automatizadas no implementan setPointerCapture.
      }
    }

    function handlePointerUp() {
      dragging = false
      canvas.style.cursor = ''
    }

    const raycaster = new Raycaster()
    const mouse = new Vector2()

    function handlePointerMove(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect()
      pointerNormalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointerNormalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1

      if (dragging && !compiledRef.current) {
        const dx = event.clientX - lastClientX
        const dy = event.clientY - lastClientY
        lastClientX = event.clientX
        lastClientY = event.clientY
        rotationY += dx * 0.008
        velocityY = dx * 0.008
        rotationX = Math.max(-0.9, Math.min(0.9, rotationX + dy * 0.006))
      }

      mouse.set(pointerNormalizedX, -pointerNormalizedY)
      raycaster.setFromCamera(mouse, camera)
      const hit = raycaster.intersectObjects(sprites)[0]
      const tooltipEl = tooltip.containerRef.current
      if (hit) {
        const index = (hit.object as Sprite).userData.index as number
        hoveredIndex = index
        const atom = MOLECULE_ATOMS[index]
        if (tooltip.titleRef.current) tooltip.titleRef.current.textContent = atom.name
        if (tooltip.descriptionRef.current) tooltip.descriptionRef.current.textContent = atom.description
        if (tooltipEl) {
          const containerRect = container.getBoundingClientRect()
          const left = Math.min(event.clientX - containerRect.left + 14, containerRect.width - 230)
          tooltipEl.style.left = `${left}px`
          tooltipEl.style.top = `${event.clientY - containerRect.top + 14}px`
          tooltipEl.style.opacity = '1'
        }
        canvas.style.cursor = dragging ? 'grabbing' : 'pointer'
      } else {
        hoveredIndex = -1
        if (tooltipEl) tooltipEl.style.opacity = '0'
        canvas.style.cursor = dragging ? 'grabbing' : ''
      }
    }

    function handlePointerLeave() {
      hoveredIndex = -1
      if (tooltip.containerRef.current) tooltip.containerRef.current.style.opacity = '0'
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)

    const currentPositions = MOLECULE_POSITIONS.map((v) => v.clone())
    const startTime = performance.now()
    let frameId = 0

    function frame(now: number) {
      frameId = requestAnimationFrame(frame)
      if (lost || !sceneVisible || !pageVisible) return

      const elapsed = (now - startTime) / 1000
      target = compiledRef.current ? 1 : 0
      if (compiledRef.current !== previousCompiled) {
        if (compiledRef.current) {
          rotationY = normalizeAngle(rotationY + Math.PI)
          rotationX = 0
        }
        previousCompiled = compiledRef.current
      }

      progress = advanceProgress(progress, target, 0.055)
      const eased = smoothstep(progress)

      if (!compiledRef.current) {
        if (!dragging) {
          velocityY *= 0.95
          rotationY += velocityY + (reducedMotion ? 0 : 0.0035)
        }
      } else {
        rotationY += (0 - rotationY) * 0.08
        rotationX += (0 - rotationX) * 0.08
      }
      group.rotation.y = rotationY + (dragging ? 0 : pointerNormalizedX * 0.18)
      group.rotation.x = rotationX + (dragging ? 0 : pointerNormalizedY * 0.12)
      particles.rotation.y = elapsed * 0.03 + rotationY * 0.3

      interpolatePositions(MOLECULE_POSITIONS, TREE_POSITIONS, eased, currentPositions)
      sprites.forEach((sprite, i) => {
        sprite.position.copy(currentPositions[i])
        const scale = (hoveredIndex === i ? 1.12 : 1) * 0.95
        sprite.scale.setScalar(scale)
      })

      MOLECULE_EDGES.forEach((edge, i) => {
        const opacity = (1 - eased) * 0.85
        const mesh = moleculeCylinders[i]
        mesh.visible = opacity > 0.02
        ;(mesh.material as MeshBasicMaterial).opacity = opacity
        const a = currentPositions[edge.from]
        const b = currentPositions[edge.to]
        const second = moleculeSecondBondCylinders[i]
        if (edge.double && second) {
          tmpPerp.set(-(b.y - a.y), b.x - a.x, 0).normalize()
          tmpMid.addVectors(a, b).multiplyScalar(0.5)
          if (tmpPerp.dot(tmpMid) > 0) tmpPerp.negate()
          const offset1 = tmpPerp.clone().multiplyScalar(0.075)
          const offset2 = tmpPerp.clone().multiplyScalar(-0.075)
          placeCylinder(mesh, a, b, 0.03, offset2)
          second.visible = mesh.visible
          ;(second.material as MeshBasicMaterial).opacity = opacity
          placeCylinder(second, a, b, 0.03, offset1)
        } else {
          placeCylinder(mesh, a, b, 0.04, null)
        }
      })

      TREE_EDGES.forEach((edge, i) => {
        const opacity = eased * 0.9
        const mesh = treeCylinders[i]
        mesh.visible = opacity > 0.02
        ;(mesh.material as MeshBasicMaterial).opacity = opacity
        placeCylinder(mesh, currentPositions[edge.from], currentPositions[edge.to], 0.04, null)
      })

      torusMaterial.opacity = 0.35 * (1 - eased)
      torusMaterial2.opacity = 0.08 * (1 - eased)
      torus.visible = eased < 0.98
      torus2.visible = eased < 0.98
      torus.scale.setScalar(1 - eased * 0.3)
      torus2.scale.setScalar(1 - eased * 0.3)
      electrons.forEach((electron, i) => {
        const angle = elapsed * 1.4 + i * (Math.PI / 2)
        electron.position.set(Math.cos(angle) * 0.98, Math.sin(angle) * 0.98, 0)
        electron.visible = eased < 0.9
      })

      renderer.render(scene, camera)
    }
    frameId = requestAnimationFrame(frame)

    return () => {
      cancelled = true
      lost = true
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)

      disposeSprites()
      disposableGeometries.forEach((geometry) => geometry.dispose())
      disposableMaterials.forEach((material) => material.dispose())
      renderer.dispose()
    }
  }, [enabled])

  return { contextLost }
}
