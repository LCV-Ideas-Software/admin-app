export type PromptModalState = {
  show: boolean
  title: string
  submitLabel: string
  primaryLabel: string
  placeholder: string
  value: string
  callback: ((payload: PromptModalSubmit) => void) | null
  isLink: boolean
  showLinkText: boolean
  linkText: string
  showCaption: boolean
  caption: string
  showAltText: boolean
  altText: string
  showTitleText: boolean
  titleText: string
}

export type PromptModalSubmit = {
  value: string
  linkText: string
  caption: string
  altText: string
  titleText: string
}

export const PROMPT_MODAL_INITIAL: PromptModalState = {
  show: false,
  title: '',
  submitLabel: 'Inserir',
  primaryLabel: 'Valor',
  placeholder: 'https://...',
  value: '',
  callback: null,
  isLink: false,
  showLinkText: false,
  linkText: '',
  showCaption: false,
  caption: '',
  showAltText: false,
  altText: '',
  showTitleText: false,
  titleText: '',
}
