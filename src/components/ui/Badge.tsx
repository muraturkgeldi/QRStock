export function Badge({ children, variant='info' }: { children: React.ReactNode; variant?: 'info'|'success'|'warn'|'danger' }){
  const map:any = {
    info: ['bg-[var(--primary-weak)]','text-[var(--primary)]'],
    success: ['bg-[var(--successBg)]','text-[var(--successText)]'],
    warn: ['bg-[var(--warnBg)]','text-[var(--warnText)]'],
    danger: ['bg-[var(--dangerBg)]','text-[var(--dangerText)]'],
  }[variant];
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[0]} ${map[1]}`}>{children}</span>;
}
