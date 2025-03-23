#!/bin/bash

# Script para criar backup do projeto
VERSION="v02"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="project_versions/aquaponia_${VERSION}_${TIMESTAMP}"

echo "Criando backup do projeto na versão ${VERSION}..."
mkdir -p ${BACKUP_DIR}

# Copiando arquivos principais
echo "Copiando arquivos principais..."
cp -r client ${BACKUP_DIR}/
cp -r server ${BACKUP_DIR}/
cp -r shared ${BACKUP_DIR}/
cp package.json ${BACKUP_DIR}/
cp tailwind.config.ts ${BACKUP_DIR}/
cp vite.config.ts ${BACKUP_DIR}/
cp drizzle.config.ts ${BACKUP_DIR}/
cp theme.json ${BACKUP_DIR}/
cp tsconfig.json ${BACKUP_DIR}/
cp postcss.config.js ${BACKUP_DIR}/

# Criando arquivo de versão
echo "Criando arquivo de versão..."
cat > ${BACKUP_DIR}/VERSION.md << EOF
# Aquaponia - Versão ${VERSION}

Data do backup: $(date)

## Alterações nesta versão:
- Remoção da página de Análise
- Melhoria na atualização dos valores de temperatura e nível no sidebar
- Adição de efeito visual (pulse) quando os valores são atualizados
- Configuração do React Query para buscar dados mais frequentemente
EOF

echo "Backup concluído em ${BACKUP_DIR}"