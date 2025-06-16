import * as THREE from 'three'
import { Text } from 'troika-three-text'
import { Box3 } from 'three'
import { Vec3 } from 'cannon-es'

export interface ZoneConfig {
  position: THREE.Vector3
  size: THREE.Vector3
  label: string
  action: () => void
  key?: string // por defecto 'e'
  htmlContent?: string // opcional, para mostrar/ocultar un HTML generado
}

export class ZoneManager {
  private scene: THREE.Scene
  private zones: {
    box: THREE.Mesh
    text: Text
    bounds: Box3
    action: () => void
    key: string
    active: boolean
    wasPressed: boolean
    htmlElement?: HTMLElement
  }[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  addZone(config: ZoneConfig) {
    const key = config.key?.toLowerCase() || 'e'

    // Zona invisible
    const geometry = new THREE.BoxGeometry(
      config.size.x,
      config.size.y,
      config.size.z
    )
    const material = new THREE.MeshBasicMaterial({ visible: false })
    const box = new THREE.Mesh(geometry, material)
    box.position.copy(config.position)
    this.scene.add(box)

    // Texto flotante
    const text = new Text()
    text.text = config.label
    text.fontSize = 0.4
    text.position.copy(config.position.clone().add(new THREE.Vector3(0, config.size.y / 2 + 0.3, 0)))
    text.color = '#ffffff'
    text.sync()
    text.visible = false
    this.scene.add(text)

    let htmlElement: HTMLElement | undefined
    if (config.htmlContent) {
      htmlElement = document.createElement('div')
      htmlElement.innerHTML = config.htmlContent
      htmlElement.style.position = 'fixed'
      htmlElement.style.bottom = '20px'
      htmlElement.style.left = '50%'
      htmlElement.style.transform = 'translateX(-50%)'
      htmlElement.style.background = 'rgba(0,0,0,0.7)'
      htmlElement.style.color = 'white'
      htmlElement.style.padding = '12px 16px'
      htmlElement.style.borderRadius = '6px'
      htmlElement.style.display = 'none'
      htmlElement.style.zIndex = '1000'
      htmlElement.style.fontFamily = 'sans-serif'
      htmlElement.style.fontSize = '14px'
      htmlElement.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)'
      htmlElement.style.transition = 'opacity 0.3s ease'
      htmlElement.style.opacity = '0'
      document.body.appendChild(htmlElement)
    }

    this.zones.push({
      box,
      text,
      bounds: new THREE.Box3().setFromObject(box),
      action: config.action,
      key,
      active: false,
      wasPressed: false,
      htmlElement
    })
  }

  update(playerPosition: THREE.Vector3 | Vec3, keysPressed: Record<string, boolean>) {
    const playerVec3 = (playerPosition instanceof THREE.Vector3)
      ? playerPosition
      : new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z)

    for (const zone of this.zones) {
      const isInside = zone.bounds.containsPoint(playerVec3)
      const key = zone.key
      const keyIsPressed = keysPressed[key]

      if (isInside && !zone.active) {
        zone.text.visible = true
        if (zone.htmlElement) {
          zone.htmlElement.style.display = 'block'
          requestAnimationFrame(() => {
            zone.htmlElement!.style.opacity = '1'
          })
        }
        zone.active = true
        zone.wasPressed = false
      } else if (!isInside && zone.active) {
        zone.text.visible = false
        if (zone.htmlElement) {
          zone.htmlElement.style.opacity = '0'
          setTimeout(() => {
            if (zone.htmlElement) zone.htmlElement.style.display = 'none'
          }, 300)
        }
        zone.active = false
        zone.wasPressed = false
      }

      if (isInside && keyIsPressed && !zone.wasPressed) {
        zone.action()
        zone.wasPressed = true
      } else if (!keyIsPressed) {
        zone.wasPressed = false
      }
    }
  }
}
