import { describe, it, expect } from "vitest";
import { zcsv } from ".";
import { z } from "zod";
import { CSVStreamError, processCSVInChunks } from "./stream";

describe("CSV streaming", () => {
  it("should process CSV data in chunks", async () => {
    const schema = z.object({
      name: zcsv.string(),
      age: zcsv.number(),
    });

    const processor = processCSVInChunks(schema);
    const validRows: z.infer<typeof schema>[] = [];
    const errors: CSVStreamError<typeof schema>[] = [];
    let headers: string[] = [];

    processor.on("data", (data) => {
      validRows.push(data);
    });

    processor.on("error", (error) => {
      errors.push(error);
    });

    processor.on("headers", (h) => {
      headers = h;
    });

    // Process chunks of CSV data
    processor.write("name,age\n");
    processor.write("John,30\n");
    processor.write("Jane,25\n");
    processor.write("Bob,invalid\n");  // This should cause an error
    processor.write("Alice,22\n");
    processor.end();

    // Give time for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check the results
    expect(headers).toEqual(["name", "age"]);
    expect(validRows).toHaveLength(3);
    expect(validRows).toEqual([
      { name: "John", age: 30 },
      { name: "Jane", age: 25 },
      { name: "Alice", age: 22 },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toEqual({ name: "Bob", age: "invalid" });
    expect(errors[0].error).toBeInstanceOf(z.ZodError);
  });

  it("should handle CSV data with quotes and special characters", async () => {
    const schema = z.object({
      name: zcsv.string(),
      description: zcsv.string(),
    });

    const processor = processCSVInChunks(schema);
    const validRows: z.infer<typeof schema>[] = [];
    let endCalled = false;

    processor.on("data", (data) => {
      validRows.push(data);
    });

    processor.on("end", () => {
      endCalled = true;
    });

    // Process CSV data with quotes and commas
    processor.write('name,description\n');
    processor.write('"John Doe","A description, with commas"\n');
    processor.write('"Jane Smith","Another\ndescription"\n');
    processor.end();

    // Give time for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(validRows).toHaveLength(2);
    expect(validRows[0]).toEqual({
      name: "John Doe",
      description: "A description, with commas",
    });
    expect(validRows[1]).toEqual({
      name: "Jane Smith",
      description: "Another\ndescription",
    });
    expect(endCalled).toBe(true);
  });

  it("should handle multiple chunks that don't align with row boundaries", async () => {
    const schema = z.object({
      name: zcsv.string(),
      age: zcsv.number(),
    });

    const processor = processCSVInChunks(schema);
    const validRows: z.infer<typeof schema>[] = [];

    processor.on("data", (data) => {
      validRows.push(data);
    });

    // Send data in chunks that don't align with row boundaries
    processor.write("na");
    processor.write("me,a");
    processor.write("ge\nJo");
    processor.write("hn,3");
    processor.write("0\nJane,25");
    processor.end();

    // Give time for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(validRows).toHaveLength(2);
    expect(validRows).toEqual([
      { name: "John", age: 30 },
      { name: "Jane", age: 25 },
    ]);
  });

  it("should handle complex CSV data with large chunks and unusual splits", async () => {
    const schema = z.object({
      id: zcsv.number(),
      name: zcsv.string(),
      description: zcsv.string(),
      date: zcsv.date(),
      active: zcsv.boolean(),
    });

    const processor = processCSVInChunks(schema);
    const validRows: z.infer<typeof schema>[] = [];
    const errors: CSVStreamError<typeof schema>[] = [];

    processor.on("data", (data) => {
      validRows.push(data);
    });

    processor.on("error", (error) => {
      errors.push(error);
    });

    // Create a large CSV string
    const csvPart1 = 'id,name,description,date,active\n1,"Complex, name with comma","This is a very long description that';
    const csvPart2 = ' continues across multiple chunks and has special characters like ""quotes"" and ,commas,",2023-01-01,true\n';
    const csvPart3 = '2,"Another name","Descrip';
    const csvPart4 = 'tion cut in the middle",2023-02-';
    const csvPart5 = '15,false\n3,"Incomplete row","Will not finish this row because';

    // Process chunks with unusual splits
    processor.write(csvPart1);
    processor.write(csvPart2);
    processor.write(csvPart3);
    processor.write(csvPart4);
    processor.write(csvPart5);
    processor.end();

    // Give time for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check the results
    expect(validRows).toHaveLength(2);
    expect(validRows[0]).toEqual({
      id: 1,
      name: "Complex, name with comma",
      description: 'This is a very long description that continues across multiple chunks and has special characters like "quotes" and ,commas,',
      date: new Date("2023-01-01"),
      active: true,
    });
    expect(validRows[1]).toEqual({
      id: 2,
      name: "Another name",
      description: "Description cut in the middle",
      date: new Date("2023-02-15"),
      active: false,
    });

    // Check if we have one error for the incomplete row
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toBeDefined();
  });

});