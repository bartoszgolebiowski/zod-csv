import { z } from "zod";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { zcsv } from "./index";
import { processCSVInChunks, CSVStreamError } from "./stream";
import { TestServer } from "./test-utils/server-http";
import path from "node:path";
import fs from "node:fs";

describe("Stream Processing Integration", () => {

    const http = new TestServer()

    beforeAll(async () => {
        http.start()
    })

    afterAll(async () => {
        http.stop()
    })

    describe("File Streams API", () => {
        it("should process CSV data using fs.createReadStream", async () => {
            // Function to test
            const schema = z.object({
                name: zcsv.string(),
                email: zcsv.string(z.string().email()),
                signupDate: zcsv.date(),
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

            let chunksQuantity = 0;
            const filePath = path.join(__dirname, "test-utils/static", "contacts.csv");
            const stream = fs.createReadStream(filePath, { encoding: "utf-8" });

            const toString = (input: string | Buffer): string => {
                return typeof input === "string" ? input : input.toString("utf8");
            }

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

            // Allow time for all processor events to be handled
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(headers).toEqual(["name", "email", "signupDate"]);
            expect(validRows).toHaveLength(10000);
            expect(chunksQuantity).toBeGreaterThan(1);
            expect(errors).toHaveLength(2);
        });
    });

    describe("Web Streams API", () => {
        it("should process CSV data using the Web Streams API", async () => {
            // Function to test
            const schema = z.object({
                name: zcsv.string(),
                email: zcsv.string(z.string().email()),
                signupDate: zcsv.date(),
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

            const response = await fetch("http://localhost:3000");

            if (!response.body) {
                throw new Error("Response body is missing");
            }

            const reader = response.body.getReader();
            let chunksQuantity = 0;
            try {
                const decoder = new TextDecoder("utf-8"); // You can specify other encodings if needed
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        processor.emit('end');
                        break;
                    }
                    // Emit each chunk as it comes in.
                    const data = decoder.decode(value)
                    chunksQuantity++;
                    processor.write(data);
                }
            } catch (error) {
                processor.emit('error', error);
            }

            await new Promise(resolve => setTimeout(resolve, 10));
            expect(headers).toEqual(["name", "email", "signupDate"]);
            expect(validRows).toHaveLength(10000);
            expect(chunksQuantity).toBeGreaterThan(1);
            expect(errors).toHaveLength(2);

        });
    });
});
