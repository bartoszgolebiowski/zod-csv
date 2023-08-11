import { parseCSVContent } from '.';
import { describe, it, expect } from "vitest";
import { zcsv } from ".";
import { ZodError, z } from "zod";

describe("csv content parsing", () => {
    it("should return no errors, headers and rows from CSV string for schema with requried fields", () => {
        const csv = `name,age
  John,20
  Doe,30`;
        const schema1 = z.object({
            name: zcsv.string(),
            age: zcsv.number(),
        });
        const result = parseCSVContent(csv, schema1);
        expect(result.header).toEqual(["name", "age"]);
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20 },
            { name: "Doe", age: 30 },
        ]);
        expect(result.success).toEqual(true);
        //@ts-expect-error - when success is true, errors are undefined
        expect(result.errors).toEqual(undefined);
    });

    it("should return error when CSV's header row is not valid with schema", () => {
        const csv = `name
  John,20
  Doe,30`;
        const schema1 = z.object({
            name: zcsv.string(),
            age: zcsv.number(),
        });
        const result = parseCSVContent(csv, schema1);
        expect(result.header).toEqual(["name"]);
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20 },
            { name: "Doe", age: 30 },
        ]);
        expect(result.success).toEqual(false);
        //@ts-expect-error - when success is false, errors are defined
        expect(result.errors).toEqual({
            header: {
                "errorCode": "MISSING_COLUMN",
                "header": "age",
            }
        });
    });

    it("should return errors when CSV's row is empty", () => {
        const csv = `name,age
John,20
Doe,30
,,`;
        const schema1 = z.object({
            name: zcsv.string(),
            age: zcsv.number(),
        });
        const result = parseCSVContent(csv, schema1);
        expect(result.header).toEqual(["name", "age"]);
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20 },
            { name: "Doe", age: 30 },
        ]);
        expect(result.success).toEqual(false);
        //@ts-expect-error - when success is false, errors are defined
        expect(result.errors).toBeDefined()
        //@ts-expect-error - we know that errors are defined
        const thirdRow = result.errors.rows['2'];

        expect(thirdRow).instanceOf(z.ZodError);
        expect(thirdRow.issues[0].message).toBe("Required");
        expect(thirdRow.issues[1].message).toBe("Required");
    });

    it("should return error when CSV's row does not match schema", () => {
        const csv = `name,age
  John,20
  Doe,30
  Doe,wewr`;
        const schema1 = z.object({
            name: zcsv.string(),
            age: zcsv.number(),
        });
        const result = parseCSVContent(csv, schema1);
        expect(result.header).toEqual(["name", "age"]);
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20 },
            { name: "Doe", age: 30 },
        ]);
        //@ts-expect-error - we know that errors are defined
        const thirdRow = result.errors.rows['2'];
        expect(thirdRow).instanceOf(z.ZodError);
        expect(thirdRow.issues[0].message).toEqual("Expected number, received string");
        expect(thirdRow.issues[0].path).toEqual(["age"]);
    });

    it("should return error when CSV's row does not match schema, + when row has more columns than schema skip extra cells", () => {
        const csv = `name,age
  John,20
  Doe,30
  Doe,wewr,TEST`;
        const schema1 = z.object({
            name: zcsv.string(),
            age: zcsv.number(),
        });
        const result = parseCSVContent(csv, schema1);
        expect(result.header).toEqual(["name", "age"]);
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20 },
            { name: "Doe", age: 30 },
        ]);
        //@ts-expect-error - we know that errors are defined
        const thirdRow = result.errors.rows['2'];
        expect(thirdRow).instanceOf(z.ZodError);
        expect(thirdRow.issues[0].message).toEqual("Expected number, received string");
    });

    it("should return no errors, headers and from CSV body for schema with optional fields", () => {
        const csv = `name,age,description
  John,20,Test
  Doe,30
  Bill,30,`;
        const schema = z.object({
            name: zcsv.string(),
            age: zcsv.number(),
            description: zcsv.string(z.string().optional())
        });

        const result = parseCSVContent(csv, schema);
        expect(result.header).toEqual(["name", "age", "description"]);
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20, description: "Test" },
            { name: "Doe", age: 30, description: undefined },
            { name: "Bill", age: 30, description: undefined },
        ]);
        expect(result.success).toEqual(true);
        //@ts-expect-error - when success is true, errors are undefined
        expect(result.errors).toEqual(undefined);
    });

    it("should return no errors, headers and from CSV body for schema with optional fields 2", () => {
        const csv = `name,age,description
  John,20,Test
  Doe,30
  Bill,30,`;
        const schema = z.object({
            name: zcsv.string(),
            age: zcsv.number(),
            description: zcsv.string(z.string().optional().default(""))
        });

        const result = parseCSVContent(csv, schema);
        expect(result.header).toEqual(["name", "age", "description"]);
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20, description: "Test" },
            { name: "Doe", age: 30, description: "" },
            { name: "Bill", age: 30, description: "" },
        ]);
        expect(result.success).toEqual(true);
        //@ts-expect-error - when success is true, errors are undefined
        expect(result.errors).toEqual(undefined);
    });

    it("should return no errors, headers and from CSV body for schema with optional fields 2", () => {
        const csv = `name,age,description
  John,20,Test
  Doe,,Test2
  Bill,30,`;
        const schema = z.object({
            name: zcsv.string(),
            age: zcsv.number(z.number().optional()),
            description: zcsv.string(z.string().optional().default(""))
        });

        const result = parseCSVContent(csv, schema);
        expect(result.header).toEqual(["name", "age", "description"]);
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20, description: "Test" },
            { name: "Doe", age: undefined, description: "Test2" },
            { name: "Bill", age: 30, description: "" },
        ]);
        expect(result.success).toEqual(true);
        //@ts-expect-error - when success is true, errors are undefined
        expect(result.errors).toEqual(undefined);
    });

    it("should return no errors, headers and from CSV body for schema with dynamic validation for users", () => {
        const csv = `name,age,description,leader,assignedTo
      John,20,Test,John@test.pl,Doe@test.pl
      Doe,30,,Doe@test.pl,John@test.pl
      Bill,30,,Bill@test.pl,John@test.pl`;
        const users = ["John@test.pl", "Doe@test.pl", "Bill@test.pl"] as const;
        const schema = z.object({
            name: zcsv.string(),
            age: zcsv.number(),
            description: zcsv.string(z.string().optional().default("")),
            leader: zcsv.enum(z.enum(users)),
            assignedTo: zcsv.enum(z.enum(users)),
        })

        const result = parseCSVContent(
            csv,
            schema
        );
        expect(result.header).toEqual([
            "name",
            "age",
            "description",
            "leader",
            "assignedTo",
        ]);
        expect(result.validRows).toStrictEqual([
            {
                name: "John",
                age: 20,
                description: "Test",
                leader: "John@test.pl",
                assignedTo: "Doe@test.pl",
            },
            {
                name: "Doe",
                age: 30,
                description: "",
                leader: "Doe@test.pl",
                assignedTo: "John@test.pl",
            },
            {
                name: "Bill",
                age: 30,
                description: "",
                leader: "Bill@test.pl",
                assignedTo: "John@test.pl",
            },
        ]);
        expect(result.success).toEqual(true);
        //@ts-expect-error - when success is true, errors are undefined
        expect(result.errors).toEqual(undefined);
    });

    it("should return errors when CSV's row contains users that does not valid", () => {
        const csv = `name,age,description,leader,assignedTo
      John,20,Test,John@test.pl,Doe@test.pl
      Doe,30,,Doe@test.pl,John@test.pl
      Bill,30,,Bills@test.pl,John@test.pl`;
        const users = ["John@test.pl", "Doe@test.pl", "Bill@test.pl"] as const;
        const schema = z.object({
            name: zcsv.string(),
            age: zcsv.number(),
            description: zcsv.string(z.string().optional().default("")),
            leader: zcsv.enum(z.enum(users)),
            assignedTo: zcsv.enum(z.enum(users)),
        })

        const result = parseCSVContent(
            csv,
            schema
        );
        expect(result.header).toEqual([
            "name",
            "age",
            "description",
            "leader",
            "assignedTo",
        ]);
        expect(result.validRows).toStrictEqual([
            {
                name: "John",
                age: 20,
                description: "Test",
                leader: "John@test.pl",
                assignedTo: "Doe@test.pl",
            },
            {
                name: "Doe",
                age: 30,
                description: "",
                leader: "Doe@test.pl",
                assignedTo: "John@test.pl",
            },

        ]);
        // @ts-expect-error - we want to check if error is correct
        const thirdRow = result.errors.rows['2'];
        expect(thirdRow).toBeInstanceOf(ZodError);
        expect(thirdRow.issues[0].message).toEqual(
            "Invalid enum value. Expected 'John@test.pl' | 'Doe@test.pl' | 'Bill@test.pl', received 'Bills@test.pl'"
        );
    });

    const isDueDateEqualOrAfterStartDate = (
        dueDate?: Date,
        startDate?: Date
    ) => {
        if (!dueDate) return false;
        if (!startDate) return true;

        return dueDate >= startDate;
    };


    it("should return errors when dueDate is before startDate", () => {
        const csv = `name,startDate,dueDate
    John,2020-01-01,2020-01-02
    Doe,2020-01-01,2020-01-02
    Bill,2020-01-01,2020-01-02`;

        const schema = z.object({
            name: zcsv.string(),
            startDate: zcsv.date(),
            dueDate: zcsv.date(),
        }).refine(
            (data) => isDueDateEqualOrAfterStartDate(data.dueDate, data.startDate), {
            message: "Due date must be after start date",
            path: ["dueDate"],
        })
        const result = parseCSVContent(csv, schema);
        expect(result.header).toEqual(["name", "startDate", "dueDate"]);
        expect(result.validRows).toStrictEqual([
            {
                name: "John",
                startDate: new Date("2020-01-01"),
                dueDate: new Date("2020-01-02"),
            },
            {
                name: "Doe",
                startDate: new Date("2020-01-01"),
                dueDate: new Date("2020-01-02"),
            },
            {
                name: "Bill",
                startDate: new Date("2020-01-01"),
                dueDate: new Date("2020-01-02"),
            },
        ]);
        expect(result.success).toEqual(true);
        //@ts-expect-error - when success is true, errors are undefined
        expect(result.errors).toEqual(undefined);
    });

    it("should return errors when dueDate is after startDate or startDate is missing", () => {
        const csv = `name,startDate,dueDate
    John,2020-01-03,2020-01-02
    John,2020-01-02,2020-01-02
    Doe,2020-01-01,2020-01-02
    Doe,,2020-01-02
    Doe,2020-01-01,
    Bill,2020-01-03,2020-01-02
    Bill,,`;
        const schema = z.object({
            name: zcsv.string(),
            startDate: zcsv.date(),
            dueDate: zcsv.date(),
        }).refine(
            (data) => isDueDateEqualOrAfterStartDate(data.dueDate, data.startDate), {
            message: "Due date must be after start date",
            path: ["dueDate"],
        })
        const result = parseCSVContent(csv, schema);
        expect(result.header).toEqual(["name", "startDate", "dueDate"]);
        expect(result.validRows).toStrictEqual([
            {
                name: "John",
                startDate: new Date("2020-01-02"),
                dueDate: new Date("2020-01-02"),
            },
            {
                name: "Doe",
                startDate: new Date("2020-01-01"),
                dueDate: new Date("2020-01-02"),
            },
        ]);
        expect(result.success).toEqual(false);
        //@ts-expect-error - we want to check if error is correct
        const errors = result.errors.rows!;
        const firstRow = errors["0"];
        const fourthRow = errors["3"];
        const fifthRow = errors["4"];
        const sixthRow = errors["5"];
        const seventhRow = errors["6"];

        expect(firstRow).toBeInstanceOf(ZodError);
        expect(fourthRow).toBeInstanceOf(ZodError);
        expect(fifthRow).toBeInstanceOf(ZodError);
        expect(sixthRow).toBeInstanceOf(ZodError);
        expect(seventhRow).toBeInstanceOf(ZodError);
    });
})