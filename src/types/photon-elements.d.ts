import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'photon-client': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        id?: string
        org?: string
        domain?: string
        uri?: string
        audience?: string
        env?: string
        'redirect-uri'?: string
        'redirect-path'?: string
        'dev-mode'?: boolean | string
      }
      'photon-auth-wrapper': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        'auto-login'?: boolean | string
        'hide-loader'?: boolean | string
        'redirect-path'?: string
      }
      'photon-prescribe-workflow': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        'patient-id'?: string
        'template-ids'?: string
        'enable-order'?: boolean | string
        'enable-local-pickup'?: boolean | string
        'enable-send-to-patient'?: boolean | string
        'enable-delivery-pharmacies'?: boolean | string
        'enable-med-history'?: boolean | string
        'enable-med-history-links'?: boolean | string
        'enable-med-history-refill-button'?: boolean | string
        'additional-notes'?: string
        'hide-patient-card'?: boolean | string
        'optional-patient-address'?: boolean | string
      }
    }
  }
}

export {}
