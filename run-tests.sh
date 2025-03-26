#!/bin/bash

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Démarrage des tests pour l'application de gestion d'inventaire${NC}"
echo "=================================================="

# Vérification que Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
    exit 1
fi

# Vérification que npm est installé
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
    exit 1
fi

# Installation des dépendances si node_modules n'existe pas
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installation des dépendances...${NC}"
    npm install
fi

# Création des répertoires nécessaires s'ils n'existent pas
mkdir -p uploads/voice
mkdir -p uploads/invoices
mkdir -p logs
mkdir -p data/invoices
mkdir -p data/voice-output
mkdir -p data/invoice-output

# Créer un fichier .env s'il n'existe pas
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Création du fichier .env par défaut...${NC}"
    cat > .env << 'EOF'
# Configuration de l'application
PORT=8080
NODE_ENV=development
API_KEY=test-api-key

# Configuration Google Sheets
GOOGLE_SHEETS_DOC_ID=test-sheet-id
GOOGLE_SHEETS_CLIENT_EMAIL=test@example.com
GOOGLE_SHEETS_PRIVATE_KEY=test-private-key

# Configuration du traitement vocal
DEEPGRAM_API_KEY=test-deepgram-key
VOICE_SCHEDULER_ENABLED=false

# Configuration de traduction
GOOGLE_TRANSLATE_API_KEY=test-translate-key
TRANSLATION_ENABLED=true

# Configuration du traitement des factures
INVOICE_PROCESSOR_ENABLED=false
INVOICE_SCHEDULER_ENABLED=false

# Configuration des journaux
LOG_LEVEL=info
LOG_TO_FILE=false
EOF
fi

# Lancer les tests unitaires
echo -e "${YELLOW}Lancement des tests unitaires...${NC}"
npm run test:unit

# Stocker le résultat des tests unitaires
UNIT_RESULT=$?

# Lancer les tests d'intégration
echo -e "${YELLOW}Lancement des tests d'intégration...${NC}"
npm run test:integration

# Stocker le résultat des tests d'intégration
INTEGRATION_RESULT=$?

# Afficher le récapitulatif
echo "=================================================="
echo -e "${YELLOW}Récapitulatif des tests${NC}"
echo "--------------------------------------------------"
if [ $UNIT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Tests unitaires : SUCCÈS${NC}"
else
    echo -e "${RED}✗ Tests unitaires : ÉCHEC${NC}"
fi

if [ $INTEGRATION_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Tests d'intégration : SUCCÈS${NC}"
else
    echo -e "${RED}✗ Tests d'intégration : ÉCHEC${NC}"
fi
echo "--------------------------------------------------"

# Vérifier si tous les tests ont réussi
if [ $UNIT_RESULT -eq 0 ] && [ $INTEGRATION_RESULT -eq 0 ]; then
    echo -e "${GREEN}Tous les tests ont réussi !${NC}"
    exit 0
else
    echo -e "${RED}Certains tests ont échoué. Veuillez consulter les détails ci-dessus.${NC}"
    exit 1
fi
