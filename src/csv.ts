import { z } from "zod";
import { Options, extractHeadersFromContent as getHeadersFromContent, extractRows } from "./parse";
import { getHeadersFromSchema } from "./csv-utils";

/**
 * Error codes used for CSV parsing operations
 */
const ERROR_CODES = {
    HEADER: {
        MISSING_HEADER: "MISSING_HEADER",
        MISSING_COLUMN: "MISSING_COLUMN",
    }
}

const JOINER = ", ";
const getCSVHeaderErrors = <T extends z.ZodTypeAny>(csvContent: string, schema: T, options?: Options) => {
    const expectedHeaders = getHeadersFromSchema(schema)
    const csvHeaders = getHeadersFromContent(csvContent, options)
    if (!csvHeaders.length) {
        return {
            errorCode: ERROR_CODES.HEADER.MISSING_HEADER,
            header: expectedHeaders.join(JOINER)
        } as const
    }
    const missingHeaders = expectedHeaders.map(header => header.trim()).filter((header) => !csvHeaders.includes(header.trim()));
    if (missingHeaders.length) {
        return {
            errorCode: ERROR_CODES.HEADER.MISSING_COLUMN,
            header: missingHeaders.join(JOINER)
        } as const
    }
    return {} as const
}

const getCSVBodyErrors = <T extends z.ZodTypeAny>(csvContent: string, schema: T, options?: Options) => {
    const validRows: z.infer<T>[] = [];
    const rows = getRowsFromContent(csvContent, schema, options);
    const errors = rows.reduce((errors, row, index) => {
        const parsed = schema.safeParse(row);
        if (!parsed.success) {
            errors[index] = parsed.error;
        } else {
            validRows.push(parsed.data);
        }
        return errors;
    }, {} as Record<string, z.ZodError<T>>);
    return [validRows, errors] as const
}

const getCSVErrorsAndValidRows = <T extends z.ZodTypeAny>(csvContent: string, schema: T, options?: Options) => {
    const [validRows, rows] = getCSVBodyErrors(csvContent, schema, options);
    const header = getCSVHeaderErrors(csvContent, schema);

    const rowsErrors = Object.keys(rows).length;
    const headerErrors = Object.keys(header).length;

    if (!rowsErrors && !headerErrors) {
        return [validRows, undefined] as const
    }
    return [
        validRows,
        {
            header: headerErrors ? header : undefined,
            rows: rowsErrors ? rows : undefined
        }
    ] as const
}

const getRowsFromContent = <T extends z.ZodType>(csvContent: string, schema: T, options?: Options) => {
    const headersFromSchema = getHeadersFromSchema(schema)
    return extractRows(csvContent, options).map((cells) => {
        return headersFromSchema.reduce((row, header, index) => {
            let cell = cells[index];
            if (cell) {
                cell = cell.trim();
            }
            row[header] = cell
            return row;
        }, {} as Record<string, string | undefined>)
    });
};

const getCSVContent = (csv: File) => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsText(csv);
    });
};

type ResultCSV<T extends z.ZodType> = {
    success: true,
    header: string[],
    allRows: Record<string, string | undefined>[],
    validRows: z.infer<T>[],
} | {
    success: false,
    header: string[],
    allRows: Record<string, string | undefined>[],
    validRows: z.infer<T>[],
    errors: {
        header?: { errorCode: keyof typeof ERROR_CODES['HEADER'], header: string },
        rows?: Record<string, z.ZodError<T>>
    }
}

/**
 * Parses CSV content against a Zod schema
 * 
 * @template T - The Zod schema type
 * @param {string} csvContent - The CSV content to parse as a string
 * @param {T} schema - The Zod schema to validate against
 * @param {Options} [options] - Optional configuration for CSV parsing
 * @returns {ResultCSV<T>} Object containing parsing results including:
 *   - success: Whether parsing was completely successful
 *   - header: The detected CSV headers
 *   - allRows: All rows from the CSV (valid and invalid)
 *   - validRows: Only the rows that passed validation
 *   - errors: When success is false, contains header and/or row validation errors
 */
export const parseCSVContent = <T extends z.ZodType>(csvContent: string, schema: T, options?: Options): ResultCSV<T> => {
    const [validRows, errors] = getCSVErrorsAndValidRows(csvContent, schema, options);

    if (errors) {
        return {
            success: false,
            header: getHeadersFromContent(csvContent, options),
            allRows: getRowsFromContent(csvContent, schema, options),
            validRows,
            errors: errors as Extract<ResultCSV<T>, { status: false }>['errors']
        }
    }

    return {
        success: true,
        header: getHeadersFromContent(csvContent, options),
        allRows: getRowsFromContent(csvContent, schema, options),
        validRows,
    }
}

/**
 * Parses a CSV file against a Zod schema
 * 
 * @template T - The Zod schema type
 * @param {File} csv - The CSV file to parse
 * @param {T} schema - The Zod schema to validate against
 * @param {Options} [options] - Optional configuration for CSV parsing
 * @returns {Promise<ResultCSV<T>>} A promise resolving to an object containing parsing results including:
 *   - success: Whether parsing was completely successful
 *   - header: The detected CSV headers
 *   - allRows: All rows from the CSV (valid and invalid)
 *   - validRows: Only the rows that passed validation
 *   - errors: When success is false, contains header and/or row validation errors
 */
export const parseCSV = async <T extends z.ZodType>(csv: File, schema: T, options?: Options): Promise<ResultCSV<T>> => {
    const csvContent = await getCSVContent(csv);
    return parseCSVContent(csvContent, schema, options)
}

type ResultRow<T extends z.ZodType> = {
    success: true,
    row: z.infer<T>,
} | {
    success: false,
    errors: z.ZodError<T>[]
}

/**
 * Parses a single CSV row against a Zod schema
 * 
 * @template T - The Zod schema type
 * @param {string} row - The CSV row content as a string
 * @param {T} schema - The Zod schema to validate against
 * @param {Options} [options] - Optional configuration for CSV parsing
 * @returns {ResultRow<T>} Object containing parsing results including:
 *   - When successful: { success: true, row: <validated data> }
 *   - When unsuccessful: { success: false, errors: <validation errors> }
 */
export const parseRow = <T extends z.ZodType>(row: string, schema: T, options?: Options): ResultRow<T> => {
    const enrichedRow = `${getHeadersFromSchema(schema)}\n${row}`
    const [validRows, errors] = getCSVErrorsAndValidRows(enrichedRow, schema, options);

    if (errors?.rows) {
        return {
            success: false,
            errors: Object.values(errors.rows)
        }
    }

    return {
        success: true,
        row: validRows[0]
    }
}

// Export ERROR_CODES to be used elsewhere
export { ERROR_CODES };