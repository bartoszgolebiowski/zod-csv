
import { z } from "zod";

const SPLITTER = ",";
const END_OF_LINE = "\n";
const JOINER = ", ";

const ERROR_CODES = {
    HEADER: {
        MISSING_HEADER: "MISSING_HEADER",
        MISSING_COLUMN: "MISSING_COLUMN",
    }
}

const zodKeys = <T extends z.ZodTypeAny>(schema: T): string[] => {
    if (schema === null || schema === undefined) return [];
    if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) return zodKeys(schema.unwrap());
    if (schema instanceof z.ZodArray) return zodKeys(schema.element);
    if (schema instanceof z.ZodObject) {
        const entries = Object.entries(schema.shape);
        return entries.flatMap(([key, value]) => {
            const nested = value instanceof z.ZodType ? zodKeys(value).map(subKey => `${key}.${subKey}`) : [];
            return nested.length ? nested : key;
        });
    }
    if (schema instanceof z.ZodEffects) {
        const innerType = schema.innerType();
        if (!innerType.shape) return []
        const entries = Object.entries(innerType.shape);
        return entries.flatMap(([key, value]) => {
            const nested = value instanceof z.ZodType ? zodKeys(value).map(subKey => `${key}.${subKey}`) : [];
            return nested.length ? nested : key;
        });
    }
    return [];
};

const getCSVHeaderErrors = <T extends z.ZodTypeAny>(csvContent: string, schema: T) => {
    const expectedHeaders = zodKeys(schema).map(header => header.trim());
    const headerLine = csvContent.split(END_OF_LINE)[0];
    if (!headerLine) return {
        errorCode: ERROR_CODES.HEADER.MISSING_HEADER,
        header: expectedHeaders.join(JOINER)
    } as const
    const csvHeaders = headerLine.split(SPLITTER).map((header) => header.trim());
    const missingHeaders = expectedHeaders.map(header => header.trim()).filter((header) => !csvHeaders.includes(header.trim()));
    if (!missingHeaders.length) return {} as const
    return {
        errorCode: ERROR_CODES.HEADER.MISSING_COLUMN,
        header: missingHeaders.join(JOINER)
    } as const
}

const getCSVBodyErrors = <T extends z.ZodTypeAny>(csvContent: string, schema: T) => {
    const validRows: z.infer<T>[] = [];
    const rows = getRowsFromCSVRaw(csvContent, schema);
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

const getCSVErrorsAndValidRows = <T extends z.ZodTypeAny>(csvContent: string, schema: T) => {
    const [validRows, rows] = getCSVBodyErrors(csvContent, schema);
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

const getHeadersFromCSV = (csvContent: string) => {
    if (!csvContent) return [];
    const headerLine = csvContent.split(END_OF_LINE)[0];
    if (!headerLine) return [];
    return headerLine.split(SPLITTER).map((header) => header.trim());
}

const getRowsFromCSVRaw = <T extends z.ZodType>(csvContent: string, schema: T) => {
    const headers = zodKeys(schema).map(header => header.trim());
    const lines = csvContent.split(END_OF_LINE);
    const rawRows = lines.slice(1).map((line) => {
        const cells = line.split(SPLITTER);
        return headers.reduce((row, header, index) => {
            let cell = cells[index];
            if (cell) {
                cell = cell.trim();
            }
            row[header] = cell
            return row;
        }, {} as Record<string, string | undefined>)
    });
    return rawRows;
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

export const parseCSVContent = <T extends z.ZodType>(csvContent: string, schema: T): ResultCSV<T> => {
    const [validRows, errors] = getCSVErrorsAndValidRows(csvContent, schema);

    if (errors) {
        return {
            success: false,
            header: getHeadersFromCSV(csvContent),
            allRows: getRowsFromCSVRaw(csvContent, schema),
            validRows,
            errors: errors as Extract<ResultCSV<T>, { status: false }>['errors']
        }
    }

    return {
        success: true,
        header: getHeadersFromCSV(csvContent),
        allRows: getRowsFromCSVRaw(csvContent, schema),
        validRows,
    }
}

export const parseCSV = async <T extends z.ZodType>(csv: File, schema: T): Promise<ResultCSV<T>> => {
    const csvContent = await getCSVContent(csv);
    return parseCSVContent(csvContent, schema)
}

type ResultRow<T extends z.ZodType> = {
    success: true,
    row: z.infer<T>,
} | {
    success: false,
    errors: z.ZodError<T>[]
}

export const parseRow = <T extends z.ZodType>(row: string, schema: T): ResultRow<T> => {
    const enrichedRow = `\n${row}`
    const [validRows, errors] = getCSVErrorsAndValidRows(enrichedRow, schema);

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