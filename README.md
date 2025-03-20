# CPE Web Scraper

Um web scraper para CPEs usando Puppeteer e integração com API IXC.

## 📝 Descrição

Este projeto é um web scraper automatizado que interage com CPEs (Customer Premises Equipment) através de suas interfaces web e integra com a API do IXC para gerenciamento e coleta de dados.

## 🚀 Configuração

O projeto utiliza variáveis de ambiente para configuração. Copie o arquivo `.env.example` e crie os arquivos de ambiente necessários:

```bash
# Desenvolvimento
cp .env.example .env.development

# Produção
cp .env.example .env.production

# Testes
cp .env.example .env.test

# Local (opcional)
cp .env.example .env.local
```

### 📋 Variáveis de Ambiente

#### Configuração IXC
- `IXC_CDY_TOKEN`: Token de autenticação para Candeias (formato: XX:hash)
- `IXC_CDY_URL`: URL base da API IXC Candeias
- `IXC_BD_TOKEN`: Token de autenticação para Brasil Digital
- `IXC_BD_URL`: URL base da API IXC Brasil Digital
- `IXC_BR364_TOKEN`: Token de autenticação para BR364
- `IXC_BR364_URL`: URL base da API IXC BR364

#### Configuração TR-069
- `TR069_URL`: URL do servidor ACS
- `TR069_USERNAME`: Usuário do ACS
- `TR069_PASSWORD`: Senha do ACS (mínimo 8 caracteres)
- `TR069_CONN_USERNAME`: Usuário para requisições de conexão
- `TR069_CONN_PASSWORD`: Senha para requisições de conexão (mínimo 8 caracteres)
- `TR069_INFORM_INTERVAL`: Intervalo de informação em segundos (300-86400)

#### Configuração de Dispositivos
- `DEVICE_PORT`: Porta para conexão com CPEs (1-65535)
- `DEVICE_USERS`: Lista de usuários separados por vírgula
- `DEVICE_PASSWORDS`: Lista de senhas separadas por vírgula

#### Configuração de Workers
- `WORKER_BATCH_SIZE`: Tamanho do lote de processamento (1-100)
- `WORKER_POOL_SIZE`: Número de workers paralelos (1-10)

### 🔒 Validação de Configuração

O projeto inclui validação automática das configurações usando Zod. As seguintes regras são aplicadas:

- Tokens IXC devem estar no formato XX:hash
- URLs não devem terminar com barra
- Senhas TR-069 devem ter no mínimo 8 caracteres
- Porta de dispositivo deve estar entre 1 e 65535
- Tamanho do lote de workers deve estar entre 1 e 100
- Número de workers deve estar entre 1 e 10
- Intervalo de informação TR-069 deve estar entre 300 e 86400 segundos

## 🛠️ Instalação

```bash
# Instala as dependências
npm install

# Inicia em desenvolvimento
npm run dev

# Inicia em produção
npm run start:prod

# Executa os testes
npm test
```

## 📦 Scripts Disponíveis

- `npm start`: Inicia a aplicação
- `npm run dev`: Inicia em modo desenvolvimento
- `npm run build`: Compila o projeto
- `npm run start:prod`: Inicia em modo produção
- `npm test`: Executa os testes
- `npm run test:watch`: Executa os testes em modo watch

## 🏗️ Estrutura do Projeto

```
src/
  ├── config/           # Configurações
  │   ├── index.ts     # Carregamento de configurações
  │   ├── env.ts       # Gerenciamento de ambiente
  │   └── validator.ts # Validação de configuração
  ├── util/            # Utilitários
  │   └── CsvParser.ts # Parser de arquivos CSV
  └── __tests__/       # Testes
```

## 🧪 Testes

O projeto usa Jest para testes. Os testes estão localizados em `src/__tests__/`.
A cobertura de testes pode ser visualizada após executar `npm test` no diretório `coverage/`.

## 🤝 Contribuição

1. Faça o fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -am 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Crie um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🔗 Links Úteis

- [Documentação do TypeScript](https://www.typescriptlang.org/docs/)
- [Documentação do Puppeteer](https://pptr.dev/)
- [Documentação do Jest](https://jestjs.io/docs/getting-started)
- [Documentação do Zod](https://zod.dev/)
