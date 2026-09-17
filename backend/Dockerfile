FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

# CPU-only torch + a matching torchvision build first - the default PyPI
# wheel pulls CUDA and adds several GB for no benefit on a machine with no
# GPU. Both must be pinned together: leaving torchvision unpinned lets pip
# resolve it to a version that requires a newer torch than this, which then
# drags in the default (CUDA) torch build anyway when requirements.txt is
# installed next.
RUN pip install --no-cache-dir torch==2.4.1 torchvision==0.19.1 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/media

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
