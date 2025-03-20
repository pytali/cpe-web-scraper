import axios, {AxiosInstance, AxiosResponse} from 'axios';
import {Buffer} from 'node:buffer';
import {IXC_CONFIG} from "../config";

/**
 * Provides an enum containing base identifiers for IXC configurations.
 */
export enum IXCBASE {
    BD = "BD",
    CDY = "CDY",
    BR364 = "BR364",
}

/**
 * Class representing the IXC API client.
 * Creates Axios clients for each base and provides methods for GET, POST, PUT, and DELETE requests.
 */
class IXCApi {
    /**
     * Holds a record mapping IXCBASE entries to Axios instances.
     * @private
     * @type {{[key in IXCBASE]: AxiosInstance}}
     */
    private apiClients: Record<IXCBASE, AxiosInstance>;

    /**
     * Initializes and stores Axios instances for each IXCBASE.
     */
    constructor() {
        this.apiClients = {
            [IXCBASE.BD]: this.createClient(IXCBASE.BD),
            [IXCBASE.BR364]: this.createClient(IXCBASE.BR364),
            [IXCBASE.CDY]: this.createClient(IXCBASE.CDY),
        };
    }

    /**
     * Creates an Axios client for a specific base.
     * @private
     * @param {IXCBASE} base - The base enum key to configure.
     * @returns {AxiosInstance} A configured Axios client.
     */
    private createClient(base: IXCBASE): AxiosInstance {
        return axios.create({
            baseURL: IXC_CONFIG[base].BASEURL,
            headers: {
                'Authorization': `Basic ${Buffer.from(IXC_CONFIG[base].TOKEN).toString('base64')}`,
                'Content-Type': 'application/json',
            }
        });
    }

    /**
     * Performs a POST request to fetch data (labeled as GET due to the 'ixcsoft' header).
     * @async
     * @param {IXCBASE} base - The base identifier to use.
     * @param {string} endpoint - The API endpoint to call.
     * @param {object} [data] - Optional data payload for the request.
     * @returns {Promise<AxiosResponse>} The response from the server.
     * @throws {Error} If the request fails.
     */
    public async get(base: IXCBASE, endpoint: string, data?: object): Promise<AxiosResponse> {
        try {
            return await this.apiClients[base].post(endpoint, data, {
                headers: {
                    ...this.apiClients[base].defaults.headers.common,
                    'ixcsoft': 'listar',
                }
            });
        } catch (error) {
            throw new Error(`GET request failed: ${error}`);
        }
    }

    /**
     * Performs a standard POST request.
     * @async
     * @param {IXCBASE} base - The base identifier to use.
     * @param {string} endpoint - The API endpoint to call.
     * @param {object} data - The data payload for the request.
     * @returns {Promise<AxiosResponse>} The response from the server.
     * @throws {Error} If the request fails.
     */
    public async post(base: IXCBASE, endpoint: string, data: object): Promise<AxiosResponse> {
        try {
            return await this.apiClients[base].post(endpoint, data);
        } catch (error) {
            throw new Error(`POST request failed: ${error}`);
        }
    }

    /**
     * Performs a PUT request to update a specific resource.
     * @async
     * @param {IXCBASE} base - The base identifier to use.
     * @param {string} endpoint - The API endpoint to call.
     * @param {object} data - The data payload for the update.
     * @param {number} id - The resource identifier to update.
     * @returns {Promise<AxiosResponse>} The response from the server.
     * @throws {Error} If the request fails.
     */
    public async put(base: IXCBASE, endpoint: string, data: object, id: number): Promise<AxiosResponse> {
        try {
            return await this.apiClients[base].put(endpoint + '/' + id, data);
        } catch (error) {
            throw new Error(`PUT request failed: ${error}`);
        }
    }

    /**
     * Performs a DELETE request for a specific resource.
     * @async
     * @param {IXCBASE} base - The base identifier to use.
     * @param {string} endpoint - The API endpoint to call.
     * @param {number} id - The resource identifier to delete.
     * @returns {Promise<AxiosResponse>} The response from the server.
     * @throws {Error} If the request fails.
     */
    public async delete(base: IXCBASE, endpoint: string, id: number): Promise<AxiosResponse> {
        try {
            return await this.apiClients[base].delete(endpoint + '/' + id);
        } catch (error) {
            throw new Error(`DELETE request failed: ${error}`);
        }
    }
}

/**
 * Exports a single instance of the IXCApi class.
 */
export default new IXCApi();