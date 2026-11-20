import { z } from "zod";
import type { BaseOrganization } from "../Organization/organization.schema";

/**
 * Отчёт об объёме закупок у субъектов малого предпринимательства и
 * социально ориентированных некоммерческих организаций.
 *
 * Форма и требования к заполнению утверждены постановлением Правительства
 * Российской Федерации от 17.03.2015 № 238 (в редакции от 22.05.2025).
 *
 * Структура документа:
 * - раздел I  — сведения о заказчике;
 * - раздел II — расчёт объёма закупок у СМП/СОНКО (показатели 1–9);
 * - раздел III — уникальные номера реестровых записей контрактов.
 *
 * Все денежные показатели ведутся в тысячах рублей, доля — в процентах.
 * Показатели 2, 3, 4, 7 и 8 являются расчётными и проверяются на соответствие
 * правилам пункта 2 требований к заполнению формы.
 */

export const SMNP_REPORT_238_MIN_SHARE_PERCENT = 25;

export const SmnpReport238StatusSchema = z.enum([
  "draft",
  "review",
  "published",
  "archived",
]);

export type SmnpReport238Status = z.infer<typeof SmnpReport238StatusSchema>;

export const SMNP_REPORT_238_STATUS_LABELS: Record<
  SmnpReport238Status,
  string
> = {
  draft: "Черновик",
  review: "На проверке",
  published: "Размещён в ЕИС",
  archived: "Архив",
};

const dateString = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value),
    "Неверный формат даты (ГГГГ-ММ-ДД)",
  );

const money = (message: string) =>
  z
    .string()
    .refine(
      (value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value),
      message,
    );

const percent = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (/^\d+(\.\d{1,2})?$/.test(value) &&
        Number(value) >= 0 &&
        Number(value) <= 100),
    "Доля указывается числом от 0 до 100 с точностью до сотых",
  );

const registryNumber = z
  .string()
  .refine(
    (value) => value === "" || /^\d{19}$/.test(value),
    "Уникальный номер реестровой записи контракта состоит из 19 цифр",
  );

const registryList = z.array(registryNumber);

// ─── Раздел I. Сведения о заказчике ─────────────────────────────────────────

export const SmnpReport238CustomerSchema = z.object({
  fullName: z.string().min(1, "Укажите полное наименование заказчика"),
  legalForm: z
    .string()
    .min(1, "Укажите организационно-правовую форму заказчика"),
  addressPhoneEmail: z
    .string()
    .min(1, "Укажите место нахождения, телефон и адрес электронной почты"),
  inn: z
    .string()
    .regex(/^(\d{10}|\d{12})$/, "ИНН должен содержать 10 или 12 цифр"),
  kpp: z.string().regex(/^\d{9}$/, "КПП должен содержать 9 цифр"),
  okopf: z
    .string()
    .regex(/^\d{2,6}$/, "Код по ОКОПФ должен содержать от 2 до 6 цифр"),
  okpo: z
    .string()
    .regex(/^\d{8,10}$/, "Код по ОКПО должен содержать 8 или 10 цифр"),
  oktmo: z
    .string()
    .regex(/^\d{8,11}$/, "Код по ОКТМО должен содержать от 8 до 11 цифр"),
});

export type SmnpReport238Customer = z.infer<typeof SmnpReport238CustomerSchema>;

// ─── Раздел II. Расчёт объёма закупок ───────────────────────────────────────

