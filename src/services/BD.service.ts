/**
 * Imports IXCApi and IXCBASE enum for making requests to a remote API.
 * AxiosResponse is used to handle HTTP requests and responses.
 * Clearmac, IxcData, and Radusuarios are types for typed responses.
 */
import IXCApi, { IXCBASE } from '../api/IXCApi.class';
import { AxiosResponse } from 'axios';
import { Clearmac, IxcData, Radusuarios } from '../types';

/**
 * Clears the MAC address associated with a specific ID in the BD base.
 * @async
 * @function clearMacBD
 * @param {string} id - The identifier whose MAC should be cleared.
 * @returns {Promise<Clearmac | Error>} Resolves with the clear MAC data or an Error if invalid.
 */
async function clearMacBD(id: string): Promise<Clearmac | Error> {
    if (!Number(id)) {
        return new Error('ID inválido');
    }

    if (!id) {
        return new Error('ID não informado');
    }

    const response = await IXCApi.post(IXCBASE.BD, '/radusuarios_25452/', {
        get_id: id,
    });

    if (!response) {
        return new Error('Erro ao buscar ID' + response);
    }

    return response.data;
}

/**
 * Retrieves the login information for a specified user in the BD base.
 * @async
 * @function getLoginBD
 * @param {string} login - The user login identifier.
 * @returns {Promise<Error | Radusuarios>} Resolves with the retrieved user data or an Error if not found.
 */
async function getLoginBD(login: string): Promise<Error | Radusuarios> {
    if (!login) {
        return new Error('Login não informado');
    }
    const response: AxiosResponse<IxcData<Radusuarios>> = await IXCApi.get(IXCBASE.BD, '/radusuarios', {
        qtype: 'radusuarios.login',
        query: login,
        oper: '=',
    });

    if (!response) {
        return new Error('Erro ao buscar login' + response);
    }

    if (response.data.registros) {
        return response.data.registros[0];
    }
    return new Error('Login não encontrado');
}

export { clearMacBD, getLoginBD };