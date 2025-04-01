// Mock das variáveis de ambiente para testes
process.env = {
    ...process.env,
    IXC_CDY_TOKEN: '04:8f9e2a3b7c6d1f4e5d8c9b2a3f6e8d7c4b5a9f8e2d1c3b7a4f6e8d9c5b2a3f7',
    IXC_CDY_URL: 'https://ixc.example.com/webservice/v1',
    IXC_BD_TOKEN: '12:3a7b4c8d2e5f9a6b1c4d7e2f5a8b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1',
    IXC_BD_URL: 'https://ixc.example.com/webservice/v1',
    IXC_BR364_TOKEN: '17:5a8b2c7d4e1f6a3b9c5d2e8f4a1b7c3d9e5f2a8b4c1d7e3f9a5b2c8d4e6f',
    IXC_BR364_URL: 'https://ixc.example.com/webservice/v1',
    TR069_URL: 'http://acs.example.com',
    TR069_USERNAME: 'admin',
    TR069_PASSWORD: 'TestPass789!@#',
    TR069_CONN_USERNAME: 'connection',
    TR069_CONN_PASSWORD: 'ConnReq456!@#',
    TR069_INFORM_INTERVAL: '1200',
    DEVICE_PORT: '80',
    DEVICE_USERS: 'user1,user2',
    DEVICE_PASSWORDS: 'pass1,pass2,pass3',
    WORKER_BATCH_SIZE: '2',
    WORKER_POOL_SIZE: '1',
    WORKER_TTL: '3600',
    WORKER_GRACEFUL_SHUTDOWN_TIMEOUT: '60'
}; 