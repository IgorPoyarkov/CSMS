import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ExternalLink } from "lucide-react";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import { useFetchEmployeeByUserId } from "../../services/StaffingTable/StaffingTable.api";
import {
  usePurchasePlans,
  useSavePositionNmck,
} from "../../services/PurchasePlan/purchasePlan.api";
import { toNumber } from "../../services/PurchasePlan/purchasePlan.schema";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import { formatNmckMoney } from "../../services/Nmck/marketNmck";
import type { NmckCalculationRecord } from "../../services/Nmck/nmck.schema";
import LegalActRefs from "../LegalAct/LegalActRefs";
import MarketNmckCalculator from "./MarketNmckCalculator";
import styles from "./NmckCalculatorPage.module.scss";

/**
 * Полноэкранный модуль расчёта НМЦК методом сопоставимых рыночных цен
 * (анализ рынка) с привязкой и сохранением результата в карточку позиции
 * плана-графика закупок (`/nmck-calculator`).
 */
export default function NmckCalculatorPage() {
  const { bem, fullName } = useUtils();
  const block = bem(styles, "nmck-page");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: organization, isLoading: isOrgLoading } =
    useCurrentOrganization();
  const organizationId = organization?.id;
  const { data: user } = useFetchCurrentUser();
  const { data: employee } = useFetchEmployeeByUserId(user?.id);

  const { data: plans = [], isLoading: isPlansLoading } =
    usePurchasePlans(organizationId);
  const { data: contractRegistryItems = [] } =
    useContractRegistry(organizationId);

  const {
    mutate: savePositionNmck,
    isPending: isSaving,
    error: saveError,
  } = useSavePositionNmck();

  const [savedNotice, setSavedNotice] = useState<{
    planId: string;
    positionId: string;
    nmckTotal: number;
    updatedAmount: boolean;
  } | null>(null);

  const paramPlanId = searchParams.get("planId") ?? "";
  const paramPositionId = searchParams.get("positionId") ?? "";

  const selectedPlan = useMemo(() => {
    if (plans.length === 0) return undefined;
    if (paramPlanId) {
      return plans.find((p) => String(p.id) === paramPlanId) ?? plans[0];
    }
    return plans[0];
  }, [plans, paramPlanId]);

  const planPositions = useMemo(
    () => selectedPlan?.positions ?? [],
    [selectedPlan],
  );

  const selectedPosition = useMemo(() => {
    if (planPositions.length === 0) return undefined;
    if (paramPositionId) {
      return (
        planPositions.find((pos) => String(pos.id) === paramPositionId) ??
        planPositions[0]
      );
    }
    return planPositions[0];
  }, [planPositions, paramPositionId]);

  const handlePlanChange = (nextPlanId: string) => {
    setSavedNotice(null);
    const plan = plans.find((p) => String(p.id) === nextPlanId);
    const firstPos = plan?.positions?.[0];
    const nextParams = new URLSearchParams();
    if (nextPlanId) nextParams.set("planId", nextPlanId);
    if (firstPos?.id !== undefined) {
      nextParams.set("positionId", String(firstPos.id));
    }
    setSearchParams(nextParams);
  };

  const handlePositionChange = (nextPosId: string) => {
    setSavedNotice(null);
    const nextParams = new URLSearchParams();
    if (selectedPlan?.id !== undefined) {
      nextParams.set("planId", String(selectedPlan.id));
    }
    if (nextPosId) {
      nextParams.set("positionId", nextPosId);
    }
    setSearchParams(nextParams);
  };

  const handleSaveToPosition = ({
    record,
    updatePlanAmount,
  }: {
    record: NmckCalculationRecord;
    basisText: string;
    updatePlanAmount: boolean;
  }) => {
    if (!selectedPlan?.id || selectedPosition?.id === undefined) return;
    setSavedNotice(null);
    savePositionNmck(
      {
        planId: selectedPlan.id,
        organizationId,
        positionId: selectedPosition.id,
        nmckCalculation: record,
        updatePlanAmount,
      },
      {
        onSuccess: () => {
          setSavedNotice({
            planId: String(selectedPlan.id),
            positionId: String(selectedPosition.id),
            nmckTotal: record.nmckTotal,
            updatedAmount: updatePlanAmount,
          });
        },
      },
    );
  };

  if (isOrgLoading || isPlansLoading) {
    return (
      <p className={block("status")}>
        Загружаем планы-графики и данные организации…
      </p>
    );
  }

  if (!organizationId) {
    return (
      <section className={block()}>
        <p className={block("status", ["error"])}>
          К вашей учётной записи не привязана организация-заказчик. Для привязки
          расчёта к плану-графику войдите под учётной записью организации.
        </p>
      </section>
    );
  }

  const calculatorName = employee?.employee ? fullName(employee.employee) : "";
  const existingPosNmck = toNumber(selectedPosition?.nmck);
  const existingPosAmountTotal = toNumber(selectedPosition?.amountTotal);
  const calcKey = `${selectedPlan?.id ?? "none"}-${selectedPosition?.id ?? "none"}-${selectedPosition?.nmckCalculation?.calculatedAt ?? ""}`;

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div>
          <button
            type="button"
            className={block("back")}
            onClick={() =>
              selectedPlan?.id
                ? navigate(`/purchase-plans/${selectedPlan.id}`)
                : navigate("/purchase-plans")
            }
          >
            {selectedPlan?.id
              ? `← К плану-графику ${selectedPlan.planNumber}`
              : "← К планам-графикам"}
          </button>
          <h1 className={block("title")}>
            Расчёт НМЦК методом сопоставимых рыночных цен (анализ рынка)
          </h1>
          <p className={block("subtitle")}>
            Обоснование цены по ст. 22 Закона № 44-ФЗ с сохранением расчёта и
            источников в карточку позиции плана-графика закупок.
          </p>
        </div>
      </header>

      <LegalActRefs component="NmckCalculatorPage" />

      {/* Выбор позиции плана-графика */}
      <div className={block("card")}>
        <h2 className={block("card-title")}>
          Привязка к позиции плана-графика закупок
        </h2>

        {plans.length === 0 ? (
          <div className={block("banner", ["info"])}>
            <span>
              У организации пока нет планов-графиков. Вы можете выполнить расчёт
              автономно и выгрузить протокол (.docx), либо сначала создать
              план-график.
            </span>
            <Link className={block("link-btn")} to="/purchase-plans">
              Перейти к планам-графикам
            </Link>
          </div>
        ) : (
          <>
            <div className={block("selectors")}>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="nmck-plan-select">
                  План-график закупок
                </label>
                <select
                  id="nmck-plan-select"
                  className={block("select")}
                  value={selectedPlan?.id ? String(selectedPlan.id) : ""}
                  onChange={(e) => handlePlanChange(e.target.value)}
                >
                  {plans.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      ПГ {p.planNumber} ({p.planYear} г., позиций:{" "}
                      {p.positions.length})
                    </option>
                  ))}
                </select>
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="nmck-pos-select">
                  Позиция плана-графика
                </label>
                <select
                  id="nmck-pos-select"
                  className={block("select")}
                  disabled={planPositions.length === 0}
                  value={
                    selectedPosition?.id !== undefined
                      ? String(selectedPosition.id)
                      : ""
                  }
                  onChange={(e) => handlePositionChange(e.target.value)}
                >
                  {planPositions.length === 0 ? (
                    <option value="">В этом плане пока нет позиций</option>
                  ) : (
                    planPositions.map((pos, idx) => (
                      <option
                        key={String(pos.id ?? idx)}
                        value={String(pos.id ?? "")}
                      >
                        № {pos.purchaseNumber || pos.serialNumber || idx + 1} —{" "}
                        {pos.objectOfPurchase.slice(0, 75)}
                        {pos.objectOfPurchase.length > 75 ? "…" : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {selectedPosition && (
              <div className={block("pos-summary")}>
                <div className={block("pos-item")}>
                  <span className={block("pos-label")}>ИКЗ позиции</span>
                  <span
                    className={`${block("pos-value")} ${block("pos-value", ["mono"])}`}
                  >
                    {selectedPosition.identificationCode || "не сформирован"}
                  </span>
                </div>
                <div className={block("pos-item")}>
                  <span className={block("pos-label")}>Код ОКПД2</span>
                  <span className={block("pos-value")}>
                    {selectedPosition.okpd2Code || "не указан"}
                  </span>
                </div>
                <div className={block("pos-item")}>
                  <span className={block("pos-label")}>
                    Финансирование в ПГ (всего)
                  </span>
                  <span className={block("pos-value")}>
                    {existingPosAmountTotal !== null
                      ? `${formatNmckMoney(existingPosAmountTotal)} ₽`
                      : "не указано"}
                  </span>
                </div>
                <div className={block("pos-item")}>
                  <span className={block("pos-label")}>
                    Текущая НМЦК в позиции
                  </span>
                  <span className={block("pos-value")}>
                    {existingPosNmck !== null
                      ? `${formatNmckMoney(existingPosNmck)} ₽`
                      : "не рассчитана"}
                    {selectedPosition.nmckCalculation
                      ? ` (анализ рынка от ${selectedPosition.nmckCalculation.calculatedAt}, V=${selectedPosition.nmckCalculation.cvPercent.toFixed(1)}%)`
                      : ""}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {saveError && (
        <div className={block("banner", ["error"])} role="alert">
          <span>Не удалось сохранить расчёт в позицию: {String(saveError)}</span>
        </div>
      )}

      {savedNotice && (
        <div className={block("banner", ["success"])} role="status">
          <span>
            <CheckCircle2
              size={15}
              style={{ verticalAlign: "text-bottom", marginRight: 6 }}
              aria-hidden="true"
            />
            Расчёт НМЦК{" "}
            <strong>{formatNmckMoney(savedNotice.nmckTotal)} ₽</strong> сохранён
            в карточку позиции плана-графика
            {savedNotice.updatedAmount
              ? " (объём финансового обеспечения позиции ПГ и итог плана обновлены)."
              : "."}
          </span>
          <div className={block("banner-actions")}>
            <Link
              className={block("link-btn")}
              to={`/purchase-plans/${savedNotice.planId}/positions/${savedNotice.positionId}/edit`}
            >
              <ExternalLink size={13} aria-hidden="true" /> Открыть карточку
              позиции
            </Link>
            <Link
              className={block("link-btn")}
              to={`/purchase-plans/${savedNotice.planId}`}
            >
              Перейти к таблице ПГ
            </Link>
          </div>
        </div>
      )}

      {/* Основной калькулятор анализа рынка */}
      <MarketNmckCalculator
        key={calcKey}
        initialRecord={selectedPosition?.nmckCalculation ?? null}
        defaultSubject={selectedPosition?.objectOfPurchase || ""}
        defaultOkpd2Code={selectedPosition?.okpd2Code || ""}
        defaultQuantity={selectedPosition?.quantity || "1"}
        defaultUnit={selectedPosition?.unit || "шт"}
        defaultIkz={selectedPosition?.identificationCode || ""}
        defaultCalculatorName={calculatorName}
        organizationName={organization?.shortName || organization?.fullName || ""}
        planAmountLimit={existingPosAmountTotal}
        contractRegistryItems={contractRegistryItems}
        canUpdatePlanAmount={Boolean(selectedPosition?.id !== undefined)}
        defaultUpdatePlanAmount={
          existingPosAmountTotal === null || existingPosAmountTotal === 0
        }
        isSaving={isSaving}
        saveButtonLabel="Сохранить результат в карточку позиции ПГ"
        onSaveToPosition={
          selectedPlan?.id && selectedPosition?.id !== undefined
            ? handleSaveToPosition
            : undefined
        }
      />
    </section>
  );
}
