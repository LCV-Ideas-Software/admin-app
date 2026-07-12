export const ASTROLOGO_CONFIG_MODULE_KEY = 'astrologo-config' as const;
export const ASTROLOGO_CONFIG_MODEL_FIELD = 'modeloSintese' as const;

export interface AstroConfig {
  modeloSintese?: string;
}

export const DEFAULT_ASTROLOGO_CONFIG: Readonly<AstroConfig> = Object.freeze({
  modeloSintese: '',
});
