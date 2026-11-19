import type { GeneratedProcurementDocument } from "./procurementDocumentGenerator";

/**
 * Экспорт сгенерированных типовых форм документов закупки (приказы, протоколы)
 * в редактируемый формат .docx и в печатный .pdf со встроенным шрифтом Roboto.
 */

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportGeneratedDocumentToDocx = async (
  docModel: GeneratedProcurementDocument,
): Promise<void> => {
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

  const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
  const tableBorders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: docModel.organizationHeader,
          bold: true,
          size: 22,
          font: "Times New Roman",
        }),
      ],
    }),
  ];

  if (docModel.organizationMeta) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: docModel.organizationMeta,
            size: 18,
            color: "555555",
            font: "Times New Roman",
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({
          text: docModel.title,
          bold: true,
          size: 28,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: docModel.subtitle,
          bold: true,
          size: 22,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `${docModel.city} · от ${docModel.docDateRu}`,
          size: 20,
          font: "Times New Roman",
        }),
      ],
    }),
  );

  docModel.sections.forEach((sec) => {
    children.push(
      new Paragraph({
        spacing: { before: 140, after: 80 },
        children: [
          new TextRun({
            text: sec.heading,
            bold: true,
            size: 22,
            font: "Times New Roman",
          }),
        ],
      }),
    );

    sec.paragraphs.forEach((p) => {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: p,
              size: 20,
              font: "Times New Roman",
            }),
          ],
        }),
      );
    });

    if (sec.table && sec.table.rows.length > 0) {
      const headerRow = new TableRow({
        tableHeader: true,
        children: sec.table.headers.map(
          (h) =>
            new TableCell({
              shading: { fill: "EEF2EF" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: h,
                      bold: true,
                      size: 18,
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
        ),
      });

      const bodyRows = sec.table.rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell,
                          size: 18,
                          font: "Times New Roman",
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [headerRow, ...bodyRows],
        }),
      );
    }
  });

  if (docModel.signatures.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: "Подписи уполномоченных должностных лиц",
            bold: true,
            size: 22,
            font: "Times New Roman",
          }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: docModel.signatures.map(
          (sig) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: sig.role,
                          size: 18,
                          font: "Times New Roman",
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: sig.person,
                          bold: true,
                          size: 18,
                          font: "Times New Roman",
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: sig.mark,
                          size: 18,
                          font: "Times New Roman",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${docModel.fileBaseName}.docx`);
};

export const exportGeneratedDocumentToPdf = async (
  docModel: GeneratedProcurementDocument,
): Promise<void> => {
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

  const content: unknown[] = [
    {
      text: docModel.organizationHeader,
      bold: true,
      alignment: "center",
      fontSize: 10.5,
    },
    ...(docModel.organizationMeta
      ? [
          {
            text: docModel.organizationMeta,
            alignment: "center",
            fontSize: 8.5,
            color: "#555555",
            margin: [0, 2, 0, 10] as [number, number, number, number],
          },
        ]
      : []),
    {
      text: docModel.title,
      bold: true,
      alignment: "center",
      fontSize: 13,
      margin: [0, 4, 0, 2] as [number, number, number, number],
    },
    {
      text: docModel.subtitle,
      bold: true,
      alignment: "center",
      fontSize: 10.5,
      margin: [0, 0, 0, 8] as [number, number, number, number],
    },
    {
      columns: [
        { text: docModel.city, fontSize: 9.5 },
        { text: `от ${docModel.docDateRu}`, alignment: "right", fontSize: 9.5 },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
  ];

  docModel.sections.forEach((sec) => {
    content.push({
      text: sec.heading,
      bold: true,
      fontSize: 10.5,
      margin: [0, 6, 0, 4] as [number, number, number, number],
    });
    sec.paragraphs.forEach((p) => {
      content.push({
        text: p,
        alignment: "justify",
        fontSize: 9.5,
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });
    });
    if (sec.table && sec.table.rows.length > 0) {
      content.push({
        table: {
          headerRows: 1,
          widths: sec.table.headers.map((_, idx) => (idx === 0 ? 32 : "*")),
          body: [
            sec.table.headers.map((h) => ({ text: h, bold: true, fontSize: 8.5 })),
            ...sec.table.rows.map((row) =>
              row.map((cell) => ({ text: cell, fontSize: 8.5 })),
            ),
          ],
        },
        margin: [0, 2, 0, 10] as [number, number, number, number],
      });
    }
  });

  if (docModel.signatures.length > 0) {
    content.push({
      text: "Подписи",
      bold: true,
      fontSize: 10.5,
      margin: [0, 8, 0, 4] as [number, number, number, number],
    });
    content.push({
      table: {
        widths: ["34%", "33%", "33%"],
        body: docModel.signatures.map((s) => [
          { text: s.role, fontSize: 8.5 },
          { text: s.person, bold: true, fontSize: 8.5 },
          { text: s.mark, fontSize: 8.5 },
        ]),
      },
    });
  }

  const pdfDoc = pdfMake.createPdf({
    pageSize: "A4",
    pageMargins: [34, 34, 34, 36] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9.5,
      lineHeight: 1.25,
    },
    content,
  });

  if (typeof pdfDoc.getBlob === "function") {
    const blob = await pdfDoc.getBlob();
    triggerBlobDownload(blob, `${docModel.fileBaseName}.pdf`);
  } else {
    pdfDoc.download(`${docModel.fileBaseName}.pdf`);
  }
};