export const SmnpReport238ExcludedSchema = z.object({
  // 2.1 Контракты для обеспечения обороны страны и безопасности государства
  defense: money("Укажите сумму числом с точностью до копеек"),
  // 2.2 Контракты на оказание услуг по предоставлению кредитов
  creditServices: money("Укажите сумму числом с точностью до копеек"),
  // 2.3 Контракты с единственным поставщиком (ч. 1 и ч. 12 ст. 93)
  soleSupplier: money("Укажите сумму числом с точностью до копеек"),
  // 2.4 Контракты на выполнение работ в области использования атомной энергии
  atomicEnergy: money("Укажите сумму числом с точностью до копеек"),
  // 2.5 Контракты по результатам закрытых способов определения поставщиков
  closedMethods: money("Укажите сумму числом с точностью до копеек"),
  // 2.6 Контракты для осуществления космической деятельности
  spaceActivity: money("Укажите сумму числом с точностью до копеек"),
  // 2.7 Контракты на поставку наркотических средств и психотропных веществ
  narcoticDrugs: money("Укажите сумму числом с точностью до копеек"),
  // 2.8 Контракты на поставку лекарственных препаратов для медицинского применения
  medicines: money("Укажите сумму числом с точностью до копеек"),
  // 2.9 Контракты на поставку медицинских изделий
  medicalDevices: money("Укажите сумму числом с точностью до копеек"),
});

export type SmnpReport238Excluded = z.infer<typeof SmnpReport238ExcludedSchema>;

export const SMNP_REPORT_238_EXCLUDED_KEYS = [
  "defense",
  "creditServices",
  "soleSupplier",
  "atomicEnergy",
  "closedMethods",
  "spaceActivity",
  "narcoticDrugs",
  "medicines",
  "medicalDevices",
] as const satisfies ReadonlyArray<keyof SmnpReport238Excluded>;

export const SmnpReport238SectionIIInputSchema = z.object({
  // 1. Совокупный годовой объём закупок
  totalAnnualVolume: money("Укажите сумму числом с точностью до копеек"),
  // 2. Общий объём финансового обеспечения по закупкам, не включаемым в расчёт
  excluded: SmnpReport238ExcludedSchema,
  // 5. Объём закупок по результатам определения поставщиков (п. 1 ч. 1 ст. 30)
  smpVolumeByResults: money("Укажите сумму числом с точностью до копеек"),
  // 6. Объём привлечения субподрядчиков и соисполнителей из числа СМП/СОНКО
  subcontractingVolume: money("Укажите сумму числом с точностью до копеек"),
  // 9. Сумма НМЦК несостоявшихся определений поставщиков
  failedProcurementsNmckSum: money(
    "Укажите сумму числом с точностью до копеек",
  ),
});

export type SmnpReport238SectionIIInput = z.infer<
  typeof SmnpReport238SectionIIInputSchema
>;

export const SmnpReport238SectionIISchema =
  SmnpReport238SectionIIInputSchema.extend({
    // 2. Общий объём финансового обеспечения (расчётная сумма подпунктов 2.1–2.9)
    excludedTotal: money("Показатель 2 рассчитывается автоматически"),
    // 3. Совокупный годовой объём закупок за вычетом показателя 2
    adjustedAnnualVolume: money("Показатель 3 рассчитывается автоматически"),
    // 4. Объём закупок, который заказчик обязан осуществить у СМП/СОНКО
    requiredSmpVolume: money("Показатель 4 рассчитывается автоматически"),
    // 7. Объём закупок, осуществлённых у СМП/СОНКО (показатели 5 + 6)
    smpVolumeTotal: money("Показатель 7 рассчитывается автоматически"),
    // 8. Доля закупок у СМП/СОНКО в показателе 3
    smpSharePercent: percent,
  });

export type SmnpReport238SectionII = z.infer<
  typeof SmnpReport238SectionIISchema
>;

// ─── Раздел III. Сведения о заключённых контрактах ──────────────────────────

export const SmnpReport238SectionIIIExcludedSchema = z.object({
  // Контракты на оказание услуг по предоставлению кредитов
  creditServices: registryList,
  // Контракты с единственным поставщиком (ч. 1 и ч. 12 ст. 93, кроме п. 25 ч. 1 ст. 93)
  soleSupplier: registryList,
  // Контракты по п. 25 ч. 1 ст. 93 по результатам несостоявшегося определения
  failedSoleSupplier: registryList,
  // Контракты на выполнение работ в области использования атомной энергии
  atomicEnergy: registryList,
  // Контракты, при осуществлении которых применяются закрытые способы
  closedMethods: registryList,
  // Контракты для осуществления космической деятельности
  spaceActivity: registryList,
  // Контракты на поставку наркотических средств и психотропных веществ
  narcoticDrugs: registryList,
  // Контракты на поставку лекарственных препаратов для медицинского применения
  medicines: registryList,
  // Контракты на поставку медицинских изделий
  medicalDevices: registryList,
});

