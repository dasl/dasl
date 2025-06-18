export const keysPressed: Record<string, boolean> = {}
export let spacePressed = false
export let shiftPressed = false

export function initInputListeners() {
  window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true
    if (e.key === ' ') spacePressed = true
    if (e.key === 'Shift') shiftPressed = true
  })
  window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false
    if (e.key === ' ') spacePressed = false
    if (e.key === 'Shift') shiftPressed = false
  })
}