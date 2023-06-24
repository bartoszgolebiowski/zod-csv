import { describe, it, expect} from "vitest";
import { zcsv } from ".";
import { z } from "zod";

describe('test helper matchers', () => {
    describe('string', () => {
        it('should be invalid when no zod schema provided, for the empty string input', () => {
            const s = zcsv.string();
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require string value, for the empty string input', () => {
            const s = zcsv.string(z.string());
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require string value, for the empty string input', () => {
            const s = zcsv.string(z.string().nonempty());
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be valid when zod schema provided that set string as optional string, returns undefined, for the empty string input', () => {
            const s = zcsv.string(z.string().optional());
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(undefined)
        })

        it('should be valid when zod schema provided that set string as optional string, returns default value, for the empty string input', () => {
            const s = zcsv.string(z.string().optional().default("default value"));
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual("default value")
        })

        it('should be valid when no zod schema provided for valid string input', () => {
            const s = zcsv.string();
            const result = s.safeParse("value")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual("value")
        })

        it('should be valid with custom zod schema for valid string input', () => {
            const s = zcsv.string(z.string().max(5));
            const result = s.safeParse("value")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual("value")
        })

        it('should be invalid with custom zod schema for invalid string input', () => {
            const s = zcsv.string(z.string().max(4));
            const result = s.safeParse("value")
            expect(result.success).toBe(false)
        })
    })

    describe('number', () => {
        it('should be invalid when no zod schema provided, for the empty string input', () => {
            const s = zcsv.number();
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require number value, for the empty string input', () => {
            const s = zcsv.number(z.number());
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require number value, for the random string input', () => {
            const s = zcsv.number(z.number());
            const result = s.safeParse("random string")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require number value, for the negative string input', () => {
            const s = zcsv.number(z.number().nonnegative());
            const result = s.safeParse("-1")
            expect(result.success).toBe(false)
        })

        it('should be valid when zod schema provided that require number value, for the positive string input', () => {
            const s = zcsv.number(z.number().nonnegative());
            const result = s.safeParse("1")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(1)
        })

        it('should be valid when zod schema provided that set number as optional number, returns undefined, for the empty string input', () => {
            const s = zcsv.number(z.number().optional());
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(undefined)
        })

        it('should be valid when zod schema provided that set number as optional number, returns default value, for the empty string input', () => {
            const s = zcsv.number(z.number().optional().default(1));
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(1)
        })

        it('should be valid when zod schema provided that set number', () => {
            const s = zcsv.number();
            const result = s.safeParse("123")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(123)
        })
    })

    describe('boolean', () => {
        it('should be invalid when no zod schema provided, for the empty string input', () => {
            const s = zcsv.boolean();
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require boolean value, for the empty string input', () => {
            const s = zcsv.boolean(z.boolean());
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require boolean value, for the random string input', () => {
            const s = zcsv.boolean(z.boolean());
            const result = s.safeParse("test")
            expect(result.success).toBe(false)
        })

        it('should be valid when no zod schema provided, for the true string input', () => {
            const s = zcsv.boolean();
            const result = s.safeParse("true")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(true)
        })

        it('should be valid when no zod schema provided, for the false string input', () => {
            const s = zcsv.boolean();
            const result = s.safeParse("false")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(false)
        })

        it('should be valid when zod schema provided that set boolean as optional boolean, returns undefined, for the empty string input', () => {
            const s = zcsv.boolean(z.boolean().optional());
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(undefined)
        })

        it('should be valid when zod schema provided that set boolean as optional boolean, returns default value, for the empty string input', () => {
            const s = zcsv.boolean(z.boolean().default(true));
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(true)
        })
    })

    describe('date', () => {
        it('should be invalid when no zod schema provided, for the empty string input', () => {
            const s = zcsv.date();
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require date value, for the empty string input', () => {
            const s = zcsv.date(z.date());
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require date value, for the random string input', () => {
            const s = zcsv.date(z.date());
            const result = s.safeParse("test")
            expect(result.success).toBe(false)
        })

        it('should be valid when no zod schema provided, for the valid date string input', () => {
            const s = zcsv.date();
            const result = s.safeParse("2021-01-01")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(new Date("2021-01-01"))
        })

        const datesAsStrings = [
            "2021/01/01",
            "01/01/2021",
            "2021-01-01",
            "2021-01-01T00:00:00.000Z",
            "2021-01-01T00:00:00.000",
            "2021-01-01T00:00:00",
            "2021-01-01T00:00:00.000+00:00",
            "2021-01-01T00:00:00.000+0000",
        ]

        it.each(datesAsStrings)('should be valid when no zod schema provided, for the valid date string input %s', (dateAsString) => {
            const s = zcsv.date();
            const result = s.safeParse(dateAsString)
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(new Date(dateAsString))
        })

        it('should be valid when zod schema provided that set date as optional date, returns default value, for the empty string input', () => {
            const s = zcsv.date(z.date().default(new Date("2021-01-01")));
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(new Date("2021-01-01"))
        })

        it('should be invalid when zod schema provided that require date value, for the date from the date string input not matching schema restriction', () => {
            const s = zcsv.date(z.date().min(new Date("1999-01-01")))
            const result = s.safeParse("1998-01-01")
            expect(result.success).toBe(false)
        })

        it('should be valid when zod schema provided that require date value, for the date from the date string input matching schema restriction', () => {
            const s = zcsv.date(z.date().min(new Date("1999-01-01")))
            const result = s.safeParse("2000-01-01")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(new Date("2000-01-01"))
        })
    })

    describe('enum', () => {
        it('should be valid when no zod schema provided, for the empty string input', () => {
            const s = zcsv.enum();
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual("")
        })

        it('should be valid for the empty string input, schema requried', () => {
            const s = zcsv.enum(z.enum([""]));
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual("")
        })

        it('should be invalid when zod schema provided that require enum value, for the empty string input', () => {
            const s = zcsv.enum(z.enum(["a", "b"]));
            const result = s.safeParse("")
            expect(result.success).toBe(false)
        })

        it('should be invalid when zod schema provided that require enum value, for the random string input', () => {
            const s = zcsv.enum(z.enum(["a", "b"]));
            const result = s.safeParse("test")
            expect(result.success).toBe(false)
        })

        it.skip('should be valid when zod schema provided that set enum as optional enum, returns undefined, for the empty string input', () => {
            const s = zcsv.enum(z.enum(["a", "b"]).optional());
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual(undefined)
        })

        it.skip('should be valid when zod schema provided that set enum as optional enum, returns default value, for the empty string input', () => {
            const s = zcsv.enum(z.enum(["a", "b"]).default("a"));
            const result = s.safeParse("")
            expect(result.success).toBe(true)
            //@ts-expect-error we will reach this line only if success is true
            expect(result.data).toEqual("a")
        })
    })
})
