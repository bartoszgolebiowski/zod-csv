import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvFilePath = path.join(__dirname, 'static/contacts.csv');

export class TestServer {
    private server: http.Server | null = null;
    private readonly port: number;

    constructor(port: number = 3000) {
        this.port = port;
    }

    private createServer(): http.Server {
        return http.createServer((req, res) => {
            if (req.method === 'GET') {
                fs.readFile(csvFilePath, (err, data) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('CSV file not found.');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/csv' });
                    res.end(data);
                });
            } else {
                res.writeHead(405, { 'Content-Type': 'text/plain' });
                res.end('Method Not Allowed');
            }
        });
    }

    /**
     * Setup the test server.
     * - Creates a default CSV file.
     * - Starts the HTTP server on the configured port.
     *
     * @returns {Promise<void>} Resolves once the server is running.
     */
    public start(): Promise<void> {
        this.server = this.createServer();

        return new Promise((resolve, reject) => {
            this.server!.listen(this.port, (err?: Error) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    /**
     * Cleanup the test server.
     * - Stops the server.
     * - Deletes the CSV file.
     *
     * @returns {Promise<void>} Resolves once cleanup is complete.
     */
    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((err) => {
                    if (err) {
                        return reject(err);
                    }
                });
            } else {
                resolve();
            }
        });
    }
}