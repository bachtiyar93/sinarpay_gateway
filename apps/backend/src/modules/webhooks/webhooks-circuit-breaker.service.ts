import { Injectable } from '@nestjs/common';

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitState {
  failures: number;
  state: BreakerState;
  openUntil: number;
}

@Injectable()
export class WebhookCircuitBreakerService {
  private readonly states = new Map<string, CircuitState>();
  private readonly failureThreshold = 3;
  private readonly cooldownMs = 30_000;

  canAttempt(merchantId: string): boolean {
    const state = this.states.get(merchantId);
    if (!state) {
      return true;
    }

    if (state.state === 'OPEN' && Date.now() < state.openUntil) {
      return false;
    }

    if (state.state === 'OPEN' && Date.now() >= state.openUntil) {
      state.state = 'HALF_OPEN';
      this.states.set(merchantId, state);
    }

    return true;
  }

  recordSuccess(merchantId: string): void {
    this.states.set(merchantId, {
      failures: 0,
      state: 'CLOSED',
      openUntil: 0,
    });
  }

  recordFailure(merchantId: string): void {
    const current = this.states.get(merchantId) ?? {
      failures: 0,
      state: 'CLOSED' as BreakerState,
      openUntil: 0,
    };

    const failures = current.failures + 1;
    if (failures >= this.failureThreshold) {
      this.states.set(merchantId, {
        failures,
        state: 'OPEN',
        openUntil: Date.now() + this.cooldownMs,
      });
      return;
    }

    this.states.set(merchantId, {
      failures,
      state: 'CLOSED',
      openUntil: 0,
    });
  }

  getState(merchantId: string): BreakerState {
    return this.states.get(merchantId)?.state ?? 'CLOSED';
  }
}
