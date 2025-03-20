import IXCApi, {IXCBASE} from "../api/IXCApi.class";
import {AxiosResponse} from "axios";
import {Clearmac, IxcData, Radusuarios} from "../types";


async function clearMacCDY(id: string): Promise<AxiosResponse<Clearmac> | Error> {

    if (!Number(id)) {
        return new Error('ID inválido');
    }

    if (!id) {
        return new Error('ID não informado');
    }

    return await IXCApi.post(IXCBASE.CDY, '/radusuarios_25452/', {
        get_id: id,
    });

}

async function getLoginCDY(login: string): Promise< Error | Radusuarios> {

    if (!login) {
        return new Error('Login não informado');
    }
    const response: AxiosResponse<IxcData<Radusuarios>> = await IXCApi.get(IXCBASE.CDY, '/radusuarios', {
        qtype: 'radusuarios.login',
        query: login,
        oper: '='
    });

    if (!response) {
        return new Error('Erro ao buscar login', response);
    }

    if(response.data.registros) {
        return response.data.registros[0]
    }
    return new Error('Login não encontrado');



}


export {clearMacCDY, getLoginCDY}