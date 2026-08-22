import { WebhookCircuitBreakerService } from './webhooks-circuit-breaker.service';

describe('WebhookCircuitBreakerService', () => {
  let service: WebhookCircuitBreakerService;
  let nowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    service = new WebhookCircuitBreakerService();
    nowSpy = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('opens after three failures and closes after success', () => {
    nowSpy.mockReturnValue(1000);

    service.recordFailure('merchant-1');
    service.recordFailure('merchant-1');
    expect(service.canAttempt('merchant-1')).toBe(true);

    service.recordFailure('merchant-1');
    expect(service.getState('merchant-1')).toBe('OPEN');
    expect(service.canAttempt('merchant-1')).toBe(false);

    service.recordSuccess('merchant-1');
    expect(service.getState('merchant-1')).toBe('CLOSED');
    expect(service.canAttempt('merchant-1')).toBe(true);
  });

  it('moves to half-open after cooldown', () => {
    nowSpy.mockReturnValue(1000);
    service.recordFailure('merchant-1');
    service.recordFailure('merchant-1');
    service.recordFailure('merchant-1');

    nowSpy.mockReturnValue(31_001);
    expect(service.canAttempt('merchant-1')).toBe(true);
    expect(service.getState('merchant-1')).toBe('HALF_OPEN');
  });
});
