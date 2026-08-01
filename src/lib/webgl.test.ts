import { afterEach, describe, expect, it, vi } from 'vitest';
import { isWebGLAvailable } from './webgl';

describe('isWebGLAvailable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error - cleaning up a test-only global
    delete window.WebGLRenderingContext;
  });

  it('returns false when getContext yields no WebGL context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(isWebGLAvailable()).toBe(false);
  });

  it('returns true when a WebGL context is available', () => {
    // @ts-expect-error - stubbing a browser global for the test
    window.WebGLRenderingContext = function WebGLRenderingContext() {};
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as RenderingContext,
    );
    expect(isWebGLAvailable()).toBe(true);
  });
});
