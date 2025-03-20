# CPE Web Scraper

## 📝 Descrição
Um web scraper automatizado desenvolvido em TypeScript que integra com a API do IXC para gerenciamento e configuração de dispositivos CPE (Customer Premises Equipment). O projeto utiliza Puppeteer para automação web e oferece funcionalidades para configuração TR-069. Com um sistema robusto de workers para processamento paralelo, o projeto é capaz de lidar com grandes volumes de dispositivos de forma eficiente e escalável.

## 🚀 Tecnologias Utilizadas
- TypeScript
- Node.js
- Puppeteer
- Axios
- Jest (para testes)
- CSV Parser/Stringify
- Sistema de Workers para Processamento Paralelo
- Gerenciamento de Threads

## 📋 Pré-requisitos
- Node.js (versão LTS recomendada)
- npm ou yarn
- Acesso à API do IXC
- Credenciais necessárias para autenticação

## 🔧 Instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/cpe-web-scraper.git
cd cpe-web-scraper
```

2. Instale as dependências
```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente necessárias para:
- Credenciais de acesso
- URLs dos serviços
- Configurações do IXC
- Outras configurações específicas do ambiente

4. Compile e execute o projeto
```bash
npm start
# ou
yarn start
```

## 📁 Estrutura do Projeto
```
src/
├── api/          # Integrações com APIs externas
├── auth/         # Lógica de autenticação
├── config/       # Configurações do projeto
├── controllers/  # Controladores da aplicação
├── devices/      # Lógica relacionada aos dispositivos
├── resources/    # Recursos estáticos
├── services/     # Serviços da aplicação
├── static/       # Arquivos estáticos
├── types/        # Definições de tipos TypeScript
├── util/         # Utilitários
└── workers/      # Workers para processamento paralelo
```

## 🛠️ Principais Funcionalidades
- Sistema avançado de workers para processamento paralelo
  - Distribuição automática de carga
  - Processamento simultâneo de múltiplos dispositivos
  - Recuperação automática de falhas
  - Monitoramento em tempo real
- Automação web com Puppeteer
- Integração com API do IXC
- Configuração TR-069 para dispositivos
- Verificação de status de dispositivos
- Processamento de dados em CSV

## 🔄 Sistema de Workers
O projeto implementa um sistema sofisticado de processamento paralelo através de workers, oferecendo:

### Características
- Processamento distribuído de dispositivos
- Balanceamento automático de carga
- Recuperação de falhas e retry automático
- Monitoramento de performance
- Escalabilidade horizontal

### Benefícios
- Aumento significativo de performance
- Melhor utilização de recursos
- Processamento mais rápido de grandes volumes de dados
- Maior resiliência a falhas
- Capacidade de escalar conforme necessidade

### Configuração
Para otimizar o uso dos workers, configure no arquivo de ambiente:
```bash
WORKER_COUNT=4              # Número de workers paralelos
WORKER_BATCH_SIZE=100      # Tamanho do lote por worker
WORKER_RETRY_ATTEMPTS=3    # Tentativas de retry em caso de falha
```

### Monitoramento
O sistema oferece métricas em tempo real:
- Taxa de processamento por worker
- Tempo médio de processamento
- Taxa de sucesso/falha
- Uso de recursos

## 📦 Scripts Disponíveis
- `npm start`: Compila o TypeScript e executa o projeto
- `npm test`: Executa os testes com Jest

## 🔍 Testes
O projeto utiliza Jest para testes. Para executar a suite de testes:
```bash
npm test
```

## 🤝 Contribuição
1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NomeFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/NomeFeature`)
5. Abra um Pull Request

## ⚠️ Notas Importantes
- Certifique-se de ter todas as credenciais necessárias configuradas antes de executar
- O projeto requer acesso à internet para funcionar corretamente
- Algumas funcionalidades podem requerer permissões específicas no IXC
- Configure adequadamente o número de workers de acordo com os recursos disponíveis
- Monitore o uso de memória e CPU ao aumentar o número de workers

## 📄 Licença
Este projeto está sob a licença MIT.

## 🔗 Links Úteis
- [Documentação do Puppeteer](https://pptr.dev/)
- [Documentação do TypeScript](https://www.typescriptlang.org/docs/)
- [Documentação da API do IXC](https://ixc-api.com/docs) <!-- Substitua pelo link correto -->
