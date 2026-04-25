type Props = { checked: boolean; onChange: (v: boolean) => void }

export default function ToggleSwitch({ checked, onChange }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={`toggle${checked ? ' toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
    />
  )
}