export type SmnpReport238SectionIIIExcluded = z.infer<
  typeof SmnpReport238SectionIIIExcludedSchema
>;

export const SmnpReport238SectionIIISchema = z.object({
  // 1. Контракты, заключённые с СМП/СОНКО
  smpContracts: registryList,
  // 2. Контракты с условием о привлечении субподрядчиков из числа СМП/СОНКО
  subcontractingContracts: registryList,
  // 3. Контракты по закупкам, не включаемым в расчёт совокупного годового объёма
  excludedProcurementContracts: SmnpReport238SectionIIIExcludedSchema,
});

export type SmnpReport238SectionIII = z.infer<
  typeof SmnpReport238SectionIIISchema
>;

// ─── Применимость отдельных показателей ─────────────────────────────────────

export const SmnpReport238ApplicabilitySchema = z.object({
  // Показатель 2.6 и соответствующий вид контрактов — для Роскосмоса и
  // организаций ракетно-космической промышленности
  spaceActivity: z.boolean(),
  // Показатель 2.8 — если годовой объём закупок лекарственных препаратов
  // для медицинского применения составляет 20 млн рублей и более
  medicines: z.boolean(),
  // Показатель 2.9 — если годовой объём закупок медицинских изделий
  // составляет 20 млн рублей и более
  medicalDevices: z.boolean(),
});

export type SmnpReport238Applicability = z.infer<
  typeof SmnpReport238ApplicabilitySchema
>;

// ─── Подпись ────────────────────────────────────────────────────────────────

export const SmnpReport238SignatureSchema = z.object({
  position: z.string(),
  name: z.string(),
  date: dateString,
});

export type SmnpReport238Signature = z.infer<
  typeof SmnpReport238SignatureSchema
>;

// ─── Отчёт ──────────────────────────────────────────────────────────────────

const SmnpReport238BaseSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  year: z
    .number()
    .int()
    .min(2000, "Отчётный год не может быть раньше 2000")
    .max(2100, "Отчётный год не может быть позже 2100"),
  reportDate: dateString,
  status: SmnpReport238StatusSchema,
  customer: SmnpReport238CustomerSchema,
  applicability: SmnpReport238ApplicabilitySchema,
  sectionII: SmnpReport238SectionIISchema,
  sectionIII: SmnpReport238SectionIIISchema,
  signature: SmnpReport238SignatureSchema,
  comment: z.string().optional(),
});

export type SmnpReport238 = z.infer<typeof SmnpReport238BaseSchema>;

/** Черновик отчёта: расчётные показатели раздела II ещё не заполнены. */
export type SmnpReport238Draft = Omit<SmnpReport238, "sectionII"> & {
  sectionII: SmnpReport238SectionIIInput;
};

const toCents = (value: string | undefined): number =>
  Math.round(Number(value || 0) * 100);

const fromCents = (value: number): string => (value / 100).toFixed(2);

const roundPercent = (value: number): number => Math.round(value * 100) / 100;

const compactRegistryNumbers = (values: string[]): string[] =>
  values.map((value) => value.trim()).filter(Boolean);

/** Сумма подпунктов 2.1–2.9 в копейках. */
export const smnpReport238ExcludedCents = (
  excluded: SmnpReport238Excluded,
): number =>
  SMNP_REPORT_238_EXCLUDED_KEYS.reduce(
    (sum, key) => sum + toCents(excluded[key]),
    0,
  );

