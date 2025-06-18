import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Text } from 'troika-three-text';
// @ts-ignore
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import * as CANNON from 'cannon-es';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationMixer, Audio, AudioListener, AudioLoader } from 'three';
// @ts-ignore
import cannonDebugger from 'cannon-es-debugger';
import { ZoneManager } from './ZoneManager'

const scene = new THREE.Scene();
const zoneManager = new ZoneManager(scene)
scene.background = new THREE.Color(0x000000); //

// Crear cámara
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
camera.position.set(5, 5, 5); // posición de la cámara

// Crear renderer
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement);



// Controles de órbita
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // suaviza el movimiento
controls.dampingFactor = 0.05;

// 💡 Luces
// scene.add(new THREE.AmbientLight(0xffffff, 0.001));s
const dirLight = new THREE.PointLight(0xffffff, 44);
dirLight.position.set(5, 5, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// 🟫 Piso (visual)
const floorGeometry = new THREE.BoxGeometry(10, 0.1, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x463403 });
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
floorMesh.position.set(0, -0.05, 0);
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// WORLD
// 🌍 Mundo de físicas
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0)
});

// 🔲 Cuerpo físico del piso (estático)
const floorBody = new CANNON.Body({
  mass: 0, // estático
  shape: new CANNON.Box(new CANNON.Vec3(5, 0.05, 5))
});
floorBody.position.set(0, -0.05, 0);
floorMesh.receiveShadow = true;
world.addBody(floorBody);


// 🧱 Paredes
// Paredes alrededor del piso
let walls = [addWall(0, 0.5, -5), addWall(0, 0.5, 5), addWall(-5, 0.5, 0, Math.PI / 2), addWall(5, 0.5, 0, Math.PI / 2)] // Fondo

////////////////////////////////////////////////////////////////////
// 🚶‍♂️‍➡️ Personaje
// Cargar modelo GLTF
const wrapper = new THREE.Group();
const loader = new GLTFLoader();
let boxMesh: THREE.Group | null = null; // Inicializa como nulo
loader.load('assets/Knight.glb', (gltf: any) => {
  const model = gltf.scene;
  model.scale.set(1, 1, 1); // Ajusta escala
  model.position.set(0, 0, 0); // Ajusta posición inicial

  wrapper.add(model);
  model.position.y = -1; 
  wrapper.quaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0)); 
  scene.add(wrapper);

  model.traverse((child: any) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.geometry.computeVertexNormals?.();
      child.material.depthWrite = true;
      child.material.needsUpdate = true;
      child.material.side = THREE.FrontSide;

    }
  });

  animations = gltf.animations;
    console.log(animations)
  mixer = new AnimationMixer(model);
  // console.log('Animaciones cargadas:', animations);
  // 🔥 Reproducir la primera animación como ejemplo
  const action = mixer.clipAction(animations[36]);
  action.play();
  boxMesh = wrapper;
});

const footStepSound = new AudioListener();
camera.add(footStepSound);
const footStep = new Audio(footStepSound);
const footStepLoader = new AudioLoader();
footStepLoader.load('audio/footstep.wav', (buffer) => {
  footStep.setBuffer(buffer);
  footStep.setLoop(true);
  footStep.setVolume(0.3); // ajusta volumen de 0.0 a 1.0
});

// 🧱 Cuerpo físico del personaje
const boxBody = new CANNON.Body({
  mass: 1, // dinámico
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5)) // forma del cubo,
});

boxBody.fixedRotation = true;
boxBody.updateMassProperties();

// Si quieres usar un BoxGeometry en lugar de Sphere, usa:
boxBody.position.set(0, 1, 0);
world.addBody(boxBody);


// 🔁 Loop 
let mixer: AnimationMixer;
let animations: THREE.AnimationClip[] = [];
const clock = new THREE.Clock();

var canJump: boolean = true; // para saltar
var cameraRecover: number = 0.0008;
let isGrounded = true; 
////////////////////////////////////////////////////////////////////
// Listener teclas
const keysPressed: Record<string, boolean> = {};
let spacePressed = false;
let interactionReady = true;


window.addEventListener('keydown', (e) => {
  let key = e.key.toLowerCase(); // Normaliza la tecla a minúsculas
  keysPressed[key] = true;
  if (key === ' ') spacePressed = true;
  if (['a', 'd', 'w', 's'].includes(key)) {
    cameraRecover = 0.09; // Aumenta la velocidad de cámara al moverse
    playAnimation(72);
  }

});

window.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
  
  if (e.key === ' '){
    spacePressed = false; // Resetea el salto
    playAnimation(40, -0.4); // Reproduce la animación de reposo
  } 
  else if (!keysPressed['w'] && !keysPressed['a'] && !keysPressed['s'] && !keysPressed['d'])  {
    cameraRecover = 0.0008; // Aumenta la velocidad de cámara al moversew
    playAnimation(36); // Reproduce la animación de reposo
  }
});


