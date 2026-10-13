import Link from "next/link";
import { Printer } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DeleteButton } from "@/components/ui/delete-button";
import { deletePrescription } from "@/server/customers";
import type { Prescription } from "@prisma/client";

function v(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return n > 0 ? `+${n}` : String(n);
}

type PrescriptionWithCreator = Prescription & { createdBy: { name: string } | null };

export function PrescriptionView({ prescription, canDelete }: { prescription: PrescriptionWithCreator; canDelete: boolean }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="font-medium text-foreground">{formatDate(prescription.date)}</span>
          <span>· الكود #{prescription.id}</span>
          {prescription.createdBy && <span>· {prescription.createdBy.name}</span>}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/prescriptions/${prescription.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-brand-navy hover:bg-background"
          >
            <Printer className="size-3.5" />
            طباعة
          </Link>
          {canDelete && (
            <DeleteButton
              action={deletePrescription.bind(null, prescription.id, prescription.customerId)}
              confirmMessage="هل تريد حذف هذا الكشف؟"
            />
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-center text-xs">
          <thead>
            <tr className="text-muted">
              <th className="w-16 text-right font-normal"></th>
              <th colSpan={3} className="pb-1 font-semibold text-brand-navy">يمين</th>
              <th className="pb-1 font-semibold text-foreground">IPD</th>
              <th colSpan={3} className="pb-1 font-semibold text-brand-teal-dark">يسار</th>
            </tr>
            <tr className="text-muted">
              <th></th>
              <th className="font-normal">SPH</th>
              <th className="font-normal">CYL</th>
              <th className="font-normal">AXIS</th>
              <th></th>
              <th className="font-normal">AXIS</th>
              <th className="font-normal">CYL</th>
              <th className="font-normal">SPH</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="py-1.5 text-right font-medium text-foreground">بعيد</td>
              <td>{v(prescription.rightSphFar)}</td>
              <td>{v(prescription.rightCylFar)}</td>
              <td>{v(prescription.rightAxisFar)}</td>
              <td rowSpan={2} className="font-medium text-foreground">{prescription.ipd ?? "-"}</td>
              <td>{v(prescription.leftAxisFar)}</td>
              <td>{v(prescription.leftCylFar)}</td>
              <td>{v(prescription.leftSphFar)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="py-1.5 text-right font-medium text-foreground">قريب</td>
              <td>{v(prescription.rightSphNear)}</td>
              <td>{v(prescription.rightCylNear)}</td>
              <td>{v(prescription.rightAxisNear)}</td>
              <td>{v(prescription.leftAxisNear)}</td>
              <td>{v(prescription.leftCylNear)}</td>
              <td>{v(prescription.leftSphNear)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {prescription.notes && <p className="mt-2 text-xs text-muted">{prescription.notes}</p>}
    </div>
  );
}
