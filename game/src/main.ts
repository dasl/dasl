import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { createRenderer, createCamera, createControls } from './core/view'
import { addLights, addFloor, addFloorBody, addWalls, addBackgroundMusic } from './core/environment'
import { initInputListeners, keysPressed, shiftPressed, spacePressed } from './core/input'
import { loadCharacter, type CharacterResources } from './core/character'
import { ZoneManager } from './ZoneManager'
import { addFogAndSky, addLargeTerrain, addTerrainCollider } from './core/world'

// Escena y motor
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })

// Render y cámara
const renderer = createRenderer()
const camera = createCamera()
const controls = createControls(camera, renderer.domElement)
const zoneManager = new ZoneManager(scene)

// Entorno
addLights(scene)
// addFloor(scene)
// const floorBody = addFloorBody(world)
// addBackgroundMusic(camera)
// const walls = addWalls(scene, world)

addFogAndSky(scene)
const terrain = addLargeTerrain(scene)

const terrainBody = addTerrainCollider(world)

// Input
initInputListeners()


// Loop y estado
const clock = new THREE.Clock()
let character: CharacterResources
let currentAction: THREE.AnimationAction | null = null
let canJump: boolean = true
let isGrounded: boolean = true
let isPlaying: boolean = false
let cameraRecover: number = 0.0008
let groundSpeed: number = 14
let airSpeed: number = 4

loadCharacter(scene, world, camera).then((res) => {
  character = res
  playAnimation(36) // idle inicial

  // Agrega lógica de colisión con el suelo y paredes
  character.body.addEventListener('collide', (event: any) => {
    if (event.body === terrainBody) {
      canJump = true
      isGrounded = true
      playAnimation(36)
    }
  })
})

zoneManager.addZone({
  position: new THREE.Vector3(1, 1, 1),
  size: new THREE.Vector3(2, 2, 2),
  label: '',
  htmlContent: '<strong>¡Bienvenido!</strong><br>Puedes presionar <kbd>E</kbd> para interactuar.',
  action: () => console.log('Interacción realizada')
})

function playAnimation(index: number, fadeDuration = 0.2) {
  if (!character) return
  const next = character.mixer.clipAction(character.animations[index])
  if (!next || currentAction === next) return
  if (currentAction) currentAction.fadeOut(fadeDuration)
  next.reset().fadeIn(fadeDuration).play()
  currentAction = next
  isPlaying = next.isRunning()
}

function isMoving(): boolean {
  return canJump && (keysPressed['w'] || keysPressed['a'] || keysPressed['s'] || keysPressed['d'])
}

function animate() {
  requestAnimationFrame(animate)
  
  const delta = clock.getDelta()
  world.step(1 / 60, delta)

  if (!character) return
  zoneManager.update(character.mesh.position, keysPressed)
  controls.update()
  character.mixer.update(delta)
  character.mesh.position.copy(character.body.position as any)

  if (spacePressed && canJump) {
    character.body.velocity.set(0, character.body.velocity.y, 0)
    const impulse = new CANNON.Vec3(0, 5, 0)
    character.body.applyImpulse(impulse, character.body.position)
    canJump = false
    isGrounded = false
    character.footstep.pause()
    playAnimation(40)
  }
  
  if (shiftPressed && isGrounded) {
    if (!character.footstep.isPlaying && character.footstep.buffer) character.footstep.play()
    character.footstep.setPlaybackRate(1.2) 
    playAnimation(48) // correr
    groundSpeed = 20
    airSpeed = 8
  }

  if (isGrounded && !shiftPressed) {
    character.footstep.setPlaybackRate(1.0)
    groundSpeed = 14
    airSpeed = 4
    if (isMoving()) {
      if (!character.footstep.isPlaying && character.footstep.buffer) character.footstep.play()
      playAnimation(72)
      cameraRecover = 0.09
    } else {
      if (character.footstep.isPlaying) character.footstep.pause()
      playAnimation(36)
      cameraRecover = 0.0008
    }
  }  

  const currentSpeed = isGrounded ? groundSpeed : airSpeed
  const v = character.body.velocity
  character.body.velocity.set(
    (keysPressed['a'] ? -currentSpeed : keysPressed['d'] ? currentSpeed : 0),
    v.y,
    (keysPressed['w'] ? -currentSpeed : keysPressed['s'] ? currentSpeed : 0)
  )

  const direction = new THREE.Vector3()
  if (keysPressed['w']) direction.z -= 1
  if (keysPressed['s']) direction.z += 1
  if (keysPressed['a']) direction.x -= 1
  if (keysPressed['d']) direction.x += 1
  direction.normalize()

  if (direction.lengthSq() > 0) {
    const targetQuaternion = new THREE.Quaternion()
    const dummy = new THREE.Object3D()
    dummy.position.copy(character.mesh.position)
    dummy.lookAt(character.mesh.position.clone().add(direction))
    targetQuaternion.copy(dummy.quaternion)
    character.mesh.quaternion.slerp(targetQuaternion, 0.08)
  }




  const offset = new THREE.Vector3(0, 5, 10)
  const targetPosition = new THREE.Vector3().copy(character.mesh.position).add(offset)
  camera.position.lerp(targetPosition, cameraRecover)
  camera.lookAt(character.mesh.position)

  renderer.render(scene, camera)
}

animate()


