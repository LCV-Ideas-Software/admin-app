import { describe, expect, it } from 'vitest';
import {
  ASTROLOGO_CONFIG_MODEL_FIELD,
  ASTROLOGO_CONFIG_MODULE_KEY,
  DEFAULT_ASTROLOGO_CONFIG,
} from './astrologo-config';

describe('canonical Astrologo module config', () => {
  it('uses astrologo-config/modeloSintese as the single Admin contract', () => {
    expect(ASTROLOGO_CONFIG_MODULE_KEY).toBe('astrologo-config');
    expect(ASTROLOGO_CONFIG_MODEL_FIELD).toBe('modeloSintese');
    expect(DEFAULT_ASTROLOGO_CONFIG).toEqual({ modeloSintese: '' });
    expect(Object.isFrozen(DEFAULT_ASTROLOGO_CONFIG)).toBe(true);
    expect(DEFAULT_ASTROLOGO_CONFIG).not.toHaveProperty('modeloIA');
  });
});
