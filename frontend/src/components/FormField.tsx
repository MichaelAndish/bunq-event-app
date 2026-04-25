import type { ReactNode } from 'react'

type Props = {
  label: string
  placeholder: string
  type?: string
  value?: string
  onChange?: (v: string) => void
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export default function FormField({ label, placeholder, type = 'text', value, onChange, iconLeft, iconRight }: Props) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="field-input-wrap">
        {iconLeft && <span className="field-icon-left">{iconLeft}</span>}
        <input
          className={`field-input${iconLeft ? ' has-icon-left' : ''}${iconRight ? ' has-icon-right' : ''}`}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange ? e => onChange(e.target.value) : undefined}
        />
        {iconRight && <span className="field-icon-right">{iconRight}</span>}
      </div>
    </div>
  )
}
