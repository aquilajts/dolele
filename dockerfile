# Usa imagem oficial do Python
FROM python:3.11-slim

# Define diretório de trabalho
WORKDIR /app

# Evita que Python crie arquivos .pyc
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copia os requirements primeiro (cache build eficiente)
COPY requirements.txt .

# Instala dependências do sistema + Python libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copia código do projeto
COPY . .

# Expõe porta (Cloud Run usa 8080 por padrão)
ENV PORT=8080

# Comando para rodar o app
CMD exec gunicorn --bind :$PORT --workers 2 --threads 8 --timeout 0 lele:app
