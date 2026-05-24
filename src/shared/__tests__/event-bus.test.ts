import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '../event-bus';

describe('EventBus', () => {
  it('should register a listener and receive emitted event', () => {
    const callback = vi.fn();
    eventBus.on('test-event', callback);

    eventBus.emit('test-event', { foo: 'bar' });
    expect(callback).toHaveBeenCalledWith({ foo: 'bar' });

    // Clean up
    eventBus.off('test-event', callback);
  });

  it('should unsubscribe using the returned function', () => {
    const callback = vi.fn();
    const unsubscribe = eventBus.on('unsubscribe-event', callback);

    eventBus.emit('unsubscribe-event', 'first');
    expect(callback).toHaveBeenCalledWith('first');

    unsubscribe();

    eventBus.emit('unsubscribe-event', 'second');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should remove listener using off', () => {
    const callback = vi.fn();
    eventBus.on('off-event', callback);
    eventBus.off('off-event', callback);

    eventBus.emit('off-event', 'data');
    expect(callback).not.toHaveBeenCalled();
  });

  it('should be resilient and not crash emit if a listener throws an error', () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

    const badCallback = () => {
      throw new Error('Bad listener');
    };
    const goodCallback = vi.fn();

    eventBus.on('crash-event', badCallback);
    eventBus.on('crash-event', goodCallback);

    expect(() => eventBus.emit('crash-event', 'data')).not.toThrow();
    expect(goodCallback).toHaveBeenCalledWith('data');
    expect(consoleErrorMock).toHaveBeenCalled();

    // Clean up
    eventBus.off('crash-event', badCallback);
    eventBus.off('crash-event', goodCallback);
    consoleErrorMock.mockRestore();
  });
});
