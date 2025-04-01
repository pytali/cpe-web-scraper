import * as fs from 'node:fs';
import csvParser from 'csv-parser';
import { logger } from './logger';

/**
 * Reads IP addresses from a CSV file.
 * @param {string} filePath - Path to the CSV file.
 * @returns {Promise<string[]>} Array of IP addresses.
 */
export async function readIpsFromCsv(filePath: string): Promise<string[]> {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        logger.error('❌ CSV file not found');
        return [];
    }

    // Check if file is empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
        logger.error('❌ CSV file is empty');
        return [];
    }

    return new Promise((resolve, reject) => {
        const records: string[] = [];

        fs.createReadStream(filePath)
            .pipe(csvParser({
                headers: false,
                skipLines: 0
            }))
            .on('data', (row: Record<string, string>) => {
                // Assume IP is in the first column
                const ip = Object.values(row)[0];
                if (ip) records.push(ip);
            })
            .on('error', (error) => {
                logger.error(`❌ Error parsing CSV: ${error.message}`);
                reject(error);
            })
            .on('end', () => {
                resolve(records);
            });
    });
}