type Props = { size?: number }

export default function BunqLogo({ size = 72 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      {/* Rounded square background */}
      <rect width="72" height="72" rx="20" fill="#00C846" />
      {/* bunq "b" lettermark */}
      <path
        d="M22 18h8v14.5c1.8-2 4.4-3.2 7.2-3.2C43.8 29.3 50 35 50 43s-6.2 13.7-12.8 13.7c-2.8 0-5.4-1.2-7.2-3.2V56h-8V18zm14.5 30.8c3.4 0 5.8-2.5 5.8-5.8s-2.4-5.8-5.8-5.8-5.8 2.5-5.8 5.8 2.4 5.8 5.8 5.8z"
        fill="white"
      />
    </svg>
  )
}
