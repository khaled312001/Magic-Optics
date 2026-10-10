import { formatDate } from "@/lib/utils";
import { DeleteButton } from "@/components/ui/delete-button";
import { deletePrescription } from "@/server/customers";
import type { Prescription } from "@prisma/client";

function v(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return n > 0 ? `+${n}` : String(n);
}

export function PrescriptionView({ prescription, canDelete }: { prescription: Prescription; canDelete: boolean }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{formatDate(prescription.date)}</p>
        {canDelete && (
          <DeleteButton
            action={deletePrescription.bind(null, prescription.id, prescription.customerId)}
            confirmMessage="هل تريد حذف هذا الكشف؟"
          />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-center text-xs">
          <thead>
            <tr className="text-muted">
              <th className="w-16 text-right font-normal"></th>
              <th colSpan={3} className="pb-1 font-semibold text-brand-navy">يمين</th>
              <th colSpan={3} className="pb-1 font-semibold text-brand-teal-dark">يسار</th>
            </tr>
            <tr className="text-muted">
              <th></th>
              <th className="font-normal">SPH</th>
              <th className="font-normal">CYL</th>
              <th className="font-normal">AXIS</th>
              <th className="font-normal">SPH</th>
              <th className="font-normal">CYL</th>
              <th className="font-normal">AXIS</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="py-1.5 text-right font-medium text-foreground">بعيد</td>
              <td>{v(prescription.rightSphFar)}</td>
              <td>{v(prescription.rightCylFar)}</td>
              <td>{v(prescription.rightAxisFar)}</td>
              <td>{v(prescription.leftSphFar)}</td>
              <td>{v(prescription.leftCylFar)}</td>
              <td>{v(prescription.leftAxisFar)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="py-1.5 text-right font-medium text-foreground">قريب</td>
              <td>{v(prescription.rightSphNear)}</td>
              <td>{v(prescription.rightCylNear)}</td>
              <td>{v(prescription.rightAxisNear)}</td>
              <td>{v(prescription.leftSphNear)}</td>
              <td>{v(prescription.leftCylNear)}</td>
              <td>{v(prescription.leftAxisNear)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {prescription.ipd && <p className="mt-2 text-xs text-muted">IPD: {prescription.ipd}</p>}
      {prescription.notes && <p className="mt-2 text-xs text-muted">{prescription.notes}</p>}
    </div>
  );
}
