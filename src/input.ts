import type { Vec2 } from './types';

export class InputController {
  private readonly keys = new Set<string>();
  private pointerVector: Vec2 = { x: 0, y: 0 };
  private pointerActive = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    this.keys.add(event.key.toLowerCase());
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.key.toLowerCase()); };

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerActive = true;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.updatePointer(event);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.pointerActive || event.pointerType === 'mouse') this.updatePointer(event);
  };

  private readonly onPointerUp = (): void => {
    this.pointerActive = false;
    this.pointerVector = { x: 0, y: 0 };
  };

  private updatePointer(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(dx, dy);
    if (length > 18) this.pointerVector = { x: dx / length, y: dy / length };
    else this.pointerVector = { x: 0, y: 0 };
  }

  getDirection(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    const length = Math.hypot(x, y);
    if (length > 0) return { x: x / length, y: y / length };
    return this.pointerVector;
  }
}
