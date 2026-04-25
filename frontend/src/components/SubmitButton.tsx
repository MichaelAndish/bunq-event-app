type Props = { label: string; onClick?: () => void }

export default function SubmitButton({ label, onClick }: Props) {
  return (
    <button className="submit-btn" onClick={onClick}>
      {label}
    </button>
  )
}
