/**
 * Uses IXCApi to send a POST request to clear the MAC address for a specific
 * user ID in the BR364 base. Returns either the resulting Clearmac data or
 * an Error object.
 *
 * @async
 * @function clearMacBR364
 * @param {string} id - The ID whose MAC address should be cleared.
 * @returns {Promise<Clearmac | Error>} The returned Clearmac data or an Error.
 */
import IXCApi, { IXCBASE } from '../api/IXCApi.class.ts';
import { type AxiosResponse } from 'axios';
import { type Clearmac, type IxcData, type Radusuarios } from '../types/index.ts';

async function clearMacBR364(id: string): Promise<Clearmac | Error> {
    if (!Number(id)) {
        return new Error('Invalid ID');
    }

    if (!id) {
        return new Error('ID not provided');
    }

    const response = await IXCApi.post(IXCBASE.BR364, '/radusuarios_25452/', {
        get_id: id,
    });

    if (!response) {
        return new Error('Error fetching ID: ' + response);
    }

    return response.data;
}

/**
 * Retrieves user login information from the BR364 base using IXCApi. If found,
 * returns the first matching Radusuarios record or an Error object otherwise.
 *
 * @async
 * @function getLoginBR364
 * @param {string} login - The user login identifier.
 * @returns {Promise<Error | Radusuarios>} The first matching Radusuarios record or an Error.
 */
async function getLoginBR364(login: string): Promise<Error | Radusuarios> {
    if (!login) {
        return new Error('Login not provided');
    }
    const response: AxiosResponse<IxcData<Radusuarios>> = await IXCApi.get(IXCBASE.BR364, '/radusuarios', {
        qtype: 'radusuarios.login',
        query: login,
        oper: '=',
    });

    if (!response) {
        return new Error('Error fetching login: ' + response);
    }

    if (response.data.registros) {
        return response.data.registros[0];
    }
    return new Error('Login not found');
}

export { clearMacBR364, getLoginBR364 };