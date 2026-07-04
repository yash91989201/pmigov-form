import logoUrl from '@/assets/logo.png';

const SIZE = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14 sm:w-16 sm:h-16',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
} as const;

type Props = {
  size?: keyof typeof SIZE;
  variant?: 'badge' | 'plain';
  className?: string;
};

export function BrandLogo({ size = 'md', variant = 'badge', className = '' }: Props) {
  const img = (
    <img src={logoUrl} alt="PMI Services Enterprises" className="w-full h-full object-contain" />
  );

  if (variant === 'plain') {
    return (
      <div className={`flex-shrink-0 ${SIZE[size]} rounded-md overflow-hidden bg-white ${className}`}>
        {img}
      </div>
    );
  }

  return (
    <div
      className={`relative flex-shrink-0 ${SIZE[size]} rounded-lg border-2 border-gold/70 bg-white shadow-sm p-1.5 flex items-center justify-center ${className}`}
    >
      <div className="w-full h-full">{img}</div>
    </div>
  );
}