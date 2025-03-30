/**
 * Sends a POST request to clear the MAC address of a specified ID in the CDY base.
 * Returns the resulting `Clearmac` data or an Error if something goes wrong.
 *
 * @async
 * @function clearMacCDY
 * @param {string} id - ID of the user whose MAC must be cleared.
 * @returns {Promise<Clearmac | Error>} The resulting clear MAC data or an Error.
 */
import IXCApi, { IXCBASE } from "../api/IXCApi.class.ts";
import { type AxiosResponse } from "axios";
import { type Clearmac, type IxcData, type Radusuarios } from "../types/index.ts";

async function clearMacCDY(id: string): Promise<Clearmac | Error> {

    if (!Number(id)) {
        return new Error('ID inválido');
    }

    if (!id) {
        return new Error('ID não informado');
    }

    const response = await IXCApi.post(IXCBASE.CDY, '/radusuarios_25452/', {
        get_id: id,
    });

    if (!response) {
        return new Error('Erro ao buscar ID' + response);
    }

    return response.data;

}

/**
 * Retrieves user login information from the CDY base. If found, returns the first
 * matching `Radusuarios` record or an Error if not found.
 *
 * @async
 * @function getLoginCDY
 * @param {string} login - The user login identifier.
 * @returns {Promise<Error | Radusuarios>} The first matching record or an Error.
 */
async function getLoginCDY(login: string): Promise<Error | Radusuarios> {

    if (!login) {
        return new Error('Login não informado');
    }
    const response: AxiosResponse<IxcData<Radusuarios>> = await IXCApi.get(IXCBASE.CDY, '/radusuarios', {
        qtype: 'radusuarios.login',
        query: login,
        oper: '='
    });

    if (!response) {
        return new Error('Erro ao buscar login' + response);
    }

    if (response.data.registros) {
        return response.data.registros[0];
    }
    return new Error('Login não encontrado');
}

export { clearMacCDY, getLoginCDY };