/**
 * Заполняет расчётные показатели раздела II по правилам пункта 2 требований:
 * 2 = сумма 2.1–2.9; 3 = 1 − 2; 4 = 25 % от 3; 7 = 5 + 6; 8 = 7 / 3 × 100.
 */
export const normalizeSmnpReport238 = (
  draft: SmnpReport238Draft,
): SmnpReport238 => {
  const excludedCents = smnpReport238ExcludedCents(draft.sectionII.excluded);
  const totalCents = toCents(draft.sectionII.totalAnnualVolume);
  const adjustedCents = Math.max(totalCents - excludedCents, 0);
  const requiredCents = Math.round(
    (adjustedCents * SMNP_REPORT_238_MIN_SHARE_PERCENT) / 100,
  );
  const smpTotalCents =
    toCents(draft.sectionII.smpVolumeByResults) +
    toCents(draft.sectionII.subcontractingVolume);
  const share =
    adjustedCents > 0 ? roundPercent((smpTotalCents / adjustedCents) * 100) : 0;

  return {
    ...draft,
    sectionII: {
      ...draft.sectionII,
      excludedTotal: fromCents(excludedCents),
      adjustedAnnualVolume: fromCents(adjustedCents),
      requiredSmpVolume: fromCents(requiredCents),
      smpVolumeTotal: fromCents(smpTotalCents),
      smpSharePercent: share.toFixed(2),
    },
    sectionIII: {
      smpContracts: compactRegistryNumbers(draft.sectionIII.smpContracts),
      subcontractingContracts: compactRegistryNumbers(
        draft.sectionIII.subcontractingContracts,
      ),
      excludedProcurementContracts: {
        creditServices: compactRegistryNumbers(
          draft.sectionIII.excludedProcurementContracts.creditServices,
        ),
        soleSupplier: compactRegistryNumbers(
          draft.sectionIII.excludedProcurementContracts.soleSupplier,
        ),
        failedSoleSupplier: compactRegistryNumbers(
          draft.sectionIII.excludedProcurementContracts.failedSoleSupplier,
        ),
        atomicEnergy: compactRegistryNumbers(
          draft.sectionIII.excludedProcurementContracts.atomicEnergy,
        ),
        closedMethods: compactRegistryNumbers(
          draft.sectionIII.excludedProcurementContracts.closedMethods,
        ),
        spaceActivity: compactRegistryNumbers(
          draft.sectionIII.excludedProcurementContracts.spaceActivity,
        ),
        narcoticDrugs: compactRegistryNumbers(
          draft.sectionIII.excludedProcurementContracts.narcoticDrugs,
        ),
        medicines: compactRegistryNumbers(
          draft.sectionIII.excludedProcurementContracts.medicines,
        ),
        medicalDevices: compactRegistryNumbers(
          draft.sectionIII.excludedProcurementContracts.medicalDevices,
        ),
      },
    },
  };
};

const addIssue = (
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string,
) => {
  ctx.addIssue({ code: "custom", path, message });
};

const checkRegistryDuplicates = (
  ctx: z.RefinementCtx,
  values: string[],
  path: (string | number)[],
  label: string,
) => {
  const seen = new Set<string>();

  values.forEach((value, index) => {
    if (!value) return;
    if (seen.has(value)) {
      addIssue(
        ctx,
        [...path, index],
        `${label}: номер ${value} указан повторно`,
      );
    }
    seen.add(value);
  });
};

