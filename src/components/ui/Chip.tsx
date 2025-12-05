export function Chip({ active, children, onClick }: { active?:boolean; children: React.ReactNode; onClick?:()=>void }){
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 rounded-full border text-sm font-semibold transition-colors duration-150
        ${active
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-brand-muted text-muted-foreground border-transparent'
        }`}
    >{children}</button>
  );
}
