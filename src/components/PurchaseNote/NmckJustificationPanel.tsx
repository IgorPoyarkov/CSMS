import { useMemo, useState } from "react";
import { Calculator, FileDown, Plus, Trash2 } from "lucide-react";
import useUtils from "../../hooks/useUtils";
import styles from "./PurchaseNoteModal.module.scss";

export interface NmckOfferItem {
  id: string;
  supplierName: string;
  offerDate?: string;
  unitPrice: string;
}

interface NmckJustificationPanelProps {
  noteNumber: string;
  subject: string;
  quantity: number;
  unit: string;
  offers: NmckOfferItem[];
  disabled?: boolean;
  onOffersChange: (offers: NmckOfferItem[]) => void;
  onApplyCalculation: (payload: {
    nmckValue: string;
    priceBasisText: string;
    fileName: string;
  }) => void;
  onClose: () => void;
}

const formatMoney = (val: number) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

/**
 * Встроенный модуль расчёта и подготовки файла обоснования НМЦК
 * (метод сопоставимых рыночных цен, ч. 2–5 ст. 22 Закона № 44-ФЗ,
 * методические рекомендации Минэкономразвития № 567).
 */
export default function NmckJustificationPanel({
  noteNumber,
  subject,
  quantity,
  unit,
  offers,
  disabled = false,
  onOffersChange,
  onApplyCalculation,
  onClose,
}: NmckJustificationPanelProps) {
  const { bem } = useUtils();
  const block = bem(styles, "purchase-note-modal");
  const [isExporting, setIsExporting] = useState(false);

  const effectiveOffers: NmckOfferItem[] =
    offers.length > 0
      ? offers
      : [
          {
            id: "offer-1",
            supplierName: "Поставщик 1 (КП №1)",
            offerDate: new Date().toISOString().slice(0, 10),
            unitPrice: "",
          },
          {
            id: "offer-2",
            supplierName: "Поставщик 2 (КП №2)",
            offerDate: new Date().toISOString().slice(0, 10),
            unitPrice: "",
          },
          {
            id: "offer-3",
            supplierName: "Поставщик 3 (КП №3)",
            offerDate: new Date().toISOString().slice(0, 10),
            unitPrice: "",
          },
        ];

  const stats = useMemo(() => {
    const prices = effectiveOffers
      .map((o) => Number(o.unitPrice.replace(",", ".")))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (prices.length === 0) {
      return {
        count: 0,
        mean: 0,
        stdDev: 0,
        cvPercent: 0,
        isHomogeneous: true,
        nmck: 0,
      };
    }

    const n = prices.length;
    const mean = prices.reduce((sum, p) => sum + p, 0) / n;
    const variance =
      n > 1
        ? prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / (n - 1)
        : 0;
    const stdDev = Math.sqrt(variance);
    const cvPercent = mean > 0 ? (stdDev / mean) * 100 : 0;
    const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const nmck = Math.round(mean * qty * 100) / 100;

    return {
      count: n,
      mean,
      stdDev,
      cvPercent,
      isHomogeneous: cvPercent <= 33,
      nmck,
    };
  }, [effectiveOffers, quantity]);

  const updateOffer = (
    idx: number,
    patch: Partial<NmckOfferItem>,
  ) => {
    const next = effectiveOffers.map((item, i) =>
      i === idx ? { ...item, ...patch } : item,
    );
    onOffersChange(next);
  };

  const handleAddOffer = () => {
    onOffersChange([
      ...effectiveOffers,
      {
        id: `offer-${Date.now()}`,
        supplierName: `Поставщик ${effectiveOffers.length + 1}`,
        offerDate: new Date().toISOString().slice(0, 10),
        unitPrice: "",
      },
    ]);
  };

  const handleRemoveOffer = (idx: number) => {
    if (effectiveOffers.length <= 1) return;
    onOffersChange(effectiveOffers.filter((_, i) => i !== idx));
  };

  const buildBasisSummary = () => {
    const valid = effectiveOffers.filter(
      (o) => Number(o.unitPrice.replace(",", ".")) > 0,
    );
    const kpList = valid
      .map(
        (o) =>
          `${o.supplierName}${o.offerDate ? ` (от ${o.offerDate})` : ""}: ${formatMoney(Number(o.unitPrice.replace(",", ".")))} ₽`,
      )
      .join("; ");
    return `Метод сопоставимых рыночных цен (анализ рынка) в соответствии со ст. 22 Закона № 44-ФЗ и Приказом МЭР № 567. Исследовано КП: ${stats.count} (${kpList || "без детализации"}). Средняя цена ед.: ${formatMoney(stats.mean)} ₽, коэффициент вариации: ${stats.cvPercent.toFixed(2)}%, НМЦК: ${formatMoney(stats.nmck)} ₽.`;
  };

  const generatedFileName = `Обоснование_НМЦК_СЗ_${noteNumber || "черновик"}.docx`;

  const handleDownloadNmckDocx = async () => {
    setIsExporting(true);
    try {
      const {
        AlignmentType,
        BorderStyle,
        Document,
        Packer,
        Paragraph,
        Table,
        TableCell,
        TableRow,
        TextRun,
        WidthType,
      } = await import("docx");

      const border = {
        style: BorderStyle.SINGLE,
        size: 4,
        color: "B4C2BA",
      };
      const borders = {
        top: border,
        bottom: border,
        left: border,
        right: border,
        insideHorizontal: border,
        insideVertical: border,
      };

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: `ОБОСНОВАНИЕ НАЧАЛЬНОЙ (МАКСИМАЛЬНОЙ) ЦЕНЫ КОНТРАКТА К СЗ № ${noteNumber || "б/н"}`,
                    bold: true,
                    size: 24,
                    font: "Times New Roman",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: `Объект закупки: ${subject || "—"} · Количество: ${quantity || 1} ${unit || "ед."}`,
                    size: 20,
                    font: "Times New Roman",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: "Метод определения НМЦК: метод сопоставимых рыночных цен (анализ рынка), ст. 22 Закона № 44-ФЗ.",
                    size: 20,
                    font: "Times New Roman",
                  }),
                ],
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders,
                rows: [
                  new TableRow({
                    tableHeader: true,
                    children: [
                      "№",
                      "Источник ценовой информации / Поставщик",
                      "Дата КП",
                      "Цена за ед., ₽",
                    ].map(
                      (h) =>
                        new TableCell({
                          margins: { top: 80, bottom: 80, left: 80, right: 80 },
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: h,
                                  bold: true,
                                  size: 19,
                                  font: "Times New Roman",
                                }),
                              ],
                            }),
                          ],
                        }),
                    ),
                  }),
                  ...effectiveOffers.map(
                    (o, idx) =>
                      new TableRow({
                        children: [
                          String(idx + 1),
                          o.supplierName || "—",
                          o.offerDate || "—",
                          o.unitPrice || "—",
                        ].map(
                          (val) =>
                            new TableCell({
                              margins: {
                                top: 70,
                                bottom: 70,
                                left: 80,
                                right: 80,
                              },
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({
                                      text: val,
                                      size: 19,
                                      font: "Times New Roman",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                        ),
                      }),
                  ),
                ],
              }),
              new Paragraph({
                spacing: { before: 140, after: 60 },
                children: [
                  new TextRun({
                    text: `Средняя цена единицы: ${formatMoney(stats.mean)} ₽ · Коэффициент вариации (V): ${stats.cvPercent.toFixed(2)}% (${stats.isHomogeneous ? "однородная выборка <= 33%" : "превышает 33%, требуется корректировка выборки"})`,
                    size: 20,
                    font: "Times New Roman",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: `Итоговая НМЦК: ${formatMoney(stats.nmck)} ₽`,
                    bold: true,
                    size: 22,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generatedFileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={block("nmck-workspace")}>
      <div className={block("toolbar-row")}>
        <div className={block("card-title-inline")}>
          <Calculator size={16} aria-hidden="true" />
          <strong>
            Расчёт и обоснование НМЦК (ст. 22 Закона № 44-ФЗ, Приказ МЭР № 567)
          </strong>
        </div>
        <button
          type="button"
          className={block("mode-btn")}
          onClick={onClose}
        >
          Свернуть калькулятор
        </button>
      </div>

      <p className={block("hint")}>
        Внесите коммерческие предложения / ценовую информацию (рекомендуется не
        менее 3 источников). При коэффициенте вариации V ≤ 33 % выборка
        считается однородной.
      </p>

      <div className={block("offers-list")}>
        {effectiveOffers.map((offer, idx) => (
          <div key={offer.id} className={block("offer-row")}>
            <input
              className={block("input")}
              disabled={disabled}
              value={offer.supplierName}
              onChange={(e) =>
                updateOffer(idx, { supplierName: e.target.value })
              }
              placeholder={`Источник цены № ${idx + 1}`}
            />
            <input
              type="date"
              className={block("input")}
              disabled={disabled}
              value={offer.offerDate ?? ""}
              onChange={(e) => updateOffer(idx, { offerDate: e.target.value })}
            />
            <input
              className={block("input")}
              disabled={disabled}
              value={offer.unitPrice}
              onChange={(e) => updateOffer(idx, { unitPrice: e.target.value })}
              placeholder="Цена за ед., ₽"
            />
            <button
              type="button"
              className={block("danger-btn")}
              disabled={disabled || effectiveOffers.length <= 1}
              onClick={() => handleRemoveOffer(idx)}
              title="Удалить источник цены"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className={block("toolbar-row")}>
        <button
          type="button"
          className={block("link-btn")}
          disabled={disabled}
          onClick={handleAddOffer}
        >
          <Plus size={14} aria-hidden="true" /> Добавить КП
        </button>

        <div className={block("nmck-summary")}>
          <span>
            Средняя ед.: <strong>{formatMoney(stats.mean)} ₽</strong>
          </span>
          <span>
            Вариация V:{" "}
            <strong
              className={
                stats.isHomogeneous ? undefined : block("nmck-warn-text")
              }
            >
              {stats.cvPercent.toFixed(2)}%
            </strong>
          </span>
          <span>
            НМЦК (× {quantity || 1} {unit || "ед."}):{" "}
            <strong>{formatMoney(stats.nmck)} ₽</strong>
          </span>
        </div>
      </div>

      {!stats.isHomogeneous && stats.count >= 2 && (
        <div className={block("alert-warning")} role="alert">
          Коэффициент вариации превышает 33 % ({stats.cvPercent.toFixed(2)} %).
          Согласно Методическим рекомендациям МЭР № 567 рекомендуется уточнить
          сопоставимость предложений или расширить выборку.
        </div>
      )}

      <div className={block("radio-row")}>
        <button
          type="button"
          className={block("btn-accent")}
          disabled={disabled || stats.nmck <= 0}
          onClick={() =>
            onApplyCalculation({
              nmckValue: stats.nmck.toFixed(2),
              priceBasisText: buildBasisSummary(),
              fileName: generatedFileName,
            })
          }
        >
          Подставить НМЦК ({formatMoney(stats.nmck)} ₽) и прикрепить файл
        </button>

        <button
          type="button"
          className={block("mode-btn")}
          disabled={isExporting || stats.count === 0}
          onClick={handleDownloadNmckDocx}
        >
          <FileDown size={14} aria-hidden="true" />{" "}
          {isExporting ? "Формирование…" : "Скачать файл обоснования (.docx)"}
        </button>
      </div>
    </div>
  );
}
