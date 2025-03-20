#!/bin/bash

# Salva o estado atual do index.ts
cp src/config/index.ts /tmp/index.ts.backup

# Remove o arquivo do histórico do git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch src/config/index.ts" \
  --prune-empty --tag-name-filter cat -- --all

# Restaura o arquivo
cp /tmp/index.ts.backup src/config/index.ts

# Adiciona o arquivo de volta
git add src/config/index.ts

# Commit com a nova versão limpa
git commit -m "feat: adiciona configuração limpa do index.ts"

# Remove os arquivos temporários do git
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now 