import * as csv from 'csv-string';
import { Comma, Quote } from "csv-string/dist/types";

export type Options = {
    comma?: Comma,
    quote?: Quote,
    skipEmptyLines?: boolean,
}

const skipEmptyLines = <T extends string>(rows: T[][]) => rows.filter((row) => row.every(cell => cell.length));

export const extractHeadersFromContent = (csvContent: string, options?: Options): string[] => {
    const [headers] = csv.parse(csvContent, options);
    return headers;
}

export const extractRows = (csvContent: string, options?: Options): string[][] => {
    const [, ...rows] = csv.parse(csvContent, options);
    if (options?.skipEmptyLines) {
        return skipEmptyLines(rows);
    }
    return rows;
}