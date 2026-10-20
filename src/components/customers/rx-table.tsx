import { Input } from "@/components/ui/input";

export const RX_FIELDS = [
  "rightSphFar",
  "rightCylFar",
  "rightAxisFar",
  "leftSphFar",
  "leftCylFar",
  "leftAxisFar",
  "rightSphNear",
  "rightCylNear",
  "rightAxisNear",
  "leftSphNear",
  "leftCylNear",
  "leftAxisNear",
  "ipdFar",
  "ipdNear",
] as const;

export type RxValues = Partial<Record<(typeof RX_FIELDS)[number], string>>;

/** جدول قياسات كشف النظر بنفس تقسيم الورقة: يسار | IPD | يمين، وصفّي D و R */
export function RxTable({ defaultValues, namePrefix = "" }: { defaultValues?: RxValues; namePrefix?: string }) {
  // نص حر: القيمة تُحفظ كما تُكتب بالضبط (الموجب والسالب من الكيبورد)
  const cell = (name: (typeof RX_FIELDS)[number]) => (
    <td className="px-0.5 py-0.5">
      <Input
        name={namePrefix + name}
        type="text"
        dir="ltr"
        autoComplete="off"
        maxLength={20}
        defaultValue={defaultValues?.[name] ?? ""}
        className="h-9 px-1.5 text-center"
      />
    </td>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="text-xs">
            <th className="w-8"></th>
            <th colSpan={3} className="pb-1 text-center font-semibold text-brand-teal-dark">
              العين اليسرى (Left)
            </th>
            <th className="w-16 pb-1 text-center font-semibold text-foreground">IPD</th>
            <th colSpan={3} className="pb-1 text-center font-semibold text-brand-navy">
              العين اليمنى (Right)
            </th>
          </tr>
          <tr className="text-[11px] text-muted">
            <th></th>
            <th className="pb-1 font-medium">AXIS</th>
            <th className="pb-1 font-medium">CYL</th>
            <th className="pb-1 font-medium">SPH</th>
            <th></th>
            <th className="pb-1 font-medium">AXIS</th>
            <th className="pb-1 font-medium">CYL</th>
            <th className="pb-1 font-medium">SPH</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pl-1 text-xs font-bold text-foreground">D</td>
            {cell("leftAxisFar")}
            {cell("leftCylFar")}
            {cell("leftSphFar")}
            {cell("ipdFar")}
            {cell("rightAxisFar")}
            {cell("rightCylFar")}
            {cell("rightSphFar")}
          </tr>
          <tr>
            <td className="pl-1 text-xs font-bold text-foreground">R</td>
            {cell("leftAxisNear")}
            {cell("leftCylNear")}
            {cell("leftSphNear")}
            {cell("ipdNear")}
            {cell("rightAxisNear")}
            {cell("rightCylNear")}
            {cell("rightSphNear")}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** قيم الكشف المحفوظ لتعبئة جدول القياسات (للتعديل) */
export function rxValuesOf(p: Partial<Record<(typeof RX_FIELDS)[number], string | null>>): RxValues {
  return Object.fromEntries(RX_FIELDS.map((f) => [f, p[f] ?? ""]));
}
