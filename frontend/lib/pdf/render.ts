import "server-only";

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";

import type { PayslipDocData } from "../payslip-documents";
import { PayslipDocument } from "./PayslipDocument";

export function renderPayslips(slips: PayslipDocData[], title: string): Promise<Buffer> {
  // PayslipDocument returns a <Document>; react-pdf's typings want that element type explicitly.
  const doc = createElement(PayslipDocument, { slips, title }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(doc);
}

/** "Ibrahim Sawadogo" → "ibrahim-sawadogo" (ASCII, for download filenames). */
export function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function pdfResponse(buffer: Buffer, filename: string, download: boolean): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
