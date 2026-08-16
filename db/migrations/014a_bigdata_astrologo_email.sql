-- admin-app / bigdata_db
-- Migration 014a: materializa o e-mail proprietário antes da regularização 015.
--
-- Instalações novas aplicam este arquivo uma única vez, depois da migration 014
-- e antes da 015. Bancos existentes devem verificar a coluna e nunca repetir
-- uma migration histórica já aplicada.

ALTER TABLE astrologo_mapas ADD COLUMN email TEXT DEFAULT '';
