# zod-csv

Validation helpers for zod specifically for parsing CSV data. This is particularly useful when dealing with CSV data that needs to be validated before being processed.

The main goal of this library is to provide a simple way to validate CSV data using Zod schemas. With the helpers in zod-csv, you can write your types closer to how you want to.

The content from the CSV file is as a string. This library parses this content, validates it against the provided schema, and returns the result. First row of the CSV data is expected to be the header. The result contains the header, all rows, valid rows, and errors.

## Table of Contents
- [zod-csv](#zod-csv)
- [Example](#example)
- [Installation](#installation)
- [API](#api)
    - [Parsing CSV](#parsing-csv)
    - [Schema Helpers](#schema-helpers)
        - [zcsv.string()](#zcsvstring)
        - [zcsv.number()](#zcsvnumber)
        - [zcsv.boolean()](#zcsvboolean)
        - [zcsv.date()](#zcsvdate)
        - [zcsv.enum()](#zcsvenum)
- [Stream Processing](#stream-processing)
    - [Example with Node.js Streams](#example-with-nodejs-streams)
    - [Example with http request](#example-with-http-request)
- [Errors](#errors)
    - [Header Errors](#header-errors)
    - [Row Errors](#row-errors)
    
# Example

```ts
import { zcsv, parseCSVContent, parseCSV } from "zod-csv";
import { z } from "zod"

it("string example", () => {
    const csv = `name,age\nJohn,20\nDoe,30`;
    const schema = z.object({
        name: zcsv.string(),
        age: zcsv.number(),
    });
    const result = parseCSVContent(csv, schema);
    // headers from the csv file, but the lib is using the schema keys from the zod schema
    expect(result.header).toEqual(["name", "age"]);
    // all records including invalid ones are returned as strings
    expect(result.allRows).toStrictEqual([
        { name: "John", age: "20" },
        { name: "Doe", age: "30" },
    ])
    // only valid records are returned as objects
    expect(result.validRows).toStrictEqual([
        { name: "John", age: 20 },
        { name: "Doe", age: 30 },
    ]);
    if(result.success){
        // typescript will scream if you try to access the errors property
        expect(result.errors).toBe(undefined)
    }
    if(!result.success){
        // typescript will not scream if you try to access the errors property
        expect(result.errors).not.toBe(undefined)
    }
});

it("file example", async () => {
    const csv = new File(
      [`name,age\nJohn,20\nDoe,30`;],
      "test.csv",
      {
        type: "text/csv",
      }
    );

    const schema = z.object({
        name: zcsv.string(),
        age: zcsv.number(),
    });

    const result = await parseCSV(csv, schema);
    // headers from the csv file, but the lib is using the schema keys from the zod schema
    expect(result.header).toEqual(["name", "age"]);
    // all records including invalid ones are returned as strings
    expect(result.allRows).toStrictEqual([
        { name: "John", age: "20" },
        { name: "Doe", age: "30" },
    ])
    // only valid records are returned as objects
    expect(result.validRows).toStrictEqual([
        { name: "John", age: 20 },
        { name: "Doe", age: 30 },
    ]);
    if(result.success){
        // typescript will narrow the type, so typescript will scream if you try to access the errors property
        expect(result.errors).toBe(undefined)
    }
    if(!result.success){
        // typescript will narrow the type, so if success is false, typescript will allow you to access the errors property
        expect(result.errors).not.toBe(undefined)
    }
});
```

# Installation

```bash
npm install zod-csv 
# peer dependency
npm install zod
```

# API

## Parsing CSV

### `parseCSVContent<T extends z.ZodType>(csvContent: string, schema: T, options?: Options): ResultCSV<T>`

Function to parse CSV data from a string. The first row of the CSV data is expected to be the header.
```ts
type Options = {
    comma?: ',' | ';' | '|' | '\t',
    quote?: string,
    skipEmptyLines?: boolean,
}

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

it('example usage string input', () => {
    const csv = `name,age\nJohn,20\nDoe,30`;
    const schema = z.object({
        name: zcsv.string(),
        age: zcsv.number(),
    });
    const result = parseCSVContent(csv, schema) 

    expect(result.header).toEqual(["name", "age"]);

    if(result.success){
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20 },
            { name: "Doe", age: 30 },
        ]);
    }
    if(!result.success){
        expect(result.errors).toBeDefined()
    }
});
```

### `async parseCSV<T extends z.ZodType>(csv: File, schema: T, options?: Options): Promise<ResultCSV<T>>`

Function to parse CSV data from a File object. The first row of the CSV data is expected to be the header.
```ts
type Options = {
    comma?: ',' | ';' | '|' | '\t',
    quote?: string,
    skipEmptyLines?: boolean,
}

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

it('example usage file input', ()=> {
    const csv = new File(
      [`name,age\nJohn,20\nDoe,30`;],
      "test.csv",
      {
        type: "text/csv",
      }
    );

    const schema = z.object({
        name: zcsv.string(),
        age: zcsv.number(),
    });

    const result = await parseCSV(csv, schema);
    expect(result.header).toEqual(["name", "age"]);
    if(result.success){
        expect(result.validRows).toStrictEqual([
            { name: "John", age: 20 },
            { name: "Doe", age: 30 },
        ]);
    }
    if(!result.success){
        expect(result.errors).toBeDefined()
    }
});
```

### `parseRow<T extends z.ZodType>(row: string, schema: T, options?: Options): ResultRow<T>`

It can be used to parse a single row. It can be useful when validating a stream of data.

```ts
type Options = {
    comma?: ',' | ';' | '|' | '\t',
    quote?: string,
    skipEmptyLines?: boolean,
}

type ResultRow<T extends z.ZodType> = {
    success: true,
    row: z.infer<T>,
} | {
    success: false,
    errors: z.ZodError<T>[]
}

it('should return validated rows', () => {
    const csv = [`John,20`, `Doe,30`];
    const schema = z.object({
        name: zcsv.string(),
        age: zcsv.number(),
    });
    const result = csv.map(row => parseRow(row, schema));
    expect(result[0].success).toEqual(true);
    expect(result[0].row).toEqual({ name: "John", age: 20 });
    expect(result[1].success).toEqual(true);
    expect(result[1].row).toEqual({ name: "Doe", age: 30 });
})

it('should return errors when row is not valid', () => {
    const csv = [`John,20`, `Doe,3d0`];
    const schema = z.object({
        name: zcsv.string(),
        age: zcsv.number(),
    });
    const result = csv.map(row => parseRow(row, schema));
    expect(result[0].success).toEqual(true);
    expect(result[0].row).toEqual({ name: "John", age: 20 });
    expect(result[1].success).toEqual(false);
    expect(result[1].errors[0]).toBeInstanceOf(ZodError)
})
```

## Schema Helpers

### `zcsv.string()`

A helper for `z.string()`. By default it will require the value to be non-empty.
```ts
it('when no schema provided, the value is required', () => {
    const s = zcsv.string();
    const result = s.safeParse("")
    expect(result.success).toBe(false)
})

it('we can also enhance the schema with other zod helpers', () => {
    const s = zcsv.string(z.string().optional().default("default value"));
    const result = s.safeParse("")
    expect(result.success).toBe(true)
    expect(result.data).toEqual("default value")
})
```

### `zcsv.number()`

A helper for `z.number()`. By default it will require the value to be non-empty.
```ts
it('when no schema provided, the value is required', () => {
    const s = zcsv.number();
    const result = s.safeParse("")
    expect(result.success).toBe(false)
})

it('we can also enhance the schema with other zod helpers', () => {
    const s = zcsv.number(z.number().optional().default(0));
    const result = s.safeParse("")
    expect(result.success).toBe(true)
    expect(result.data).toEqual(0)
})

it('default behavior is to parse the value as a number', () => {
    const s = zcsv.number();
    const result = s.safeParse("123")
    expect(result.success).toBe(true)
    expect(result.data).toEqual(123)
})
```

### `zcsv.boolean()`

A helper for `z.boolean()`. By default it will require the value to be true or false.
```ts
it('when no schema provided, the value is required', () => {
    const s = zcsv.boolean();
    const result = s.safeParse("")
    expect(result.success).toBe(false)
})

it('we can also enhance the schema with other zod helpers', () => {
    const s = zcsv.boolean(z.boolean().optional().default(false));
    const result = s.safeParse("")
    expect(result.success).toBe(true)
    expect(result.data).toEqual(false)
})

it('default behavior is to parse the value as a boolean', () => {
    const s = zcsv.boolean();
    const result = s.safeParse("true")
    expect(result.success).toBe(true)
    expect(result.data).toEqual(true)
})
```

### `zcsv.date()`

A helper for `z.date()`. By default it will require the value to be non-empty.
```ts
it('when no schema provided, the value is required', () => {
    const s = zcsv.date();
    const result = s.safeParse("")
    expect(result.success).toBe(false)
})

it('we can also enhance the schema with other zod helpers', () => {
    const s = zcsv.date(z.date().optional().default(new Date()));
    const result = s.safeParse("")
    expect(result.success).toBe(true)
    expect(result.data).toEqual(new Date())
})

it('default behavior is to parse the value as a date', () => {
    const s = zcsv.date();
    const result = s.safeParse("2021-01-01")
    expect(result.success).toBe(true)
    expect(result.data).toEqual(new Date("2021-01-01"))
})
```

### `zcsv.enum()`

A helper for `z.enum()`. By default it will require the value to be non-empty.
```ts
it('when no schema provided, the value is required', () => {
    const s = zcsv.enum(["a", "b"]);
    const result = s.safeParse("")
    expect(result.success).toBe(false)
})

it('default behavior is to parse the value as a enum', () => {
    const s = zcsv.enum(["a", "b"]);
    const result = s.safeParse("a")
    expect(result.success).toBe(true)
    expect(result.data).toEqual("a")
})
```

# Stream Processing

zod-csv can validate CSV data in a streaming fashion, making it well suited for processing large files without loading everything into memory. Two common approaches are demonstrated below: one using Node.js file streams (fs.createReadStream) and another using the Web Streams API.

## Example with Node.js Streams

In this example the CSV file is read as a stream using fs.createReadStream. The contents are processed chunk by chunk by writing each chunk to a CSV processor created with processCSVInChunks:

```ts
import { zcsv, processCSVInChunks } from "zod-csv";
import { z } from "zod";
import fs from "node:fs";

async function processCSVFile() {
    const schema = z.object({
        name: zcsv.string(),
        email: zcsv.string(z.string().email()),
        signupDate: zcsv.date(),
    });
    const processor = processCSVInChunks(schema);
    const validRows: z.infer<typeof schema>[] = [];
    let headers: string[] = [];

    // Register event listeners.
    processor.on("data", (data) => {
        validRows.push(data);
    });

    processor.on("headers", (h) => {
        headers = h;
    });

    let chunksQuantity = 0;
    const stream = fs.createReadStream("filepath", { encoding: "utf-8" });

    // Helper to convert Buffer input to string.
    const toString = (input: string | Buffer): string => {
        return typeof input === "string" ? input : input.toString("utf8");
    };

    await new Promise<void>((resolve, reject) => {
        stream.on("data", (chunk) => {
            chunksQuantity++;
            processor.write(toString(chunk));
        });
        stream.on("end", () => {
            processor.emit("end");
            resolve();
        });
    });
}
```

## Example with http request

In this example the CSV file is read as a stream using the Web Streams API. The contents are processed chunk by chunk by writing each chunk to a CSV processor created with processCSVInChunks:

```ts
import { zcsv, processCSVInChunks } from "zod-csv";
import { z } from "zod";

async function processCSVFromUrl(url: string) {
    const schema = z.object({
        name: zcsv.string(),
        email: zcsv.string(z.string().email()),
        signupDate: zcsv.date(),
    });

    const processor = processCSVInChunks(schema);
    const validRows: z.infer<typeof schema>[] = [];
    let headers: string[] = [];

    processor.on("data", (data) => {
        validRows.push(data);
    });
    processor.on("headers", (h) => {
        headers = h;
    });

    const response = await fetch(url);
    if (!response.body) {
        throw new Error("Response body is missing");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let chunksQuantity = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            processor.emit("end");
            break;
        }
        const chunk = decoder.decode(value);
        chunksQuantity++;
        processor.write(chunk);
    }
}

```
# Errors

## Header Errors

### `errors.header.errorCode === "MISSING_COLUMN"`

The header is missing from the CSV data.

```ts

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
    expect(result.errors).toEqual({
        header: {
            "errorCode": "MISSING_COLUMN",
            "header": "age",
        }
    });
});

```


## Example with http request

```ts
import { zcsv, processCSVInChunks } from "zod-csv";
import { z } from "zod";

async function processCSVFromUrl(url: string) {
    const schema = z.object({
        name: zcsv.string(),
        email: zcsv.string(z.string().email()),
        signupDate: zcsv.date(),
    });

    const processor = processCSVInChunks(schema);
    const validRows: z.infer<typeof schema>[] = [];
    const errors: any[] = [];
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

    const response = await fetch(url);
    if (!response.body) {
        throw new Error("Response body is missing");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let chunksQuantity = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            processor.emit("end");
            break;
        }
        const chunk = decoder.decode(value);
        chunksQuantity++;
        processor.write(chunk);
    }

    // Allow time for the processor to handle all events.
    await new Promise(resolve => setTimeout(resolve, 10));

    console.log("Headers:", headers);
    console.log("Valid Rows:", validRows.length);
    console.log("Chunks Quantity:", chunksQuantity);
    console.log("Errors:", errors.length);
}
```
## Row Errors

### `errors.rows['row_number']`

```ts
it("example error handling for invalid data", () => {
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

    const errors = result.errors.rows;
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
```