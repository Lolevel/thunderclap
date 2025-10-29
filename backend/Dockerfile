# Backend Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including Chrome for Selenium
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    wget \
    gnupg \
    unzip \
    curl \
    ca-certificates \
    && wget -q -O /tmp/google-chrome-key.gpg https://dl-ssl.google.com/linux/linux_signing_key.pub \
    && gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg /tmp/google-chrome-key.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/* /tmp/google-chrome-key.gpg

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 5000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/health', timeout=5)"

# Use entrypoint for automatic migrations
ENTRYPOINT ["./entrypoint.sh"]

# Default command (can be overridden)
CMD ["python", "run.py"]
