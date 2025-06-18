// core/world.ts
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Noise } from 'noisejs'

export function generateProceduralTerrain(): THREE.Mesh {
  const width = 100, depth = 100, segments = 128
  const geometry = new THREE.PlaneGeometry(width, depth, segments, segments)
  const noise = new Noise(Math.random())

  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const x = geometry.attributes.position.getX(i)
    const y = geometry.attributes.position.getY(i)
    const z = noise.perlin2(x / 10, y / 10) * 4
    geometry.attributes.position.setZ(i, z)
  }

  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    color: 0x556B2F,
    flatShading: false,
    side: THREE.DoubleSide
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.receiveShadow = true

  return mesh
}

export function createTerrainCollider(heightMatrix: number[][], world: CANNON.World): CANNON.Body {
  const hfShape = new CANNON.Heightfield(heightMatrix, {
    elementSize: 100 / (heightMatrix[0].length - 1) // asumiendo que el ancho es 100
  })

  const hfBody = new CANNON.Body({ mass: 0 })
  hfBody.addShape(hfShape)
  hfBody.position.set(-50, 0, -50) // centrar según tamaño
  hfBody.quaternion.setFromEuler(Math.PI / 2, 0, 0)
  world.addBody(hfBody)

  return hfBody
}
export function extractHeightMatrix(geometry: THREE.PlaneGeometry): number[][] {
  const segments = geometry.parameters.widthSegments + 1
  const heights: number[][] = []

  for (let i = 0; i < segments; i++) {
    const row: number[] = []
    for (let j = 0; j < segments; j++) {
      const idx = i * segments + j
      const z = geometry.attributes.position.getZ(idx)
      row.push(z)
    }
    heights.push(row)
  }

  return heights
}

export function addFogAndSky(scene: THREE.Scene) {
  // Fog
  scene.fog = new THREE.Fog(0x002B20, 10, 100)

  // Skybox (cielo simple con color, se puede reemplazar con textura)
  const skyColor = new THREE.Color(0x87ceeb) // celeste
  scene.background = skyColor
}


export function addLargeTerrain(scene: THREE.Scene) {
  const geometry = new THREE.PlaneGeometry(1000, 1000, 100, 100)
  const material = new THREE.MeshStandardMaterial({ color: 0x228B22 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.receiveShadow = true
  scene.add(mesh)
//   const terrain = generateProceduralTerrain()
//   scene.add(terrain)
//   return terrain
}

export function addTerrainCollider(world: CANNON.World) {
  const groundShape = new CANNON.Plane()
  const groundBody = new CANNON.Body({ mass: 0 })
  groundBody.addShape(groundShape)
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // para que esté horizontal
  world.addBody(groundBody)
  return groundBody
}