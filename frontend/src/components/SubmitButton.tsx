type Props = { label: string; onClick?: () => void; disabled?: boolean }

export default function SubmitButton({ label, onClick, disabled }: Props) {
  return (
    <button className="submit-btn" onClick={onClick} disabled={disabled} style={disabled ? { opacity: 0.6 } : undefined}>
      {label}
    </button>
  )
}
