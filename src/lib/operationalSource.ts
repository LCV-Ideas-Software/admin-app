export type OperationalSource =
  | 'bigdata_db'
  | 'bootstrap-default'
  | 'legacy-admin'
  | 'legacy-worker'
  | string

export const formatOperationalSourceLabel = (source: OperationalSource) => {
  switch (source) {
    case 'bigdata_db':
      return 'BIGDATA_DB'
    case 'bootstrap-default':
      return 'BOOTSTRAP-DEFAULT (local)'
    case 'legacy-admin':
      return 'LEGACY-ADMIN (ponte)'
    case 'legacy-worker':
      return 'LEGACY-WORKER (ponte)'
    default:
      return String(source).toUpperCase()
  }
}

export const isLegacyOperationalSource = (source: OperationalSource) => (
  source === 'legacy-admin' || source === 'legacy-worker'
)
