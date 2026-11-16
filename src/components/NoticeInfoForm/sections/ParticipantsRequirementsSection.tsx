import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import { CRITERION_LABELS, PP2571_POSITIONS } from "../noticeInfo.config";
import styles from "../NoticeInfoForm.module.scss";

const ParticipantsRequirementsSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch, setValue } = useFormContext<NoticeInfoFormValues>();

  const placingWayCode = watch("generalInfo.placingWayCode");
  const reqs = watch("participantsRequirements");
  const isContest = placingWayCode.startsWith("OK");

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
                Преимущество СМП и СОНО в соответствии с ч. 3 ст. 30 Закона №
                44-ФЗ
              </span>
            </label>
          </div>
        </div>

        {/* Требования по ст. 31 */}
        <div className={block("row")}>
          <span className={block("label")}>
            Требования к участникам (ст. 31 44-ФЗ)
          </span>
          <div className={block("field-col")}>
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
                Требование об отсутствии в РНП в связи с отказом от исполнения
                контракта из-за санкций
              </span>
            </label>
          </div>
        </div>

        {/* Требование о привлечении СМП/СОНКО (ч. 5 ст. 30 44-ФЗ). Процент
            приходит из служебной записки по позиции плана-графика: требование
            рождается на этапе СЗ и наследуется вниз по цепочке */}
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

        {/* Обеспечение заявки, контракта и гарантии */}
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
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.requiresQualityWarranty",
                )}
              />
              <span>Требуется гарантия качества товара, работы, услуги</span>
            </label>
            {reqs.requiresQualityWarranty && (
              <input
                type="text"
                placeholder="Срок и объем предоставления гарантии качества"
                className={block("input")}
                {...register("participantsRequirements.warrantyTermAndVolume")}
              />
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.requiresWarrantySecurity",
                )}
              />
              <span>Требуется обеспечение гарантийных обязательств</span>
            </label>
            {reqs.requiresWarrantySecurity && (
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
            )}
          </div>
        </div>

        {/* Казначейское и банковское сопровождение */}
        <div className={block("row")}>
          <span className={block("label")}>Сопровождение контракта</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "participantsRequirements.requiresTreasurySupport",
                )}
              />
              <span>
                Требуется казначейское сопровождение контракта (ст. 242.23 БК
                РФ)
              </span>
            </label>
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