boxBody.addEventListener('collide', (event: any) => {
  if (event.body === floorBody || walls.includes(event.body)) {
    canJump = true;
    isGrounded = true; // Se ha tocado el suelo
    playAnimation(36);
  }
});

zoneManager.addZone({
  position: new THREE.Vector3(1, 1, 1),
  size: new THREE.Vector3(2, 2, 2),
  label: 'Presiona E para abrir',
  htmlContent: '<strong>¡Bienvenido!</strong><br>Puedes presionar <kbd>E</kbd> para interactuar.',
  action: () => console.log('Interacción realizada')
})


const cannonDebug = cannonDebugger(scene, world);
////////////////////////////////////////////////////////////////////
// Animación y movimiento
function animate() {
  requestAnimationFrame(animate);
  zoneManager.update(boxBody.position, keysPressed)
  controls.update();

  // ⏱️ Paso de física
  const delta = clock.getDelta();
  world.step(1 / 60, delta);
  if (mixer) mixer.update(delta);

  if (boxMesh) {
    controls.target.copy(boxMesh.position);
    boxMesh.position.copy(boxBody.position as any);

    if (spacePressed && canJump) {
      // boxBody.wakeUp(); // Por si estaba dormido
      boxBody.velocity.set(0, boxBody.velocity.y, 0); // Anula movimiento lateral
      const impulse = new CANNON.Vec3(0, 5, 0); // fuerza vertical
      boxBody.applyImpulse(impulse, boxBody.position);
      canJump = false;
      isGrounded = false; // Evita saltos múltiples
    }

      const groundSpeed = 14;
      const airSpeed = 4; // velocidad reducida en el aire

      const v = boxBody.velocity;

      // Decide velocidad según estado
      const currentSpeed = isGrounded ? groundSpeed : airSpeed;

      // Aplica velocidad horizontal
      boxBody.velocity.set(
        (keysPressed['a'] ? -currentSpeed : keysPressed['d'] ? currentSpeed : 0),
        v.y,
        (keysPressed['w'] ? -currentSpeed : keysPressed['s'] ? currentSpeed : 0)
      );
    // 🧭 Rotación basada en input
    const direction = new THREE.Vector3();

    if (keysPressed['w']) direction.z -= 1;
    if (keysPressed['s']) direction.z += 1;
    if (keysPressed['a']) direction.x -= 1;
    if (keysPressed['d']) direction.x += 1;

    direction.normalize();

    if (direction.lengthSq() > 0) {
      const targetQuaternion = new THREE.Quaternion();
      const dummy = new THREE.Object3D();
      dummy.position.copy(boxMesh.position);
      dummy.lookAt(boxMesh.position.clone().add(direction));
      targetQuaternion.copy(dummy.quaternion);
      boxMesh.quaternion.slerp(targetQuaternion, 0.08); // Interpolación suave
    }

    if (isMoving()) {
      if (!footStep.isPlaying && footStep.buffer) {
        footStep.play();
      }
    } else {
      if (footStep.isPlaying) {
        footStep.pause(); // o .stop() si quieres reiniciar siempre
      }
    }

    const offset = new THREE.Vector3(0, 5, 10); // altura y distancia detrás del cubo
    const targetPosition = new THREE.Vector3().copy(boxMesh.position).add(offset);

    camera.position.lerp(targetPosition, cameraRecover); // interpolación suave
    camera.lookAt(boxMesh.position);
  }
  // cannonDebug.update();
  renderer.render(scene, camera);
}
animate();

function addWall(x: number, y: number, z: number, rotY: number = 0) {
  // Visual
  const wallGeo = new THREE.BoxGeometry(10, 2, 0.2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1F3681 });
  const wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.position.set(x, y, z);
  wallMesh.rotation.y = rotY;
  scene.add(wallMesh);

  // Física
  const wallShape = new CANNON.Box(new CANNON.Vec3(5, 0.5, 0.1));
  const wallBody = new CANNON.Body({ mass: 0 }); // Estático
  wallBody.addShape(wallShape);
  wallBody.position.set(x, y, z);
  wallBody.quaternion.setFromEuler(0, rotY, 0);
  world.addBody(wallBody);
  return wallBody
}

let currentAction: THREE.AnimationAction | null = null;

function playAnimation(index: number, fadeDuration = 0.2) {
  const next = mixer.clipAction(animations[index]);

  if (currentAction !== next) {
    if (currentAction) {
      currentAction.fadeOut(fadeDuration);
    }
    next.reset().fadeIn(fadeDuration).play();
    currentAction = next;
  }
}

function isMoving(): boolean {
  return canJump && (keysPressed['w'] || keysPressed['a'] || keysPressed['s'] || keysPressed['d']);
}
