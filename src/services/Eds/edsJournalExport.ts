import type { BaseOrganization } from "../Organization/organization.schema";
import {
  edsCertificateSourceLabels,
  edsCertificateStateLabels,
  certificateStateOn,
  formatCertificatePeriod,
  signatureEventActionLabels,
  signatureEventEntityTypeLabels,
  signatureEventResultLabels,
  type EdsCertificate,
  type SignatureEvent,
} from "./eds.schema";
import type { PluginSignature } from "./cryptoPro";

/**
 * Экспорт журнала действий с ЭП в подписанный PDF-отчёт для контролирующих органов
 * (ФАС России, Федеральное казначейство, органы внутреннего госфинконтроля).
 *
 * Целостность аудит-логов обеспечивается каскадной SHA-256 цепочкой (hash-chain):
 * каждая строка лога хэшируется с привязкой к предыдущему хэшу, а поверх
 * канонического среза сертификатов и событий вычисляется корневой SHA-256 дайджест.
 */

export interface HashedSignatureEvent {
  index: number;
  event: SignatureEvent;
  prevHash: string;
  entryHashSha256: string;
}

export interface EdsJournalIntegrityPackage {
  reportId: string;
  generatedAtIso: string;
  oversightBody: string;
  organization: {
    id: string | number;
    name: string;
    inn: string;
    kpp?: string;
    ogrn?: string;
  };
  filters: {
    action: string;
    dateFrom: string;
    dateTo: string;
  };
  totals: {
    certificatesCount: number;
    eventsCount: number;
    signedCount: number;
    rejectedCount: number;
    failedCount: number;
  };
  certificateDigestSha256: string;
  eventsChainRootSha256: string;
  payloadDigestSha256: string;
  hashedEvents: HashedSignatureEvent[];
  signerCertificate: {
    ownerName: string;
    ownerPosition?: string;
    inn?: string;
    serialNumber?: string;
    fingerprint?: string;
    signatureAlgorithm?: string;
    validFrom?: string;
    validTo?: string;
    source: string;
  };
  signatureMode: "plugin" | "registry";
  pluginSignature?: PluginSignature | null;
}

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const sha256Hex = async (text: string): Promise<string> => {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return toHex(digest);
  }
  // Детерминированный запасной вариант, если WebCrypto недоступен в среде
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`.repeat(4);
};

const canonicalEventRecord = (event: SignatureEvent) => ({
  id: event.id ?? "",
  organizationId: String(event.organizationId),
  createdAt: event.createdAt,
  action: event.action,
  entityType: event.entityType,
  entityId: String(event.entityId),
  documentLabel: event.documentLabel,
  userId: event.userId ?? "",
  userLabel: event.userLabel ?? "",
  certificateOwner: event.certificateOwner ?? "",
  certificateInn: event.certificateInn ?? "",
  certificateSerial: event.certificateSerial ?? "",
  certificateFingerprint: event.certificateFingerprint ?? "",
  certificateAlgorithm: event.certificateAlgorithm ?? "",
  innMatched: Boolean(event.innMatched),
  result: event.result,
  comment: event.comment ?? "",
});

const canonicalCertificateRecord = (cert: EdsCertificate) => ({
  id: cert.id ?? "",
  organizationId: String(cert.organizationId),
  ownerName: cert.ownerName,
  inn: cert.inn ?? "",
  serialNumber: cert.serialNumber ?? "",
  fingerprint: cert.fingerprint ?? "",
  validFrom: cert.validFrom ?? "",
  validTo: cert.validTo ?? "",
  isRevoked: Boolean(cert.isRevoked),
  source: cert.source,
});

export const buildEdsJournalIntegrityPackage = async (params: {
  organization: BaseOrganization;
  certificates: EdsCertificate[];
  events: SignatureEvent[];
  oversightBody: string;
  filters: {
    action: string;
    dateFrom: string;
    dateTo: string;
  };
  signerCertificate: EdsCertificate;
  signatureMode: "plugin" | "registry";
  pluginSignature?: PluginSignature | null;
}): Promise<EdsJournalIntegrityPackage> => {
  const {
    organization,
    certificates,
    events,
    oversightBody,
    filters,
    signerCertificate,
    signatureMode,
    pluginSignature,
  } = params;

  const generatedAtIso = new Date().toISOString();
  const reportId = `EDS-RPT-${generatedAtIso.slice(0, 10).replace(/-/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

  // Сортируем хронологически для воспроизводимой хэш-цепочки
  const chronological = [...events].sort((a, b) =>
    String(a.createdAt).localeCompare(String(b.createdAt)),
  );

  let prevHash = "0".repeat(64);
  const hashedEvents: HashedSignatureEvent[] = [];

  for (let i = 0; i < chronological.length; i += 1) {
    const event = chronological[i];
    const canonical = JSON.stringify(canonicalEventRecord(event));
    const entryHashSha256 = await sha256Hex(`${prevHash}|${canonical}`);
    hashedEvents.push({
      index: i + 1,
      event,
      prevHash,
      entryHashSha256,
    });
    prevHash = entryHashSha256;
  }

  const eventsChainRootSha256 =
    hashedEvents.length > 0
      ? hashedEvents[hashedEvents.length - 1].entryHashSha256
      : await sha256Hex("EMPTY_EDS_EVENT_LOG");

  const certificateDigestSha256 = await sha256Hex(
    JSON.stringify(certificates.map(canonicalCertificateRecord)),
  );

  const payloadDigestSha256 = await sha256Hex(
    JSON.stringify({
      reportId,
      organizationId: String(organization.id ?? ""),
      organizationInn: organization.inn ?? "",
      oversightBody,
      filters,
      certificateDigestSha256,
      eventsChainRootSha256,
      eventsCount: hashedEvents.length,
    }),
  );

  return {
    reportId,
    generatedAtIso,
    oversightBody,
    organization: {
      id: organization.id ?? "",
      name: organization.shortName || organization.fullName,
      inn: organization.inn ?? "",
      kpp: organization.kpp,
      ogrn: organization.ogrn,
    },
    filters,
    totals: {
      certificatesCount: certificates.length,
      eventsCount: events.length,
      signedCount: events.filter((e) => e.result === "signed").length,
      rejectedCount: events.filter((e) => e.result === "rejected_certificate")
        .length,
      failedCount: events.filter((e) => e.result === "failed").length,
    },
    certificateDigestSha256,
    eventsChainRootSha256,
    payloadDigestSha256,
    hashedEvents,
    signerCertificate: {
      ownerName: signerCertificate.ownerName,
      ownerPosition: signerCertificate.ownerPosition,
      inn: signerCertificate.inn,
      serialNumber: signerCertificate.serialNumber,
      fingerprint: signerCertificate.fingerprint,
      signatureAlgorithm: signerCertificate.signatureAlgorithm,
      validFrom: signerCertificate.validFrom,
      validTo: signerCertificate.validTo,
      source: signerCertificate.source,
    },
    signatureMode,
    pluginSignature,
  };
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const formatDateTimeRu = (iso: string): string => {
  const clean = iso.replace("T", " ").slice(0, 19);
  const datePart = clean.slice(0, 10);
  const timePart = clean.slice(11);
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return clean;
  return timePart ? `${d}.${m}.${y} ${timePart}` : `${d}.${m}.${y}`;
};

const shortHash = (hex: string): string =>
  hex.length > 16 ? `${hex.slice(0, 8)}…${hex.slice(-8)}` : hex;

export const exportEdsJournalSignedPdf = async (params: {
  pkg: EdsJournalIntegrityPackage;
  certificates: EdsCertificate[];
  alsoDownloadIntegrityManifest?: boolean;
}): Promise<void> => {
  const { pkg, certificates, alsoDownloadIntegrityManifest = true } = params;
  const todayIso = pkg.generatedAtIso.slice(0, 10);

  const [pdfMakeMod, pdfFontsMod] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);

  type PdfMakeRuntime = {
    addVirtualFileSystem?: (vfs: Record<string, string>) => void;
    vfs?: Record<string, string>;
    createPdf: (docDefinition: unknown) => {
      download: (filename?: string) => void;
      getBlob?: () => Promise<Blob>;
    };
  };

  const pdfMake = ((pdfMakeMod as { default?: PdfMakeRuntime }).default ??
    pdfMakeMod) as PdfMakeRuntime;
  const pdfFonts = ((pdfFontsMod as { default?: Record<string, string> })
    .default ?? pdfFontsMod) as Record<string, string>;

  if (typeof pdfMake.addVirtualFileSystem === "function") {
    pdfMake.addVirtualFileSystem(pdfFonts);
  } else {
    pdfMake.vfs = pdfFonts;
  }

  const periodText =
    pkg.filters.dateFrom || pkg.filters.dateTo
      ? `${pkg.filters.dateFrom || "начала учёта"} — ${pkg.filters.dateTo || "текущей даты"}`
      : "за весь период ведения журнала";

  const certRows = certificates.map((cert, idx) => {
    const state = certificateStateOn(cert, todayIso);
    return [
      { text: String(idx + 1), fontSize: 7.5 },
      {
        text: `${cert.ownerName}${cert.isProxy ? ` (МЧД ${cert.proxyNumber || "б/н"})` : ""}`,
        fontSize: 7.5,
      },
      { text: cert.ownerPosition || "—", fontSize: 7.5 },
      { text: cert.inn || "—", fontSize: 7.5 },
      { text: cert.serialNumber || "—", fontSize: 7.5 },
      { text: formatCertificatePeriod(cert), fontSize: 7.5 },
      { text: edsCertificateStateLabels[state], fontSize: 7.5 },
      { text: edsCertificateSourceLabels[cert.source], fontSize: 7.5 },
    ];
  });

  // В PDF показываем отсортированные в обратном порядке либо в хронологическом (хэш-цепочка идёт от 1 к N)
  const eventRows = pkg.hashedEvents.map((item) => {
    const ev = item.event;
    return [
      { text: String(item.index), fontSize: 7 },
      { text: formatDateTimeRu(ev.createdAt), fontSize: 7 },
      { text: signatureEventActionLabels[ev.action], fontSize: 7 },
      {
        text: `${signatureEventEntityTypeLabels[ev.entityType]}\n${ev.documentLabel}`,
        fontSize: 7,
      },
      {
        text: `${ev.certificateOwner || "—"}\nИНН: ${ev.certificateInn || "—"} (${ev.innMatched ? "совпал" : "НЕ СОВПАЛ"})`,
        fontSize: 7,
      },
      {
        text: `${ev.certificateSerial ? `${ev.certificateSerial.slice(0, 10)}…` : "—"}\n${ev.certificateAlgorithm || "—"}`,
        fontSize: 7,
      },
      {
        text: `${signatureEventResultLabels[ev.result]}${ev.comment ? `\n${ev.comment}` : ""}`,
        fontSize: 7,
      },
      { text: shortHash(item.entryHashSha256), fontSize: 6.5 },
    ];
  });

  const signModeLabel =
    pkg.signatureMode === "plugin"
      ? `КриптоПро ЭЦП Browser plug-in (${pkg.pluginSignature?.algorithm || "ГОСТ Р 34.10-2012"})`
      : "Реестровый штамп ЭП (стендовый режим без аппаратного плагина)";

  const docDefinition = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [24, 28, 24, 28] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 8.5,
      lineHeight: 1.2,
    },
    content: [
      {
        columns: [
          {
            width: "*",
            text: [
              { text: `${pkg.organization.name}\n`, bold: true, fontSize: 10 },
              {
                text: `ИНН: ${pkg.organization.inn}${pkg.organization.kpp ? ` · КПП: ${pkg.organization.kpp}` : ""}${pkg.organization.ogrn ? ` · ОГРН: ${pkg.organization.ogrn}` : ""}`,
                fontSize: 8,
                color: "#444444",
              },
            ],
          },
          {
            width: "auto",
            alignment: "right",
            text: [
              {
                text: `Отчёт № ${pkg.reportId}\n`,
                bold: true,
                fontSize: 9,
              },
              {
                text: `Сформирован: ${formatDateTimeRu(pkg.generatedAtIso)} (UTC)`,
                fontSize: 7.5,
                color: "#444444",
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },
      {
        text: "ОФИЦИАЛЬНАЯ ВЫПИСКА ИЗ ЖУРНАЛА ДЕЙСТВИЙ С ЭЛЕКТРОННОЙ ПОДПИСЬЮ",
        bold: true,
        fontSize: 12,
        alignment: "center",
        margin: [0, 2, 0, 2] as [number, number, number, number],
      },
      {
        text: `для представления в контролирующий орган: ${pkg.oversightBody}`,
        fontSize: 9.5,
        alignment: "center",
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        table: {
          widths: ["25%", "25%", "25%", "25%"],
          body: [
            [
              {
                text: `Период выгрузки:\n${periodText}`,
                fontSize: 8,
              },
              {
                text: `Фильтр действия:\n${pkg.filters.action ? (signatureEventActionLabels[pkg.filters.action as keyof typeof signatureEventActionLabels] ?? pkg.filters.action) : "Все действия"}`,
                fontSize: 8,
              },
              {
                text: `Сертификатов / Событий:\n${pkg.totals.certificatesCount} / ${pkg.totals.eventsCount} (подписано: ${pkg.totals.signedCount})`,
                fontSize: 8,
              },
              {
                text: `Инциденты (отказ ИНН / ошибки):\n${pkg.totals.rejectedCount} / ${pkg.totals.failedCount}`,
                fontSize: 8,
              },
            ],
          ],
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        text: `1. Реестр квалифицированных сертификатов ЭП заказчика (${certificates.length})`,
        bold: true,
        fontSize: 10,
        margin: [0, 4, 0, 4] as [number, number, number, number],
      },
      certificates.length === 0
        ? {
            text: "Сертификаты в журнале организации отсутствуют.",
            italics: true,
            fontSize: 8.5,
            margin: [0, 0, 0, 8] as [number, number, number, number],
          }
        : {
            table: {
              headerRows: 1,
              widths: [20, "*", 95, 62, 78, 84, 72, 95],
              body: [
                [
                  { text: "№", bold: true, fontSize: 7.5 },
                  { text: "Владелец сертификата", bold: true, fontSize: 7.5 },
                  { text: "Должность", bold: true, fontSize: 7.5 },
                  { text: "ИНН", bold: true, fontSize: 7.5 },
                  { text: "Серийный номер", bold: true, fontSize: 7.5 },
                  { text: "Срок действия", bold: true, fontSize: 7.5 },
                  { text: "Состояние", bold: true, fontSize: 7.5 },
                  { text: "Источник", bold: true, fontSize: 7.5 },
                ],
                ...certRows,
              ],
            },
            margin: [0, 0, 0, 10] as [number, number, number, number],
          },
      {
        text: `2. Неизменяемый аудит-лог операций подписания с каскадной SHA-256 целостностью (${pkg.hashedEvents.length})`,
        bold: true,
        fontSize: 10,
        margin: [0, 4, 0, 4] as [number, number, number, number],
      },
      pkg.hashedEvents.length === 0
        ? {
            text: "За выбранный период события подписания не зафиксированы.",
            italics: true,
            fontSize: 8.5,
            margin: [0, 0, 0, 10] as [number, number, number, number],
          }
        : {
            table: {
              headerRows: 1,
              widths: [18, 66, 86, "*", 96, 74, 88, 76],
              body: [
                [
                  { text: "№", bold: true, fontSize: 7.5 },
                  { text: "Дата и время", bold: true, fontSize: 7.5 },
                  { text: "Операция", bold: true, fontSize: 7.5 },
                  { text: "Документ / сущность", bold: true, fontSize: 7.5 },
                  { text: "Подписант и сверка ИНН", bold: true, fontSize: 7.5 },
                  { text: "Сертификат / ГОСТ", bold: true, fontSize: 7.5 },
                  { text: "Результат / комментарий", bold: true, fontSize: 7.5 },
                  { text: "SHA-256 цепи", bold: true, fontSize: 7.5 },
                ],
                ...eventRows,
              ],
            },
            margin: [0, 0, 0, 12] as [number, number, number, number],
          },
      {
        text: "3. Протокол целостности данных и штамп электронной подписи (ст. 6, 10 Закона № 63-ФЗ)",
        bold: true,
        fontSize: 10,
        margin: [0, 4, 0, 4] as [number, number, number, number],
      },
      {
        table: {
          widths: ["52%", "48%"],
          body: [
            [
              {
                stack: [
                  {
                    text: "КОНТРОЛЬ ЦЕЛОСТНОСТИ АУДИТ-ЛОГОВ (SHA-256)",
                    bold: true,
                    fontSize: 8.5,
                    margin: [0, 0, 0, 4] as [number, number, number, number],
                  },
                  {
                    text: `Корневой хэш цепи событий:\n${pkg.eventsChainRootSha256}`,
                    fontSize: 7.2,
                    margin: [0, 0, 0, 3] as [number, number, number, number],
                  },
                  {
                    text: `Дайджест реестра сертификатов:\n${pkg.certificateDigestSha256}`,
                    fontSize: 7.2,
                    margin: [0, 0, 0, 3] as [number, number, number, number],
                  },
                  {
                    text: `Итоговый дайджест отчёта (Payload SHA-256):\n${pkg.payloadDigestSha256}`,
                    fontSize: 7.2,
                    bold: true,
                  },
                ],
                margin: [4, 4, 4, 4] as [number, number, number, number],
              },
              {
                stack: [
                  {
                    text: "ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ",
                    bold: true,
                    fontSize: 8.5,
                    color: "#1B5E20",
                    margin: [0, 0, 0, 4] as [number, number, number, number],
                  },
                  {
                    text: `Сертификат: ${pkg.signerCertificate.serialNumber || "не указан"}`,
                    fontSize: 7.5,
                  },
                  {
                    text: `Владелец: ${pkg.signerCertificate.ownerName}${pkg.signerCertificate.ownerPosition ? ` (${pkg.signerCertificate.ownerPosition})` : ""}`,
                    fontSize: 7.5,
                  },
                  {
                    text: `ИНН в сертификате: ${pkg.signerCertificate.inn || "—"} · Алгоритм: ${pkg.signerCertificate.signatureAlgorithm || "ГОСТ Р 34.10-2012"}`,
                    fontSize: 7.5,
                  },
                  {
                    text: `Действителен: с ${pkg.signerCertificate.validFrom || "?"} по ${pkg.signerCertificate.validTo || "?"}`,
                    fontSize: 7.5,
                  },
                  {
                    text: `Способ формирования: ${signModeLabel}`,
                    fontSize: 7.2,
                    color: "#333333",
                    margin: [0, 3, 0, 0] as [number, number, number, number],
                  },
                  ...(pkg.pluginSignature?.value
                    ? [
                        {
                          text: `Фрагмент подписи CMS/CAdES: ${pkg.pluginSignature.value.slice(0, 42)}…`,
                          fontSize: 6.8,
                          color: "#333333",
                        },
                      ]
                    : []),
                ],
                margin: [4, 4, 4, 4] as [number, number, number, number],
              },
            ],
          ],
        },
      },
    ],
  };

  const baseName = `EDS_Journal_${pkg.organization.inn || "org"}_${pkg.generatedAtIso.slice(0, 10)}`;
  const pdfDoc = pdfMake.createPdf(docDefinition);
  if (typeof pdfDoc.getBlob === "function") {
    const blob = await pdfDoc.getBlob();
    triggerDownload(blob, `${baseName}.pdf`);
  } else {
    pdfDoc.download(`${baseName}.pdf`);
  }

  if (alsoDownloadIntegrityManifest) {
    const manifestBlob = new Blob([JSON.stringify(pkg, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    triggerDownload(manifestBlob, `${baseName}.integrity.json`);
  }
};
