import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

async function setup() {
    const rootDir = path.resolve(__dirname, '..');
    const envPath = path.join(rootDir, '.env');

    try {
        // Verifica se o arquivo .env já existe
        try {
            await access(envPath);
            console.log('⚠️  Arquivo .env já existe. Pulando...');
        } catch {
            // Cria um arquivo .env com variáveis de exemplo
            const envContent = `# Configuração IXC
IXC_CDY_TOKEN="XX:hash"
IXC_CDY_URL="https://ixc.example.com/webservice/v1"

IXC_BD_TOKEN="XX:hash"
IXC_BD_URL="https://ixc.example.com/webservice/v1"

IXC_BR364_TOKEN="XX:hash"
IXC_BR364_URL="https://ixc.example.com/webservice/v1"

# Configuração TR-069
TR069_URL="http://acs.example.com"
TR069_USERNAME="admin"
TR069_PASSWORD="password"
TR069_CONN_USERNAME="connection"
TR069_CONN_PASSWORD="password"
TR069_INFORM_INTERVAL="1200"

# Configuração de Dispositivos
DEVICE_PORT="80"
DEVICE_USERS="user1,user2"
DEVICE_PASSWORDS="pass1,pass2,pass3"

# Configuração de Workers
WORKER_BATCH_SIZE="2"
WORKER_POOL_SIZE="1"`;

            await writeFile(envPath, envContent);
            console.log('✅ Arquivo .env criado com sucesso!');
        }

        console.log('\n🎉 Setup concluído! Por favor, atualize as configurações no arquivo:');
        console.log(`- ${envPath}`);
    } catch (error) {
        console.error('❌ Erro durante o setup:', error);
        process.exit(1);
    }
}

setup(); 