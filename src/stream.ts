import { z } from "zod";
import { EventEmitter } from "events";
import * as csv from 'csv-string';
import { Options } from "./parse";

export interface CSVStreamError<T extends z.ZodType> {
  index: number;
  row: Record<string, string | undefined>;
  error: z.ZodError<T>;
}

interface CSVStreamEvents<T extends z.ZodType> {
  data: (data: z.infer<T>) => void;
  error: (error: CSVStreamError<T>) => void;
  end: () => void;
  headers: (headers: string[]) => void;
}

declare interface CSVStream<T extends z.ZodType> {
  on<E extends keyof CSVStreamEvents<T>>(
    event: E,
    listener: CSVStreamEvents<T>[E]
  ): this;
  emit<E extends keyof CSVStreamEvents<T>>(
    event: E,
    ...args: Parameters<CSVStreamEvents<T>[E]>
  ): boolean;
}

/**
 * A class that processes CSV data as a stream and emits events for parsed records
 */
class CSVStream<T extends z.ZodType> extends EventEmitter {
  private schema: T;
  private options?: Options;
  private headers: string[] = [];
  private buffer: string = '';
  private rowIndex: number = 0;
  private headersParsed: boolean = false;

  constructor(schema: T, options?: Options) {
    super();
    this.schema = schema;
    this.options = options;
  }

  /**
   * Write a chunk of CSV data to the stream
   * @param chunk - A chunk of CSV data
   */
  write(chunk: string): void {
    this.buffer += chunk;
    this.processBuffer();
  }

  /**
   * End the stream and process any remaining data
   */
  end(): void {
    this.processBuffer(true);
    this.emit('end');
  }

  private processBuffer(isEnd: boolean = false): void {
    // Process headers if not already done
    if (!this.headersParsed) {
      const headerEndIndex = this.findSafeNewlinePosition();
      if (headerEndIndex === -1 && !isEnd) {
        return; // Not enough data to parse headers yet
      }

      // Extract headers
      const headerLine = isEnd && headerEndIndex === -1
        ? this.buffer
        : this.buffer.substring(0, headerEndIndex);

      try {
        this.headers = csv.parse(headerLine, this.options)[0] || [];
        this.emit('headers', this.headers);
        this.headersParsed = true;

        // Remove the header line from the buffer
        this.buffer = headerEndIndex === -1 ? '' : this.buffer.substring(headerEndIndex + 1);
      } catch (error) {
        // If header parsing fails, wait for more data unless we're at the end
        if (isEnd) {
          console.error('Failed to parse CSV headers:', error);
          return;
        }
      }
    }

    // Continue processing the buffer for complete rows
    while (this.buffer.length > 0) {
      const rowEndIndex = this.findSafeNewlinePosition();
      if (rowEndIndex === -1) {
        // No complete row found
        if (isEnd && this.buffer.trim()) {
          // At the end, process any remaining data as a final row
          try {
            const rows = csv.parse(this.buffer, this.options);
            for (const row of rows) {
              this.processRow(row);
            }
            this.buffer = '';
          } catch (error) {
            console.error('Error parsing final CSV row:', error);
            break;
          }
        }
        break; // Wait for more data if not at the end
      }

      // Extract the row
      const rowData = this.buffer.substring(0, rowEndIndex);
      try {
        const rows = csv.parse(rowData, this.options);
        for (const row of rows) {
          this.processRow(row);
        }

        // Remove the processed row from the buffer
        this.buffer = this.buffer.substring(rowEndIndex + 1);
      } catch (error) {
        // If parsing fails, skip this problematic part and try to continue
        console.error('Error parsing CSV row:', error);
        // Move forward to prevent an infinite loop
        this.buffer = this.buffer.substring(rowEndIndex + 1);
      }
    }
  }

  /**
   * Find the position of a newline character that is not inside quoted content
   * This handles both regular quotes and escaped quotes
   */
  private findSafeNewlinePosition(): number {
    let inQuotes = false;
    let pos = 0;

    while (pos < this.buffer.length) {
      const char = this.buffer.charAt(pos);

      // Handle escaped quotes (\" within quoted content)
      if (char === '\\' && pos + 1 < this.buffer.length && this.buffer.charAt(pos + 1) === '"') {
        // Skip both the backslash and the quote
        pos += 2;
        continue;
      }

      // Toggle quote state when finding an unescaped quote
      if (char === '"') {
        inQuotes = !inQuotes;
      }
      // Return position when finding a newline outside of quotes
      else if (char === '\n' && !inQuotes) {
        return pos;
      }

      pos++;
    }

    // No safe newline found
    return -1;
  }

  private processRow(cells: string[]): void {
    // Ensure we have enough cells to match headers
    const filledCells = [...cells];
    while (filledCells.length < this.headers.length) {
      filledCells.push('');
    }

    // Create object from row cells and CSV headers
    const rowObject = this.headers.reduce((obj, header, index) => {
      obj[header] = filledCells[index] !== undefined ? filledCells[index] : undefined;
      return obj;
    }, {} as Record<string, string | undefined>);

    // Validate the row against the schema
    const parsed = this.schema.safeParse(rowObject);

    if (parsed.success) {
      // Emit valid row
      this.emit('data', parsed.data);
    } else {
      // Emit error for invalid row
      this.emit('error', {
        index: this.rowIndex,
        row: rowObject,
        error: parsed.error as z.ZodError<T>
      });
    }

    this.rowIndex++;
  }
}

/**
 * Create a new CSV stream parser that emits events for parsed records
 * @param schema - Zod schema to validate each record against
 * @param options - CSV parsing options
 * @returns A CSVStream instance
 */
function createCSVStream<T extends z.ZodType>(
  schema: T,
  options?: Options
): CSVStream<T> {
  return new CSVStream<T>(schema, options);
}

/**
 * Process CSV data in chunks and emit events for parsed records
 * @param schema - Zod schema to validate each record against
 * @param options - CSV parsing options
 * @returns A function that accepts chunks of CSV data
 * 
 * @example
 * ```ts
 * const processor = processCSVInChunks(schema);
 * 
 * processor.on('data', (data) => {
 *   console.log('Valid row:', data);
 * });
 * 
 * processor.on('error', ({ index, error }) => {
 *   console.log(`Invalid row at index ${index}:`, error);
 * });
 * 
 * // Process chunks of data
 * processor.write('name,age\n');
 * processor.write('John,30\n');
 * processor.write('Jane,invalid\n');
 * processor.end();
 * ```
 */
export function processCSVInChunks<T extends z.ZodType>(
  schema: T,
  options?: Options
): CSVStream<T> {
  return createCSVStream(schema, options);
}