import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import {
  detectObjectCategory,
  objectCategoryLimits,
  pp2604Applies,
  procedureApplicabilityHint,
  procedureKindFromPlacingWay,
} from "../../../services/BidEvaluation/bidEvaluation.schema";
import { CRITERION_LABELS, PP2571_POSITIONS } from "../noticeInfo.config";
import SecurityRequisitesFields from "../../PurchaseNote/SecurityRequisitesFields";
import styles from "../NoticeInfoForm.module.scss";

const ParticipantsRequirementsSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch, setValue } = useFormContext<NoticeInfoFormValues>();

  const placingWayCode = watch("generalInfo.placingWayCode");
  const reqs = watch("participantsRequirements");
  const procedureKind = procedureKindFromPlacingWay(placingWayCode);
  const isContest = pp2604Applies(procedureKind);

  // Категория объекта и ОКПД2 пришли из служебной записки: по ним проверяем
  // предельные величины значимости приложения N 2 к ПП РФ N 2604
  const evaluationLimits = objectCategoryLimits(reqs.evaluationObjectCategory);
  const detection = detectObjectCategory(reqs.evaluationOkpd2Codes ?? []);
  const enabledCriteria = reqs.evaluationCriteria.filter(
    (criterion) => criterion.enabled,
  );
  const weightSum = enabledCriteria.reduce(
    (total, criterion) => total + Number(criterion.weightPercent ?? 0),
    0,
  );
  const nonCostSum = enabledCriteria
    .filter(
      (criterion) =>
        criterion.type === "qualitative_characteristics" ||
        criterion.type === "qualification",
    )
    .reduce(
      (total, criterion) => total + Number(criterion.weightPercent ?? 0),
      0,
    );

  const smpConflictWarning =
    Boolean(reqs.advantageSmpPart3Art30) &&
    Boolean(reqs.subcontractingSmpPart5Art30);
  const rnpConflictWarning =
    Boolean(reqs.requirementsPart1_1Art31) &&
    Boolean(reqs.sanctionsRnpRequirement);

  const togglePp2571 = (pos: string) => {
    const current = reqs.pp2571Positions || [];
    const next = current.includes(pos)
      ? current.filter((x) => x !== pos)
      : [...current, pos];
    setValue("participantsRequirements.pp2571Positions", next);
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Требования к участникам, критерии оценки и обеспечение
      </h2>

      <div className={block("form-grid")}>
        {/* Категория объекта по ОКПД2 и предельные значимости (ПП РФ N 2604) */}
        <div className={block("row")}>
          <span className={block("label")}>
            Категория объекта закупки (приложение N 2 к ПП РФ N 2604)
          </span>
          <div className={block("field-col")}>
            <span>{evaluationLimits.label}</span>
            {detection.matches.length > 0 ? (
              <span className={block("hint")}>
                ОКПД2:{" "}
                {detection.matches
                  .map(
                    (match) =>
                      `${match.code} → ${
                        match.category
                          ? objectCategoryLimits(match.category).label
                          : "правило не найдено"
                      }`,
                  )
                  .join("; ")}
              </span>
            ) : (
              <span className={block("hint")}>
                Коды ОКПД2 не переданы из служебной записки — категория
                определена вручную.
              </span>
            )}
            <span className={block("hint")}>
              Цена — не менее {evaluationLimits.minPrice}%, характеристики и
              квалификация — не более {evaluationLimits.maxNonCost}%, расходы —{" "}
              {evaluationLimits.maxExpenses === null
                ? "не применяются"
                : `не более ${evaluationLimits.maxExpenses}%`}
              .
            </span>

            {!isContest && (
              <span className={block("hint")}>
                {procedureApplicabilityHint[procedureKind]}
              </span>
            )}

            {isContest && Math.abs(weightSum - 100) > 0.01 && (
              <div className={block("yellow-warning")} role="alert">
                <span className={block("warning-badge")}>!</span>
                <span>
                  Сумма значимости критериев — {weightSum.toFixed(2)}%, должна
                  составлять 100% (п. 5, подп. «д» Положения).
                </span>
              </div>
            )}

            {isContest && nonCostSum > evaluationLimits.maxNonCost && (
              <div className={block("yellow-warning")} role="alert">
                <span className={block("warning-badge")}>!</span>
                <span>
                  Сумма значимости характеристик и квалификации —{" "}
                  {nonCostSum.toFixed(2)}%, максимум{" "}
                  {evaluationLimits.maxNonCost}% (приложение N 2).
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Критерии оценки (отображаются для конкурса) */}
        {isContest && (
          <div className={block("row")}>
            <span className={block("label")}>
              Критерии оценки заявок участников<sup>*</sup>
            </span>
            <div className={block("field-col")}>
              {reqs.evaluationCriteria.map((crit, index) => (
                <div key={crit.id} className={block("sub-box")}>
                  <label className={block("checkbox")}>
                    <input
                      type="checkbox"
                      {...register(
                        `participantsRequirements.evaluationCriteria.${index}.enabled`,
                      )}
                    />
                    <span>{CRITERION_LABELS[crit.type] || crit.type}</span>
                  </label>
                  {crit.enabled && (
                    <div className={block("inline-group")}>
                      <span>Значимость критерия, %:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={block("input", ["code"])}
                        {...register(
                          `participantsRequirements.evaluationCriteria.${index}.weightPercent`,
                          { valueAsNumber: true },
                        )}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Преимущества */}
        <div className={block("row")}>
          <span className={block("label")}>Преимущества (ст. 28–30 44-ФЗ)</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("participantsRequirements.advantageDisabledArt29")}
              />
              <span>
                Организациям инвалидов в соответствии со ст. 29 Закона № 44-ФЗ
                (15.00%)
              </span>
            </label>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.advantagePenalSystemArt28",
                )}
              />
              <span>
                Учреждениям и предприятиям уголовно-исполнительной системы по
                ст. 28 Закона № 44-ФЗ (15.00%)
              </span>
            </label>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("participantsRequirements.advantageSmpPart3Art30")}
              />
              <span>
                Закупка только среди СМП и СОНКО (ч. 3 ст. 30 Закона № 44-ФЗ)
              </span>
            </label>
          </div>
        </div>

        {/* Требования по ст. 31, ПП 1482 и ПП 2571 */}
        <div className={block("row")}>
          <span className={block("label")}>
            Требования к участникам (ст. 31 44-ФЗ)
          </span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.requirementsPart1_1Art31",
                )}
              />
              <span>
                Требования к участникам закупок в соответствии с ч. 1.1 ст. 31
                Закона № 44-ФЗ
              </span>
            </label>

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.pp1482ProductionFacilities",
                )}
              />
              <span>
                Наличие на праве собственности или на ином законном основании
                производственных мощностей и технологического оборудования для
                исполнения государственного контракта (п. 1 ПП РФ от 25.12.2014
                № 1482)
              </span>
            </label>
            {reqs.pp1482ProductionFacilities && (
              <textarea
                rows={2}
                className={block("input")}
                placeholder="Описание требуемых производственных мощностей (п. 1 ПП РФ № 1482)"
                {...register(
                  "participantsRequirements.pp1482ProductionFacilitiesText",
                )}
              />
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.pp1482FinancialStability",
                )}
              />
              <span>
                Финансовая устойчивость и платежеспособность (п. 1 ПП РФ от
                25.12.2014 № 1482)
              </span>
            </label>
            {reqs.pp1482FinancialStability && (
              <textarea
                rows={2}
                className={block("input")}
                placeholder="Описание показателей финансовой устойчивости (п. 1 ПП РФ № 1482)"
                {...register(
                  "participantsRequirements.pp1482FinancialStabilityText",
                )}
              />
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("participantsRequirements.pp1482Specialists")}
              />
              <span>
                Наличие специалистов с профессиональным образованием,
                заключивших с участником ГОЗ трудовые договоры (п. 1 ПП РФ от
                25.12.2014 № 1482)
              </span>
            </label>
            {reqs.pp1482Specialists && (
              <textarea
                rows={2}
                className={block("input")}
                placeholder="Описание требований к специалистам (п. 1 ПП РФ № 1482)"
                {...register("participantsRequirements.pp1482SpecialistsText")}
              />
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.requirementP1Part1Art31",
                )}
              />
              <span>
                Требование к участникам закупок в соответствии с п. 1 ч. 1 ст.
                31 Закона № 44-ФЗ
              </span>
            </label>
            {reqs.requirementP1Part1Art31 && (
              <textarea
                rows={2}
                className={block("input")}
                placeholder="Описание лицензий / СРО / допусков (п. 1 ч. 1 ст. 31)"
                {...register(
                  "participantsRequirements.requirementP1Part1Art31Text",
                )}
              />
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.unifiedRequirementsPart1Art31",
                )}
              />
              <span>
                Единые требования к участникам закупок по ч. 1 ст. 31 Закона №
                44-ФЗ
              </span>
            </label>
            {reqs.unifiedRequirementsPart1Art31 && (
              <textarea
                rows={2}
                className={block("input")}
                placeholder="Описание единых требований по ч. 1 ст. 31"
                {...register(
                  "participantsRequirements.unifiedRequirementsPart1Art31Text",
                )}
              />
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.additionalRequirementsPart2Art31",
                )}
              />
              <span>
                Дополнительные требования по ч. 2 ст. 31 Закона № 44-ФЗ (ПП РФ
                от 29.12.2021 № 2571)
              </span>
            </label>

            {reqs.additionalRequirementsPart2Art31 && (
              <div className={block("sub-box")}>
                {PP2571_POSITIONS.map((pos) => (
                  <label key={pos} className={block("checkbox")}>
                    <input
                      type="checkbox"
                      checked={reqs.pp2571Positions.includes(pos)}
                      onChange={() => togglePp2571(pos)}
                    />
                    <span>{pos}</span>
                  </label>
                ))}
                <textarea
                  rows={2}
                  className={block("input")}
                  placeholder="Описание дополнительных требований по ч. 2 ст. 31"
                  {...register(
                    "participantsRequirements.additionalRequirementsPart2Art31Text",
                  )}
                />
              </div>
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.requirementsPart2_1Art31",
                )}
              />
              <span>
                Требования к участникам закупок в соответствии с ч. 2.1 ст. 31
                Закона № 44-ФЗ
              </span>
            </label>

            {reqs.requirementsPart2_1Art31 && (
              <div className={block("sub-box")}>
                <textarea
                  rows={2}
                  className={block("input")}
                  placeholder="Описание требований по ч. 2.1 ст. 31"
                  {...register(
                    "participantsRequirements.requirementsPart2_1Art31Text",
                  )}
                />
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register(
                      "participantsRequirements.pp2571Point4Requirement",
                    )}
                  />
                  <span>
                    Требования в соответствии с пунктом 4 ПП РФ от 29.12.2021 №
                    2571
                  </span>
                </label>
                {reqs.pp2571Point4Requirement && (
                  <textarea
                    rows={2}
                    className={block("input")}
                    placeholder="Стандартный текст требования по п. 4 ПП РФ № 2571"
                    {...register(
                      "participantsRequirements.pp2571Point4RequirementText",
                    )}
                  />
                )}
              </div>
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.sanctionsRnpRequirement",
                )}
              />
              <span>
                Требование об отсутствии в РНП информации, включенной в связи с
                отказом от исполнения контракта из-за санкций и мер
                ограничительного характера
              </span>
            </label>

            {rnpConflictWarning && (
              <div className={block("error-banner")} role="alert">
                Предупреждение: требование об отсутствии в РНП по ч. 1.1 ст. 31
                и санкционное требование об отсутствии в РНП вместе не должны
                устанавливаться.
              </div>
            )}
          </div>
        </div>

        {/* Требование о привлечении СМП/СОНКО (ч. 5 ст. 30 44-ФЗ) */}
        <div className={block("row")}>
          <span className={block("label")}>Привлечение СМП и СОНКО</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.subcontractingSmpPart5Art30",
                )}
              />
              <span>
                Требование о привлечении субподрядчиков и соисполнителей из
                числа СМП и СОНКО (ч. 5 ст. 30 Закона № 44-ФЗ)
              </span>
            </label>
            {smpConflictWarning && (
              <div className={block("error-banner")} role="alert">
                Предупреждение: нельзя одновременно устанавливать закупку только
                среди СМП (ч. 3 ст. 30) и привлечение субподрядчиков СМП (ч. 5
                ст. 30 Закона № 44-ФЗ).
              </div>
            )}
            {reqs.subcontractingSmpPart5Art30 && (
              <div className={block("inline-group")}>
                <span>
                  Объём привлечения, % от цены контракта (п. 1 типовых условий,
                  ПП РФ от 23.12.2016 № 1466, не менее 5%):
                </span>
                <input
                  type="text"
                  className={block("input", ["code"])}
                  placeholder="5"
                  {...register(
                    "participantsRequirements.subcontractingSmpRequiredPercent",
                  )}
                />
              </div>
            )}
            <span className={block("caption")}>
              {reqs.subcontractingSmpNoteNumber
                ? `Требование унаследовано из служебной записки № ${reqs.subcontractingSmpNoteNumber} по позиции плана-графика`
                : "Требование устанавливается служебной запиской по позиции плана-графика; здесь оно попадает в извещение"}
            </span>
          </div>
        </div>

        {/* Обеспечение заявки, контракта, гарантия качества и обеспечение гарантий */}
        <div className={block("row")}>
          <span className={block("label")}>Обеспечение и гарантия</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.requiresApplicationSecurity",
                )}
              />
              <span>Требуется обеспечение заявки (ст. 44 44-ФЗ)</span>
            </label>
            {reqs.requiresApplicationSecurity && (
              <div className={block("sub-box")}>
                <div className={block("inline-group")}>
                  <span>Размер обеспечения заявки, % от НМЦК:</span>
                  <input
                    type="number"
                    step="any"
                    className={block("input", ["code"])}
                    {...register(
                      "participantsRequirements.applicationSecurityPercent",
                      { valueAsNumber: true },
                    )}
                  />
                </div>
                <textarea
                  rows={2}
                  className={block("input")}
                  placeholder="Порядок предоставления обеспечения заявки"
                  {...register(
                    "participantsRequirements.applicationSecurityOrder",
                  )}
                />
                <SecurityRequisitesFields
                  idPrefix="notice-app-sec"
                  title="Реквизиты счета для перечисления обеспечения заявки"
                  account={reqs.applicationSecurityRequisites}
                  onAccountChange={(next) =>
                    setValue(
                      "participantsRequirements.applicationSecurityRequisites",
                      next,
                    )
                  }
                  showBudgetPart13Art44
                  budgetAccount={reqs.applicationSecurityBudgetRequisites}
                  onBudgetAccountChange={(next) =>
                    setValue(
                      "participantsRequirements.applicationSecurityBudgetRequisites",
                      next,
                    )
                  }
                />
              </div>
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.requiresContractSecurity",
                )}
              />
              <span>
                Требуется обеспечение исполнения контракта (ст. 96 44-ФЗ)
              </span>
            </label>
            {reqs.requiresContractSecurity && (
              <div className={block("sub-box")}>
                <div className={block("inline-group")}>
                  <span>Размер обеспечения исполнения контракта, %:</span>
                  <input
                    type="number"
                    step="any"
                    className={block("input", ["code"])}
                    {...register(
                      "participantsRequirements.contractSecurityPercent",
                      { valueAsNumber: true },
                    )}
                  />
                </div>
                <textarea
                  rows={2}
                  className={block("input")}
                  placeholder="Порядок предоставления обеспечения исполнения контракта"
                  {...register(
                    "participantsRequirements.contractSecurityOrder",
                  )}
                />
                <SecurityRequisitesFields
                  idPrefix="notice-contract-sec"
                  title="Реквизиты счета для перечисления обеспечения контракта"
                  account={reqs.contractSecurityRequisites}
                  onAccountChange={(next) =>
                    setValue(
                      "participantsRequirements.contractSecurityRequisites",
                      next,
                    )
                  }
                />
              </div>
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                checked={Boolean(reqs.requiresQualityWarranty)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setValue(
                    "participantsRequirements.requiresQualityWarranty",
                    checked,
                  );
                  if (!checked) {
                    setValue(
                      "participantsRequirements.requiresWarrantySecurity",
                      false,
                    );
                  }
                }}
              />
              <span>Требуется гарантия качества товара, работы, услуги</span>
            </label>
            {reqs.requiresQualityWarranty && (
              <div className={block("sub-box")}>
                <textarea
                  rows={2}
                  placeholder="1) Информация о требованиях к гарантийному обслуживанию товара"
                  className={block("input")}
                  {...register(
                    "participantsRequirements.warrantyMaintenanceInfo",
                  )}
                />
                <textarea
                  rows={2}
                  placeholder="2) Требования к гарантии производителя товара"
                  className={block("input")}
                  {...register(
                    "participantsRequirements.manufacturerWarrantyInfo",
                  )}
                />
                <textarea
                  rows={2}
                  placeholder="3) Срок, на который предоставляется гарантия и (или) требования к объему предоставления гарантий качества товара, работы, услуги *"
                  className={block("input")}
                  {...register(
                    "participantsRequirements.warrantyTermAndVolume",
                  )}
                />
              </div>
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                disabled={!reqs.requiresQualityWarranty}
                {...register(
                  "participantsRequirements.requiresWarrantySecurity",
                )}
              />
              <span>
                Требуется обеспечение гарантийных обязательств (доступно при
                включённой гарантии качества)
              </span>
            </label>
            {reqs.requiresQualityWarranty && reqs.requiresWarrantySecurity && (
              <div className={block("sub-box")}>
                <div className={block("inline-group")}>
                  <span>Размер обеспечения гарантийных обязательств, %:</span>
                  <input
                    type="number"
                    step="any"
                    className={block("input", ["code"])}
                    {...register(
                      "participantsRequirements.warrantySecurityPercent",
                      { valueAsNumber: true },
                    )}
                  />
                </div>
                <textarea
                  rows={2}
                  className={block("input")}
                  placeholder="Порядок предоставления обеспечения гарантийных обязательств"
                  {...register(
                    "participantsRequirements.warrantySecurityOrder",
                  )}
                />
                <SecurityRequisitesFields
                  idPrefix="notice-warranty-sec"
                  title="Реквизиты счета для перечисления обеспечения гарантийных обязательств"
                  account={reqs.warrantySecurityRequisites}
                  onAccountChange={(next) =>
                    setValue(
                      "participantsRequirements.warrantySecurityRequisites",
                      next,
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Казначейское и банковское сопровождение */}
        <div className={block("row")}>
          <span className={block("label")}>Сопровождение контракта</span>
          <div className={block("field-col")}>
            <div className={block("radio-group")}>
              <span>
                Казначейское сопровождение контракта (ст. 242.23 БК РФ):
              </span>
              <label className={block("radio")}>
                <input
                  type="radio"
                  checked={!reqs.requiresTreasurySupport}
                  onChange={() => {
                    setValue(
                      "participantsRequirements.requiresTreasurySupport",
                      false,
                    );
                    setValue(
                      "participantsRequirements.treasurySupportType",
                      "",
                    );
                  }}
                />
                <span>Нет</span>
              </label>
              <label className={block("radio")}>
                <input
                  type="radio"
                  checked={Boolean(reqs.requiresTreasurySupport)}
                  onChange={() => {
                    setValue(
                      "participantsRequirements.requiresTreasurySupport",
                      true,
                    );
                    if (!reqs.treasurySupportType) {
                      setValue(
                        "participantsRequirements.treasurySupportType",
                        "full",
                      );
                    }
                  }}
                />
                <span>Да</span>
              </label>
            </div>
            {reqs.requiresTreasurySupport && (
              <select
                className={block("select")}
                {...register("participantsRequirements.treasurySupportType")}
              >
                <option value="full">Полное казначейское сопровождение</option>
                <option value="advance_only">
                  Казначейское сопровождение только аванса
                </option>
              </select>
            )}
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("participantsRequirements.requiresBankSupport")}
              />
              <span>Требуется банковское сопровождение контракта</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParticipantsRequirementsSection;
