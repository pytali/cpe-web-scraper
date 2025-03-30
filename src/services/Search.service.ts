/**
 * Imports methods for checking user login in different services (BD, CDY, BR364)
 * and a Radusuarios type for a typed response.
 */
import { getLoginBD } from "./BD.service.ts";
import { getLoginCDY } from "./CDY.service.ts";
import { getLoginBR364 } from "./BR364.service.ts";
import { type Radusuarios } from "../types/index.ts";
import { logger } from "../util/logger.ts";
/**
 * Asynchronously checks a user login in multiple services (BD, CDY, BR364).
 * If exactly one service has the user, returns its result.
 * If multiple services have it, returns an Error describing which services.
 * If none have it, returns an Error.
 *
 * @async
 * @function checkLoginInAllServices
 * @param {string} login - The user login identifier.
 * @returns {Promise<Radusuarios | Error>} A `Radusuarios` object or an Error.
 */
async function checkLoginInAllServices(login: string): Promise<Radusuarios | Error> {
    if (!login) {
        return new Error('Login não informado');
    }

    const results = await Promise.all([
        getLoginBD(login).then(result => ({ service: 'BD', result })),
        getLoginCDY(login).then(result => ({ service: 'CDY', result })),
        getLoginBR364(login).then(result => ({ service: 'BR364', result }))
    ]);

    const successfulResults = results.filter(({ result }) => !(result instanceof Error));

    if (successfulResults.length === 1) {
        logger.info(`🔍 Login ${login} encontrado em: ${successfulResults[0].service}`);
        return successfulResults[0].result;
    } else if (successfulResults.length > 1) {
        const services = successfulResults.map(({ service }) => service).join(', ');
        return new Error(`Login ${login} encontrado em mais de um serviço: ${services}`);
    } else {
        return new Error(`Login ${login} não encontrado em nenhum serviço`);
    }
}

export { checkLoginInAllServices };
