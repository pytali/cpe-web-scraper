import axios, {AxiosInstance, AxiosResponse} from 'axios';
import {Buffer} from 'node:buffer';

class IXCApi {
    private api: AxiosInstance;
    private token: string;

    constructor(baseURL: string, token: string) {
        this.token = token;
        this.api = axios.create({
            baseURL: baseURL,
            headers: {
                'Authorization': `Basic ${Buffer.from(this.token).toString('base64')}`,
                'Content-Type': 'application/json',
            }
        });
    }

    public async get(endpoint: string, data?: object): Promise<AxiosResponse> {
        try {

            return await this.api.post(endpoint, data, {
                headers: {
                    ...this.api.defaults.headers.common,
                    'ixcsoft': 'listar',
                }
            });


        } catch (error) {
            throw new Error(`GET request failed: ${error}`);
        }
    }

    public async post(endpoint: string, data: object): Promise<AxiosResponse> {
        try {
            return await this.api.post(endpoint, data);
        } catch (error) {
            throw new Error(`POST request failed: ${error}`);
        }
    }

    public async put(endpoint: string, data: object, id: number): Promise<AxiosResponse> {
        try {
            return await this.api.put(endpoint+'/'+id, data);
        } catch (error) {
            throw new Error(`PUT request failed: ${error}`);
        }
    }

    public async delete(endpoint: string, id: number): Promise<AxiosResponse> {
        try {
            return await this.api.delete(endpoint+'/'+id);
        } catch (error) {
            throw new Error(`DELETE request failed: ${error}`);
        }
    }
}

export default IXCApi;