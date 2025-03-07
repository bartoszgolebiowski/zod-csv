import { z } from "zod";

/**
 * Extract schema keys from a Zod type
 */
export const zodKeys = <T extends z.ZodTypeAny>(schema: T): string[] => {
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
        if (!innerType.shape) return zodKeys(innerType);
        const entries = Object.entries(innerType.shape);
        return entries.flatMap(([key, value]) => {
            const nested = value instanceof z.ZodType ? zodKeys(value).map(subKey => `${key}.${subKey}`) : [];
            return nested.length ? nested : key;
        });
    }
    return [];
}; 

/**
 * Get headers from a Zod schema
 */
export const getHeadersFromSchema = <T extends z.ZodTypeAny>(schema: T): string[] => {
    return zodKeys(schema).map(header => header.trim());
}

/**
 * Validate a row against a schema
 */
export const getRowValidation = <T extends z.ZodType>(row: Record<string, string | undefined>, schema: T) => {
    return schema.safeParse(row);
}