const refineSmnpReport238 = (data: SmnpReport238, ctx: z.RefinementCtx) => {
  const excludedCents = smnpReport238ExcludedCents(data.sectionII.excluded);
  const totalCents = toCents(data.sectionII.totalAnnualVolume);
  const adjustedCents = totalCents - excludedCents;

  if (toCents(data.sectionII.excludedTotal) !== excludedCents) {
    addIssue(
      ctx,
      ["sectionII", "excludedTotal"],
      "Показатель 2 должен равняться сумме подпунктов 2.1–2.9",
    );
  }

  if (adjustedCents < 0) {
    addIssue(
      ctx,
      ["sectionII", "adjustedAnnualVolume"],
      "Показатель 2 не может превышать показатель 1",
    );
  } else {
    if (toCents(data.sectionII.adjustedAnnualVolume) !== adjustedCents) {
      addIssue(
        ctx,
        ["sectionII", "adjustedAnnualVolume"],
        "Показатель 3 должен равняться разнице показателей 1 и 2",
      );
    }

    const requiredCents = Math.round(
      (adjustedCents * SMNP_REPORT_238_MIN_SHARE_PERCENT) / 100,
    );

    if (toCents(data.sectionII.requiredSmpVolume) !== requiredCents) {
      addIssue(
        ctx,
        ["sectionII", "requiredSmpVolume"],
        "Показатель 4 должен составлять 25 % от показателя 3",
      );
    }

    const smpTotalCents =
      toCents(data.sectionII.smpVolumeByResults) +
      toCents(data.sectionII.subcontractingVolume);

    if (toCents(data.sectionII.smpVolumeTotal) !== smpTotalCents) {
      addIssue(
        ctx,
        ["sectionII", "smpVolumeTotal"],
        "Показатель 7 должен равняться сумме показателей 5 и 6",
      );
    }

    const share =
      adjustedCents > 0
        ? roundPercent((smpTotalCents / adjustedCents) * 100)
        : 0;

    if (Math.abs(Number(data.sectionII.smpSharePercent || 0) - share) > 0.01) {
      addIssue(
        ctx,
        ["sectionII", "smpSharePercent"],
        "Показатель 8 должен равняться отношению показателя 7 к показателю 3, умноженному на 100",
      );
    }

    if (adjustedCents > 0 && smpTotalCents < requiredCents) {
      addIssue(
        ctx,
        ["sectionII", "smpSharePercent"],
        `Доля закупок у СМП/СОНКО составляет ${share.toFixed(2)} %, что меньше установленных ${SMNP_REPORT_238_MIN_SHARE_PERCENT} % (ч. 1 ст. 30 Федерального закона)`,
      );
    }
  }

  if (
    !data.applicability.spaceActivity &&
    toCents(data.sectionII.excluded.spaceActivity) !== 0
  ) {
    addIssue(
      ctx,
      ["sectionII", "excluded", "spaceActivity"],
      "Показатель 2.6 заполняется только организациями космической деятельности",
    );
  }

  if (
    !data.applicability.medicines &&
    toCents(data.sectionII.excluded.medicines) !== 0
  ) {
    addIssue(
      ctx,
      ["sectionII", "excluded", "medicines"],
      "Показатель 2.8 заполняется при годовом объёме закупок лекарственных препаратов 20 млн рублей и более",
    );
  }

  if (
    !data.applicability.medicalDevices &&
    toCents(data.sectionII.excluded.medicalDevices) !== 0
  ) {
    addIssue(
      ctx,
      ["sectionII", "excluded", "medicalDevices"],
      "Показатель 2.9 заполняется при годовом объёме закупок медицинских изделий 20 млн рублей и более",
    );
  }

  const excludedSection = data.sectionIII.excludedProcurementContracts;

  if (
    !data.applicability.spaceActivity &&
    excludedSection.spaceActivity.length > 0
  ) {
    addIssue(
      ctx,
      ["sectionIII", "excludedProcurementContracts", "spaceActivity"],
      "Контракты космической деятельности включаются только организациями космической деятельности",
    );
  }

  if (!data.applicability.medicines && excludedSection.medicines.length > 0) {
    addIssue(
      ctx,
      ["sectionIII", "excludedProcurementContracts", "medicines"],
      "Контракты на поставку лекарственных препаратов включаются при годовом объёме закупок 20 млн рублей и более",
    );
  }

  if (
    !data.applicability.medicalDevices &&
    excludedSection.medicalDevices.length > 0
  ) {
    addIssue(
      ctx,
      ["sectionIII", "excludedProcurementContracts", "medicalDevices"],
      "Контракты на поставку медицинских изделий включаются при годовом объёме закупок 20 млн рублей и более",
    );
  }

  checkRegistryDuplicates(
    ctx,
    data.sectionIII.smpContracts,
    ["sectionIII", "smpContracts"],
    "Контракты с СМП/СОНКО",
  );
  checkRegistryDuplicates(
    ctx,
    data.sectionIII.subcontractingContracts,
    ["sectionIII", "subcontractingContracts"],
    "Контракты с привлечением субподрядчиков",
  );

  (
    Object.keys(excludedSection) as Array<keyof SmnpReport238SectionIIIExcluded>
  ).forEach((key) => {
    checkRegistryDuplicates(
      ctx,
      excludedSection[key],
      ["sectionIII", "excludedProcurementContracts", key],
      "Контракты по закупкам, не включаемым в расчёт",
    );
  });

  if (data.status !== "draft") {
    if (!data.reportDate) {
      addIssue(ctx, ["reportDate"], "Укажите дату размещения отчёта в ЕИС");
    }

    if (!data.signature.position.trim()) {
      addIssue(
        ctx,
        ["signature", "position"],
        "Укажите должность руководителя (уполномоченного работника)",
      );
    }

    if (!data.signature.name.trim()) {
      addIssue(ctx, ["signature", "name"], "Укажите расшифровку подписи");
    }

    if (!data.signature.date) {
      addIssue(ctx, ["signature", "date"], "Укажите дату подписания отчёта");
    }
  }
};

