import * as fs from 'node:fs';
import csvParser from 'csv-parser';

/**
 * Reads IP addresses from a CSV file at the given `filePath`.
 * Uses a CSV parser to extract rows and collect the `ip` field.
 * Resolves with an array of IP addresses or rejects on error.
 *
 * Example usage:
 * ```js
 * import {readIPColumnFromCSV} from "./util/CsvParser";
 * const csvFilePath = './example.csv';
 *
 * (async () => {
 *      const arrIP = await readIPColumnFromCSV(csvFilePath);
 *
 *      for (const item of arrIP) {
 *          console.log(item);
 *       }
 *  })();
 *
 * ```
 *
 * @param {string} filePath - The path to the CSV file.
 * @returns {Promise<string[]>} A Promise resolving to an array of IP addresses.
 *
 */

export async function readIPColumnFromCSV(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const ips: string[] = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row: { ip: string; }) => {
                if (row.ip) {
                    ips.push(row.ip);
                }
            })
            .on('end', () => {
                resolve(ips);
            })
            .on('error', (error: any) => {
                reject(error);
            });
    });
}