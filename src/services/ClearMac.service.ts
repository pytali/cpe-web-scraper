import { clearMacBD } from "./BD.service.ts";
import { clearMacCDY } from "./CDY.service.ts";
import { clearMacBR364 } from "./BR364.service.ts";
import { type Clearmac } from "../types/index.ts";
import { logger } from "../util/logger.ts";
/**
 * Attempts to clear the MAC address in multiple services (BD, CDY, BR364) for a given ID.
 * If found in exactly one service, returns the cleared MAC result.
 * If found in more than one, returns true.
 * Otherwise, returns an Error.
 *
 * @async
 * @function ClearmacInAllServices
 * @param {string} id - The ID whose MAC address will be cleared in each service.
 * @returns {Promise<Clearmac | Error | boolean>} The cleared MAC data, a boolean, or an Error if not found.
 */

async function ClearmacInAllServices(id: string): Promise<Clearmac | Error | boolean> {
    if (!id) {
        return new Error('ID não informado');
    }


    const results = await Promise.all([
        clearMacBD(id).then(result => ({ service: 'BD', result })),
        clearMacCDY(id).then(result => ({ service: 'CDY', result })),
        clearMacBR364(id).then(result => ({ service: 'BR364', result }))
    ]);

    const successfulResults = results.filter(({ result }) => !(result instanceof Error));

    if (successfulResults.length === 1) {
        logger.info(`🔍 ID ${id} encontrado em: ${successfulResults[0].service}`);
        return successfulResults[0].result;
    } else if (successfulResults.length > 1) {
        return true;
    } else {
        return new Error('ID não encontrado em nenhum serviço');
    }


}

export { ClearmacInAllServices };