export const SmnpReport238Schema =
  SmnpReport238BaseSchema.superRefine(refineSmnpReport238);

export interface SmnpReport238Issue {
  path: string;
  message: string;
}

export const smnpReport238IssuesFromError = (
  error: z.ZodError,
): SmnpReport238Issue[] =>
  error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));

/** Проверка черновика отчёта без выброса исключения. */
export const validateSmnpReport238 = (
  draft: SmnpReport238Draft,
): SmnpReport238Issue[] => {
  const result = SmnpReport238Schema.safeParse(normalizeSmnpReport238(draft));

  return result.success ? [] : smnpReport238IssuesFromError(result.error);
};

/** Пустой отчёт с реквизитами заказчика из учётной записи. */
export const emptySmnpReport238 = (
  organization?: BaseOrganization | null,
): SmnpReport238Draft => {
  const addressPhoneEmail = [
    organization?.legalAddress || "",
    organization?.phone ? `тел. ${organization.phone}` : "",
    organization?.email ? `e-mail: ${organization.email}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    organizationId: organization?.id ?? "",
    year: new Date().getFullYear() - 1,
    reportDate: "",
    status: "draft",
    customer: {
      fullName: organization?.fullName ?? "",
      legalForm: "",
      addressPhoneEmail,
      inn: organization?.inn ?? "",
      kpp: organization?.kpp ?? "",
      okopf: organization?.okopf ?? "",
      okpo: organization?.okpo ?? "",
      oktmo: organization?.oktmo ?? "",
    },
    applicability: {
      spaceActivity: false,
      medicines: false,
      medicalDevices: false,
    },
    sectionII: {
      totalAnnualVolume: "",
      excluded: {
        defense: "",
        creditServices: "",
        soleSupplier: "",
        atomicEnergy: "",
        closedMethods: "",
        spaceActivity: "",
        narcoticDrugs: "",
        medicines: "",
        medicalDevices: "",
      },
      smpVolumeByResults: "",
      subcontractingVolume: "",
      failedProcurementsNmckSum: "",
    },
    sectionIII: {
      smpContracts: [],
      subcontractingContracts: [],
      excludedProcurementContracts: {
        creditServices: [],
        soleSupplier: [],
        failedSoleSupplier: [],
        atomicEnergy: [],
        closedMethods: [],
        spaceActivity: [],
        narcoticDrugs: [],
        medicines: [],
        medicalDevices: [],
      },
    },
    signature: {
      position: "",
      name: "",
      date: "",
    },
    comment: "",
  };
};
