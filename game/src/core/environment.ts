import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { AudioLoader } from 'three'

export function addLights(scene: THREE.Scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.position.set(30, 30, 30)
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048  
  dirLight.castShadow = true
  scene.add(dirLight)

  const d = 200 // usa un valor más grande para cubrir un terreno más amplio
  dirLight.shadow.camera.left = -d
  dirLight.shadow.camera.right = d
  dirLight.shadow.camera.top = d
  dirLight.shadow.camera.bottom = -d
  dirLight.shadow.camera.near = 1
  dirLight.shadow.camera.far = 300

  // ✅ (opcional) ver la cámara de sombras si estás debuggeando
  // const helper = new THREE.CameraHelper(dirLight.shadow.camera)
  // scene.add(helper)  
}

export function addFloor(scene: THREE.Scene): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(10, 0.1, 10)
  const material = new THREE.MeshStandardMaterial({ color: 0x463403 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(0, -0.05, 0)
  mesh.receiveShadow = true
  scene.add(mesh)
  return mesh
}

export function addFloorBody(world: CANNON.World): CANNON.Body {
  const floorBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(5, 0.05, 5))
  })
  floorBody.position.set(0, -0.05, 0)
  world.addBody(floorBody)
  return floorBody
}

export function addBackgroundMusic(camera: THREE.Camera): THREE.Audio {
    // 🎧 Crear listener y asociarlo a la cámara
    const listener = new THREE.AudioListener();
    camera.add(listener);
    
    // 🎵 Crear objeto de audio global
    const backgroundMusic = new THREE.Audio(listener);
    
    // 📥 Cargar el archivo de música
    const audioLoader = new AudioLoader();
    audioLoader.load('/audio/music.ogg', (buffer) => {
      backgroundMusic.setBuffer(buffer);
      backgroundMusic.setLoop(true);
      backgroundMusic.setVolume(0.5); // ajusta volumen de 0.0 a 1.0
      backgroundMusic.play();
    });

    return backgroundMusic;
}

export function addWalls(scene: THREE.Scene, world: CANNON.World): CANNON.Body[] {
  const walls = []
  const positions = [
    { x: 0, y: 0.5, z: -5, rotY: 0 },
    { x: 0, y: 0.5, z: 5, rotY: 0 },
    { x: -5, y: 0.5, z: 0, rotY: Math.PI / 2 },
    { x: 5, y: 0.5, z: 0, rotY: Math.PI / 2 }
  ]
  for (const { x, y, z, rotY } of positions) {
    const wallGeo = new THREE.BoxGeometry(10, 2, 0.2)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1F3681 })
    const wallMesh = new THREE.Mesh(wallGeo, wallMat)
    wallMesh.position.set(x, y, z)
    wallMesh.rotation.y = rotY
    scene.add(wallMesh)

    const wallShape = new CANNON.Box(new CANNON.Vec3(5, 0.5, 0.1))
    const wallBody = new CANNON.Body({ mass: 0 })
    wallBody.addShape(wallShape)
    wallBody.position.set(x, y, z)
    wallBody.quaternion.setFromEuler(0, rotY, 0)
    world.addBody(wallBody)
    walls.push(wallBody)
  }
  return walls
}