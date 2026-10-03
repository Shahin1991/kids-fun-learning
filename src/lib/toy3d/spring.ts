/** Damped spring used for squash/stretch and jelly wobble. */
export class Spring {
  vel = 0;
  constructor(public value = 0, public target = 0, private stiffness = 220, private damping = 11) {}

  /** Adds an instant velocity kick, e.g. on landing. */
  kick(v: number) {
    this.vel += v;
  }

  step(dt: number): number {
    // Sub-step so large frame gaps stay stable.
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.vel += (this.stiffness * (this.target - this.value) - this.damping * this.vel) * h;
      this.value += this.vel * h;
    }
    return this.value;
  }
}
