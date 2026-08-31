import './style.css';
import { Renderer } from './renderer';
import { GameUI } from './ui';
import { SinkCityGame } from './game';

function boot(): void {
  const canvas = document.getElementById('game-canvas');
  const errorDisplay = document.getElementById('render-error');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas-Element fehlt.');
  try {
    const renderer = new Renderer(canvas);
    const ui = new GameUI();
    new SinkCityGame(renderer, ui, canvas);
  } catch (error) {
    console.error('Sink City konnte nicht gestartet werden:', error);
    if (errorDisplay) {
      errorDisplay.hidden = false;
      errorDisplay.textContent = 'Sink City konnte nicht gestartet werden. Dein Browser unterstützt möglicherweise kein Canvas 2D.';
    }
  }
}

boot();
