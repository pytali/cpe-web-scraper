# Política de Segurança

## Reportando uma Vulnerabilidade

Se você descobrir uma vulnerabilidade de segurança no CPE Web Scraper, por favor NÃO abra uma Issue pública. Em vez disso:

1. Envie um email para walissongois@gmail.com com:
   - Descrição detalhada da vulnerabilidade
   - Passos para reproduzir
   - Possível impacto
   - Sugestões de correção (se houver)

2. Você receberá uma resposta dentro de 48 horas com os próximos passos.

3. Uma vez que a vulnerabilidade for confirmada:
   - Desenvolveremos e testaremos uma correção
   - Criaremos um advisory de segurança
   - Lançaremos uma nova versão com a correção
   - Daremos crédito apropriado a você no advisory (se desejar)

## Práticas de Segurança

### Variáveis de Ambiente
- NUNCA comite arquivos `.env` com credenciais reais
- Use `.env.example` como template
- Mantenha senhas e tokens seguros

### Dependências
- Mantenha todas as dependências atualizadas
- Execute `npm audit` regularmente
- Use versões fixas no package.json

### Autenticação
- Use tokens de acesso com escopo limitado
- Implemente rate limiting
- Valide todas as entradas de usuário

### Logs
- Não registre informações sensíveis
- Sanitize dados antes de logar
- Use níveis apropriados de log

## Versões Suportadas

| Versão | Suporte          |
| ------ | ---------------- |
| 1.x.x  | :white_check_mark: |
| < 1.0  | :x:              |

## Atualizações de Segurança

Atualizações de segurança são publicadas como:

1. GitHub Security Advisories
2. Novas releases com patches
3. Notas de versão detalhadas

## Melhores Práticas para Contribuidores

1. Não comite credenciais ou tokens
2. Valide todas as entradas
3. Siga as diretrizes de código seguro
4. Execute testes de segurança
5. Reporte vulnerabilidades privadamente 