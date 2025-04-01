// Mock das variáveis de ambiente para testes
process.env = {
    ...process.env,
    IXC_CDY_TOKEN: '04:8f9e2a3b7c6d1f4e5d8c9b2a3f6e8d7c4b5a9f8e2d1c3b7a4f6e8d9c5b2a3f',
    IXC_CDY_URL: 'https://ixc.example.com/webservice/v1',
    IXC_BD_TOKEN: '12:3a7b4c8d2e5f9g6h1i4j7k2l5m8n3o6p9q2r5s8t1u4v7w0x3y6z9a2b5c8d',
    IXC_BD_URL: 'https://ixc.example.com/webservice/v1',
    IXC_BR364_TOKEN: '17:5x8y2z7a4b1c6d3e9f5g2h8i4j1k7l3m9n5o2p8q4r1s7t3u9v5w2x8y4z',
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