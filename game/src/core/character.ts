// core/character.ts
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { AnimationMixer, Group, Audio, AudioListener, AudioLoader } from 'three'

export interface CharacterResources {
  mesh: THREE.Group
  body: CANNON.Body
  mixer: AnimationMixer
  animations: THREE.AnimationClip[]
  footstep: Audio
}

export async function loadCharacter(
  scene: THREE.Scene,
  world: CANNON.World,
  camera: THREE.Camera
): Promise<CharacterResources> {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync('assets/Knight.glb')

  const model = gltf.scene
  model.scale.set(1, 1, 1)
  model.position.set(0, 0, 0)
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      child.material.side = THREE.FrontSide;
    }
  })

  const wrapper = new Group()
  wrapper.add(model)
  model.position.y = -1
  wrapper.quaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0))
  scene.add(wrapper)

  const mixer = new AnimationMixer(model)
  const animations = gltf.animations

  const body = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5)),
    position: new CANNON.Vec3(0, 1, 0),
    fixedRotation: true
  })
  body.updateMassProperties()
  world.addBody(body)

  const listener = new AudioListener()
  camera.add(listener)
  const footstep = new Audio(listener)
  const audioLoader = new AudioLoader()
  await new Promise<void>((resolve) => {
    audioLoader.load('audio/footstep.wav', (buffer) => {
      footstep.setBuffer(buffer)
      footstep.setLoop(true)
      footstep.setVolume(0.3)
      resolve()
    })
  })

  return {
    mesh: wrapper,
    body,
    mixer,
    animations,
    footstep
  }
}
