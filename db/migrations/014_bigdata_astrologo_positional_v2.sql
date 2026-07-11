-- Astrólogo v2: posições planetárias, Placidus, classificação IAU e falange angelical.
-- A coluna é aditiva e nullable para manter leitura integral dos mapas legados.
ALTER TABLE astrologo_mapas ADD COLUMN dados_posicionais_v2 TEXT;
