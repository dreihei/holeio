import type { Hole } from './types';

function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`UI element #${id} fehlt`);
  return element as T;
}

export class GameUI {
  readonly startScreen = required<HTMLElement>('start-screen');
  readonly resultScreen = required<HTMLElement>('result-screen');
  readonly startButton = required<HTMLButtonElement>('start-button');
  readonly restartButton = required<HTMLButtonElement>('restart-button');
  private readonly score = required<HTMLElement>('score');
  private readonly size = required<HTMLElement>('size');
  private readonly time = required<HTMLElement>('time');
  private readonly leaderboard = required<HTMLOListElement>('leaderboard');
  private readonly highscore = required<HTMLElement>('highscore');
  private readonly finalScore = required<HTMLElement>('final-score');
  private readonly finalRank = required<HTMLElement>('final-rank');
  private readonly resultTitle = required<HTMLElement>('result-title');

  setHighscore(value: number): void { this.highscore.textContent = String(value); }

  showGame(): void {
    this.startScreen.hidden = true;
    this.resultScreen.hidden = true;
  }

  update(player: Hole, bots: Hole[], seconds: number): void {
    this.score.textContent = String(Math.floor(player.score));
    this.size.textContent = `${(player.radius / 27).toFixed(1)}×`;
    const remaining = Math.max(0, Math.ceil(seconds));
    this.time.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
    const ranking = [player, ...bots].sort((a, b) => b.score - a.score);
    this.leaderboard.replaceChildren(...ranking.map((hole, index) => {
      const item = document.createElement('li');
      if (hole.id === 'player') item.className = 'is-player';
      item.innerHTML = `<span><i style="--color:${hole.color}"></i>${index + 1}. ${hole.name}</span><strong>${Math.floor(hole.score)}</strong>`;
      return item;
    }));
  }

  showResult(player: Hole, bots: Hole[]): void {
    const ranking = [player, ...bots].sort((a, b) => b.score - a.score);
    const rank = ranking.findIndex((hole) => hole.id === 'player') + 1;
    this.finalScore.textContent = String(Math.floor(player.score));
    this.finalRank.textContent = `Platz ${rank} von ${ranking.length}`;
    this.resultTitle.textContent = rank === 1 ? 'STADTLEGENDE' : rank <= 3 ? 'STARKE RUNDE' : 'WEITER WACHSEN';
    this.resultScreen.hidden = false;
  }
}
