import { Badge } from '../ui/Badge';
export function OrderRow({ code, customer, total, status }:{ code:string; customer:string; total:string; status:'new'|'picking'|'shipped'|'returned'}){
  const map = status==='new'? ['Yeni','info'] : status==='picking'? ['Toplanıyor','warn'] : status==='shipped'? ['Sevk','success'] : ['İade','danger'];
  return (
    <div className="flex items-center py-3 border-b border-[var(--border)]">
      <div className="flex-1">
        <div className="font-medium text-[var(--text)]">{code}</div>
        <div className="text-sm text-[var(--subtext)]">{customer}</div>
      </div>
      <Badge variant={map[1] as any}>{map[0]}</Badge>
      <div className="ml-3 font-semibold text-[var(--text)]">{total}</div>
    </div>
  );
}
