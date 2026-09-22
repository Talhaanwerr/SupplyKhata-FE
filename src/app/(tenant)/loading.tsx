import { TablePageSkeleton } from "@/components/ui/skeletons";

export default function TenantLoading() {
  return <TablePageSkeleton rows={7} cols={5} filterSelects={1} withButton />;
}
