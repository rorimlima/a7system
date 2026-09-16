#!/bin/bash
set -e
echo "=== Rodando testes ==="
cd backend && python -m pytest tests/ -v && cd ..
echo "=== Deploy Backend (Cloud Run) ==="
cd backend && gcloud builds submit --tag gcr.io/$PROJECT_ID/a7system-api && cd ..
gcloud run deploy a7system-api --image gcr.io/$PROJECT_ID/a7system-api --region southamerica-east1 --platform managed
echo "=== Deploy Frontend (Firebase Hosting) ==="
firebase deploy --only hosting
echo "=== Deploy Rules ==="
firebase deploy --only firestore:rules,storage
echo "=== Deploy Indexes ==="
firebase deploy --only firestore:indexes
echo "=== DEPLOY COMPLETO ==="
