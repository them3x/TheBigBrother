FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install exiftool
RUN apt update && apt install -y libimage-exiftool-perl

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "-m", "uvicorn", "the_big_brother.gui.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
